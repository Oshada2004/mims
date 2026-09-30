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