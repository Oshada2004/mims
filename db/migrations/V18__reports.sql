CREATE OR REPLACE VIEW vw_rep4_monthly_interest_distribution AS
SELECT
    YEAR(t.txn_timestamp) AS txn_year,
    MONTH(t.txn_timestamp) AS txn_month,
    DATE_FORMAT(t.txn_timestamp, '%Y-%m') AS year_month_label,
    DATE_FORMAT(t.txn_timestamp, '%M %Y') AS month_year_name,
    sa.plan_code,
    sap.plan_name AS account_type,
    COUNT(DISTINCT COALESCE(i.sav_acc_no, f.acc_no)) AS accounts_receiving_interest,
    COUNT(i.txn_id) AS total_interest_payouts,
    COALESCE(SUM(CASE WHEN i.account_type = 'SAVINGS' THEN i.amount ELSE 0.00 END), 0.00) AS total_savings_interest,
    COALESCE(SUM(CASE WHEN i.account_type = 'FIXED'   THEN i.amount ELSE 0.00 END), 0.00) AS total_fd_interest,
    COALESCE(SUM(i.amount), 0.00) AS total_interest_paid
FROM INTEREST_LOG i
JOIN TRANSACTION_LOG t 
    ON t.txn_id = i.txn_id
LEFT JOIN FIXED_DEPOSIT f 
    ON f.fd_id = i.fd_id AND i.account_type = 'FIXED'
JOIN SAVINGS_ACCOUNT sa 
    ON sa.account_no = COALESCE(i.sav_acc_no, f.acc_no)
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



DROP PROCEDURE IF EXISTS GetAgentTransactionSummary$$

CREATE PROCEDURE GetAgentTransactionSummary()
BEGIN
    SELECT 
        p.person_id AS agent_id,
        p.first_name,
        p.last_name,
        COUNT(t.txn_id) AS total_transactions,
        SUM(t.amount) AS total_value
    FROM PERSON p
    JOIN (
        SELECT txn_id, agent_person_id, amount 
        FROM DEPOSIT_WITHDRAW_LOG 
        WHERE agent_person_id IS NOT NULL
        UNION ALL
        SELECT txn_id, agent_person_id, amount 
        FROM AtoA_TRANSFER_LOG 
        WHERE agent_person_id IS NOT NULL
    ) t ON p.person_id = t.agent_person_id
    GROUP BY 
        p.person_id, 
        p.first_name, 
        p.last_name
    ORDER BY 
        total_value DESC;
END$$

DROP PROCEDURE IF EXISTS sp_account_transaction_summary$$

CREATE PROCEDURE sp_account_transaction_summary(
    IN p_account_no VARCHAR(15),
    IN p_from_date  DATE,
    IN p_to_date    DATE
)
READS SQL DATA
BEGIN
    IF p_account_no IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM SAVINGS_ACCOUNT WHERE account_no = p_account_no) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Account not found';
    END IF;

    SELECT
        sa.account_no,
        sa.plan_code,
        sa.status,
        sa.balance AS current_balance,
        COUNT(m.kind) AS txn_count,
        COALESCE(SUM(CASE WHEN m.kind = 'DEPOSIT'      THEN m.amount END), 0) AS total_deposits,
        COALESCE(SUM(CASE WHEN m.kind = 'WITHDRAWAL'   THEN m.amount END), 0) AS total_withdrawals,
        COALESCE(SUM(CASE WHEN m.kind = 'INTEREST'     THEN m.amount END), 0) AS total_savings_interest,
        COALESCE(SUM(CASE WHEN m.kind = 'FD_INTEREST'  THEN m.amount END), 0) AS total_fd_interest,
        COALESCE(SUM(CASE WHEN m.kind = 'TRANSFER_IN'  THEN m.amount END), 0) AS total_transfers_in,
        COALESCE(SUM(CASE WHEN m.kind = 'TRANSFER_OUT' THEN m.amount END), 0) AS total_transfers_out,
        COALESCE(SUM(CASE WHEN m.kind IN ('DEPOSIT','INTEREST','FD_INTEREST','TRANSFER_IN')
                          THEN m.amount
                          WHEN m.kind IN ('WITHDRAWAL','TRANSFER_OUT')
                          THEN -m.amount END), 0) AS net_change
    FROM SAVINGS_ACCOUNT sa
    LEFT JOIN (
        SELECT d.sav_acc_no AS acc, d.txn_type AS kind, d.amount, t.txn_timestamp AS ts
        FROM DEPOSIT_WITHDRAW_LOG d
        JOIN TRANSACTION_LOG t ON t.txn_id = d.txn_id

        UNION ALL
        SELECT i.sav_acc_no, 'INTEREST', i.amount, t.txn_timestamp
        FROM INTEREST_LOG i
        JOIN TRANSACTION_LOG t ON t.txn_id = i.txn_id
        WHERE i.account_type = 'SAVINGS'

        UNION ALL
        SELECT f.acc_no, 'FD_INTEREST', i.amount, t.txn_timestamp
        FROM INTEREST_LOG i
        JOIN TRANSACTION_LOG t ON t.txn_id = i.txn_id
        JOIN FIXED_DEPOSIT f   ON f.fd_id = i.fd_id
        WHERE i.account_type = 'FIXED'

        UNION ALL
        SELECT a.sender_acc_no, 'TRANSFER_OUT', a.amount, t.txn_timestamp
        FROM AtoA_TRANSFER_LOG a
        JOIN TRANSACTION_LOG t ON t.txn_id = a.txn_id

        UNION ALL
        SELECT a.receiver_acc_no, 'TRANSFER_IN', a.amount, t.txn_timestamp
        FROM AtoA_TRANSFER_LOG a
        JOIN TRANSACTION_LOG t ON t.txn_id = a.txn_id
    ) m
      ON m.acc = sa.account_no
     AND (p_from_date IS NULL OR m.ts >= p_from_date)
     AND (p_to_date   IS NULL OR m.ts <  p_to_date + INTERVAL 1 DAY)
    WHERE p_account_no IS NULL OR sa.account_no = p_account_no
    GROUP BY sa.account_no, sa.plan_code, sa.status, sa.balance
    ORDER BY sa.account_no;
