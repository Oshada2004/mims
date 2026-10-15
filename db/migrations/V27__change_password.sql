-- Change password for a logged-in user (any role).
-- Passwords are hashed exactly like sp_authenticate_user / fn_verify_password (SHA2-256).
-- The caller's own session stays active; every other active session of the user is ended.

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_change_password$$
CREATE PROCEDURE sp_change_password(
    IN p_person_id INT,
    IN p_session_id VARCHAR(64),
    IN p_current_password VARCHAR(255),
    IN p_new_password VARCHAR(255),
    IN p_ip VARCHAR(45),
    OUT p_ended_sessions INT
)
BEGIN
    DECLARE v_hash VARCHAR(255) DEFAULT NULL;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET p_ended_sessions = 0;

    IF p_new_password IS NULL OR CHAR_LENGTH(p_new_password) < 8 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'The new password must be at least 8 characters.';
    END IF;

    START TRANSACTION;

    SELECT password_hash INTO v_hash
    FROM AUTH_USER
    WHERE person_id = p_person_id
    FOR UPDATE;

    -- The session must be the caller's own, still active one.
    IF v_hash IS NULL OR NOT EXISTS (
        SELECT 1
        FROM USER_SESSION
        WHERE session_id = p_session_id
          AND person_id = p_person_id
          AND is_active = 1
          AND expires_at > NOW()
    ) THEN
        SIGNAL SQLSTATE '45401'
        SET MESSAGE_TEXT = 'Session is invalid or expired.';
    END IF;

    IF p_current_password IS NULL OR NOT fn_verify_password(p_current_password, v_hash) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'The current password is incorrect.';
    END IF;

    IF fn_verify_password(p_new_password, v_hash) THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'The new password must be different from the current password.';
    END IF;

    UPDATE AUTH_USER
    SET password_hash = SHA2(p_new_password, 256),
        failed_login_attempts = 0
    WHERE person_id = p_person_id;

    UPDATE USER_SESSION
    SET is_active = 0
    WHERE person_id = p_person_id
      AND session_id <> p_session_id
      AND is_active = 1;

    SET p_ended_sessions = ROW_COUNT();

    INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip)
    VALUES (p_person_id, 'UPDATE', COALESCE(NULLIF(LEFT(p_ip, 45), ''), '0.0.0.0'));

    COMMIT;
END$$

DELIMITER ;
