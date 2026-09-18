DROP FUNCTION IF EXISTS get_savings_account_by_no;

CREATE FUNCTION get_savings_account_by_no(p_account_no VARCHAR(15))
RETURNS JSON
READS SQL DATA
RETURN (
    SELECT JSON_OBJECT(
        'account_no',account_no,
        'balance',balance,
        'status',status,
        'plan_code',plan_code,
        'branch_id',branch_id,
        'agent_person_id',agent_person_id,
        'opened_date',opened_date,
        'contracted_interest_rate',contracted_interest_rate,
        'contracted_min_balance',contracted_min_balance
    )
    FROM SAVINGS_ACCOUNT
    WHERE account_no =p_account_no
);


DROP FUNCTION IF EXISTS get_fixed_deposit_by_id;

CREATE FUNCTION get_fixed_deposit_by_id(p_fd_id VARCHAR(15))
RETURNS JSON
READS SQL DATA
RETURN (
    SELECT JSON_OBJECT(
        'fd_id',fd_id,
        'acc_no',acc_no,
        'principal_amount',principal_amount,
        'term_code',term_code,
        'contracted_interest_rate',contracted_interest_rate,
        'opened_date',opened_date,
        'maturity_date',maturity_date,
        'status',status
    )
    FROM FIXED_DEPOSIT
    WHERE fd_id=p_fd_id
);

DROP FUNCTION IF EXISTS get_accounts_by_person_id;

CREATE FUNCTION get_accounts_by_person_id(p_person_id INT)
RETURNS JSON
READS SQL DATA
RETURN (
    SELECT COALESCE(
        JSON_ARRAYAGG(
            JSON_OBJECT(
                'account_no',sa.account_no,
                'plan_code',sa.plan_code,
                'balance',sa.balance,
                'status',sa.status,
                'holder_role',ah.holder_role
            )
        ),
        JSON_ARRAY()
    )
    FROM ACCOUNT_HOLDER ah
    JOIN SAVINGS_ACCOUNT sa
        ON sa.account_no = ah.account_no
    WHERE ah.customer_person_id = p_person_id
);