DELIMITER $$

DROP FUNCTION IF EXISTS fn_calculate_30_day_interest$$

CREATE FUNCTION fn_calculate_30_day_interest(
    p_amount DECIMAL(14,2),
    p_annual_rate DECIMAL(5,2)
)
RETURNS DECIMAL(14,2)
DETERMINISTIC
NO SQL
BEGIN
    IF p_amount IS NULL OR p_amount < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Amount must be zero or greater.';
    END IF;

    IF p_annual_rate IS NULL OR p_annual_rate < 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Annual interest rate must be zero or greater.';
    END IF;

    RETURN ROUND(
        p_amount * (p_annual_rate/100) * (30.0/365),
        2
    );
END$$

DELIMITER ;

CREATE OR REPLACE VIEW vw_rep3_active_fd_schedules AS
SELECT
    fd_id,
    acc_no AS linked_savings_account,
    term_code,
    principal_amount,
    contracted_interest_rate,
    opened_date,
    maturity_date,
    next_accrual_date AS upcoming_payout_date,
    fn_calculate_30_day_interest(
        principal_amount,
        contracted_interest_rate
    ) AS expected_30_day_interest
FROM FIXED_DEPOSIT
WHERE status = 'ACTIVE';

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_get_active_fd_schedule$$

CREATE PROCEDURE sp_get_active_fd_schedule(
    IN p_due_by DATE
)
READS SQL DATA
BEGIN
    SELECT
        fd_id,
        linked_savings_account,
        term_code,
        principal_amount,
        contracted_interest_rate,
        opened_date,
        maturity_date,
        upcoming_payout_date,
        expected_30_day_interest
    FROM vw_rep3_active_fd_schedules
    WHERE p_due_by IS NULL
       OR upcoming_payout_date <= p_due_by
    ORDER BY upcoming_payout_date, fd_id;
END$$

DELIMITER ;