END$$

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
        SIGNAL SQLSTATE '45404' SET MESSAGE_TEXT = 'Customer does not exist.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Customer has no open accounts.';
    END IF;

    SELECT
        p.person_id AS customer_id,
        CONCAT(p.first_name, ' ', p.last_name) AS customer_name,
        b.branch_name,
        CONCAT(ap.first_name, ' ', ap.last_name) AS agent_name,
        acc.number_of_accounts,
        COALESCE(tx.total_deposits, 0.00) AS total_deposits,
        COALESCE(tx.total_withdrawals, 0.00) AS total_withdrawals,
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
            COALESCE(SUM(sa.balance), 0.00) AS net_balance
        FROM ACCOUNT_HOLDER ah
        JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
        WHERE ah.customer_person_id = p_customer_id
          AND sa.status <> 'CLOSED'
    ) acc
    LEFT JOIN (
        SELECT
            COALESCE(SUM(t.deposit_amt), 0.00) AS total_deposits,
            COALESCE(SUM(t.withdraw_amt), 0.00) AS total_withdrawals
        FROM (
            SELECT dw.amount AS deposit_amt, 0.00 AS withdraw_amt, tl.txn_timestamp
            FROM DEPOSIT_WITHDRAW_LOG dw
            JOIN TRANSACTION_LOG tl ON dw.txn_id = tl.txn_id
            JOIN ACCOUNT_HOLDER ah ON ah.account_no = dw.sav_acc_no
            JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
            WHERE ah.customer_person_id = p_customer_id
              AND sa.status <> 'CLOSED'
              AND dw.txn_type = 'DEPOSIT'

            UNION ALL

            SELECT 0.00 AS deposit_amt, dw.amount AS withdraw_amt, tl.txn_timestamp
            FROM DEPOSIT_WITHDRAW_LOG dw
            JOIN TRANSACTION_LOG tl ON dw.txn_id = tl.txn_id
            JOIN ACCOUNT_HOLDER ah ON ah.account_no = dw.sav_acc_no
            JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
            WHERE ah.customer_person_id = p_customer_id
              AND sa.status <> 'CLOSED'
              AND dw.txn_type = 'WITHDRAWAL'

            UNION ALL

            SELECT a2a.amount AS deposit_amt, 0.00 AS withdraw_amt, tl.txn_timestamp
            FROM AtoA_TRANSFER_LOG a2a
            JOIN TRANSACTION_LOG tl ON a2a.txn_id = tl.txn_id
            JOIN ACCOUNT_HOLDER ah ON ah.account_no = a2a.receiver_acc_no
            JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
            WHERE ah.customer_person_id = p_customer_id
              AND sa.status <> 'CLOSED'

            UNION ALL

            SELECT 0.00 AS deposit_amt, a2a.amount AS withdraw_amt, tl.txn_timestamp
            FROM AtoA_TRANSFER_LOG a2a
            JOIN TRANSACTION_LOG tl ON a2a.txn_id = tl.txn_id
            JOIN ACCOUNT_HOLDER ah ON ah.account_no = a2a.sender_acc_no
            JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
            WHERE ah.customer_person_id = p_customer_id
              AND sa.status <> 'CLOSED'

            UNION ALL

            SELECT i.amount AS deposit_amt, 0.00 AS withdraw_amt, tl.txn_timestamp
            FROM INTEREST_LOG i
            JOIN TRANSACTION_LOG tl ON i.txn_id = tl.txn_id
            JOIN ACCOUNT_HOLDER ah ON ah.account_no = i.sav_acc_no
            JOIN SAVINGS_ACCOUNT sa ON sa.account_no = ah.account_no
            WHERE ah.customer_person_id = p_customer_id
              AND sa.status <> 'CLOSED'
              AND i.sav_acc_no IS NOT NULL
        ) t
        WHERE (p_start_date IS NULL OR t.txn_timestamp >= p_start_date)
          AND (p_end_date   IS NULL OR t.txn_timestamp <  p_end_date + INTERVAL 1 DAY)
    ) tx ON TRUE
    WHERE p.person_id = p_customer_id;
END$$

DELIMITER ;

