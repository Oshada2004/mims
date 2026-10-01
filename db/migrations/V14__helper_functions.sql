DELIMITER $$

DROP FUNCTION IF EXISTS get_person_by_id$$
CREATE FUNCTION get_person_by_id(p_person_id INT)
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_res JSON;
    SELECT JSON_OBJECT(
        'person_id', person_id,
        'first_name', first_name,
        'last_name', last_name,
        'dob', dob,
        'phone_number', phone_number,
        'address', address,
        'postal_code', postal_code,
        'person_role', person_role
    ) INTO v_res
    FROM PERSON
    WHERE person_id = p_person_id;
    RETURN v_res;
END $$

DROP FUNCTION IF EXISTS check_fd_existence$$
CREATE FUNCTION check_fd_existence(p_active_acc_no VARCHAR(15))
RETURNS TINYINT(1)
READS SQL DATA
BEGIN
    DECLARE fd_exists TINYINT(1);

    SELECT EXISTS(
        SELECT 1 
        FROM FIXED_DEPOSIT 
        WHERE active_acc_no = p_active_acc_no AND 
        status = 'ACTIVE'
    ) INTO fd_exists;

    RETURN fd_exists;
END $$

DROP PROCEDURE IF EXISTS customer_active_accounts$$
CREATE PROCEDURE customer_active_accounts (
    IN p_person_id INT
)
BEGIN
    SELECT 
        sa.account_no,
        sa.branch_id,
        sa.agent_person_id, 
        sa.plan_code,
        sa.opened_date AS savings_opened_date,
        fd.fd_id,
        fd.principal_amount,
        fd.term_code,
        fd.opened_date AS fd_opened_date
    FROM ACCOUNT_HOLDER ah 
    JOIN SAVINGS_ACCOUNT sa ON ah.account_no = sa.account_no 
    LEFT JOIN FIXED_DEPOSIT fd ON sa.account_no = fd.active_acc_no AND fd.status = 'ACTIVE'
    WHERE ah.customer_person_id = p_person_id 
      AND sa.status = 'ACTIVE';
END $$

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_close_savings_account$$

CREATE PROCEDURE sp_close_savings_account(
    IN p_account_no VARCHAR(15),
    IN p_operator_id INT
)
BEGIN
    DECLARE v_balance DECIMAL(14,2);
    DECLARE v_status ENUM('ACTIVE', 'DORMANT', 'CLOSED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT balance, status 
    INTO v_balance, v_status 
    FROM SAVINGS_ACCOUNT 
    WHERE account_no = p_account_no;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Closure Rejected: Account does not exist.';
    ELSEIF v_status = 'CLOSED' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Closure Rejected: Account is already closed.';
    ELSEIF check_fd_existence(p_account_no) = 1 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Closure Rejected: Account has an active fixed deposit.';
    ELSEIF v_balance > 0.00 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Closure Rejected: Account balance must be zero before closing.';
    END IF;

    START TRANSACTION;
        UPDATE SAVINGS_ACCOUNT 
        SET status = 'CLOSED', closed_date = CURDATE() 
        WHERE account_no = p_account_no;

        INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip, timestamp)
        VALUES (p_operator_id, 'UPDATE', 'INTERNAL', NOW());
    COMMIT;
END$$

DELIMITER ;
