DROP PROCEDURE IF EXISTS Agent_transactions_report;

DELIMITER $$
CREATE PROCEDURE Agent_transactions_report(
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
        LEFT JOIN TRANSACTION_LOG t
            ON t.agent_person_id = sp.person_id
            AND t.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
            AND t.txn_timestamp >= p_start
            AND t.txn_timestamp < DATE_ADD(p_end, INTERVAL 1 DAY)
        WHERE sp.staff_role = 'AGENT'
        GROUP BY sp.person_id, p.first_name, p.last_name, b.branch_name
        ORDER BY gross_value_lkr DESC;

END $$



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
        SIGNAL SQLSTATE '45000'
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
        JOIN TRANSACTION_LOG t ON t.sav_acc_no = sa.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
          AND t.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
          AND (p_start_date IS NULL OR t.txn_timestamp >= p_start_date)
          AND (p_end_date IS NULL OR t.txn_timestamp < DATE_ADD(p_end_date, INTERVAL 1 DAY))
    ) tx ON TRUE
    WHERE p.person_id = p_customer_id;
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vw_rep2_account_transaction_summary AS
SELECT 
    sa.account_no,
    sa.plan_code,
    sap.plan_name,
    COALESCE(h.holder_names, 'N/A') AS holder_names,
    sa.balance AS current_balance,
    COALESCE(t.total_deposits, 0.00) AS total_deposits,
    COALESCE(t.total_withdrawals, 0.00) AS total_withdrawals,
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
        SUM(CASE WHEN txn_type IN ('SAVINGS_INTEREST', 'FD_INTEREST') THEN amount ELSE 0.00 END) AS total_interest_credited,
        MAX(DATE(txn_timestamp)) AS last_txn_date
    FROM TRANSACTION_LOG
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








