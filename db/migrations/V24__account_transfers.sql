-- Customer-initiated account-to-account transfers.
--
--   sp_check_transfer_rules   every business rule; optionally locks both accounts (shared with OTP challenges)
--   fn_get_daily_transfer_total
--   sp_transfer_internal      moves the money; NO transaction control (the caller owns the transaction)
--   sp_process_transfer       START TRANSACTION + sp_transfer_internal + COMMIT / ROLLBACK + RESIGNAL
--
-- Sender <> receiver is enforced by the existing V7 triggers on AtoA_TRANSFER_LOG
-- (trg_bi_atoa_transfer_log / trg_bu_atoa_transfer_log) and again in sp_check_transfer_rules.
-- A CHECK constraint is not possible here: MySQL rejects CHECK constraints on columns used by a
-- foreign key with a referential action (error 3823), and both account columns have ON DELETE SET NULL.

ALTER TABLE BANK_META_DATA
    ADD COLUMN daily_transfer_limit DECIMAL(14,2) NOT NULL DEFAULT 100000.00;

DELIMITER $$

-- Total sent today from an account. "Today" is the same calendar day as the daily withdrawal check
-- (CURDATE() in the server time zone), compared as a range so an index on txn_timestamp can be used.
DROP FUNCTION IF EXISTS fn_get_daily_transfer_total$$
CREATE FUNCTION fn_get_daily_transfer_total(p_account_no VARCHAR(15))
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);

    SELECT COALESCE(SUM(a.amount), 0.00)
    INTO v_total
    FROM AtoA_TRANSFER_LOG a
    JOIN TRANSACTION_LOG t ON t.txn_id = a.txn_id
    WHERE a.sender_acc_no = p_account_no
      AND t.txn_timestamp >= CURDATE()
      AND t.txn_timestamp < CURDATE() + INTERVAL 1 DAY;

    RETURN v_total;
END$$

