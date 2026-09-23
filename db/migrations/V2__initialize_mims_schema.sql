-- droping test table
DROP TABLE IF EXISTS connection_test;

CREATE TABLE BANK_META_DATA(
    bank_id VARCHAR(10) NOT NULL,
    bank_name VARCHAR(50) NOT NULL,
    daily_agent_withdrawal_limit DECIMAL(14,2) NOT NULL,
    contact_email VARCHAR(50) NOT NULL,
    motto VARCHAR(30) NULL,
    bank_start_time TIME NOT NULL,
    bank_close_time TIME NOT NULL,
    PRIMARY KEY(bank_id)
);  

CREATE TABLE BRANCH(
    branch_id INT NOT NULL AUTO_INCREMENT,
    branch_name VARCHAR(100) NOT NULL,
    district VARCHAR(50) NOT NULL,
    address VARCHAR(150) NOT NULL,
    contact_no VARCHAR(15) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(branch_id)
);

CREATE TABLE PERSON(
    person_id INT NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    dob DATE NOT NULL,
    phone_number VARCHAR(12) NOT NULL,
    address VARCHAR(100) NOT NULL,
    postal_code VARCHAR(6) NOT NULL,
    PRIMARY KEY(person_id)
);

CREATE TABLE AUTH_USER(
    person_id INT NOT NULL,
    email VARCHAR(50) NOT NULL,
    username VARCHAR(50) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_role ENUM('ADMIN','STAFF','CUSTOMER') NOT NULL,
    last_login_at TIMESTAMP NULL DEFAULT NULL,
    PRIMARY KEY(person_id),
    UNIQUE KEY uq_user_email(email),
    UNIQUE KEY uq_user_username(username),
    CONSTRAINT fk_user_person FOREIGN KEY(person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE SYSTEM_AUDIT_LOG(
    audit_id BIGINT NOT NULL AUTO_INCREMENT,
    person_id INT NULL,
    action ENUM('LOGIN','LOGOUT','CREATE','UPDATE','DELETE','TRANSACTION') NOT NULL,
    ip VARCHAR(45) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(audit_id),
    CONSTRAINT fk_audit_person FOREIGN KEY(person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE STAFF_PROFILE(
    person_id INT NOT NULL,
    staff_role ENUM('MANAGER','CASHIER','OFFICER','AGENT','ADMIN') NOT NULL,
    branch_id INT NOT NULL,
    department ENUM('OPERATIONS','CREDIT','IT','CUSTOMER_SERVICE') NOT NULL,
    salary DECIMAL(12,2) NOT NULL,
    daily_cash DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY(person_id),
    CONSTRAINT fk_staff_person FOREIGN KEY(person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_staff_branch FOREIGN KEY(branch_id) 
        REFERENCES BRANCH(branch_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ADULT_CUSTOMER_PROFILES(
    person_id INT NOT NULL,
    nic VARCHAR(12) NOT NULL,
    tax_id VARCHAR(20) NULL,
    agent_person_id INT NULL,
    occupation VARCHAR(50) NULL,
    monthly_income DECIMAL(12,2) NULL,
    PRIMARY KEY(person_id),
    UNIQUE KEY uq_adult_nic(nic),
    UNIQUE KEY uq_adult_tax_id(tax_id),
    CONSTRAINT fk_adult_person FOREIGN KEY(person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_adult_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE MINOR_CUSTOMER_PROFILES(
    person_id INT NOT NULL,
    birth_cert_no VARCHAR(12) NOT NULL,
    guardian_person_id INT NOT NULL,
    agent_person_id INT NULL,
    relation ENUM('FATHER','MOTHER','LEGAL_GUARDIAN') NOT NULL,
    PRIMARY KEY(person_id),
    UNIQUE KEY uq_minor_birth_cert(birth_cert_no),
    CONSTRAINT fk_minor_person FOREIGN KEY(person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_minor_guardian FOREIGN KEY(guardian_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_minor_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE SAV_ACC_PLAN(
    plan_code ENUM('CHILD','TEEN','ADULT','SENIOR','JOINT') NOT NULL,
    plan_name VARCHAR(30) NOT NULL,
    annual_interest_rate DECIMAL(5,2) NOT NULL,
    min_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    min_age INT NOT NULL DEFAULT 0,
    max_age INT NULL,
    allows_joint BOOLEAN NOT NULL DEFAULT FALSE,
    PRIMARY KEY(plan_code)
);

CREATE TABLE FD_ACC_PLAN(
    term_code ENUM('6M','1Y','3Y') NOT NULL,
    duration_months INT NOT NULL,
    annual_interest_rate DECIMAL(5,2) NOT NULL,
    PRIMARY KEY(term_code)
);

CREATE TABLE SAVINGS_ACCOUNT(
    account_no VARCHAR(15) NOT NULL,
    branch_id INT NOT NULL,
    agent_person_id INT NULL,
    plan_code ENUM('CHILD','TEEN','ADULT','SENIOR','JOINT') NOT NULL,
    opened_date DATE NOT NULL,
    status ENUM('ACTIVE','DORMANT','CLOSED') NOT NULL DEFAULT 'ACTIVE',
    next_accrual_date DATE NULL,
    balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    daily_interest DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    contracted_interest_rate DECIMAL(5,2) NOT NULL,
    contracted_min_balance DECIMAL(14,2) NOT NULL DEFAULT 0.00,
    curr_accrual_cycle_no INT NOT NULL DEFAULT 0,
    last_txn_date DATE NULL,
    closed_date DATE NULL,
    PRIMARY KEY(account_no),
    CONSTRAINT fk_savings_branch FOREIGN KEY(branch_id) 
        REFERENCES BRANCH(branch_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_savings_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_savings_plan FOREIGN KEY(plan_code) 
        REFERENCES SAV_ACC_PLAN(plan_code) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE ACCOUNT_HOLDER(
    account_no VARCHAR(15) NOT NULL,
    customer_person_id INT NOT NULL,
    holder_role ENUM('PRIMARY','JOINT','GUARDIAN') NOT NULL DEFAULT 'PRIMARY',
    PRIMARY KEY(account_no,customer_person_id),
    CONSTRAINT fk_holder_account FOREIGN KEY(account_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_holder_customer FOREIGN KEY(customer_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE FIXED_DEPOSIT(
    fd_id VARCHAR(15) NOT NULL,
    active_acc_no VARCHAR(15) NULL,
    acc_no VARCHAR(15) NOT NULL,
    term_code ENUM('6M','1Y','3Y') NOT NULL,
    principal_amount DECIMAL(14,2) NOT NULL,
    opened_date DATE NOT NULL,
    maturity_date DATE NOT NULL,
    next_accrual_date DATE NULL,
    contracted_interest_rate DECIMAL(5,2) NOT NULL,
    curr_accrual_cycle_no INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE','MATURED','PREMATURELY_CLOSED','SETTLED') NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY(fd_id),
    UNIQUE KEY uq_fd_active_acc(active_acc_no),
    CONSTRAINT fk_fd_active_savings FOREIGN KEY(active_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_fd_savings FOREIGN KEY(acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_fd_term FOREIGN KEY(term_code) 
        REFERENCES FD_ACC_PLAN(term_code) 
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE TRANSACTION_LOG(
    txn_id BIGINT NOT NULL AUTO_INCREMENT,
    sav_acc_no VARCHAR(15) NULL,
    agent_person_id INT NULL,
    fd_id VARCHAR(15) NULL,
    txn_type ENUM('DEPOSIT','WITHDRAWAL','SAVINGS_INTEREST','FD_INTEREST') NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    balance_after DECIMAL(14,2) NOT NULL,
    ref_text VARCHAR(50) NULL,
    txn_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(txn_id),
    CONSTRAINT fk_txn_savings FOREIGN KEY(sav_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_txn_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_txn_fd FOREIGN KEY(fd_id) 
        REFERENCES FIXED_DEPOSIT(fd_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);