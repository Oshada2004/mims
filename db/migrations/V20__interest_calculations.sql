DROP PROCEDURE IF EXISTS sp_monthly_savings_interest;

DELIMITER $$

CREATE PROCEDURE sp_monthly_savings_interest()
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE v_acc VARCHAR(15);
    DECLARE v_bal DECIMAL(14,2);
    DECLARE v_rate DECIMAL(5,2);
    DECLARE v_min DECIMAL(14,2);
    DECLARE v_cycle INT;
    DECLARE v_int DECIMAL(14,2);

    DECLARE cur CURSOR FOR
        SELECT account_no
        FROM SAVINGS_ACCOUNT
        WHERE status = 'ACTIVE'
          AND next_accrual_date IS NOT NULL
          AND next_accrual_date <= CURDATE();

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_acc;
        IF done = 1 THEN LEAVE read_loop; END IF;

        START TRANSACTION;

        SELECT balance, contracted_interest_rate, contracted_min_balance, curr_accrual_cycle_no
        INTO v_bal, v_rate, v_min, v_cycle
        FROM SAVINGS_ACCOUNT
        WHERE account_no = v_acc
        FOR UPDATE;

        SET v_int = ROUND(v_bal * (v_rate / 100) * 30 / 365, 2);

        IF v_bal >= v_min AND v_int >= 1.00 THEN
            UPDATE SAVINGS_ACCOUNT
            SET balance = balance + v_int,
                curr_accrual_cycle_no = v_cycle + 1,
                last_txn_date = CURDATE()
            WHERE account_no = v_acc;

            INSERT INTO TRANSACTION_LOG
                (sav_acc_no, agent_person_id, fd_id, txn_type, amount, balance_after, ref_text, txn_timestamp)
            VALUES
                (v_acc, NULL, NULL, 'SAVINGS_INTEREST', v_int, v_bal + v_int,
                 CONCAT('SI-', v_acc, '-', v_cycle + 1), NOW());
        END IF;

        UPDATE SAVINGS_ACCOUNT
        SET next_accrual_date = DATE_ADD(next_accrual_date, INTERVAL 30 DAY)
        WHERE account_no = v_acc;

        COMMIT;
    END LOOP;

    CLOSE cur;
END$$

DELIMITER ;