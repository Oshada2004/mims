DELIMITER $$

DROP PROCEDURE IF EXISTS sp_find_guardian_by_nic$$
CREATE PROCEDURE sp_find_guardian_by_nic(
    IN p_nic VARCHAR(12)
)
BEGIN
    IF p_nic IS NULL OR TRIM(p_nic)='' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Guardian NIC is required.';
    END IF;

    SELECT
        p.person_id,
        p.first_name,
        p.last_name,
        p.dob,
        p.nic,
        p.phone_number,
        p.address,
        p.postal_code,
        fn_calculate_age(p.dob) AS age
    FROM PERSON p
    WHERE p.nic=TRIM(p_nic)
        AND p.nic IS NOT NULL
        AND TRIM(p.nic) <> ''
        AND (fn_is_adult_customer(p.person_id) OR fn_calculate_age(p.dob)>=18);
END$$



DROP PROCEDURE IF EXISTS sp_create_minor_with_existing_guardian$$
CREATE PROCEDURE sp_create_minor_with_existing_guardian(
    IN p_minor_first_name VARCHAR(100),
    IN p_minor_last_name VARCHAR(100),
    IN p_minor_dob DATE,
    IN p_minor_phone_number VARCHAR(12),
    IN p_minor_address VARCHAR(100),
    IN p_minor_postal_code VARCHAR(6),
    IN p_birth_cert_no VARCHAR(12),
    IN p_guardian_person_id INT,
    IN p_relation ENUM('FATHER','MOTHER','LEGAL_GUARDIAN'),
    IN p_agent_person_id INT
)
BEGIN
    DECLARE v_minor_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    START TRANSACTION;

    INSERT INTO PERSON(first_name,last_name,dob,nic,phone_number,address,postal_code)
    VALUES(p_minor_first_name,p_minor_last_name,p_minor_dob,NULL,p_minor_phone_number,p_minor_address,p_minor_postal_code);
    SET v_minor_person_id=LAST_INSERT_ID();
    INSERT INTO MINOR_CUSTOMER_PROFILE(person_id,birth_cert_no,guardian_person_id,agent_person_id,relation)
    VALUES(v_minor_person_id,p_birth_cert_no,p_guardian_person_id,p_agent_person_id,p_relation);

    COMMIT;

    SELECT
        v_minor_person_id AS minor_person_id, p_guardian_person_id AS guardian_person_id;

END$$

DELIMITER ;