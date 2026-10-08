DROP PROCEDURE IF EXISTS sp_open_savings_account;


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
    DECLARE v_guardian_id INT;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_agent_person_id IS NULL OR p_agent_person_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A valid agent ID is required.';
    END IF;

    SELECT dob INTO v_dob FROM PERSON WHERE person_id = p_customer_id;
    IF v_dob IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening Failed: Customer does not exist.';
    END IF;

    IF NOT fn_is_plan_eligible(p_plan_code, v_dob) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Opening Failed: Customer age does not qualify for selected plan.';
    END IF;

    IF p_plan_code IN ('CHILD','TEEN') THEN
        SELECT guardian_person_id INTO v_guardian_id 
        FROM MINOR_CUSTOMER_PROFILE 
        WHERE person_id=p_customer_id;

        IF v_guardian_id IS NULL THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT='Children and Teen accounts require a linked guardian.';
        END IF;
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

        SET p_account_no = CONCAT('SA', LPAD(FLOOR(RAND() * 999999999), 10, '0'));

        INSERT INTO SAVINGS_ACCOUNT (
            account_no, branch_id, agent_person_id, plan_code, opened_date,
            status, next_accrual_date, balance, daily_interest,
            contracted_interest_rate, contracted_min_balance,
            curr_accrual_cycle_no, last_txn_date
        ) VALUES (
            p_account_no, p_branch_id, p_agent_person_id, p_plan_code, CURDATE(),
            'ACTIVE', DATE_ADD(CURDATE(), INTERVAL 30 DAY), p_initial_deposit, 0.00,
            v_rate, v_min_bal, 0, CURDATE()
        );

        IF p_plan_code != 'JOINT' THEN
        INSERT INTO ACCOUNT_HOLDER (account_no, customer_person_id, holder_role)
        VALUES (p_account_no, p_customer_id, 'PRIMARY');
        ELSE
        INSERT INTO ACCOUNT_HOLDER (account_no, customer_person_id, holder_role)
        VALUES (p_account_no, p_customer_id, 'JOINT');
        END IF;

        
        INSERT INTO TRANSACTION_LOG (
            sav_acc_no, agent_person_id, fd_id, txn_type, amount, balance_after, ref_text, txn_timestamp
        ) VALUES (
            p_account_no, p_agent_person_id, NULL, 'DEPOSIT', p_initial_deposit, p_initial_deposit, 'Initial Opening Deposit', NOW()
        );

    COMMIT;
END$$

DELIMITER ;
