DELIMITER $$

CREATE TRIGGER trg_staff_before_insert
BEFORE INSERT ON STAFF_PROFILE
FOR EACH ROW
BEGIN

    IF EXISTS (
        SELECT 1
        FROM ADULT_CUSTOMER_PROFILES
        WHERE person_id=NEW.person_id
    )
    OR EXISTS (
        SELECT 1
        FROM MINOR_CUSTOMER_PROFILES
        WHERE person_id=NEW.person_id
    )
    THEN

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';

    END IF;

END$$


CREATE TRIGGER trg_adult_customer_before_insert
BEFORE INSERT ON ADULT_CUSTOMER_PROFILES
FOR EACH ROW
BEGIN

    IF EXISTS (
        SELECT 1
        FROM STAFF_PROFILE
        WHERE person_id=NEW.person_id
    )
    OR EXISTS (
        SELECT 1
        FROM MINOR_CUSTOMER_PROFILES
        WHERE person_id=NEW.person_id
    )
    THEN

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';

    END IF;

END$$


CREATE TRIGGER trg_minor_customer_before_insert
BEFORE INSERT ON MINOR_CUSTOMER_PROFILES
FOR EACH ROW
BEGIN

    IF EXISTS (
        SELECT 1
        FROM ADULT_CUSTOMER_PROFILES
        WHERE person_id=NEW.person_id
    )
    OR EXISTS (
        SELECT 1
        FROM STAFF_PROFILE
        WHERE person_id=NEW.person_id
    )
    THEN

        SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Person already belongs to another customer subtype';

    END IF;

END$$


DELIMITER ;