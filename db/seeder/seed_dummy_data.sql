SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE TRANSACTION_LOG;
TRUNCATE TABLE FIXED_DEPOSIT;
TRUNCATE TABLE ACCOUNT_HOLDER;
TRUNCATE TABLE SAVINGS_ACCOUNT;
TRUNCATE TABLE MINOR_CUSTOMER_PROFILES;
TRUNCATE TABLE ADULT_CUSTOMER_PROFILES;
TRUNCATE TABLE STAFF_PROFILE;
TRUNCATE TABLE USER_ACCOUNT;
TRUNCATE TABLE PERSON;
TRUNCATE TABLE BRANCH;
TRUNCATE TABLE BANK_META_DATA;
TRUNCATE TABLE SAV_ACC_PLAN;
TRUNCATE TABLE FD_ACC_PLAN;
SET FOREIGN_KEY_CHECKS = 1;

-- Foundation Tables
INSERT INTO BANK_META_DATA VALUES ('BTRUST', 'B-Trust Microfinance Bank', 100000.00, 'support@btrust.lk', 'Empowering Rural Communities', '08:30:00', '16:30:00');

INSERT INTO SAV_ACC_PLAN VALUES
('CHILD',  'Children Savings Plan', 12.00,     0.00,  0, 12, FALSE),
('TEEN',   'Teen Savings Plan',     11.00,   500.00, 13, 17, FALSE),
('ADULT',  'Adult Standard Plan',   10.00,  1000.00, 18, 59, FALSE),
('SENIOR', 'Senior Citizen Plan',   13.00,  1000.00, 60, 150, FALSE),
('JOINT',  'Joint Savings Plan',     7.00,  5000.00, 18, 150, TRUE);

INSERT INTO FD_ACC_PLAN VALUES
('6M',  6, 13.00),
('1Y', 12, 14.00),
('3Y', 36, 15.00);

INSERT INTO BRANCH VALUES
(1, 'Colombo Central Branch', 'Colombo', 'No. 12, Main Street, Pettah',   '0112345678', NOW()),
(2, 'Kandy Hill Branch',      'Kandy',   'No. 45, Dalada Veediya, Kandy', '0812345678', NOW()),
(3, 'Galle Coastal Branch',   'Galle',   'No. 78, Fort Road, Galle',      '0912345678', NOW());

-- Bootstrap Admin (Operator ID 1)SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE TRANSACTION_LOG;
TRUNCATE TABLE FIXED_DEPOSIT;
TRUNCATE TABLE ACCOUNT_HOLDER;
TRUNCATE TABLE SAVINGS_ACCOUNT;
TRUNCATE TABLE MINOR_CUSTOMER_PROFILES;
TRUNCATE TABLE ADULT_CUSTOMER_PROFILES;
TRUNCATE TABLE STAFF_PROFILE;
TRUNCATE TABLE USER_ACCOUNT;
TRUNCATE TABLE PERSON;
TRUNCATE TABLE BRANCH;
TRUNCATE TABLE BANK_META_DATA;
TRUNCATE TABLE SAV_ACC_PLAN;
TRUNCATE TABLE FD_ACC_PLAN;
SET FOREIGN_KEY_CHECKS = 1;

-- Foundation Tables
INSERT INTO BANK_META_DATA VALUES ('BTRUST', 'B-Trust Microfinance Bank', 100000.00, 'support@btrust.lk', 'Empowering Rural Communities', '08:30:00', '16:30:00');

INSERT INTO SAV_ACC_PLAN VALUES
('CHILD',  'Children Savings Plan', 12.00,     0.00,  0, 12, FALSE),
('TEEN',   'Teen Savings Plan',     11.00,   500.00, 13, 17, FALSE),
('ADULT',  'Adult Standard Plan',   10.00,  1000.00, 18, 59, FALSE),
('SENIOR', 'Senior Citizen Plan',   13.00,  1000.00, 60, 150, FALSE),
('JOINT',  'Joint Savings Plan',     7.00,  5000.00, 18, 150, TRUE);

INSERT INTO FD_ACC_PLAN VALUES
('FD6M',  6, 13.00),
('FD1Y', 12, 14.00),
('FD3Y', 36, 15.00);

