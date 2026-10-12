DELIMITER $$

DROP FUNCTION IF EXISTS fn_get_profile_context$$
CREATE FUNCTION fn_get_profile_context(p_session_id VARCHAR(64))
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_profile JSON;

    SELECT JSON_OBJECT(
        'person_id', au.person_id,
        'email', au.email,
        'username', au.username,
        'user_role', au.user_role,
        'first_name', p.first_name,
        'last_name', p.last_name,
        'staff_role', sp.staff_role,
        'branch_id', sp.branch_id,
        'branch_name', b.branch_name
    )
    INTO v_profile
    FROM USER_SESSION us
    JOIN AUTH_USER au ON au.person_id = us.person_id
    JOIN PERSON p ON p.person_id = au.person_id
    LEFT JOIN STAFF_PROFILE sp ON sp.person_id = au.person_id
    LEFT JOIN BRANCH b ON b.branch_id = sp.branch_id
    WHERE us.session_id = p_session_id
      AND us.is_active = TRUE
      AND us.expires_at > NOW()
    LIMIT 1;

    RETURN v_profile;
END$$

DROP FUNCTION IF EXISTS fn_get_bank_metadata$$
CREATE FUNCTION fn_get_bank_metadata()
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_metadata JSON;

    SELECT JSON_OBJECT(
        'bank_id', bank_id,
        'bank_name', bank_name,
        'daily_agent_withdrawal_limit', daily_agent_withdrawal_limit,
        'contact_email', contact_email,
        'motto', motto,
        'bank_start_time', bank_start_time,
        'bank_close_time', bank_close_time
    )
    INTO v_metadata
    FROM BANK_META_DATA
    ORDER BY bank_id
    LIMIT 1;

    RETURN v_metadata;
END$$

DELIMITER ;
