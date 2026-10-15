DELIMITER $$

DROP TRIGGER IF EXISTS trg_bi_atoa_transfer_log$$
CREATE TRIGGER trg_bi_atoa_transfer_log
BEFORE INSERT ON AtoA_TRANSFER_LOG
FOR EACH ROW
BEGIN
    IF NEW.sender_acc_no IS NOT NULL AND NEW.receiver_acc_no IS NOT NULL AND NEW.sender_acc_no = NEW.receiver_acc_no THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Sender and receiver accounts must be distinct.';
    END IF;
END$$

DROP TRIGGER IF EXISTS trg_bu_atoa_transfer_log$$
CREATE TRIGGER trg_bu_atoa_transfer_log
BEFORE UPDATE ON AtoA_TRANSFER_LOG
FOR EACH ROW
BEGIN
    IF NEW.sender_acc_no IS NOT NULL AND NEW.receiver_acc_no IS NOT NULL AND NEW.sender_acc_no = NEW.receiver_acc_no THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Sender and receiver accounts must be distinct.';
    END IF;
END$$

-- Acc type age validation
DROP FUNCTION IF EXISTS fn_is_plan_eligible$$
CREATE FUNCTION fn_is_plan_eligible(p_plan_code VARCHAR(10),p_dob DATE) 
RETURNS BOOLEAN 
NOT DETERMINISTIC
NO SQL
BEGIN
    DECLARE v_age INT;
    SET v_age=fn_calculate_age(p_dob);
    CASE p_plan_code
        WHEN 'CHILD' THEN RETURN(v_age<13);
        WHEN 'TEEN' THEN RETURN((v_age>=13) AND(v_age<=17));
        WHEN 'ADULT' THEN RETURN((v_age>=18) AND(v_age<=59));
        WHEN 'SENIOR' THEN RETURn(v_age>=60);
        WHEN 'JOINT' THEN RETURN(v_age>=18);
        ELSE RETURN FALSE;
    END CASE;
END$$

-- System operations within bank hours?
DROP FUNCTION IF EXISTS fn_is_within_banking_hours$$
CREATE FUNCTION fn_is_within_banking_hours() 
RETURNS BOOLEAN 
NOT DETERMINISTIC
READS SQL DATA
BEGIN
    DECLARE v_start TIME;
    DECLARE v_close TIME;
    DECLARE v_now TIME;
    SELECT bank_start_time, bank_close_time INTO v_start, v_close 
    FROM BANK_META_DATA LIMIT 1;
    IF v_start IS NULL OR v_close IS NULL THEN
        RETURN TRUE;
    END IF;
    SET v_now=CURRENT_TIME();
    IF v_start<=v_close THEN
        RETURN(v_now>=v_start AND v_now<=v_close);
    ELSE
        RETURN(v_now>=v_start OR v_now<=v_close);
    END IF;
END$$

-- agent assisted daily withdrawal
DROP FUNCTION IF EXISTS fn_get_agent_daily_withdrawn$$
CREATE FUNCTION fn_get_agent_daily_withdrawn(p_account_no VARCHAR(15)) 
RETURNS DECIMAL(14,2) 
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);
    SELECT COALESCE(SUM(dw.amount), 0.00) INTO v_total
    FROM DEPOSIT_WITHDRAW_LOG dw
    JOIN TRANSACTION_LOG t ON dw.txn_id=t.txn_id
    WHERE dw.sav_acc_no=p_account_no
        AND dw.txn_type='WITHDRAWAL'
        AND DATE(t.txn_timestamp)=CURDATE()
        AND dw.agent_person_id IS NOT NULL;
    RETURN v_total;
END$$

-- got active FD?
DROP FUNCTION IF EXISTS fn_has_active_fd$$
CREATE FUNCTION fn_has_active_fd(p_account_no VARCHAR(15)) 
RETURNS BOOLEAN 
READS SQL DATA
BEGIN
    RETURN EXISTS(
        SELECT 1 
        FROM FIXED_DEPOSIT 
        WHERE active_acc_no=p_account_no 
            AND status='ACTIVE'
    );
END$$

DELIMITER ;

-------------------------

DELIMITER $$

-- minimum balance and overdraft prevention
DROP TRIGGER IF EXISTS trg_before_insert_transaction_log$$
CREATE TRIGGER trg_before_insert_transaction_log
BEFORE INSERT ON DEPOSIT_WITHDRAW_LOG
FOR EACH ROW
BEGIN
    DECLARE v_curr_bal DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_min_bal DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_status ENUM ('ACTIVE', 'DORMANT', 'CLOSED') DEFAULT NULL;
    
    IF NEW.txn_type='WITHDRAWAL' THEN
        IF NEW.sav_acc_no IS NULL THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Withdrawal records must reference a valid sav_acc_no.';
        END IF;
        
        SELECT balance, contracted_min_balance, status 
        INTO v_curr_bal, v_min_bal, v_status
        FROM SAVINGS_ACCOUNT 
        WHERE account_no=NEW.sav_acc_no;
        
        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Referenced savings account does not exist.';
        END IF;
        
        IF v_status='DORMANT' THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Account is DORMANT. Agent reactivation required.';
        ELSEIF v_status='CLOSED' THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Cannot withdraw from a CLOSED account.';
        END IF;
        
        IF(v_curr_bal-NEW.amount)<v_min_bal THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Transaction breaches the contracted minimum balance.';
        END IF;
    END IF;
END$$

-- Block UPDATE on TRANSACTION_LOG
DROP TRIGGER IF EXISTS trg_prevent_update_transaction_log$$
CREATE TRIGGER trg_prevent_update_transaction_log
BEFORE UPDATE ON TRANSACTION_LOG
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT='TRANSACTION_LOG records are immutable.';
END$$

-- Block DELETE on TRANSACTION_LOG
DROP TRIGGER IF EXISTS trg_prevent_delete_transaction_log$$
CREATE TRIGGER trg_prevent_delete_transaction_log
BEFORE DELETE ON TRANSACTION_LOG
FOR EACH ROW
BEGIN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT='TRANSACTION_LOG records cannot be deleted.';
END$$

-- Prevent closing Sav acc with Active or Unsettled FDs
DROP TRIGGER IF EXISTS trg_prevent_closing_account_with_fd$$
CREATE TRIGGER trg_prevent_closing_account_with_fd
BEFORE UPDATE ON SAVINGS_ACCOUNT
FOR EACH ROW
BEGIN
    IF NEW.status='CLOSED' AND OLD.status!='CLOSED' THEN
        IF EXISTS(
            SELECT 1 
            FROM FIXED_DEPOSIT 
            WHERE(acc_no=OLD.account_no OR active_acc_no=OLD.account_no)
                AND status='ACTIVE'
        ) THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Savings account has active, unsettled Fixed Deposits linked to it.';
        END IF;
    END IF;
END$$

DELIMITER ;