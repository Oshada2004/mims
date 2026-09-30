DELIMITER $$

DROP PROCEDURE IF EXISTS sp_logout_user$$
CREATE PROCEDURE sp_logout_user(
    IN p_session_id VARCHAR(64),
    IN p_ip_address VARCHAR(45)
)
BEGIN
    DECLARE v_person_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT person_id INTO v_person_id
    FROM USER_SESSION
    WHERE session_id = p_session_id AND is_active = TRUE;

    IF v_person_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Logout Failed: Invalid or expired session.';
    END IF;

    START TRANSACTION;
        
        UPDATE USER_SESSION
        SET is_active = FALSE
        WHERE session_id = p_session_id;

        
        INSERT INTO SYSTEM_AUDIT_LOG (person_id, action, ip, timestamp)
        VALUES (v_person_id, 'LOGOUT', p_ip_address, NOW());
    COMMIT;
END$$

DELIMITER ;

DELIMITER $$

DROP FUNCTION IF EXISTS fn_get_auth_user_context$$
CREATE FUNCTION fn_get_auth_user_context(p_session_id VARCHAR(64))
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_res JSON;

    IF NOT fn_is_session_valid(p_session_id) THEN
        RETURN JSON_OBJECT('error', 'Invalid or expired session key.');
    END IF;

    SELECT JSON_OBJECT(
        'person_id', p.person_id,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'email', u.email,
        'username', u.username,
        'user_role', u.user_role,
        'staff_role', sp.staff_role,
        'branch_id', sp.branch_id,
        'last_login_at', u.last_login_at
    ) INTO v_res
    FROM USER_SESSION s
    JOIN AUTH_USER u ON s.person_id = u.person_id
    JOIN PERSON p ON p.person_id = u.person_id
    LEFT JOIN STAFF_PROFILE sp ON sp.person_id = u.person_id
    WHERE s.session_id = p_session_id;

    RETURN v_res;
END$$

DELIMITER ;