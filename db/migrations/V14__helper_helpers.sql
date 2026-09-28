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
        fd.fd_id AS "Fixed Deposit ID",
        fd.principal_amount,
        fd.term_code,
        fd.opened_date AS fd_opened_date
    FROM ACCOUNT_HOLDER ah 
    JOIN SAVINGS_ACCOUNT sa ON ah.account_no = sa.account_no 
    LEFT JOIN FIXED_DEPOSIT fd ON sa.account_no = fd.active_acc_no AND fd.status = 'ACTIVE'
    WHERE ah.customer_person_id = p_person_id 
      AND sa.status = 'ACTIVE';
END $$

DELIMITER ;