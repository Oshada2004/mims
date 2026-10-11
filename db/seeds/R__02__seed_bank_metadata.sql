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
    'MIMS001',
    'B-Trust',
    100000.00,
    'info@btrust.lk',
    'Banking for a brighter future',
    '08:30:00',
    '16:30:00'
)