-- Checks every transfer rule and raises SQLSTATE 45000 with a user-facing message on the first failure.
-- p_lock = TRUE locks both SAVINGS_ACCOUNT rows (lower account_no first, so opposite transfers between
-- the same two accounts cannot deadlock) and must then be called inside the caller's transaction BEFORE
-- any plain (non-locking) read, so the balance and daily-total reads see the latest committed data.
-- p_lock = FALSE only reads (used to validate an OTP challenge before any money moves).
DROP PROCEDURE IF EXISTS sp_check_transfer_rules$$
CREATE PROCEDURE sp_check_transfer_rules(
    IN p_sender VARCHAR(15),
    IN p_receiver VARCHAR(15),
    IN p_amount DECIMAL(14,2),
    IN p_initiator_person_id INT,
    IN p_lock BOOLEAN,
    OUT p_sender_balance DECIMAL(14,2),
    OUT p_receiver_balance DECIMAL(14,2)
)
BEGIN
    DECLARE v_first VARCHAR(15);
    DECLARE v_second VARCHAR(15);
    DECLARE v_found_first BOOLEAN DEFAULT FALSE;
    DECLARE v_found_second BOOLEAN DEFAULT FALSE;
    DECLARE v_first_status, v_second_status VARCHAR(10);
    DECLARE v_first_balance, v_second_balance DECIMAL(14,2);
    DECLARE v_first_min, v_second_min DECIMAL(14,2);
    DECLARE v_first_plan, v_second_plan VARCHAR(10);
    DECLARE v_sender_status, v_receiver_status VARCHAR(10);
    DECLARE v_sender_min DECIMAL(14,2);
    DECLARE v_sender_plan VARCHAR(10);
    DECLARE v_user_role VARCHAR(10);
    DECLARE v_limit DECIMAL(14,2);
    DECLARE v_sent_today DECIMAL(14,2);
    DECLARE v_message VARCHAR(255);
    -- A missing account leaves v_found_* FALSE instead of raising "No data".
    DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;

    SET p_sender_balance = NULL;
    SET p_receiver_balance = NULL;

    -- Input
    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount must be greater than zero.';
    END IF;

    IF p_sender IS NULL OR TRIM(p_sender) = '' OR p_receiver IS NULL OR TRIM(p_receiver) = '' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender and receiver account numbers are required.';
    END IF;

    IF p_sender = p_receiver THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You cannot transfer money to the same account.';
    END IF;

    -- Read (and optionally lock) both accounts, lower account number first.
    IF p_sender < p_receiver THEN
        SET v_first = p_sender, v_second = p_receiver;
    ELSE
        SET v_first = p_receiver, v_second = p_sender;
    END IF;

    IF p_lock THEN
        SELECT TRUE, status, balance, contracted_min_balance, plan_code
        INTO v_found_first, v_first_status, v_first_balance, v_first_min, v_first_plan
        FROM SAVINGS_ACCOUNT WHERE account_no = v_first
        FOR UPDATE;

        SELECT TRUE, status, balance, contracted_min_balance, plan_code
        INTO v_found_second, v_second_status, v_second_balance, v_second_min, v_second_plan
        FROM SAVINGS_ACCOUNT WHERE account_no = v_second
        FOR UPDATE;
    ELSE
        SELECT TRUE, status, balance, contracted_min_balance, plan_code
        INTO v_found_first, v_first_status, v_first_balance, v_first_min, v_first_plan
        FROM SAVINGS_ACCOUNT WHERE account_no = v_first;

        SELECT TRUE, status, balance, contracted_min_balance, plan_code
        INTO v_found_second, v_second_status, v_second_balance, v_second_min, v_second_plan
        FROM SAVINGS_ACCOUNT WHERE account_no = v_second;
    END IF;

    IF (v_first = p_sender AND NOT v_found_first) OR (v_second = p_sender AND NOT v_found_second) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender account does not exist.';
    END IF;

    IF (v_first = p_receiver AND NOT v_found_first) OR (v_second = p_receiver AND NOT v_found_second) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account does not exist.';
    END IF;

    IF v_first = p_sender THEN
        SET v_sender_status = v_first_status, p_sender_balance = v_first_balance,
            v_sender_min = v_first_min, v_sender_plan = v_first_plan,
            v_receiver_status = v_second_status, p_receiver_balance = v_second_balance;
    ELSE
        SET v_sender_status = v_second_status, p_sender_balance = v_second_balance,
            v_sender_min = v_second_min, v_sender_plan = v_second_plan,
            v_receiver_status = v_first_status, p_receiver_balance = v_first_balance;
    END IF;

    -- Who is sending
    SET v_user_role = (SELECT user_role FROM AUTH_USER WHERE person_id = p_initiator_person_id);

    IF v_user_role IS NULL OR v_user_role <> 'CUSTOMER' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only customers can make transfers.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM ACCOUNT_HOLDER
        WHERE account_no = p_sender
          AND customer_person_id = p_initiator_person_id
          AND holder_role IN ('PRIMARY', 'JOINT')
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You can only send money from an account you hold.';
    END IF;

    IF v_sender_plan IN ('CHILD', 'TEEN')
       OR EXISTS (SELECT 1 FROM MINOR_CUSTOMER_PROFILE WHERE person_id = p_initiator_person_id) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Minors cannot make transfers.';
    END IF;

    -- Account states
    IF v_sender_status <> 'ACTIVE' THEN
        SET v_message = CONCAT('Your account is ', v_sender_status, ' and cannot send money.');
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
    END IF;

    IF v_receiver_status <> 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'The receiving account is not active and cannot accept transfers.';
    END IF;

    -- Money rules
    IF p_sender_balance - p_amount < v_sender_min THEN
        SET v_message = CONCAT(
            'Insufficient funds: your balance must stay at or above the minimum of LKR ',
            FORMAT(v_sender_min, 2), '.'
        );
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
    END IF;

    SET v_limit = COALESCE(
        (SELECT daily_transfer_limit FROM BANK_META_DATA ORDER BY bank_id LIMIT 1),
        100000.00
    );
    SET v_sent_today = fn_get_daily_transfer_total(p_sender);

    IF v_sent_today + p_amount > v_limit THEN
        SET v_message = CONCAT(
            'Daily transfer limit exceeded: you can send up to LKR ',
            FORMAT(GREATEST(v_limit - v_sent_today, 0), 2), ' more today.'
        );
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = v_message;
    END IF;