INSERT INTO BRANCH VALUES
(1, 'Colombo Central Branch', 'Colombo', 'No. 12, Main Street, Pettah',   '0112345678', NOW()),
(2, 'Kandy Hill Branch',      'Kandy',   'No. 45, Dalada Veediya, Kandy', '0812345678', NOW()),
(3, 'Galle Coastal Branch',   'Galle',   'No. 78, Fort Road, Galle',      '0912345678', NOW());

-- Bootstrap Admin (Operator ID 1)
INSERT INTO PERSON VALUES (1, 'Super', 'Administrator', '1980-01-01', '0770000000', 'B-Trust HQ, Colombo', '00100');
INSERT INTO STAFF_PROFILE VALUES (1, 'ADMIN', 1, 'OPERATIONS', 150000.00, 0.00);
INSERT INTO USER_ACCOUNT VALUES (1, 'admin@btrust.lk', 'admin', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', 'ADMIN', NOW());

-- Staff Onboarding via Procedure
CALL sp_register_staff_member(1, 'Sunil',     'Fernando',    '1980-09-20', '0772222222', '45 Temple Rd, Kandy',    '20000', 'MANAGER', 1, 'MANAGEMENT', 120000.00, 0.00, 'manager@btrust.lk',   'manager', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Nimal',     'Jayasinghe',  '1992-03-15', '0773333333', '89 Hill St, Kandy',      '20000', 'AGENT',   2, 'FIELD',       60000.00, 20000.00, 'agent3@btrust.lk',   'agent3',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Kamal',     'Silva',       '1994-07-22', '0774444444', '14 Station Rd, Galle',   '80000', 'AGENT',   3, 'FIELD',       60000.00, 20000.00, 'agent4@btrust.lk',   'agent4',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Dilani',    'Alwis',       '1995-11-05', '0775555555', '90 Beach Rd, Galle',     '80000', 'AGENT',   3, 'FIELD',       60000.00, 20000.00, 'agent5@btrust.lk',   'agent5',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Priyantha', 'Dissanayake', '1990-01-30', '0776666666', '33 Cross St, Colombo',   '00100', 'AGENT',   1, 'FIELD',       60000.00, 20000.00, 'agent6@btrust.lk',   'agent6',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Chamari',   'Gunasekara',  '1993-06-18', '0777777777', '56 Park Ave, Colombo',   '00100', 'AGENT',   1, 'FIELD',       60000.00, 20000.00, 'agent7@btrust.lk',   'agent7',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);

-- Adult Customers Onboarded by Agents
CALL sp_register_customer_adult(6, 'Anura',    'Bandara',         '1978-02-14', '0711010101', '10 Galle Rd, Colombo',    '00300', '197804501234', 'TAX10101', 'Accountant',      120000.00, 'anura@gmail.com',    'anura',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c101);
CALL sp_register_customer_adult(6, 'Kusum',    'Bandara',         '1982-05-18', '0711020202', '10 Galle Rd, Colombo',    '00300', '198255401234', 'TAX10202', 'Teacher',          85000.00, 'kusum@gmail.com',    'kusum',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c102);
CALL sp_register_customer_adult(3, 'Saman',    'Wickramasinghe',  '1960-03-10', '0711030303', '22 Kandy Rd, Kadugannawa','20400', '196007001234', 'TAX10303', 'Retired Officer',  70000.00, 'saman@gmail.com',    'saman',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c103);
CALL sp_register_customer_adult(3, 'Manoja',   'Wickramasinghe',  '1964-11-25', '0711040404', '22 Kandy Rd, Kadugannawa','20400', '196458001234', 'TAX10404', 'Nurse',            90000.00, 'manoja@gmail.com',   'manoja',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c104);
CALL sp_register_customer_adult(4, 'Lalith',   'De Silva',        '1955-08-14', '0711050505', '88 Light House St, Galle','80000', '195522701234', 'TAX10505', 'Retired Engineer', 95000.00, 'lalith@gmail.com',   'lalith',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c105);
CALL sp_register_customer_adult(4, 'Chitra',   'De Silva',        '1958-12-02', '0711060606', '88 Light House St, Galle','80000', '195861101234', 'TAX10606', 'Consultant',      110000.00, 'chitra@gmail.com',   'chitra',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c106);
CALL sp_register_customer_adult(3, 'Duminda',  'Herath',          '1998-04-10', '0711070707', '19 Bazaar St, Kandy',     '20000', '199810001234', 'TAX10707', 'Software Dev',    140000.00, 'duminda@gmail.com',  'duminda',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c107);
CALL sp_register_customer_adult(5, 'Nadeeka',  'Rathnayake',      '1999-09-17', '0711080808', '40 Main St, Galle',        '80000', '199975001234', 'TAX10808', 'Bank Executive',   80000.00, 'nadeeka@gmail.com',  'nadeeka',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c108);
CALL sp_register_customer_adult(7, 'Kasun',    'Fonseka',         '1988-06-21', '0711090909', '77 Hospital Rd, Colombo',  '00500', '198817201234', 'TAX10909', 'Pharmacist',       95000.00, 'kasun@gmail.com',    'kasun',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c109);
CALL sp_register_customer_adult(3, 'Shanika',  'Peiris',          '1991-01-09', '0711101010', '15 Peradeniya Rd, Kandy',  '20000', '199150901234', 'TAX11010', 'Civil Engineer',  130000.00, 'shanika@gmail.com',  'shanika',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c110);
CALL sp_register_customer_adult(5, 'Asanka',   'Maduranga',       '1986-10-31', '0711111111', '60 Matara Rd, Galle',      '80000', '198630501234', 'TAX11111', 'Hotelier',        160000.00, 'asanka@gmail.com',   'asanka',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c111);
CALL sp_register_customer_adult(7, 'Sanduni',  'Karunaratne',     '1995-07-12', '0711121212', '5 Duplication Rd, Colombo','00400', '199569401234', 'TAX11212', 'Architect',       115000.00, 'sanduni@gmail.com',  'sanduni',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c112);
CALL sp_register_customer_adult(3, 'Upul',     'Tharanga',        '1972-12-14', '0711131313', '81 Post Office Rd, Kandy', '20000', '197234801234', 'TAX11313', 'Businessman',     220000.00, 'upul@gmail.com',     'upul',     '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c113);
CALL sp_register_customer_adult(4, 'Nirupama', 'Senanayake',      '1983-03-29', '0711141414', '34 Rampart St, Galle',     '80000', '198358901234', 'TAX11414', 'Lawyer',          175000.00, 'nirupama@gmail.com', 'nirupama', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c114);

-- Minor Customers Onboarded by Agents
CALL sp_register_customer_minor(6, 'Dineth',  'Bandara',  '2018-06-15', '0711151515', '10 Galle Rd, Colombo',    '00300', 'BC2018001', @c101, 'FATHER',         'dineth@gmail.com',  'dineth',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c115);
CALL sp_register_customer_minor(3, 'Thisuri', 'Herath',   '2011-09-04', '0711161616', '19 Bazaar St, Kandy',     '20000', 'BC2011002', @c107, 'LEGAL_GUARDIAN', 'thisuri@gmail.com', 'thisuri', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c116);
CALL sp_register_customer_minor(4, 'Sachin',  'De Silva', '2015-01-20', '0711171717', '88 Light House St, Galle','80000', 'BC2015003', @c105, 'FATHER',         'sachin@gmail.com',  'sachin',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c117);

-- Savings Accounts Opened via Procedure
CALL sp_open_savings_account(1, 6, @c101, 'ADULT',  250000.00, @acc1);
CALL sp_open_savings_account(1, 6, @c102, 'ADULT',  180000.00, @acc2);
CALL sp_open_savings_account(2, 3, @c103, 'SENIOR', 320000.00, @acc3);
CALL sp_open_savings_account(2, 3, @c104, 'SENIOR', 150000.00, @acc4);
CALL sp_open_savings_account(3, 4, @c105, 'SENIOR', 450000.00, @acc5);
CALL sp_open_savings_account(3, 4, @c106, 'SENIOR', 210000.00, @acc6);
CALL sp_open_savings_account(2, 3, @c107, 'ADULT',   95000.00, @acc7);
CALL sp_open_savings_account(3, 5, @c108, 'ADULT',  140000.00, @acc8);
CALL sp_open_savings_account(1, 7, @c109, 'ADULT',  275000.00, @acc9);
CALL sp_open_savings_account(2, 3, @c110, 'ADULT',  310000.00, @acc10);
CALL sp_open_savings_account(3, 5, @c111, 'ADULT',  185000.00, @acc11);
CALL sp_open_savings_account(1, 7, @c112, 'ADULT',   80000.00, @acc12);
CALL sp_open_savings_account(1, 6, @c115, 'CHILD',   55000.00, @acc13);
CALL sp_open_savings_account(2, 3, @c116, 'TEEN',    35000.00, @acc14);
CALL sp_open_savings_account(3, 4, @c117, 'CHILD',   42000.00, @acc15);

-- 2 Joint Accounts
CALL sp_open_savings_account(1, 6, @c101, 'JOINT', 650000.00, @acc16);
CALL sp_add_joint_holder(@acc16, @c102);

CALL sp_open_savings_account(2, 3, @c103, 'JOINT', 480000.00, @acc17);
CALL sp_add_joint_holder(@acc17, @c104);

-- 10 Active Fixed Deposits
CALL sp_open_fixed_deposit(@acc1,  'FD1Y', 100000.00, 6, @fd1);
CALL sp_open_fixed_deposit(@acc2,  'FD6M',  50000.00, 6, @fd2);
CALL sp_open_fixed_deposit(@acc3,  'FD3Y', 150000.00, 3, @fd3);
CALL sp_open_fixed_deposit(@acc4,  'FD1Y',  75000.00, 3, @fd4);
CALL sp_open_fixed_deposit(@acc5,  'FD3Y', 200000.00, 4, @fd5);
CALL sp_open_fixed_deposit(@acc6,  'FD6M',  80000.00, 4, @fd6);
CALL sp_open_fixed_deposit(@acc7,  'FD1Y',  40000.00, 3, @fd7);
CALL sp_open_fixed_deposit(@acc8,  'FD1Y',  60000.00, 5, @fd8);
CALL sp_open_fixed_deposit(@acc9,  'FD3Y', 120000.00, 7, @fd9);
CALL sp_open_fixed_deposit(@acc10, 'FD6M',  90000.00, 3, @fd10);
INSERT INTO PERSON VALUES (1, 'Super', 'Administrator', '1980-01-01', '0770000000', 'B-Trust HQ, Colombo', '00100');
INSERT INTO STAFF_PROFILE VALUES (1, 'ADMIN', 1, 'OPERATIONS', 150000.00, 0.00);
INSERT INTO USER_ACCOUNT VALUES (1, 'admin@btrust.lk', 'admin', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', 'ADMIN', NOW());

-- Staff Onboarding via Procedure
CALL sp_register_staff_member(1, 'Sunil',     'Fernando',    '1980-09-20', '0772222222', '45 Temple Rd, Kandy',    '20000', 'MANAGER', 1, 'MANAGEMENT', 120000.00, 0.00, 'manager@btrust.lk',   'manager', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Nimal',     'Jayasinghe',  '1992-03-15', '0773333333', '89 Hill St, Kandy',      '20000', 'AGENT',   2, 'FIELD',       60000.00, 20000.00, 'agent3@btrust.lk',   'agent3',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Kamal',     'Silva',       '1994-07-22', '0774444444', '14 Station Rd, Galle',   '80000', 'AGENT',   3, 'FIELD',       60000.00, 20000.00, 'agent4@btrust.lk',   'agent4',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Dilani',    'Alwis',       '1995-11-05', '0775555555', '90 Beach Rd, Galle',     '80000', 'AGENT',   3, 'FIELD',       60000.00, 20000.00, 'agent5@btrust.lk',   'agent5',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Priyantha', 'Dissanayake', '1990-01-30', '0776666666', '33 Cross St, Colombo',   '00100', 'AGENT',   1, 'FIELD',       60000.00, 20000.00, 'agent6@btrust.lk',   'agent6',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);
CALL sp_register_staff_member(1, 'Chamari',   'Gunasekara',  '1993-06-18', '0777777777', '56 Park Ave, Colombo',   '00100', 'AGENT',   1, 'FIELD',       60000.00, 20000.00, 'agent7@btrust.lk',   'agent7',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @s_id);

-- Adult Customers Onboarded by Agents
CALL sp_register_customer_adult(6, 'Anura',    'Bandara',         '1978-02-14', '0711010101', '10 Galle Rd, Colombo',    '00300', '197804501234', 'TAX10101', 'Accountant',      120000.00, 'anura@gmail.com',    'anura',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c101);
CALL sp_register_customer_adult(6, 'Kusum',    'Bandara',         '1982-05-18', '0711020202', '10 Galle Rd, Colombo',    '00300', '198255401234', 'TAX10202', 'Teacher',          85000.00, 'kusum@gmail.com',    'kusum',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c102);
CALL sp_register_customer_adult(3, 'Saman',    'Wickramasinghe',  '1960-03-10', '0711030303', '22 Kandy Rd, Kadugannawa','20400', '196007001234', 'TAX10303', 'Retired Officer',  70000.00, 'saman@gmail.com',    'saman',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c103);
CALL sp_register_customer_adult(3, 'Manoja',   'Wickramasinghe',  '1964-11-25', '0711040404', '22 Kandy Rd, Kadugannawa','20400', '196458001234', 'TAX10404', 'Nurse',            90000.00, 'manoja@gmail.com',   'manoja',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c104);
CALL sp_register_customer_adult(4, 'Lalith',   'De Silva',        '1955-08-14', '0711050505', '88 Light House St, Galle','80000', '195522701234', 'TAX10505', 'Retired Engineer', 95000.00, 'lalith@gmail.com',   'lalith',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c105);
CALL sp_register_customer_adult(4, 'Chitra',   'De Silva',        '1958-12-02', '0711060606', '88 Light House St, Galle','80000', '195861101234', 'TAX10606', 'Consultant',      110000.00, 'chitra@gmail.com',   'chitra',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c106);
CALL sp_register_customer_adult(3, 'Duminda',  'Herath',          '1998-04-10', '0711070707', '19 Bazaar St, Kandy',     '20000', '199810001234', 'TAX10707', 'Software Dev',    140000.00, 'duminda@gmail.com',  'duminda',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c107);
CALL sp_register_customer_adult(5, 'Nadeeka',  'Rathnayake',      '1999-09-17', '0711080808', '40 Main St, Galle',        '80000', '199975001234', 'TAX10808', 'Bank Executive',   80000.00, 'nadeeka@gmail.com',  'nadeeka',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c108);
CALL sp_register_customer_adult(7, 'Kasun',    'Fonseka',         '1988-06-21', '0711090909', '77 Hospital Rd, Colombo',  '00500', '198817201234', 'TAX10909', 'Pharmacist',       95000.00, 'kasun@gmail.com',    'kasun',    '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c109);
CALL sp_register_customer_adult(3, 'Shanika',  'Peiris',          '1991-01-09', '0711101010', '15 Peradeniya Rd, Kandy',  '20000', '199150901234', 'TAX11010', 'Civil Engineer',  130000.00, 'shanika@gmail.com',  'shanika',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c110);
CALL sp_register_customer_adult(5, 'Asanka',   'Maduranga',       '1986-10-31', '0711111111', '60 Matara Rd, Galle',      '80000', '198630501234', 'TAX11111', 'Hotelier',        160000.00, 'asanka@gmail.com',   'asanka',   '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c111);
CALL sp_register_customer_adult(7, 'Sanduni',  'Karunaratne',     '1995-07-12', '0711121212', '5 Duplication Rd, Colombo','00400', '199569401234', 'TAX11212', 'Architect',       115000.00, 'sanduni@gmail.com',  'sanduni',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c112);
CALL sp_register_customer_adult(3, 'Upul',     'Tharanga',        '1972-12-14', '0711131313', '81 Post Office Rd, Kandy', '20000', '197234801234', 'TAX11313', 'Businessman',     220000.00, 'upul@gmail.com',     'upul',     '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c113);
CALL sp_register_customer_adult(4, 'Nirupama', 'Senanayake',      '1983-03-29', '0711141414', '34 Rampart St, Galle',     '80000', '198358901234', 'TAX11414', 'Lawyer',          175000.00, 'nirupama@gmail.com', 'nirupama', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c114);

-- Minor Customers Onboarded by Agents
CALL sp_register_customer_minor(6, 'Dineth',  'Bandara',  '2018-06-15', '0711151515', '10 Galle Rd, Colombo',    '00300', 'BC2018001', @c101, 'FATHER',         'dineth@gmail.com',  'dineth',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c115);
CALL sp_register_customer_minor(3, 'Thisuri', 'Herath',   '2011-09-04', '0711161616', '19 Bazaar St, Kandy',     '20000', 'BC2011002', @c107, 'LEGAL_GUARDIAN', 'thisuri@gmail.com', 'thisuri', '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c116);
CALL sp_register_customer_minor(4, 'Sachin',  'De Silva', '2015-01-20', '0711171717', '88 Light House St, Galle','80000', 'BC2015003', @c105, 'FATHER',         'sachin@gmail.com',  'sachin',  '$2a$10$w09ZJc44XNl4t9Wc/kL.V.X9hVwP9XfCcmj80sFq4yW0ZkQJ8xYmS', @c117);

-- Savings Accounts Opened via Procedure
CALL sp_open_savings_account(1, 6, @c101, 'ADULT',  250000.00, @acc1);
CALL sp_open_savings_account(1, 6, @c102, 'ADULT',  180000.00, @acc2);
CALL sp_open_savings_account(2, 3, @c103, 'SENIOR', 320000.00, @acc3);
CALL sp_open_savings_account(2, 3, @c104, 'SENIOR', 150000.00, @acc4);
CALL sp_open_savings_account(3, 4, @c105, 'SENIOR', 450000.00, @acc5);
CALL sp_open_savings_account(3, 4, @c106, 'SENIOR', 210000.00, @acc6);
CALL sp_open_savings_account(2, 3, @c107, 'ADULT',   95000.00, @acc7);
CALL sp_open_savings_account(3, 5, @c108, 'ADULT',  140000.00, @acc8);
CALL sp_open_savings_account(1, 7, @c109, 'ADULT',  275000.00, @acc9);
CALL sp_open_savings_account(2, 3, @c110, 'ADULT',  310000.00, @acc10);
CALL sp_open_savings_account(3, 5, @c111, 'ADULT',  185000.00, @acc11);
CALL sp_open_savings_account(1, 7, @c112, 'ADULT',   80000.00, @acc12);
CALL sp_open_savings_account(1, 6, @c115, 'CHILD',   55000.00, @acc13);
CALL sp_open_savings_account(2, 3, @c116, 'TEEN',    35000.00, @acc14);
CALL sp_open_savings_account(3, 4, @c117, 'CHILD',   42000.00, @acc15);

-- 2 Joint Accounts
CALL sp_open_savings_account(1, 6, @c101, 'JOINT', 650000.00, @acc16);
CALL sp_add_joint_holder(@acc16, @c102);

CALL sp_open_savings_account(2, 3, @c103, 'JOINT', 480000.00, @acc17);
CALL sp_add_joint_holder(@acc17, @c104);

-- 10 Active Fixed Deposits
CALL sp_open_fixed_deposit(@acc1,  'FD1Y', 100000.00, 6, @fd1);
CALL sp_open_fixed_deposit(@acc2,  'FD6M',  50000.00, 6, @fd2);
CALL sp_open_fixed_deposit(@acc3,  'FD3Y', 150000.00, 3, @fd3);
CALL sp_open_fixed_deposit(@acc4,  'FD1Y',  75000.00, 3, @fd4);
CALL sp_open_fixed_deposit(@acc5,  'FD3Y', 200000.00, 4, @fd5);
CALL sp_open_fixed_deposit(@acc6,  'FD6M',  80000.00, 4, @fd6);
CALL sp_open_fixed_deposit(@acc7,  'FD1Y',  40000.00, 3, @fd7);
CALL sp_open_fixed_deposit(@acc8,  'FD1Y',  60000.00, 5, @fd8);
CALL sp_open_fixed_deposit(@acc9,  'FD3Y', 120000.00, 7, @fd9);
CALL sp_open_fixed_deposit(@acc10, 'FD6M',  90000.00, 3, @fd10);