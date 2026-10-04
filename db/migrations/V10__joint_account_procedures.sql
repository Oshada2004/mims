DELIMITER $$

drop PROCEDURE if EXISTS sp_add_joint_holder$$

create PROCEDURE sp_add_joint_holder(
    IN p_account_no VARCHAR(15),
    IN p_co_customer_id INT
)

BEGIN

DECLARE v_dob DATE;
DECLARE v_allows_joint BOOLEAN;
DECLARE v_status ENUM('ACTIVE','DORMANT','CLOSED');

DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

SELECT sa.status,p.allows_joint 
INTO v_status,v_allows_joint
FROM SAVINGS_ACCOUNT sa
JOIN SAV_ACC_PLAN p ON sa.plan_code=p.plan_code
WHERE sa.account_no=p_account_no;

IF v_status IS NULL THEN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Savings account does not exist.';
END IF;

IF v_status != 'ACTIVE' THEN
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account must be ACTIVE to map joint holders.';
END IF;

IF v_allows_joint IS NULL OR v_allows_joint=FALSE THEN
SIGNAL SQLSTATE '45000' 
SET MESSAGE_TEXT='Selected account plan does not permit joint ownership.';
END IF;

SELECT dob INTO v_dob FROM PERSON WHERE person_id=p_co_customer_id;
IF v_dob IS NULL THEN 
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Customer does not exist.';
END IF;

IF NOT fn_is_plan_eligible('JOINT',v_dob) THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Customer does not qualify: Joint account holders must be at least 18 years old.';
END IF;

START TRANSACTION;


INSERT INTO ACCOUNT_HOLDER(account_no,customer_person_id,holder_role) VALUES
(p_account_no,p_co_customer_id,'JOINT');

COMMIT;

END$$

DROP PROCEDURE IF EXISTS sp_reactivate_dormant_account$$

CREATE PROCEDURE sp_reactivate_dormant_account(
    IN p_account_no VARCHAR(15),
    IN p_operator_id INT
)
BEGIN
    DECLARE v_status ENUM('ACTIVE', 'DORMANT', 'CLOSED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    
    SELECT status INTO v_status 
    FROM SAVINGS_ACCOUNT 
    WHERE account_no = p_account_no;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Action Rejected: Account does not exist.';
    ELSEIF v_status != 'DORMANT' THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Action Rejected: Only DORMANT accounts can be reactivated.';
    END IF;

    
    START TRANSACTION;
        UPDATE SAVINGS_ACCOUNT 
        SET status = 'ACTIVE', last_txn_date = CURDATE() 
        WHERE account_no = p_account_no;

        INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip, timestamp)
        VALUES (p_operator_id, 'UPDATE', 'INTERNAL', NOW());
    COMMIT;
END$$




DELIMITER ;