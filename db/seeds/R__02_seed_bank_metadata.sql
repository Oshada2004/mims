USE mims_db;

INSERT INTO BANK_META_DATA (
    bank_id,
    bank_name,
    daily_agent_withdrawal_limit,
    contact_email,
    motto,
    bank_start_time,
    bank_close_time
)
VALUES (
    'BTRUST',
    'B-TRUST',
    100000.00,
    'contact@b-trust.lk',
    'Trust in every transaction',
    '08:30:00',
    '16:30:00'
);
