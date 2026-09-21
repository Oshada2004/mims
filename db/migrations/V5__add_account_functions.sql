DELIMITER $$

DROP FUNCTION IF EXISTS get_person_by_id$$

CREATE FUNCTION get_person_by_id(p_person_id INT)
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_res JSON;
    SELECT JSON_OBJECT(
        'person_id',person_id,
        'first_name',first_name,
        'last_name',last_name,
        'dob',dob,
        'phone_number',phone_number,
        'address',address,
        'postal_code',postal_code,
        'person_role',person_role
    ) INTO v_res
    FROM PERSON
    WHERE person_id = p_person_id;
    
    RETURN v_res;
END$$

DELIMITER ;