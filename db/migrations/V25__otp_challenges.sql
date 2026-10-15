-- One-time-password challenges for customer transfers (and later LOGIN / WITHDRAWAL).
--
-- The code itself never reaches the database: the backend stores HMAC-SHA256(challenge_id + code) as
-- code_hash and sends the code by email.
--
-- Errors: SQLSTATE '45000' = business rule / invalid challenge (HTTP 422),
--         SQLSTATE '45429' = rate limit, resend cooldown or resend limit (HTTP 429).
--
-- Procedures that end with an error but must keep a state change (a failed attempt, an expiry, a
-- lockout) COMMIT that change first and then SIGNAL, so the rollback in the error handler cannot undo it.

CREATE TABLE OTP_CHALLENGE (
    challenge_id CHAR(64) NOT NULL,
    purpose ENUM('TRANSFER') NOT NULL,
    person_id INT NOT NULL,
    payload JSON NOT NULL,
    code_hash CHAR(64) NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 5,
    resend_count INT NOT NULL DEFAULT 0,
    last_sent_at DATETIME NOT NULL,
    status ENUM('PENDING','USED','EXPIRED','LOCKED','CANCELLED') NOT NULL DEFAULT 'PENDING',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    used_at DATETIME NULL,
    txn_id BIGINT NULL,
    PRIMARY KEY (challenge_id),
    -- "pending challenges of this person" and the 15-minute creation count
    INDEX idx_otp_person_purpose_status (person_id, purpose, status, created_at),
    CONSTRAINT chk_otp_attempts CHECK (attempts >= 0 AND attempts <= max_attempts),
    CONSTRAINT chk_otp_code_hash CHECK (code_hash REGEXP '^[0-9a-f]{64}$'),
    CONSTRAINT fk_otp_person FOREIGN KEY (person_id)
        REFERENCES AUTH_USER(person_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_otp_txn FOREIGN KEY (txn_id)
        REFERENCES TRANSACTION_LOG(txn_id)
        ON DELETE RESTRICT ON UPDATE CASCADE
);

DELIMITER $$

-- Validates the transfer (same rules as the transfer itself, without moving money or locking accounts),
-- rate-limits the person, cancels their other pending transfer challenges and stores the new one.
DROP PROCEDURE IF EXISTS sp_create_transfer_challenge$$
CREATE PROCEDURE sp_create_transfer_challenge(
    IN p_person_id INT,
    IN p_sender VARCHAR(15),
    IN p_receiver VARCHAR(15),
    IN p_amount DECIMAL(14,2),
    IN p_ref VARCHAR(100),
    IN p_code_hash CHAR(64),
    OUT p_challenge_id CHAR(64)
)
BEGIN
    DECLARE v_ref VARCHAR(100);
    DECLARE v_sender_balance, v_receiver_balance DECIMAL(14,2);
    DECLARE v_recent INT;
    DECLARE v_locked_person INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET p_challenge_id = NULL;

    IF p_code_hash IS NULL OR p_code_hash NOT REGEXP '^[0-9a-f]{64}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid code hash.';
    END IF;

    SET v_ref = NULLIF(TRIM(p_ref), '');
    IF CHAR_LENGTH(v_ref) > 50 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reference must be at most 50 characters.';
    END IF;

    -- Every transfer rule, so an invalid transfer is refused before any email is sent.
    CALL sp_check_transfer_rules(
        p_sender, p_receiver, p_amount, p_person_id, FALSE,
        v_sender_balance, v_receiver_balance
    );

    START TRANSACTION;

    -- Serialise this person's challenge creation so the rate limit cannot be raced.
    SELECT person_id INTO v_locked_person
    FROM AUTH_USER
    WHERE person_id = p_person_id
    FOR UPDATE;

    SELECT COUNT(*) INTO v_recent
    FROM OTP_CHALLENGE
    WHERE person_id = p_person_id
      AND purpose = 'TRANSFER'
      AND created_at > NOW() - INTERVAL 15 MINUTE;

    IF v_recent >= 5 THEN
        SIGNAL SQLSTATE '45429'
            SET MESSAGE_TEXT = 'Too many transfer requests. Please wait a few minutes and try again.';
    END IF;

    UPDATE OTP_CHALLENGE
    SET status = 'CANCELLED'
    WHERE person_id = p_person_id
      AND purpose = 'TRANSFER'
      AND status = 'PENDING';

    SET p_challenge_id = LOWER(HEX(RANDOM_BYTES(32)));

    INSERT INTO OTP_CHALLENGE (
        challenge_id, purpose, person_id, payload, code_hash, expires_at, last_sent_at
    ) VALUES (
        p_challenge_id,
        'TRANSFER',
        p_person_id,
        JSON_OBJECT(
            'sender', p_sender,
            'receiver', p_receiver,
            'amount', CAST(p_amount AS CHAR),
            'reference', v_ref
        ),
        p_code_hash,
        NOW() + INTERVAL 5 MINUTE,
        NOW()
    );

    COMMIT;
END$$

-- New code for the owner's pending, unexpired challenge: at least 60 s after the last send, at most
-- 3 resends. Replaces the hash and restarts the 5-minute expiry. Failed attempts are NOT reset.
DROP PROCEDURE IF EXISTS sp_resend_transfer_challenge$$
CREATE PROCEDURE sp_resend_transfer_challenge(
    IN p_challenge_id CHAR(64),
    IN p_person_id INT,
    IN p_new_code_hash CHAR(64)
)
BEGIN
    DECLARE v_found BOOLEAN DEFAULT FALSE;
    DECLARE v_owner INT;
    DECLARE v_status VARCHAR(10);
    DECLARE v_expires_at DATETIME;
    DECLARE v_last_sent_at DATETIME;
    DECLARE v_resends INT;
    DECLARE v_wait INT;
    DECLARE v_message VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;

    IF p_new_code_hash IS NULL OR p_new_code_hash NOT REGEXP '^[0-9a-f]{64}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid code hash.';
    END IF;

    START TRANSACTION;

    SELECT TRUE, person_id, status, expires_at, last_sent_at, resend_count
    INTO v_found, v_owner, v_status, v_expires_at, v_last_sent_at, v_resends
    FROM OTP_CHALLENGE
    WHERE challenge_id = p_challenge_id
      AND purpose = 'TRANSFER'
    FOR UPDATE;

    IF NOT v_found OR v_owner <> p_person_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer request not found.';
    END IF;

    IF v_status = 'PENDING' AND v_expires_at <= NOW() THEN
        UPDATE OTP_CHALLENGE SET status = 'EXPIRED' WHERE challenge_id = p_challenge_id;
        COMMIT;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This code has expired. Please start the transfer again.';
    END IF;

    IF v_status <> 'PENDING' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This transfer request is no longer active. Please start again.';
    END IF;

    SET v_wait = 60 - TIMESTAMPDIFF(SECOND, v_last_sent_at, NOW());
    IF v_wait > 0 THEN
        SET v_message = CONCAT('Please wait ', v_wait, ' seconds before requesting a new code.');
        SIGNAL SQLSTATE '45429' SET MESSAGE_TEXT = v_message;
    END IF;

    IF v_resends >= 3 THEN
        SIGNAL SQLSTATE '45429'
            SET MESSAGE_TEXT = 'You have reached the maximum number of new codes. Please start the transfer again.';
    END IF;

    UPDATE OTP_CHALLENGE
    SET code_hash = p_new_code_hash,
        resend_count = resend_count + 1,
        last_sent_at = NOW(),
        expires_at = NOW() + INTERVAL 5 MINUTE
    WHERE challenge_id = p_challenge_id;

    COMMIT;
END$$

-- Checks the code and, if it matches, performs the stored transfer, all in one transaction.
-- A used challenge can never run again: the row is locked and its status re-checked under the lock.
DROP PROCEDURE IF EXISTS sp_confirm_transfer_challenge$$
CREATE PROCEDURE sp_confirm_transfer_challenge(
    IN p_challenge_id CHAR(64),
    IN p_person_id INT,
    IN p_code_hash CHAR(64),
    OUT p_txn_id BIGINT,
    OUT p_sender_balance_after DECIMAL(14,2)
)
BEGIN
    DECLARE v_found BOOLEAN DEFAULT FALSE;
    DECLARE v_owner INT;
    DECLARE v_status VARCHAR(10);
    DECLARE v_expires_at DATETIME;
    DECLARE v_hash CHAR(64);
    DECLARE v_attempts INT;
    DECLARE v_max INT;
    DECLARE v_payload JSON;
    DECLARE v_left INT;
    DECLARE v_message VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;
    DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;

    SET p_txn_id = NULL;
    SET p_sender_balance_after = NULL;

    START TRANSACTION;

    -- Locking read first: no plain reads may happen before sp_transfer_internal takes its locks.
    SELECT TRUE, person_id, status, expires_at, code_hash, attempts, max_attempts, payload
    INTO v_found, v_owner, v_status, v_expires_at, v_hash, v_attempts, v_max, v_payload
    FROM OTP_CHALLENGE
    WHERE challenge_id = p_challenge_id
      AND purpose = 'TRANSFER'
    FOR UPDATE;

    IF NOT v_found OR v_owner <> p_person_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer request not found.';
    END IF;

    IF v_status = 'USED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This transfer has already been completed.';
    ELSEIF v_status = 'LOCKED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Too many incorrect codes. Please start the transfer again.';
    ELSEIF v_status = 'EXPIRED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This code has expired. Please start the transfer again.';
    ELSEIF v_status = 'CANCELLED' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This transfer request was cancelled. Please start again.';
    END IF;

    IF v_expires_at <= NOW() THEN
        UPDATE OTP_CHALLENGE SET status = 'EXPIRED' WHERE challenge_id = p_challenge_id;
        COMMIT;
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This code has expired. Please start the transfer again.';
    END IF;

    IF p_code_hash IS NULL OR p_code_hash <> v_hash THEN
        SET v_attempts = v_attempts + 1;
        SET v_left = v_max - v_attempts;

        UPDATE OTP_CHALLENGE
        SET attempts = v_attempts,
            status = IF(v_left <= 0, 'LOCKED', status)
        WHERE challenge_id = p_challenge_id;
        COMMIT;

        IF v_left <= 0 THEN
            SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT = 'Incorrect code. Too many attempts: this transfer has been cancelled. Please start again.';
        END IF;

        SET v_message = CONCAT('Incorrect code. ', v_left, IF(v_left = 1, ' attempt', ' attempts'), ' left.');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
    END IF;

    -- Code matches: run the STORED payload, never values from the caller.
    BEGIN
        -- A transfer rule that fails now (e.g. the balance changed since the code was sent) ends this
        -- request: roll back the transfer, mark the challenge CANCELLED, and pass the error on.
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            START TRANSACTION;
            UPDATE OTP_CHALLENGE SET status = 'CANCELLED'
            WHERE challenge_id = p_challenge_id AND status = 'PENDING';
            COMMIT;
            RESIGNAL;
        END;

        CALL sp_transfer_internal(
            JSON_VALUE(v_payload, '$.sender'),
            JSON_VALUE(v_payload, '$.receiver'),
            JSON_VALUE(v_payload, '$.amount' RETURNING DECIMAL(14,2)),
            JSON_VALUE(v_payload, '$.reference'),
            p_person_id,
            p_txn_id,
            p_sender_balance_after
        );
    END;

    UPDATE OTP_CHALLENGE
    SET status = 'USED',
        used_at = NOW(),
        txn_id = p_txn_id
    WHERE challenge_id = p_challenge_id;

    COMMIT;
END$$

-- Cancels the owner's pending challenge (e.g. when the email could not be sent). No error if it is
-- not pending any more.
DROP PROCEDURE IF EXISTS sp_cancel_transfer_challenge$$
CREATE PROCEDURE sp_cancel_transfer_challenge(
    IN p_challenge_id CHAR(64),
    IN p_person_id INT
)
BEGIN
    UPDATE OTP_CHALLENGE
    SET status = 'CANCELLED'
    WHERE challenge_id = p_challenge_id
      AND person_id = p_person_id
      AND purpose = 'TRANSFER'
      AND status = 'PENDING';
END$$

DELIMITER ;
