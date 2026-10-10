
ALTER TABLE AUTH_USER
ADD COLUMN failed_login_attempts INT NOT NULL DEFAULT 0,
ADD COLUMN is_locked BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN locked_until TIMESTAMP NULL DEFAULT NULL;


CREATE TABLE IF NOT EXISTS USER_SESSION (
    session_id VARCHAR(64) NOT NULL,
    person_id INT NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    PRIMARY KEY(session_id),
    CONSTRAINT fk_session_user FOREIGN KEY(person_id) 
        REFERENCES AUTH_USER(person_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

USE `mims_db`;

DROP PROCEDURE IF EXISTS `sp_authenticate_user`;

DELIMITER //

CREATE PROCEDURE `sp_authenticate_user`(
    IN p_username VARCHAR(100),
    IN p_password VARCHAR(255),
    IN p_client_ip VARCHAR(45),
    OUT p_session_id VARCHAR(255),
    OUT p_person_id INT,
    OUT p_user_role VARCHAR(50),
    OUT p_staff_role VARCHAR(50),
    OUT p_branch_id INT
)
BEGIN
    DECLARE v_count INT DEFAULT 0;
    DECLARE v_clean_ip VARCHAR(45);

    -- Ensure IP is never NULL
    SET v_clean_ip = COALESCE(NULLIF(p_client_ip, ''), '127.0.0.1');

    -- Validate user credentials against AUTH_USER table using SHA256 password hash
    SELECT COUNT(*), u.person_id, u.user_role
    INTO v_count, p_person_id, p_user_role
    FROM AUTH_USER u
    WHERE u.username = p_username 
      AND u.password_hash = SHA2(p_password, 256)
      AND u.is_locked = 0
    GROUP BY u.person_id, u.user_role;

    IF v_count > 0 THEN
        -- Generate a unique session token
        SET p_session_id = UUID();

        -- Record active session in USER_SESSION table with sanitized IP
        INSERT INTO USER_SESSION (session_id, person_id, ip_address, created_at, expires_at, is_active)
        VALUES (p_session_id, p_person_id, v_clean_ip, NOW(), DATE_ADD(NOW(), INTERVAL 24 HOUR), 1);

        -- Update last login timestamp and reset failed attempts
        UPDATE AUTH_USER 
        SET last_login_at = NOW(), failed_login_attempts = 0 
        WHERE person_id = p_person_id;

        -- Fetch staff-specific profile details if user is staff/agent
        SELECT staff_role, branch_id 
        INTO p_staff_role, p_branch_id
        FROM STAFF_PROFILE
        WHERE person_id = p_person_id
        LIMIT 1;
    ELSE
        -- Clear OUT variables on failure
        SET p_session_id = NULL;
        SET p_person_id = NULL;
        SET p_user_role = NULL;
        SET p_staff_role = NULL;
        SET p_branch_id = NULL;
        
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Invalid username or password';
    END IF;
END //

DELIMITER ;