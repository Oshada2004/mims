DELIMITER $$

DROP PROCEDURE IF EXISTS sp_logout_user$$
CREATE PROCEDURE sp_logout_user(
    IN p_session_id VARCHAR(64),
    IN p_ip VARCHAR(45)
)
BEGIN
    DECLARE v_person_id INT DEFAULT NULL;

    IF p_session_id IS NOT NULL AND p_session_id <> '' THEN
        SET v_person_id = (
            SELECT person_id
            FROM USER_SESSION
            WHERE session_id = p_session_id
              AND is_active = 1
            LIMIT 1
        );

        IF v_person_id IS NOT NULL THEN
            UPDATE USER_SESSION
            SET is_active = 0
            WHERE session_id = p_session_id;

            INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip)
            VALUES (v_person_id, 'LOGOUT', COALESCE(NULLIF(LEFT(p_ip, 45), ''), '0.0.0.0'));
        END IF;
    END IF;
END$$

DELIMITER ;