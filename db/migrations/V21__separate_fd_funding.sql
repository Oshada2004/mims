ALTER TABLE TRANSACTION_LOG
MODIFY COLUMN txn_type ENUM(
    'DEPOSIT',
    'WITHDRAWAL',
    'SAVINGS_INTEREST',
    'FD_INTEREST',
    'FD_FUNDING'
) NOT NULL;

DELIMITER $$

DROP TRIGGER IF EXISTS trg_before_insert_transaction_log$$

CREATE TRIGGER trg_before_insert_transaction_log
BEFORE INSERT ON TRANSACTION_LOG
FOR EACH ROW
BEGIN
    DECLARE v_curr_bal DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_min_bal DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_status VARCHAR(10) DEFAULT NULL;

    IF NEW.amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Transaction amount must be greater than zero.';
    END IF;

    IF NEW.txn_type IN ('WITHDRAWAL', 'FD_FUNDING') THEN
        IF NEW.sav_acc_no IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Debit transactions must reference a savings account.';
        END IF;

        SELECT balance, contracted_min_balance, status
        INTO v_curr_bal, v_min_bal, v_status
        FROM SAVINGS_ACCOUNT
        WHERE account_no = NEW.sav_acc_no;

        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Referenced savings account does not exist.';
        END IF;

        IF v_status = 'DORMANT' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Account is DORMANT. Agent reactivation required.';
        ELSEIF v_status = 'CLOSED' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot debit a CLOSED account.';
        END IF;

        IF (v_curr_bal - NEW.amount) < v_min_bal THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Transaction breaches the contracted minimum balance.';
        END IF;
    END IF;
END$$

DELIMITER ;

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
    DECLARE v_attempts INT DEFAULT 0;
    DECLARE v_duplicate BOOLEAN DEFAULT FALSE;
    DECLARE v_candidate_id CHAR(20);
    DECLARE v_existing_fd_id CHAR(20) DEFAULT NULL;

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
    -- if an sql exception occurs rollback and throw the error again
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

        fd_id_retry: LOOP -- creating a unique id for fd
            SET v_attempts = v_attempts + 1;
            SET v_duplicate = FALSE;

            SET v_candidate_id = CONCAT(
                'FD',
                LPAD(UNIX_TIMESTAMP(), 10, '0'),
                LPAD(FLOOR(RAND() * 100000000), 8, '0')
            );

            BEGIN
                DECLARE CONTINUE HANDLER FOR 1062 -- duplicate key error
                    SET v_duplicate = TRUE;

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
                    v_candidate_id,
                    p_savings_acc_no,
                    p_savings_acc_no,
                    p_term_code,
                    p_principal,
                    CURDATE(),
                    DATE_ADD(
                        CURDATE(),
                        INTERVAL v_duration_months MONTH
                    ),
                    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
                    v_rate,
                    0,
                    'ACTIVE'
                );
            END;

            IF NOT v_duplicate THEN
                SET p_fd_id = v_candidate_id;
                LEAVE fd_id_retry;
            END IF;

           
            SET v_existing_fd_id = NULL;

            BEGIN
                DECLARE CONTINUE HANDLER FOR NOT FOUND
                    SET v_existing_fd_id = NULL;

                SELECT fd_id
                INTO v_existing_fd_id
                FROM FIXED_DEPOSIT
                WHERE active_acc_no = p_savings_acc_no
                FOR UPDATE;
            END;

            IF v_existing_fd_id IS NOT NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Account already has an active fixed deposit.';
            END IF;

            IF v_attempts >= 5 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Could not allocate an FD ID after 5 attempts. Retry.';
            END IF;

        END LOOP fd_id_retry;
        INSERT INTO TRANSACTION_LOG (
            sav_acc_no,
            agent_person_id,
            fd_id,
            txn_type,
            amount,
            balance_after,
            ref_text,
            txn_timestamp
        )
        VALUES (
            p_savings_acc_no,
            p_agent_id,
            p_fd_id,
            'FD_FUNDING',
            p_principal,
            v_balance - p_principal,
            'Principal allocation to fixed deposit',
            NOW()
        );

        UPDATE SAVINGS_ACCOUNT
        SET balance = balance - p_principal,
            last_txn_date = CURDATE()
        WHERE account_no = p_savings_acc_no;

        COMMIT;
    END;
    END$$

    DELIMITER ;

    DELIMITER $$

