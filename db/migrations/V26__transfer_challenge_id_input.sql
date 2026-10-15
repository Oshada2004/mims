-- sp_create_transfer_challenge now takes the challenge id as an INPUT.
--
-- Why: the backend stores HMAC-SHA256(OTP_SECRET, challenge_id + code), so it needs the id BEFORE the
-- challenge row is created. The id is still generated in MySQL: the backend first runs
--   SELECT LOWER(HEX(RANDOM_BYTES(32)))
-- then hashes the code with that id and calls this procedure. The primary key rejects duplicates.
-- (V25 is left unchanged; this migration replaces only this one procedure.)

DELIMITER $$

-- Validates the transfer (same rules as the transfer itself, without moving money or locking accounts),
-- rate-limits the person, cancels their other pending transfer challenges and stores the new one.
DROP PROCEDURE IF EXISTS sp_create_transfer_challenge$$
CREATE PROCEDURE sp_create_transfer_challenge(
    IN p_challenge_id CHAR(64),
    IN p_person_id INT,
    IN p_sender VARCHAR(15),
    IN p_receiver VARCHAR(15),
    IN p_amount DECIMAL(14,2),
    IN p_ref VARCHAR(100),
    IN p_code_hash CHAR(64)
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

    IF p_challenge_id IS NULL OR p_challenge_id NOT REGEXP '^[0-9a-f]{64}$' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Invalid challenge id.';
    END IF;

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

DELIMITER ;
