USE mims_db;

INSERT INTO SAV_ACC_PLAN (
    plan_code, plan_name, annual_interest_rate, min_balance,
    min_age, max_age, allows_joint
)
VALUES
    ('CHILD', 'Child Savings', 12.00, 0.00, 0, 12, FALSE),
    ('TEEN', 'Teen Savings', 11.00, 500.00, 13, 17, FALSE),
    ('ADULT', 'Adult Savings', 10.00, 1000.00, 18, 59, FALSE),
    ('SENIOR', 'Senior Savings', 13.00, 1000.00, 60, NULL, FALSE),
    ('JOINT', 'Joint Savings', 7.00, 5000.00, 18, NULL, TRUE)
ON DUPLICATE KEY UPDATE
    plan_name = VALUES(plan_name),
    annual_interest_rate = VALUES(annual_interest_rate),
    min_balance = VALUES(min_balance),
    min_age = VALUES(min_age),
    max_age = VALUES(max_age),
    allows_joint = VALUES(allows_joint);

INSERT INTO FD_ACC_PLAN (term_code, duration_months, annual_interest_rate)
VALUES
    ('6M', 6, 13.00),
    ('1Y', 12, 14.00),
    ('3Y', 36, 15.00)
ON DUPLICATE KEY UPDATE
    duration_months = VALUES(duration_months),
    annual_interest_rate = VALUES(annual_interest_rate);

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_seed_demo_customers_accounts$$

