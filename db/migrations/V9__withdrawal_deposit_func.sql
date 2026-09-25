DELIMITER $$

DROP PROCEDURE IF EXISTS sp_process_deposit$$
CREATE PROCEDURE sp_process_deposit(
    IN p_account_no VARCHAR(15),
    IN p_agent_id INT,
    IN p_amount DECIMAL(14,2),
    IN p_ref_text VARCHAR(50),
    OUT p_txn_id BIGINT,
    OUT p_new_balance DECIMAL(14,2)
)
BEGIN
    DECLARE v_status ENUM('ACTIVE','DORMANT','CLOSED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount<=0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT='Deposit amount must be greater than zero.';
    END IF;

    IF NOT fn_is_within_banking_hours() THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT='Manual deposits are permitted only during business banking hours';
    END IF;

    START TRANSACTION;
        SELECT balance,status INTO p_new_balance,v_status
        FROM SAVINGS_ACCOUNT
        WHERE account_no=p_account_no FOR UPDATE;

        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Savings account does not exist.';
        END IF;

        IF v_status!='ACTIVE' THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Savings account is not ACTIVE';
        END IF;

        SET p_new_balance=p_new_balance+p_amount;

        INSERT INTO TRANSACTION_LOG(
            sav_acc_no,agent_person_id,fd_id,txn_type,amount,balance_after,ref_text,txn_timestamp
        ) VALUES(
            p_account_no,p_agent_id,NULL,'DEPOSIT',p_amount,p_new_balance,p_ref_text,NOW()
        );
        SET p_txn_id=LAST_INSERT_ID();

        UPDATE SAVINGS_ACCOUNT
        SET balance=p_new_balance,last_txn_date=CURDATE()
        WHERE account_no=p_account_no;
    COMMIT;
END$$

DROP PROCEDURE IF EXISTS sp_process_withdrawal$$
CREATE PROCEDURE sp_process_withdrawal(
    IN p_account_no VARCHAR(15),
    IN p_agent_id INT,
    IN p_amount DECIMAL(14,2),
    IN p_ref_text VARCHAR(50),
    OUT p_txn_id BIGINT,
    OUT p_new_balance DECIMAL(14,2)
)
BEGIN
    DECLARE v_daily_limit DECIMAL(14,2);
    DECLARE v_already_withdrawn DECIMAL(14,2);
    DECLARE v_min_bal DECIMAL(14,2);
    DECLARE v_curr_bal DECIMAL(14,2);
    DECLARE v_status ENUM('ACTIVE','DORMANT','CLOSED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount<=0 THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT='Withdrawal amount must be greater than zero.';
    END IF;
    
    IF NOT fn_is_within_banking_hours() THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT='Manual withdrawals are permitted only during business banking hours';
    END IF;

    SELECT daily_agent_withdrawal_limit INTO v_daily_limit 
    FROM BANK_META_DATA LIMIT 1;
    
    SET v_already_withdrawn=fn_get_agent_daily_withdrawn(p_account_no);
    IF(v_already_withdrawn+p_amount) >v_daily_limit THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT='Daily withdrawal limit exceeded';
    END IF;

    START TRANSACTION;
        SELECT balance,contracted_min_balance,status 
        INTO v_curr_bal,v_min_bal,v_status
        FROM SAVINGS_ACCOUNT
        WHERE account_no=p_account_no FOR UPDATE;

        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account does not exist.';
        END IF;

        IF v_status='DORMANT' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account is DORMANT';
        ELSEIF v_status='CLOSED' THEN
            SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT='Account is CLOSED';
        END IF;

        IF(p_new_balance-p_amount) < v_min_bal THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Remaining balance breaches the contracted minimum balance';
        END IF;

        SET p_new_balance=p_new_balance-p_amount;

        INSERT INTO TRANSACTION_LOG(
            sav_acc_no,agent_person_id,fd_id,txn_type,amount,balance_after,ref_text,txn_timestamp
        ) VALUES(
            p_account_no,p_agent_id,NULL,'WITHDRAWAL',p_amount,p_new_balance,p_ref_text,NOW()
        );
        SET p_txn_id=LAST_INSERT_ID();

        UPDATE SAVINGS_ACCOUNT
        SET balance=p_new_balance,last_txn_date=CURDATE()
        WHERE account_no=p_account_no;
    COMMIT;
END$$

DELIMITER ;