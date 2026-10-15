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
        (v_adult, 'thisathsenindu@gmail.com', 'dilan_w',
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