DROP FUNCTION IF EXISTS fn_get_agent_daily_withdrawn$$

CREATE FUNCTION fn_get_agent_daily_withdrawn(
    p_account_no VARCHAR(15)
)
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);

    SELECT COALESCE(SUM(amount), 0.00)
    INTO v_total
    FROM TRANSACTION_LOG
    WHERE sav_acc_no = p_account_no
      AND txn_type = 'WITHDRAWAL'
      AND DATE(txn_timestamp) = CURDATE()
      AND agent_person_id IS NOT NULL
      AND NOT (
          fd_id IS NOT NULL
          AND (
              ref_text <=> 'Principal allocation to fixed deposit'
          )
      );

    RETURN v_total;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vw_classified_transaction_log AS
SELECT
    txn_id,
    sav_acc_no,
    agent_person_id,
    fd_id,
    CASE
        WHEN txn_type = 'WITHDRAWAL'
             AND fd_id IS NOT NULL
             AND (
                 ref_text <=> 'Principal allocation to fixed deposit'
             )
        THEN 'FD_FUNDING'
        ELSE txn_type
    END AS txn_type,
    amount,
    balance_after,
    ref_text,
    txn_timestamp
FROM TRANSACTION_LOG;

CREATE OR REPLACE VIEW vw_rep2_account_transaction_summary AS
SELECT 
    sa.account_no,
    sa.plan_code,
    sap.plan_name,
    COALESCE(h.holder_names, 'N/A') AS holder_names,
    sa.balance AS current_balance,
    COALESCE(t.total_deposits, 0.00) AS total_deposits,
    COALESCE(t.total_withdrawals, 0.00) AS total_withdrawals,
    COALESCE(t.total_fd_funding, 0.00) AS total_fd_funding,
    COALESCE(t.total_interest_credited, 0.00) AS total_interest_credited,
    COALESCE(t.transaction_count, 0) AS transaction_count,
    COALESCE(t.last_txn_date, sa.last_txn_date) AS last_transaction_date,
    sa.status AS account_status,
    sa.opened_date
FROM SAVINGS_ACCOUNT sa
JOIN SAV_ACC_PLAN sap 
    ON sa.plan_code = sap.plan_code
LEFT JOIN (
    SELECT 
        ah.account_no,
        GROUP_CONCAT(
            CONCAT(p.first_name, ' ', p.last_name)
            ORDER BY 
                CASE ah.holder_role 
                    WHEN 'PRIMARY' THEN 1 
                    WHEN 'JOINT' THEN 2 
                    ELSE 3 
                END, 
                p.person_id 
            SEPARATOR ', '
        ) AS holder_names
    FROM ACCOUNT_HOLDER ah
    JOIN PERSON p 
        ON ah.customer_person_id = p.person_id
    GROUP BY ah.account_no
) h ON sa.account_no = h.account_no
LEFT JOIN (
    SELECT 
        sav_acc_no,
        COUNT(txn_id) AS transaction_count,
        SUM(CASE WHEN txn_type = 'DEPOSIT' THEN amount ELSE 0.00 END) AS total_deposits,
        SUM(CASE WHEN txn_type = 'WITHDRAWAL' THEN amount ELSE 0.00 END) AS total_withdrawals,
        SUM(CASE WHEN txn_type = 'FD_FUNDING' THEN amount ELSE 0.00 END) AS total_fd_funding,
        SUM(CASE WHEN txn_type IN ('SAVINGS_INTEREST', 'FD_INTEREST') THEN amount ELSE 0.00 END) AS total_interest_credited,
        MAX(DATE(txn_timestamp)) AS last_txn_date
    FROM vw_classified_transaction_log
    WHERE sav_acc_no IS NOT NULL
    GROUP BY sav_acc_no
) t ON sa.account_no = t.sav_acc_no;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_account_transaction_summary$$

CREATE PROCEDURE sp_get_account_transaction_summary(
    IN p_plan_code VARCHAR(10),
    IN p_account_status VARCHAR(10)
)
READS SQL DATA
BEGIN
    SELECT
        account_no,
        plan_code,
        plan_name,
        holder_names,
        current_balance,
        total_deposits,
        total_withdrawals,
        total_fd_funding,
        total_interest_credited,
        transaction_count,
        last_transaction_date,
        account_status,
        opened_date
    FROM vw_rep2_account_transaction_summary
    WHERE (p_plan_code IS NULL OR plan_code = p_plan_code)
      AND (p_account_status IS NULL OR account_status = p_account_status)
    ORDER BY account_no ASC;