CREATE PROCEDURE sp_seed_demo_customers_accounts()
BEGIN
    DECLARE v_agent_one INT;
    DECLARE v_agent_two INT;
    DECLARE v_guardian INT;
    DECLARE v_child INT;
    DECLARE v_teen INT;
    DECLARE v_adult INT;
    DECLARE v_senior INT;
    DECLARE v_joint INT;
    DECLARE v_account_no VARCHAR(15);
    DECLARE v_fd_id CHAR(20);

    SELECT person_id INTO v_agent_one
    FROM PERSON WHERE nic = '198812345678' LIMIT 1;
    IF v_agent_one IS NULL THEN
        CALL sp_create_staff(
            'Ayesha', 'Fernando', '1988-04-12', '198812345678',
            '0772345678', '25 Flower Road, Colombo 07', '00700',
            'AGENT', 1, 'OPERATIONS', 180000.00
        );
        SELECT person_id INTO v_agent_one
        FROM PERSON WHERE nic = '198812345678' LIMIT 1;
    END IF;

    SELECT person_id INTO v_agent_two
    FROM PERSON WHERE nic = '199112345679' LIMIT 1;
    IF v_agent_two IS NULL THEN
        CALL sp_create_staff(
            'Ruwan', 'Jayasinghe', '1991-09-23', '199112345679',
            '0713456789', '14 Lake Drive, Colombo 05', '00500',
            'AGENT', 1, 'CUSTOMER_SERVICE', 155000.00
        );
        SELECT person_id INTO v_agent_two
        FROM PERSON WHERE nic = '199112345679' LIMIT 1;
    END IF;

    SELECT person_id INTO v_guardian
    FROM PERSON WHERE nic = '197806150001' LIMIT 1;
    IF v_guardian IS NULL THEN
        CALL sp_create_adult_customer(
            'Malini', 'Perera', '1978-06-15', '0774567890',
            '18 Temple Road, Colombo 03', '00300', '197806150001',
            'TAX-DEMO-001', v_agent_one, 'Teacher', 180000.00
        );
        SELECT person_id INTO v_guardian
        FROM PERSON WHERE nic = '197806150001' LIMIT 1;
    END IF;

    SELECT person_id INTO v_child
    FROM PERSON WHERE first_name = 'Sahan' AND last_name = 'Perera'
    LIMIT 1;
    IF v_child IS NULL THEN
        CALL sp_create_minor_with_existing_guardian(
            'Sahan', 'Perera', '2016-05-05', '0774567891',
            '18 Temple Road, Colombo 03', '00300', 'BC-DEMO-001',
            v_guardian, 'MOTHER', v_agent_one
        );
        SELECT person_id INTO v_child
        FROM PERSON WHERE first_name = 'Sahan' AND last_name = 'Perera'
        LIMIT 1;
    END IF;

    SELECT person_id INTO v_teen
    FROM PERSON WHERE nic IS NULL AND first_name = 'Nadeesha'
    LIMIT 1;
    IF v_teen IS NULL THEN
        CALL sp_create_minor_with_existing_guardian(
            'Nadeesha', 'Perera', '2009-10-10', '0715678901',
            '18 Temple Road, Colombo 03', '00300', 'BC-DEMO-002',
            v_guardian, 'MOTHER', v_agent_one
        );
        SELECT person_id INTO v_teen
        FROM PERSON WHERE first_name = 'Nadeesha' AND last_name = 'Perera'
        LIMIT 1;
    END IF;

    SELECT person_id INTO v_adult
    FROM PERSON WHERE nic = '199505050003' LIMIT 1;
    IF v_adult IS NULL THEN
        CALL sp_create_adult_customer(
            'Dilan', 'Wickramasinghe', '1995-02-20', '0766789012',
            '9 Beach Road, Galle', '80000', '199505050003',
            'TAX-DEMO-003', v_agent_two, 'Business Owner', 320000.00
        );
        SELECT person_id INTO v_adult
        FROM PERSON WHERE nic = '199505050003' LIMIT 1;
    END IF;

    SELECT person_id INTO v_senior
    FROM PERSON WHERE nic = '195001010004' LIMIT 1;
    IF v_senior IS NULL THEN
        CALL sp_create_adult_customer(
            'Sunil', 'Silva', '1950-01-01', '0716789012',
            '42 Station Road, Kandy', '20000', '195001010004',
            'TAX-DEMO-004', v_agent_two, 'Retired Engineer', 95000.00
        );
        SELECT person_id INTO v_senior
        FROM PERSON WHERE nic = '195001010004' LIMIT 1;
    END IF;

    SELECT person_id INTO v_joint
    FROM PERSON WHERE nic = '199810100005' LIMIT 1;
    IF v_joint IS NULL THEN
        CALL sp_create_adult_customer(
            'Kavindu', 'Jayasinghe', '1998-10-10', '0717890123',
            '12 Lake View, Colombo 05', '00500', '199810100005',
            'TAX-DEMO-005', v_agent_two, 'Accountant', 175000.00
        );
        SELECT person_id INTO v_joint
        FROM PERSON WHERE nic = '199810100005' LIMIT 1;
    END IF;

    INSERT INTO AUTH_USER (
        person_id, email, username, password_hash, user_role,
        failed_login_attempts, is_locked
    )
    VALUES
        (v_agent_one, 'ayesha.fernando@mimsbank.lk', 'ayesha_agent',
         SHA2('AyeshaAgent123!', 256), 'STAFF', 0, FALSE),
        (v_agent_two, 'ruwan.jayasinghe@mimsbank.lk', 'ruwan_agent',
         SHA2('RuwanAgent123!', 256), 'STAFF', 0, FALSE),
        (v_guardian, 'malini.perera@gmail.com', 'malini_perera',
         SHA2('MaliniCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_child, 'sahan.perera@gmail.com', 'sahan_perera',
         SHA2('SahanCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_teen, 'nadeesha.perera@gmail.com', 'nadeesha_perera',
         SHA2('NadeeshaCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_adult, 'dilan.wickramasinghe@gmail.com', 'dilan_w',
         SHA2('DilanCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_senior, 'sunil.silva@gmail.com', 'sunil_silva',
         SHA2('SunilCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_joint, 'kavindu.jayasinghe@gmail.com', 'kavindu_j',
         SHA2('KavinduCustomer123!', 256), 'CUSTOMER', 0, FALSE)
    ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        username = VALUES(username),
        password_hash = VALUES(password_hash),
        user_role = VALUES(user_role),
        failed_login_attempts = 0,
        is_locked = FALSE;

    SELECT sa.account_no INTO v_account_no
    FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_child AND sa.plan_code = 'CHILD'
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_no IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_one, v_child, 'CHILD', 10000.00, v_account_no);
    END IF;

    SET v_account_no = NULL;
    SELECT sa.account_no INTO v_account_no
    FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_teen AND sa.plan_code = 'TEEN'
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_no IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_one, v_teen, 'TEEN', 20000.00, v_account_no);
    END IF;

    SET v_account_no = NULL;
    SELECT sa.account_no INTO v_account_no
    FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_adult AND sa.plan_code = 'ADULT'
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_no IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_two, v_adult, 'ADULT', 100000.00, v_account_no);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM FIXED_DEPOSIT
        WHERE active_acc_no = v_account_no AND status = 'ACTIVE'
    ) THEN
        CALL sp_open_fixed_deposit(v_account_no, '6M', 25000.00, v_agent_two, v_fd_id);
    END IF;

    SET v_account_no = NULL;
    SELECT sa.account_no INTO v_account_no
    FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_senior AND sa.plan_code = 'SENIOR'
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_no IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_one, v_senior, 'SENIOR', 150000.00, v_account_no);
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM FIXED_DEPOSIT
        WHERE active_acc_no = v_account_no AND status = 'ACTIVE'
    ) THEN
        CALL sp_open_fixed_deposit(v_account_no, '1Y', 50000.00, v_agent_one, v_fd_id);
    END IF;

    SET v_account_no = NULL;
    SELECT sa.account_no INTO v_account_no
    FROM SAVINGS_ACCOUNT sa JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_guardian AND sa.plan_code = 'JOINT'
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_no IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_one, v_guardian, 'JOINT', 200000.00, v_account_no);
        CALL sp_add_joint_holder(v_account_no, v_joint);
    END IF;
