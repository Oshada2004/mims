DELIMITER $$

DROP PROCEDURE IF EXISTS sp_open_fixed_deposit$$

CREATE PROCEDURE sp_open_fixed_deposit(
    IN p_savings_acc_no VARCHAR(15),
    IN p_term_code VARCHAR(5),
    IN p_principal DECIMAL(14,2),
    IN p_agent_id INT,
    OUT p_fd_id CHAR(20)
)
BEGIN
    DECLARE v_duration_months INT DEFAULT NULL;
    DECLARE v_rate DECIMAL(5,2) DEFAULT NULL;
    DECLARE v_balance DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_min_balance DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_status VARCHAR(10) DEFAULT NULL;
    DECLARE v_account_agent_id INT DEFAULT NULL;
    DECLARE v_txn_id BIGINT;

    SET p_fd_id = NULL; -- ie no fd has been created yet

    IF p_savings_acc_no IS NULL
       OR TRIM(p_savings_acc_no) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Savings account number is required.';
    END IF;

    IF p_principal IS NULL OR p_principal <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FD principal must be greater than zero.';
    END IF;

    IF p_agent_id IS NULL OR p_agent_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A valid agent ID is required.';
    END IF;

    IF p_term_code IS NULL
       OR p_term_code NOT IN ('6M', '1Y', '3Y') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid FD term code.';
    END IF;

    SELECT duration_months, annual_interest_rate
    INTO v_duration_months, v_rate
    FROM FD_ACC_PLAN
    WHERE term_code = p_term_code;

    IF v_duration_months IS NULL OR v_rate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FD plan has not been configured.';
    END IF;

    BEGIN
    -- error handling
    -- if an sql exception occurs, rollback and throw the error again
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            RESIGNAL;
        END;

        START TRANSACTION;

        SELECT balance, contracted_min_balance, status,
               agent_person_id
        INTO v_balance, v_min_balance, v_status,
             v_account_agent_id
        FROM SAVINGS_ACCOUNT
        WHERE account_no = p_savings_acc_no
        FOR UPDATE;

        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Savings account does not exist.';
        END IF;

        IF v_status <> 'ACTIVE' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Savings account must be ACTIVE.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM STAFF_PROFILE
            WHERE person_id = p_agent_id
            AND staff_role = 'AGENT'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Provided person is not a banking agent.';
        END IF;

        IF v_account_agent_id IS NULL
        OR v_account_agent_id <> p_agent_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Agent is not assigned to this savings account.';
        END IF;

        IF fn_has_active_fd(p_savings_acc_no) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Account already has an active fixed deposit.';
        END IF;

        IF (v_balance - p_principal) < v_min_balance THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance to fund the fixed deposit.';
        END IF;

        SET p_fd_id = CONCAT(
            'FD',
            LPAD(FLOOR(RAND() * 1000000000000), 12, '0') -- gets a random number scales it up and adds zero s to left till it has 12 digits
            -- need to fix this later to avoid duplicate numbers
        );

        INSERT INTO FIXED_DEPOSIT (
            fd_id,
            active_acc_no,
            acc_no,
            term_code,
            principal_amount,
            opened_date,
            maturity_date,
            next_accrual_date,
            contracted_interest_rate,
            curr_accrual_cycle_no,
            status
        )
        VALUES (
            p_fd_id,
            p_savings_acc_no,
            p_savings_acc_no,
            p_term_code,
            p_principal,
            CURDATE(),
            DATE_ADD(CURDATE(), INTERVAL v_duration_months MONTH),
            DATE_ADD(CURDATE(), INTERVAL 30 DAY),
            v_rate,
            0,
            'ACTIVE'
        );

        INSERT INTO TRANSACTION_LOG (
            txn_type,
            txn_timestamp
        )
        VALUES (
            'DEPOSIT_WITHDRAWAL',
            NOW()
        );

        SET v_txn_id = LAST_INSERT_ID();

        INSERT INTO DEPOSIT_WITHDRAW_LOG (
            txn_id,
            txn_type,
            agent_person_id,
            sav_acc_no,
            fd_id,
            amount,
            balance_after,
            ref_text
        )
        VALUES (
            v_txn_id,
            'FD_FUNDING',
            p_agent_id,
            p_savings_acc_no,
            p_fd_id,
            p_principal,
            v_balance - p_principal,
            'Principal allocation to fixed deposit'
        );

        UPDATE SAVINGS_ACCOUNT
        SET balance = balance - p_principal,
            last_txn_date = CURDATE()
        WHERE account_no = p_savings_acc_no;

        COMMIT;
    END;
    END$$

    DELIMITER ;