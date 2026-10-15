-- Reports. TRANSACTION_LOG is a parent table (txn_id, txn_type, txn_timestamp); the amounts and
-- accounts live in DEPOSIT_WITHDRAW_LOG, INTEREST_LOG and AtoA_TRANSFER_LOG (see V2).

DROP PROCEDURE IF EXISTS Agent_transactions_report;
DROP PROCEDURE IF EXISTS sp_agent_transactions_report;

DELIMITER $$

-- Report 1: agent-assisted deposits and withdrawals per agent between two dates.
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
        COUNT(dw.txn_id) AS total_transactions,
        COALESCE(SUM(dw.amount), 0) AS gross_value_lkr,
        COALESCE(SUM(CASE WHEN dw.txn_type = 'WITHDRAWAL' THEN -dw.amount ELSE dw.amount END), 0) AS net_value_lkr
    FROM STAFF_PROFILE sp
    JOIN PERSON p ON p.person_id = sp.person_id
    JOIN BRANCH b ON b.branch_id = sp.branch_id
    LEFT JOIN (
        SELECT d.txn_id, d.txn_type, d.agent_person_id, d.amount
        FROM DEPOSIT_WITHDRAW_LOG d
        JOIN TRANSACTION_LOG t ON t.txn_id = d.txn_id
        WHERE d.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
          AND t.txn_timestamp >= p_start
          AND t.txn_timestamp < DATE_ADD(p_end, INTERVAL 1 DAY)
    ) dw ON dw.agent_person_id = sp.person_id
    WHERE sp.staff_role = 'AGENT'
    GROUP BY sp.person_id, p.first_name, p.last_name, b.branch_name
    ORDER BY gross_value_lkr DESC;
END$$

DROP PROCEDURE IF EXISTS sp_get_customer_activity_report$$

-- Report: one customer's open accounts, deposits/withdrawals (optionally between dates) and FD status.
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
            SUM(CASE WHEN dw.txn_type = 'DEPOSIT' THEN dw.amount END) AS total_deposits,
            SUM(CASE WHEN dw.txn_type = 'WITHDRAWAL' THEN dw.amount END) AS total_withdrawals
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        JOIN DEPOSIT_WITHDRAW_LOG dw ON dw.sav_acc_no = sa.account_no
        JOIN TRANSACTION_LOG t ON t.txn_id = dw.txn_id
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
          AND dw.txn_type IN ('DEPOSIT', 'WITHDRAWAL')
          AND (p_start_date IS NULL OR t.txn_timestamp >= p_start_date)
          AND (p_end_date IS NULL OR t.txn_timestamp < DATE_ADD(p_end_date, INTERVAL 1 DAY))
    ) tx ON TRUE
    WHERE p.person_id = p_customer_id;
END$$

DELIMITER ;