END$$

-- Moves the money. Does NOT start, commit or roll back: the caller owns the transaction
-- (sp_process_transfer, or the OTP confirmation in a later migration).
DROP PROCEDURE IF EXISTS sp_transfer_internal$$
CREATE PROCEDURE sp_transfer_internal(
    IN p_sender VARCHAR(15),
    IN p_receiver VARCHAR(15),
    IN p_amount DECIMAL(14,2),
    IN p_ref VARCHAR(100),
    IN p_initiator_person_id INT,
    OUT p_txn_id BIGINT,
    OUT p_sender_balance_after DECIMAL(14,2)
)
BEGIN
    DECLARE v_sender_balance DECIMAL(14,2);
    DECLARE v_receiver_balance DECIMAL(14,2);
    DECLARE v_receiver_balance_after DECIMAL(14,2);
    DECLARE v_ref VARCHAR(100);

    SET p_txn_id = NULL;
    SET p_sender_balance_after = NULL;

    SET v_ref = NULLIF(TRIM(p_ref), '');
    IF CHAR_LENGTH(v_ref) > 50 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Reference must be at most 50 characters.';
    END IF;

    -- Locks both accounts and validates every rule.
    CALL sp_check_transfer_rules(
        p_sender, p_receiver, p_amount, p_initiator_person_id, TRUE,
        v_sender_balance, v_receiver_balance
    );

    SET p_sender_balance_after = v_sender_balance - p_amount;
    SET v_receiver_balance_after = v_receiver_balance + p_amount;

    UPDATE SAVINGS_ACCOUNT
    SET balance = p_sender_balance_after,
        last_txn_date = CURDATE()
    WHERE account_no = p_sender;

    -- The receiver's last_txn_date is intentionally left unchanged.
    UPDATE SAVINGS_ACCOUNT
    SET balance = v_receiver_balance_after
    WHERE account_no = p_receiver;

    INSERT INTO TRANSACTION_LOG (txn_type, txn_timestamp)
    VALUES ('TRANSFER', NOW());
    SET p_txn_id = LAST_INSERT_ID();

    INSERT INTO AtoA_TRANSFER_LOG (
        txn_id, sender_acc_no, receiver_acc_no, agent_person_id, amount,
        sender_balance_after, receiver_balance_after, ref_text
    ) VALUES (
        p_txn_id, p_sender, p_receiver, NULL, p_amount,
        p_sender_balance_after, v_receiver_balance_after, v_ref
    );

    -- SYSTEM_AUDIT_LOG.ip is NOT NULL; the client IP is not available at this level.
    INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip)
    VALUES (p_initiator_person_id, 'TRANSACTION', '0.0.0.0');
END$$

-- Stand-alone transfer: its own transaction around sp_transfer_internal.
-- Must not be called while a transaction is already open (START TRANSACTION would commit it).
DROP PROCEDURE IF EXISTS sp_process_transfer$$
CREATE PROCEDURE sp_process_transfer(
    IN p_sender VARCHAR(15),
    IN p_receiver VARCHAR(15),
    IN p_amount DECIMAL(14,2),
    IN p_ref VARCHAR(100),
    IN p_initiator_person_id INT,
    OUT p_txn_id BIGINT,
    OUT p_sender_balance_after DECIMAL(14,2)
)
BEGIN
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    CALL sp_transfer_internal(
        p_sender, p_receiver, p_amount, p_ref, p_initiator_person_id,
        p_txn_id, p_sender_balance_after
    );

    COMMIT;
END$$

DELIMITER ;
