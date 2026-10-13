CREATE TABLE LOG_TRANSACTIONS(
    txn_id BIGINT NOT NULL AUTO_INCREMENT,
    txn_type ENUM('DEPOSIT_WITHDRAWAL','INTEREST','TRANSFER') NOT NULL,
    txn_timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(txn_id)
);

CREATE TABLE DEPOSIT_WITHDRAW_LOG(
    txn_id BIGINT NOT NULL,
    txn_type ENUM('DEPOSIT','WITHDRAWAL') NOT NULL,
    agent_person_id INT NULL,
    sav_acc_no VARCHAR(15) NULL,
    amount NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    ref_text VARCHAR(50) NULL,
    PRIMARY KEY(txn_id),
    CONSTRAINT chk_dw_amount CHECK (amount > 0),
    CONSTRAINT fk_dw_txn FOREIGN KEY(txn_id)
        REFERENCES LOG_TRANSACTIONS(txn_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dw_savings FOREIGN KEY(sav_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_dw_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE INTEREST_LOG(
    txn_id BIGINT NOT NULL,
    account_type ENUM('FIXED','SAVINGS') NOT NULL,
    sav_acc_no VARCHAR(15) NULL,
    fd_id VARCHAR(15) NULL,
    amount NUMERIC(14,2) NOT NULL,
    balance_after NUMERIC(14,2) NOT NULL,
    ref_text VARCHAR(50) NULL,
    PRIMARY KEY(txn_id),
    CONSTRAINT chk_int_amount CHECK (amount > 0),
    CONSTRAINT fk_int_txn FOREIGN KEY(txn_id)
        REFERENCES LOG_TRANSACTIONS(txn_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_int_savings FOREIGN KEY(sav_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_int_fd FOREIGN KEY(fd_id) 
        REFERENCES FIXED_DEPOSIT(fd_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE AtoA_TRANSFER_LOG(
    txn_id BIGINT NOT NULL,
    sender_acc_no VARCHAR(15) NULL,
    receiver_acc_no VARCHAR(15) NULL,
    agent_person_id INT NULL,
    amount NUMERIC(14,2) NOT NULL,
    sender_balance_after NUMERIC(14,2) NOT NULL, 
    receiver_balance_after NUMERIC(14,2) NOT NULL,
    ref_text VARCHAR(50) NULL,
    PRIMARY KEY(txn_id),
    CONSTRAINT chk_aca_amount CHECK (amount > 0),
    CONSTRAINT chk_aca_distinct_accounts CHECK (sender_acc_no <> receiver_acc_no),
    CONSTRAINT fk_aca_txn FOREIGN KEY(txn_id)
        REFERENCES LOG_TRANSACTIONS(txn_id)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_aca_sender FOREIGN KEY(sender_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_aca_receiver FOREIGN KEY(receiver_acc_no) 
        REFERENCES SAVINGS_ACCOUNT(account_no) 
        ON DELETE SET NULL ON UPDATE CASCADE,    
    CONSTRAINT fk_aca_agent FOREIGN KEY(agent_person_id) 
        REFERENCES PERSON(person_id) 
        ON DELETE SET NULL ON UPDATE CASCADE
);