-- Report 2: per savings account totals and current balance.
-- Every movement of a savings account becomes one row: deposits/withdrawals (FD funding and
-- principal returns only count towards transaction_count), interest credited to the account,
-- and transfers in/out.
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
    sa.opened_date,
    COALESCE(t.total_transfers_in, 0.00) AS total_transfers_in,
    COALESCE(t.total_transfers_out, 0.00) AS total_transfers_out
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
        m.account_no,
        COUNT(*) AS transaction_count,
        SUM(m.deposit) AS total_deposits,
        SUM(m.withdrawal) AS total_withdrawals,
        SUM(m.interest) AS total_interest_credited,
        SUM(m.transfer_in) AS total_transfers_in,
        SUM(m.transfer_out) AS total_transfers_out,
        MAX(DATE(tl.txn_timestamp)) AS last_txn_date
    FROM (
        SELECT dw.sav_acc_no AS account_no, dw.txn_id,
               CASE WHEN dw.txn_type = 'DEPOSIT' THEN dw.amount ELSE 0.00 END AS deposit,
               CASE WHEN dw.txn_type = 'WITHDRAWAL' THEN dw.amount ELSE 0.00 END AS withdrawal,
               0.00 AS interest, 0.00 AS transfer_in, 0.00 AS transfer_out
        FROM DEPOSIT_WITHDRAW_LOG dw
        WHERE dw.sav_acc_no IS NOT NULL
        UNION ALL
        SELECT il.sav_acc_no, il.txn_id, 0.00, 0.00, il.amount, 0.00, 0.00
        FROM INTEREST_LOG il
        WHERE il.sav_acc_no IS NOT NULL
        UNION ALL
        SELECT a.receiver_acc_no, a.txn_id, 0.00, 0.00, 0.00, a.amount, 0.00
        FROM AtoA_TRANSFER_LOG a
        WHERE a.receiver_acc_no IS NOT NULL
        UNION ALL
        SELECT a.sender_acc_no, a.txn_id, 0.00, 0.00, 0.00, 0.00, a.amount
        FROM AtoA_TRANSFER_LOG a
        WHERE a.sender_acc_no IS NOT NULL
    ) m
    JOIN TRANSACTION_LOG tl ON tl.txn_id = m.txn_id
    GROUP BY m.account_no
) t ON sa.account_no = t.account_no;

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
        opened_date,
        total_transfers_in,
        total_transfers_out
    FROM vw_rep2_account_transaction_summary
    WHERE (p_plan_code IS NULL OR plan_code = p_plan_code)
      AND (p_account_status IS NULL OR account_status = p_account_status)
    ORDER BY account_no ASC;
END$$

DELIMITER ;

-- Report 4: interest credited per month and savings plan (savings interest, and FD interest which
-- is paid into the linked savings account).
CREATE OR REPLACE VIEW vw_rep4_monthly_interest_distribution AS
SELECT
    YEAR(t.txn_timestamp) AS txn_year,
    MONTH(t.txn_timestamp) AS txn_month,
    DATE_FORMAT(t.txn_timestamp, '%Y-%m') AS year_month_label,
    DATE_FORMAT(t.txn_timestamp, '%M %Y') AS month_year_name,
    sa.plan_code,
    sap.plan_name AS account_type,
    COUNT(DISTINCT il.sav_acc_no) AS accounts_receiving_interest,
    COUNT(il.txn_id) AS total_interest_payouts,
    COALESCE(SUM(CASE WHEN il.account_type = 'SAVINGS' THEN il.amount ELSE 0.00 END), 0.00) AS total_savings_interest,
    COALESCE(SUM(CASE WHEN il.account_type = 'FIXED' THEN il.amount ELSE 0.00 END), 0.00) AS total_fd_interest,
    COALESCE(SUM(il.amount), 0.00) AS total_interest_paid
FROM INTEREST_LOG il
JOIN TRANSACTION_LOG t
    ON t.txn_id = il.txn_id
JOIN SAVINGS_ACCOUNT sa
    ON il.sav_acc_no = sa.account_no
JOIN SAV_ACC_PLAN sap
    ON sa.plan_code = sap.plan_code
GROUP BY
    YEAR(t.txn_timestamp),
    MONTH(t.txn_timestamp),
    DATE_FORMAT(t.txn_timestamp, '%Y-%m'),
    DATE_FORMAT(t.txn_timestamp, '%M %Y'),
    sa.plan_code,
    sap.plan_name;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_monthly_interest_distribution$$

CREATE PROCEDURE sp_get_monthly_interest_distribution(
    IN p_year INT,
    IN p_month INT,
    IN p_plan_code VARCHAR(10)
)
READS SQL DATA
BEGIN
    SELECT
        txn_year,
        txn_month,
        year_month_label,
        month_year_name,
        plan_code,
        account_type,
        accounts_receiving_interest,
        total_interest_payouts,
        total_savings_interest,
        total_fd_interest,
        total_interest_paid
    FROM vw_rep4_monthly_interest_distribution
    WHERE (p_year IS NULL OR txn_year = p_year)
      AND (p_month IS NULL OR txn_month = p_month)
      AND (p_plan_code IS NULL OR plan_code = p_plan_code)
    ORDER BY
        txn_year DESC,
        txn_month DESC,
        plan_code ASC;
END$$

DELIMITER ;
