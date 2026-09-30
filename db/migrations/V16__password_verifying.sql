DELIMITER $$


DROP FUNCTION IF EXISTS fn_verify_password$$
CREATE FUNCTION fn_verify_password(
    p_input_password VARCHAR(255),
    p_stored_hash VARCHAR(255)
)
RETURNS BOOLEAN
DETERMINISTIC
NO SQL
BEGIN

    RETURN (SHA2(p_input_password, 256) = p_stored_hash);
END$$


DROP FUNCTION IF EXISTS fn_is_session_valid$$
CREATE FUNCTION fn_is_session_valid(
    p_session_id VARCHAR(64)
)
RETURNS BOOLEAN
READS SQL DATA
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM USER_SESSION 
        WHERE session_id = p_session_id 
          AND is_active = TRUE 
          AND expires_at > NOW()
    );
END$$

DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_register_user_credentials$$
CREATE PROCEDURE sp_register_user_credentials(
    IN p_person_id INT,
    IN p_email VARCHAR(50),
    IN p_username VARCHAR(50),
    IN p_raw_password VARCHAR(255),
    IN p_user_role ENUM('ADMIN','STAFF','CUSTOMER')
)
BEGIN
    DECLARE v_password_hash VARCHAR(255);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    
    IF NOT fn_person_exists(p_person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Registration Failed: Specified person record does not exist.';
    END IF;

    IF EXISTS (SELECT 1 FROM AUTH_USER WHERE person_id = p_person_id) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Registration Failed: Auth credentials already configured for this person.';
    END IF;

  
    SET v_password_hash = SHA2(p_raw_password, 256);

    START TRANSACTION;
        INSERT INTO AUTH_USER (
            person_id, email, username, password_hash, user_role, last_login_at
        ) VALUES (
            p_person_id, TRIM(p_email), TRIM(p_username), v_password_hash, p_user_role, NULL
        );

        INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip, timestamp)
        VALUES (p_person_id, 'CREATE', 'INTERNAL', NOW());
    COMMIT;
END$$

DELIMITER ;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_authenticate_user$$
CREATE PROCEDURE sp_authenticate_user(
    IN p_username_or_email VARCHAR(50),
    IN p_raw_password VARCHAR(255),
    IN p_ip_address VARCHAR(45),
    OUT p_session_id VARCHAR(64),
    OUT p_person_id INT,
    OUT p_user_role VARCHAR(20),
    OUT p_staff_role VARCHAR(20),
    OUT p_branch_id INT
)
BEGIN
    DECLARE v_stored_hash VARCHAR(255);
    DECLARE v_failed_attempts INT;
    DECLARE v_is_locked BOOLEAN;
    DECLARE v_locked_until TIMESTAMP;
    DECLARE v_auth_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

  
    SELECT person_id, password_hash, user_role, failed_login_attempts, is_locked, locked_until
    INTO v_auth_person_id, v_stored_hash, p_user_role, v_failed_attempts, v_is_locked, v_locked_until
    FROM AUTH_USER
    WHERE username = TRIM(p_username_or_email) 
       OR email = TRIM(p_username_or_email);

  
    IF v_auth_person_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Authentication Failed: Invalid credentials.';
    END IF;

  
    IF v_is_locked = TRUE THEN
        IF v_locked_until IS NOT NULL AND v_locked_until > NOW() THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Authentication Failed: Account is temporarily locked due to excessive failed attempts.';
        ELSE
      
            UPDATE AUTH_USER 
            SET is_locked = FALSE, failed_login_attempts = 0, locked_until = NULL 
            WHERE person_id = v_auth_person_id;
        END IF;
    END IF;

  
    IF NOT fn_verify_password(p_raw_password, v_stored_hash) THEN
      
        UPDATE AUTH_USER 
        SET failed_login_attempts = failed_login_attempts + 1
        WHERE person_id = v_auth_person_id;

        
        IF (v_failed_attempts + 1) >= 5 THEN
            UPDATE AUTH_USER 
            SET is_locked = TRUE, locked_until = DATE_ADD(NOW(), INTERVAL 15 MINUTE)
            WHERE person_id = v_auth_person_id;
        END IF;

        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Authentication Failed: Invalid credentials.';
    END IF;


    START TRANSACTION;
        
        UPDATE AUTH_USER 
        SET failed_login_attempts = 0, 
            is_locked = FALSE, 
            locked_until = NULL, 
            last_login_at = NOW()
        WHERE person_id = v_auth_person_id;

      
        SET p_session_id = SHA2(CONCAT(v_auth_person_id, NOW(), RAND()), 256);
        SET p_person_id = v_auth_person_id;

      
        INSERT INTO USER_SESSION (session_id, person_id, ip_address, created_at, expires_at, is_active)
        VALUES (p_session_id, v_auth_person_id, p_ip_address, NOW(), DATE_ADD(NOW(), INTERVAL 8 HOUR), TRUE);

   
        IF p_user_role = 'STAFF' OR p_user_role = 'ADMIN' THEN
            SELECT staff_role, branch_id 
            INTO p_staff_role, p_branch_id
            FROM STAFF_PROFILE 
            WHERE person_id = v_auth_person_id;
        ELSE
            SET p_staff_role = NULL;
            SET p_branch_id = NULL;
        END IF;

        -- Record entry in SYSTEM_AUDIT_LOG
        INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip, timestamp)
        VALUES (v_auth_person_id, 'LOGIN', p_ip_address, NOW());

    COMMIT;
END$$

DELIMITER ;