DROP PROCEDURE IF EXISTS sp_open_savings_account;

ALTER TABLE SAVINGS_ACCOUNT ADD COLUMN Serial_no INT AUTO_INCREMENT UNIQUE FIRST;

DELIMITER $$

CREATE PROCEDURE sp_open_savings_account(
    IN p_branch_id INT,
    IN p_agent_person_id INT,
    IN p_customer_id INT,
    IN p_plan_code VARCHAR(10),
    IN p_initial_deposit DECIMAL(14,2),
    OUT p_account_no VARCHAR(15)
)
BEGIN
    DECLARE v_dob DATE;
    DECLARE v_rate DECIMAL(5,2);
    DECLARE v_min_bal DECIMAL(12,2);
    DECLARE v_serial INT

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SELECT dob INTO v_dob FROM PERSON WHERE person_id = p_customer_id;
    IF v_dob IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening Failed: Customer does not exist.';
    END IF;

    IF NOT fn_is_plan_eligible(p_plan_code, v_dob) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening Failed: Customer age does not qualify for selected plan.';
    END IF;

    SELECT annual_interest_rate, min_balance 
    INTO v_rate, v_min_bal 
    FROM SAV_ACC_PLAN WHERE plan_code = p_plan_code;

    IF v_rate IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening Failed: Invalid savings plan selected.';
    END IF;
    
    IF p_initial_deposit < v_min_bal THEN
        SIGNAL SQLSTATE '45000' 
        SET MESSAGE_TEXT = 'Opening Failed: Initial deposit is lower than the plan required minimum balance.';
    END IF;

    START TRANSACTION;

        INSERT INTO SAVINGS_ACCOUNT (
            account_no, branch_id, agent_person_id, plan_code, opened_date,
            status, next_accrual_date, balance, daily_interest,
            contracted_interest_rate, contracted_min_balance,
            curr_accrual_cycle_no, last_txn_date
        ) VALUES (
            UUID(), p_branch_id, p_agent_person_id, p_plan_code, CURDATE(),
            'ACTIVE', DATE_ADD(CURDATE(), INTERVAL 30 DAY), p_initial_deposit, 0.00,
            v_rate, v_min_bal, 0, CURDATE()
        );

        SET v_serial = LAST_INSERT_ID();

        SET p_account_no = CONCAT('SA', LPAD(v_serial MOD 100000, 5, '0'), LPAD(FLOOR(RAND() * 99999), 5, '0'));
        UPDATE SAVINGS_ACCOUNT SET account_no = p_account_no WHERE Serial_no = v_serial;

        
        INSERT INTO ACCOUNT_HOLDER (account_no, customer_person_id, holder_role)
        VALUES (p_account_no, p_customer_id, 'PRIMARY');

        
        INSERT INTO TRANSACTION_LOG (
            sav_acc_no, agent_person_id, fd_id, txn_type, amount, balance_after, ref_text, txn_timestamp
        ) VALUES (
            p_account_no, p_agent_person_id, NULL, 'DEPOSIT', p_initial_deposit, p_initial_deposit, 'Initial Opening Deposit', NOW()
        );

    COMMIT;
END$$

DELIMITER ;
