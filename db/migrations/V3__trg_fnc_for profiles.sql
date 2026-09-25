DELIMITER $$

-- check for exsistence of person
DROP FUNCTION IF EXISTS fn_person_exists$$
CREATE FUNCTION fn_person_exists(
    p_person_id INT
)
RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM PERSON
        WHERE person_id=p_person_id
    );
END$$

-- check for exsistence of staff profile
DROP FUNCTION IF EXISTS fn_is_staff$$
CREATE FUNCTION fn_is_staff(
    p_person_id INT
)
RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM STAFF_PROFILE
        WHERE person_id=p_person_id
    );
END$$

-- check for exsistence of adult profile
DROP FUNCTION IF EXISTS fn_is_adult_customer$$
CREATE FUNCTION fn_is_adult_customer(
    p_person_id INT
)
RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM ADULT_CUSTOMER_PROFILE
        WHERE person_id=p_person_id
    );
END$$


-- check for exsistence of minor profile
DROP FUNCTION IF EXISTS fn_is_minor_customer$$
CREATE FUNCTION fn_is_minor_customer(
    p_person_id INT
)
RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM MINOR_CUSTOMER_PROFILE
        WHERE person_id=p_person_id
    );
END$$


-- trigers to check person_id duplicaions in each profile
DROP TRIGGER IF EXISTS trg_staff_before_insert$$
CREATE TRIGGER trg_staff_before_insert
BEFORE INSERT ON STAFF_PROFILE
FOR EACH ROW
BEGIN
    IF fn_is_adult_customer(NEW.person_id) OR fn_is_minor_customer(NEW.person_id)
        THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_adult_customer_before_insert$$
CREATE TRIGGER trg_adult_customer_before_insert
BEFORE INSERT ON ADULT_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    IF fn_is_staff(NEW.person_id) OR fn_is_minor_customer(NEW.person_id)
        THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';
    END IF;
END$$


DROP TRIGGER IF EXISTS trg_minor_customer_before_insert$$
CREATE TRIGGER trg_minor_customer_before_insert
BEFORE INSERT ON MINOR_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    IF fn_is_staff(NEW.person_id) OR fn_is_adult_customer(NEW.person_id)
        THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';
    END IF;
END$$


-- Find age from dob
DROP FUNCTION IF EXISTS fn_calculate_age$$
CREATE FUNCTION fn_calculate_age(p_dob DATE) 
RETURNS INT 
NOT DETERMINISTIC
NO SQL
BEGIN
    RETURN TIMESTAMPDIFF(YEAR,p_dob,CURDATE());
END$$

-- validate NIC exsistence
DROP FUNCTION IF EXISTS fn_person_has_nic$$
CREATE FUNCTION fn_person_has_nic(
    p_person_id INT
)
RETURNS BOOLEAN
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1
        FROM PERSON
        WHERE (person_id=p_person_id) AND (nic IS NOT NULL) AND (TRIM(nic) <> '')
    );
END$$


-- validate age
DROP TRIGGER IF EXISTS trg_adult_customer_validate_age$$
CREATE TRIGGER trg_adult_customer_validate_age
BEFORE INSERT ON ADULT_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    DECLARE v_dob DATE;
    SELECT dob
    INTO v_dob
    FROM PERSON
    WHERE person_id=NEW.person_id;
    IF fn_calculate_age(v_dob)<18 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Adult customer must be at least 18 years old';
    END IF;
END$$


DROP TRIGGER IF EXISTS trg_minor_customer_validate_age$$
CREATE TRIGGER trg_minor_customer_validate_age
BEFORE INSERT ON MINOR_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    DECLARE v_dob DATE;
    SELECT dob
    INTO v_dob
    FROM PERSON
    WHERE person_id=NEW.person_id;
    IF fn_calculate_age(v_dob)>=18 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Minor customer must be under 18 years old';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_staff_validate_age$$
CREATE TRIGGER trg_staff_validate_age
BEFORE INSERT ON STAFF_PROFILE
FOR EACH ROW
BEGIN
    DECLARE v_dob DATE;
    SELECT dob
    INTO v_dob
    FROM PERSON
    WHERE person_id=NEW.person_id;
    IF fn_calculate_age(v_dob)<18 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Staff member must be at least 18 years old';
    END IF;
END$$

-- validate NIC


DROP TRIGGER IF EXISTS trg_adult_customer_validate_nic$$
CREATE TRIGGER trg_adult_customer_validate_nic
BEFORE INSERT ON ADULT_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    IF NOT fn_person_has_nic(NEW.person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Person must have a NIC.';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_staff_validate_nic$$
CREATE TRIGGER trg_staff_validate_nic
BEFORE INSERT ON STAFF_PROFILE
FOR EACH ROW
BEGIN
    IF NOT fn_person_has_nic(NEW.person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Person must have a NIC.';
    END IF;
END$$


-- validate guardian
DROP TRIGGER IF EXISTS trg_minor_customer_validate_guardian$$
CREATE TRIGGER trg_minor_customer_validate_guardian
BEFORE INSERT ON MINOR_CUSTOMER_PROFILE
FOR EACH ROW
BEGIN
    DECLARE v_guardian_dob DATE;
    SELECT dob
    INTO v_guardian_dob
    FROM PERSON
    WHERE person_id=NEW.guardian_person_id;

    -- NIC validation
    IF NOT fn_person_has_nic(NEW.guardian_person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Guardian must have a NIC.';
    END IF;

    -- canot be a staff member
    IF fn_is_staff(NEW.guardian_person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Staff members cannot be guardians.';
    END IF;

    -- age validation
    IF NOT (
        fn_is_adult_customer(NEW.guardian_person_id) OR fn_calculate_age(v_guardian_dob)>=18
    ) THEN
        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Guardian must be an adult.';
    END IF;
END$$

DELIMITER ;