DROP FUNCTION IF EXISTS get_person_by_id;

CREATE FUNCTION get_person_by_id(p_person_id INT)
RETURNS JSON
READS SQL DATA
RETURN (
    SELECT JSON_OBJECT(
        'person_id', person_id,
        'first_name', first_name,
        'last_name', last_name,
        'phone_number', phone_number,
        'person_role', person_role
    )
    FROM PERSON
    WHERE person_id = p_person_id
);