END$$

CALL sp_seed_demo_customers_accounts()$$

DROP PROCEDURE sp_seed_demo_customers_accounts$$

DELIMITER ;

USE mims_db;

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_seed_extended_demo_data$$

CREATE PROCEDURE sp_seed_extended_demo_data()
BEGIN
    DECLARE v_agent_one INT;
    DECLARE v_agent_two INT;
    DECLARE v_agent_three INT;
    DECLARE v_agent_four INT;
    DECLARE v_agent_five INT;
    DECLARE v_customer_one INT;
    DECLARE v_customer_two INT;
    DECLARE v_customer_three INT;
    DECLARE v_customer_four INT;
    DECLARE v_customer_five INT;
    DECLARE v_customer_six INT;
    DECLARE v_customer_seven INT;
    DECLARE v_customer_eight INT;
    DECLARE v_customer_nine INT;
    DECLARE v_existing_joint_customer INT;
    DECLARE v_account_one VARCHAR(15);
    DECLARE v_account_two VARCHAR(15);
    DECLARE v_account_three VARCHAR(15);
    DECLARE v_account_four VARCHAR(15);
    DECLARE v_account_five VARCHAR(15);
    DECLARE v_account_six VARCHAR(15);
    DECLARE v_account_seven VARCHAR(15);
    DECLARE v_account_eight VARCHAR(15);
    DECLARE v_fd_id CHAR(20);
    DECLARE v_txn_id BIGINT;
    DECLARE v_balance DECIMAL(14,2);
    DECLARE v_sender_balance DECIMAL(14,2);
    DECLARE v_receiver_balance DECIMAL(14,2);
    DECLARE v_cycle INT DEFAULT 0;
    DECLARE v_bank_start TIME;
    DECLARE v_bank_close TIME;

    SELECT person_id INTO v_agent_one
    FROM PERSON WHERE nic = '198812345678' LIMIT 1;
    SELECT person_id INTO v_agent_two
    FROM PERSON WHERE nic = '199112345679' LIMIT 1;

    SELECT person_id INTO v_agent_three
    FROM PERSON WHERE nic = '198706200006' LIMIT 1;
    IF v_agent_three IS NULL THEN
        CALL sp_create_staff(
            'Tharindu', 'Senanayake', '1987-06-20', '198706200006',
            '0778901234', '22 Lotus Avenue, Colombo 04', '00400',
            'AGENT', 2, 'OPERATIONS', 165000.00
        );
        SELECT person_id INTO v_agent_three
        FROM PERSON WHERE nic = '198706200006' LIMIT 1;
    END IF;

    SELECT person_id INTO v_agent_four
    FROM PERSON WHERE nic = '199303150007' LIMIT 1;
    IF v_agent_four IS NULL THEN
        CALL sp_create_staff(
            'Ishara', 'Gunawardena', '1993-03-15', '199303150007',
            '0718901234', '8 Hill Street, Kandy', '20000',
            'AGENT', 3, 'CUSTOMER_SERVICE', 150000.00
        );
        SELECT person_id INTO v_agent_four
        FROM PERSON WHERE nic = '199303150007' LIMIT 1;
    END IF;

    SELECT person_id INTO v_agent_five
    FROM PERSON WHERE nic = '198411250008' LIMIT 1;
    IF v_agent_five IS NULL THEN
        CALL sp_create_staff(
            'Pradeep', 'Rathnayake', '1984-11-25', '198411250008',
            '0769012345', '31 Palm Road, Galle', '80000',
            'AGENT', 3, 'CREDIT', 175000.00
        );
        SELECT person_id INTO v_agent_five
        FROM PERSON WHERE nic = '198411250008' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_one
    FROM PERSON WHERE nic = '199201010009' LIMIT 1;
    IF v_customer_one IS NULL THEN
        CALL sp_create_adult_customer(
            'Amaya', 'Ranatunga', '1992-01-01', '0779012345',
            '15 Park Road, Colombo 05', '00500', '199201010009',
            'TAX-DEMO-009', v_agent_three, 'Architect', 240000.00
        );
        SELECT person_id INTO v_customer_one
        FROM PERSON WHERE nic = '199201010009' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_two
    FROM PERSON WHERE nic = '198905120010' LIMIT 1;
    IF v_customer_two IS NULL THEN
        CALL sp_create_adult_customer(
            'Nuwan', 'Karunaratne', '1989-05-12', '0710123456',
            '7 River Road, Kandy', '20000', '198905120010',
            'TAX-DEMO-010', v_agent_four, 'Consultant', 210000.00
        );
        SELECT person_id INTO v_customer_two
        FROM PERSON WHERE nic = '198905120010' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_three
    FROM PERSON WHERE nic = '199607230011' LIMIT 1;
    IF v_customer_three IS NULL THEN
        CALL sp_create_adult_customer(
            'Mihiri', 'Bandara', '1996-07-23', '0771234506',
            '19 Lake Lane, Galle', '80000', '199607230011',
            'TAX-DEMO-011', v_agent_five, 'Designer', 190000.00
        );
        SELECT person_id INTO v_customer_three
        FROM PERSON WHERE nic = '199607230011' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_four
    FROM PERSON WHERE nic = '198302180012' LIMIT 1;
    IF v_customer_four IS NULL THEN
        CALL sp_create_adult_customer(
            'Suresh', 'Wijeratne', '1983-02-18', '0712345607',
            '26 Temple Street, Colombo 03', '00300', '198302180012',
            'TAX-DEMO-012', v_agent_three, 'Engineer', 280000.00
        );
        SELECT person_id INTO v_customer_four
        FROM PERSON WHERE nic = '198302180012' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_five
    FROM PERSON WHERE nic = '199410300013' LIMIT 1;
    IF v_customer_five IS NULL THEN
        CALL sp_create_adult_customer(
            'Thilini', 'Mendis', '1994-10-30', '0763456708',
            '4 Beach View, Galle', '80000', '199410300013',
            'TAX-DEMO-013', v_agent_four, 'Analyst', 205000.00
        );
        SELECT person_id INTO v_customer_five
        FROM PERSON WHERE nic = '199410300013' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_six
    FROM PERSON WHERE nic = '198711110014' LIMIT 1;
    IF v_customer_six IS NULL THEN
        CALL sp_create_adult_customer(
            'Kasun', 'Herath', '1987-11-11', '0774567809',
            '11 Garden Road, Kandy', '20000', '198711110014',
            'TAX-DEMO-014', v_agent_five, 'Manager', 350000.00
        );
        SELECT person_id INTO v_customer_six
        FROM PERSON WHERE nic = '198711110014' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_seven
    FROM PERSON WHERE nic = '199902220015' LIMIT 1;
    IF v_customer_seven IS NULL THEN
        CALL sp_create_adult_customer(
            'Sachini', 'Ekanayake', '1999-02-22', '0715678900',
            '16 Main Road, Colombo 07', '00700', '199902220015',
            'TAX-DEMO-015', v_agent_three, 'Teacher', 160000.00
        );
        SELECT person_id INTO v_customer_seven
        FROM PERSON WHERE nic = '199902220015' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_eight
    FROM PERSON WHERE nic = '199307160016' LIMIT 1;
    IF v_customer_eight IS NULL THEN
        CALL sp_create_adult_customer(
            'Rashmi', 'Alwis', '1993-07-16', '0776789011',
            '9 Station Road, Colombo 02', '00200', '199307160016',
            'TAX-DEMO-016', v_agent_four, 'Pharmacist', 225000.00
        );
        SELECT person_id INTO v_customer_eight
        FROM PERSON WHERE nic = '199307160016' LIMIT 1;
    END IF;

    SELECT person_id INTO v_customer_nine
    FROM PERSON WHERE nic = '198608270017' LIMIT 1;
    IF v_customer_nine IS NULL THEN
        CALL sp_create_adult_customer(
            'Lahiru', 'Fernando', '1986-08-27', '0717890122',
            '33 School Lane, Kandy', '20000', '198608270017',
            'TAX-DEMO-017', v_agent_five, 'Lecturer', 260000.00
        );
        SELECT person_id INTO v_customer_nine
        FROM PERSON WHERE nic = '198608270017' LIMIT 1;
    END IF;

    SELECT person_id INTO v_existing_joint_customer
    FROM PERSON WHERE nic = '199810100005' LIMIT 1;

    INSERT INTO AUTH_USER (
        person_id, email, username, password_hash, user_role,
        failed_login_attempts, is_locked
    )
    VALUES
        (v_agent_three, 'tharindu.senanayake@mimsbank.lk', 'tharindu_agent',
         SHA2('TharinduAgent123!', 256), 'STAFF', 0, FALSE),
        (v_agent_four, 'ishara.gunawardena@mimsbank.lk', 'ishara_agent',
         SHA2('IsharaAgent123!', 256), 'STAFF', 0, FALSE),
        (v_agent_five, 'pradeep.rathnayake@mimsbank.lk', 'pradeep_agent',
         SHA2('PradeepAgent123!', 256), 'STAFF', 0, FALSE),
        (v_customer_one, 'amaya.ranatunga@gmail.com', 'amaya_r',
         SHA2('AmayaCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_two, 'nuwan.karunaratne@gmail.com', 'nuwan_k',
         SHA2('NuwanCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_three, 'mihiri.bandara@gmail.com', 'mihiri_b',
         SHA2('MihiriCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_four, 'suresh.wijeratne@gmail.com', 'suresh_w',
         SHA2('SureshCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_five, 'thilini.mendis@gmail.com', 'thilini_m',
         SHA2('ThiliniCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_six, 'kasun.herath@gmail.com', 'kasun_h',
         SHA2('KasunCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_seven, 'sachini.ekanayake@gmail.com', 'sachini_e',
         SHA2('SachiniCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_eight, 'rashmi.alwis@gmail.com', 'rashmi_a',
         SHA2('RashmiCustomer123!', 256), 'CUSTOMER', 0, FALSE),
        (v_customer_nine, 'lahiru.fernando@gmail.com', 'lahiru_f',
         SHA2('LahiruCustomer123!', 256), 'CUSTOMER', 0, FALSE)
    ON DUPLICATE KEY UPDATE
        email = VALUES(email),
        username = VALUES(username),
        password_hash = VALUES(password_hash),
        failed_login_attempts = 0,
        is_locked = FALSE;

    SELECT sa.account_no INTO v_account_one
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_one
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_one IS NULL THEN
        CALL sp_open_savings_account(2, v_agent_three, v_customer_one, 'ADULT', 90000.00, v_account_one);
    END IF;

    SELECT sa.account_no INTO v_account_two
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_two
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_two IS NULL THEN
        CALL sp_open_savings_account(2, v_agent_four, v_customer_two, 'ADULT', 90000.00, v_account_two);
    END IF;

    SELECT sa.account_no INTO v_account_three
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_three
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_three IS NULL THEN
        CALL sp_open_savings_account(3, v_agent_five, v_customer_three, 'ADULT', 90000.00, v_account_three);
    END IF;

    SELECT sa.account_no INTO v_account_four
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_four
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_four IS NULL THEN
        CALL sp_open_savings_account(3, v_agent_three, v_customer_four, 'ADULT', 90000.00, v_account_four);
    END IF;

    SELECT sa.account_no INTO v_account_five
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_five
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_five IS NULL THEN
        CALL sp_open_savings_account(3, v_agent_four, v_customer_five, 'ADULT', 90000.00, v_account_five);
    END IF;

    SELECT sa.account_no INTO v_account_six
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_six
      AND sa.status = 'ACTIVE' LIMIT 1;
    IF v_account_six IS NULL THEN
        CALL sp_open_savings_account(2, v_agent_five, v_customer_six, 'JOINT', 120000.00, v_account_six);
        CALL sp_add_joint_holder(v_account_six, v_customer_seven);
    END IF;

    SELECT sa.account_no INTO v_account_seven
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_customer_seven
      AND sa.status = 'ACTIVE'
      AND sa.plan_code <> 'JOINT' LIMIT 1;
    IF v_account_seven IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_three, v_customer_seven, 'ADULT', 90000.00, v_account_seven);
    END IF;

    SELECT sa.account_no INTO v_account_eight
    FROM SAVINGS_ACCOUNT sa
    JOIN ACCOUNT_HOLDER ah ON ah.account_no = sa.account_no
    WHERE ah.customer_person_id = v_existing_joint_customer
      AND sa.status = 'ACTIVE'
      AND sa.plan_code = 'ADULT' LIMIT 1;
    IF v_account_eight IS NULL THEN
        CALL sp_open_savings_account(1, v_agent_two, v_existing_joint_customer, 'ADULT', 90000.00, v_account_eight);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_one AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_one, '6M', 20000.00, v_agent_three, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_two AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_two, '1Y', 20000.00, v_agent_four, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_three AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_three, '3Y', 20000.00, v_agent_five, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_four AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_four, '6M', 20000.00, v_agent_three, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_five AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_five, '1Y', 20000.00, v_agent_four, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_six AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_six, '3Y', 20000.00, v_agent_five, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_seven AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_seven, '6M', 20000.00, v_agent_three, v_fd_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM FIXED_DEPOSIT WHERE active_acc_no = v_account_eight AND status = 'ACTIVE') THEN
        CALL sp_open_fixed_deposit(v_account_eight, '1Y', 20000.00, v_agent_two, v_fd_id);
    END IF;

    IF (SELECT COUNT(*) FROM TRANSACTION_LOG) < 100
       OR NOT EXISTS (
           SELECT 1 FROM AtoA_TRANSFER_LOG
       ) THEN
        SELECT bank_start_time, bank_close_time
        INTO v_bank_start, v_bank_close
        FROM BANK_META_DATA LIMIT 1;

        UPDATE BANK_META_DATA
        SET bank_start_time = '00:00:00',
            bank_close_time = '23:59:59';

        WHILE v_cycle < 40 DO
            CALL sp_process_deposit(
                v_account_one, v_agent_three, 1000.00,
                CONCAT('DEMO-DEPOSIT-', v_cycle), v_txn_id, v_balance
            );
            CALL sp_process_withdrawal(
                v_account_one, v_agent_three, 100.00,
                CONCAT('DEMO-WITHDRAWAL-', v_cycle), v_txn_id, v_balance
            );
            CALL sp_account_transfer(
                v_account_one, v_account_two, v_agent_three, 250.00,
                CONCAT('DEMO-TRANSFER-', v_cycle), v_txn_id,
                v_sender_balance, v_receiver_balance
            );
            SET v_cycle = v_cycle + 1;
        END WHILE;

        UPDATE BANK_META_DATA
        SET bank_start_time = v_bank_start,
            bank_close_time = v_bank_close;

        CALL sp_run_savings_interest_accrual(
            DATE_ADD(CURDATE(), INTERVAL 365 DAY)
        );
        CALL sp_run_fd_interest_payout(
            DATE_ADD(CURDATE(), INTERVAL 60 DAY)
        );
    END IF;
END$$

CALL sp_seed_extended_demo_data()$$

DROP PROCEDURE sp_seed_extended_demo_data$$

DELIMITER ;
