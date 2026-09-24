DELIMITER $$

-- procedure to create staff
DROP PROCEDURE IF EXISTS sp_create_staff$$
CREATE PROCEDURE sp_create_staff(
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_dob DATE,
    IN p_nic VARCHAR(12),
    IN p_phone_number VARCHAR(12),
    IN p_address VARCHAR(100),
    IN p_postal_code VARCHAR(6),
    IN p_staff_role ENUM('MANAGER','CASHIER','OFFICER','AGENT','ADMIN'),
    IN p_branch_id INT,
    IN p_department ENUM('OPERATIONS','CREDIT','IT','CUSTOMER_SERVICE'),
    IN p_salary DECIMAL(12,2)
)
BEGIN
    DECLARE v_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION; -- treats both inserts as one transaction

    INSERT INTO PERSON(first_name,last_name,dob,nic,phone_number,address,postal_code)
    VALUES(p_first_name,p_last_name,p_dob,p_nic,p_phone_number,p_address,p_postal_code);
    SET v_person_id=LAST_INSERT_ID();
    INSERT INTO STAFF_PROFILE(person_id,staff_role,branch_id,department,salary)
    VALUES(v_person_id,p_staff_role,p_branch_id,p_department,p_salary);

    COMMIT;  -- end transaction. if failed, rollback

    SELECT v_person_id AS person_id;
END$$


DROP PROCEDURE IF EXISTS sp_create_adult_customer$$
CREATE PROCEDURE sp_create_adult_customer(
    IN p_first_name VARCHAR(100),
    IN p_last_name VARCHAR(100),
    IN p_dob DATE,
    IN p_phone_number VARCHAR(12),
    IN p_address VARCHAR(100),
    IN p_postal_code VARCHAR(6),
    IN p_nic VARCHAR(12),
    IN p_tax_id VARCHAR(20),
    IN p_agent_person_id INT,
    IN p_occupation VARCHAR(50),
    IN p_monthly_income DECIMAL(12,2)
)
BEGIN
    DECLARE v_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION; -- treats both inserts as one transaction

    INSERT INTO PERSON(first_name,last_name,dob,nic,phone_number,address,postal_code)
    VALUES(p_first_name,p_last_name,p_dob,p_nic,p_phone_number,p_address,p_postal_code);
    SET v_person_id=LAST_INSERT_ID();
    INSERT INTO ADULT_CUSTOMER_PROFILE(person_id,tax_id,agent_person_id,occupation,monthly_income)
    VALUES(v_person_id,p_tax_id,p_agent_person_id,p_occupation,p_monthly_income);

    COMMIT;  -- end transaction. if failed, rollback

    SELECT v_person_id AS person_id;
END$$


DROP PROCEDURE IF EXISTS sp_create_minor_with_new_guardian$$
CREATE PROCEDURE sp_create_minor_with_new_guardian(
    IN p_minor_first_name VARCHAR(100),
    IN p_minor_last_name VARCHAR(100),
    IN p_minor_dob DATE,
    IN p_minor_phone_number VARCHAR(12),
    IN p_minor_address VARCHAR(100),
    IN p_minor_postal_code VARCHAR(6),
    IN p_birth_cert_no VARCHAR(12),

    IN p_guardian_first_name VARCHAR(100),
    IN p_guardian_last_name VARCHAR(100),
    IN p_guardian_dob DATE,
    IN p_guardian_nic VARCHAR(12),
    IN p_guardian_phone_number VARCHAR(12),
    IN p_guardian_address VARCHAR(100),
    IN p_guardian_postal_code VARCHAR(6),

    IN p_relation ENUM('FATHER','MOTHER','LEGAL_GUARDIAN'),

    IN p_agent_person_id INT
)
BEGIN
    DECLARE v_minor_person_id INT;
    DECLARE v_guardian_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION; -- treats both inserts as one transaction

    -- Create guardian as a PERSON
    INSERT INTO PERSON(first_name,last_name,dob,nic,phone_number,address,postal_code)
    VALUES(p_guardian_first_name,p_guardian_last_name,p_guardian_dob,p_guardian_nic,p_guardian_phone_number,p_guardian_address,p_guardian_postal_code);

    SET v_guardian_person_id=LAST_INSERT_ID();

    -- Create minor as a PERSON
    INSERT INTO PERSON(first_name,last_name,dob,nic,phone_number,address,postal_code)
    VALUES(p_minor_first_name,p_minor_last_name,p_minor_dob,NULL,p_minor_phone_number,p_minor_address,p_minor_postal_code);
    SET v_minor_person_id=LAST_INSERT_ID();
    INSERT INTO MINOR_CUSTOMER_PROFILE(person_id,birth_cert_no,guardian_person_id,agent_person_id,relation)
    VALUES(v_minor_person_id,p_birth_cert_no,v_guardian_person_id,p_agent_person_id,p_relation);

    COMMIT;  -- end transaction. if failed

    SELECT
        v_minor_person_id AS minor_person_id,v_guardian_person_id AS guardian_person_id;
END$$

DELIMITER ;