END$$

DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_agent_transactions_report$$

CREATE PROCEDURE sp_agent_transactions_report(
    IN p_start DATE,
    IN p_end DATE
)
READS SQL DATA
BEGIN
    SELECT
        sp.person_id AS agent_id,
        CONCAT(p.first_name, ' ', p.last_name) AS agent_name,
        b.branch_name,
        COUNT(t.txn_id) AS total_transactions,
        COALESCE(SUM(ABS(t.amount)), 0) AS gross_value_lkr,
        COALESCE(SUM(CASE WHEN t.txn_type = 'WITHDRAWAL' THEN -ABS(t.amount) ELSE ABS(t.amount)END), 0)
        AS net_value_lkr FROM STAFF_PROFILE sp
        JOIN PERSON p ON p.person_id = sp.person_id
        JOIN BRANCH b ON b.branch_id = sp.branch_id
        LEFT JOIN vw_classified_transaction_log t
            ON t.agent_person_id = sp.person_id
            AND t.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
            AND t.txn_timestamp >= p_start
            AND t.txn_timestamp < DATE_ADD(p_end, INTERVAL 1 DAY)
        WHERE sp.staff_role = 'AGENT'
        GROUP BY sp.person_id, p.first_name, p.last_name, b.branch_name
        ORDER BY gross_value_lkr DESC;

END $$
DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_customer_activity_report$$

CREATE PROCEDURE sp_get_customer_activity_report(
    IN p_customer_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
READS SQL DATA
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM ADULT_CUSTOMER_PROFILE WHERE person_id = p_customer_id
        UNION ALL
        SELECT 1 FROM MINOR_CUSTOMER_PROFILE WHERE person_id = p_customer_id
    ) THEN
        SIGNAL SQLSTATE '45404'
        SET MESSAGE_TEXT = 'Customer does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
    ) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Customer has no open accounts.';
    END IF;

    SELECT
        p.person_id AS customer_id,
        CONCAT(p.first_name, ' ', p.last_name) AS customer_name,
        b.branch_name,
        CONCAT(ap.first_name, ' ', ap.last_name) AS agent_name,
        acc.number_of_accounts,
        COALESCE(tx.total_deposits, 0) AS total_deposits,
        COALESCE(tx.total_withdrawals, 0) AS total_withdrawals,
        acc.net_balance,
        CASE WHEN EXISTS (
            SELECT 1
            FROM FIXED_DEPOSIT fd
            JOIN ACCOUNT_HOLDER ah2 ON ah2.account_no = fd.acc_no
            WHERE ah2.customer_person_id = p_customer_id
              AND fd.status = 'ACTIVE'
        ) THEN 'YES' ELSE 'NO' END AS has_active_fd
    FROM PERSON p
    LEFT JOIN ADULT_CUSTOMER_PROFILE acp ON acp.person_id = p.person_id
    LEFT JOIN MINOR_CUSTOMER_PROFILE mcp ON mcp.person_id = p.person_id
    LEFT JOIN PERSON ap ON ap.person_id = COALESCE(acp.agent_person_id, mcp.agent_person_id)
    LEFT JOIN STAFF_PROFILE sp ON sp.person_id = ap.person_id
    LEFT JOIN BRANCH b ON b.branch_id = sp.branch_id
    JOIN (
        SELECT
            COUNT(*) AS number_of_accounts,
            COALESCE(SUM(sa.balance), 0) AS net_balance
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
    ) acc
    LEFT JOIN (
        SELECT
            SUM(CASE WHEN t.txn_type = 'DEPOSIT' THEN ABS(t.amount) END) AS total_deposits,
            SUM(CASE WHEN t.txn_type = 'WITHDRAWAL' THEN ABS(t.amount) END) AS total_withdrawals
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        JOIN vw_classified_transaction_log t ON t.sav_acc_no = sa.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
          AND t.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
          AND (p_start_date IS NULL OR t.txn_timestamp >= p_start_date)
          AND (p_end_date IS NULL OR t.txn_timestamp < DATE_ADD(p_end_date, INTERVAL 1 DAY))
    ) tx ON TRUE
    WHERE p.person_id = p_customer_id;
END$$
DELIMITER ;