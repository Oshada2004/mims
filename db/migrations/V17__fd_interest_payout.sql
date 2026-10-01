DELIMITER $$

DROP PROCEDURE IF EXISTS sp_run_fd_interest_payout$$

CREATE PROCEDURE sp_run_fd_interest_payout(
    IN p_run_date DATE
)
BEGIN
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_fd_id VARCHAR(15);
    DECLARE v_acc_no VARCHAR(15);
    DECLARE v_locked_acc_no VARCHAR(15);

    DECLARE v_principal DECIMAL(14,2);
    DECLARE v_rate DECIMAL(5,2);
    DECLARE v_interest DECIMAL(14,2);
    DECLARE v_balance DECIMAL(14,2);

    DECLARE v_maturity_date DATE;
    DECLARE v_next_accrual_date DATE;
    DECLARE v_fd_status VARCHAR(25);
    DECLARE v_account_status VARCHAR(10);

    DECLARE cur_fd CURSOR FOR
        SELECT fd_id, acc_no
        FROM FIXED_DEPOSIT
        WHERE status = 'ACTIVE'
          AND (
              next_accrual_date <= p_run_date
              OR maturity_date <= p_run_date
          )
        ORDER BY acc_no, fd_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET v_done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_run_date IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT='Run date is required.';
    END IF;
        OPEN cur_fd;

    payout_loop: LOOP
        FETCH cur_fd INTO v_fd_id, v_acc_no;

        IF v_done THEN
            LEAVE payout_loop;
        END IF;

        START TRANSACTION;

        SET v_account_status= NULL;
        SET v_balance = NULL;

        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND
                SET v_account_status= NULL;

            SELECT balance, status
            INTO v_balance, v_account_status
            FROM SAVINGS_ACCOUNT
            WHERE account_no =v_acc_no
            FOR UPDATE;
        END;

        IF v_account_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT ='Linked savings account does not exist.';
        END IF;

        IF v_account_status ='CLOSED' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Cannot pay FD funds into a closed account.';
        END IF;
                SET v_fd_status = NULL;

        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND
                SET v_fd_status = NULL;

            SELECT acc_no,
                   principal_amount,
                   contracted_interest_rate,
                   maturity_date,
                   next_accrual_date,
                   status
            INTO v_locked_acc_no,
                 v_principal,
                 v_rate,
                 v_maturity_date,
                 v_next_accrual_date,
                 v_fd_status
            FROM FIXED_DEPOSIT
            WHERE fd_id = v_fd_id
            FOR UPDATE;
        END;

        IF v_fd_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Fixed deposit no longer exists.';
        END IF;

        IF v_locked_acc_no <> v_acc_no THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'FD account linkage changed. Retry the operation.';
        END IF;

        IF v_fd_status <> 'ACTIVE' THEN
            COMMIT;
            ITERATE payout_loop;
        END IF;

        IF (v_next_accrual_date IS NULL
            OR v_next_accrual_date > p_run_date)
           AND v_maturity_date > p_run_date THEN
            COMMIT;
            ITERATE payout_loop;
        END IF;

        WHILE v_next_accrual_date IS NOT NULL
          AND v_next_accrual_date <= p_run_date
          AND v_next_accrual_date <= v_maturity_date DO

            SET v_interest = fn_calculate_30_day_interest(
                v_principal,
                v_rate
            );

            UPDATE SAVINGS_ACCOUNT
            SET balance = balance + v_interest
            WHERE account_no = v_acc_no;

            SET v_balance = v_balance + v_interest;

            INSERT INTO TRANSACTION_LOG (
                sav_acc_no,
                agent_person_id,
                fd_id,
                txn_type,
                amount,
                balance_after,
                ref_text,
                txn_timestamp
            )
            VALUES (
                v_acc_no,
                NULL,
                v_fd_id,
                'FD_INTEREST',
                v_interest,
                v_balance,
                CONCAT('FD interest due ', v_next_accrual_date),
                NOW()
            );

            SET v_next_accrual_date =
                DATE_ADD(v_next_accrual_date, INTERVAL 30 DAY);

            UPDATE FIXED_DEPOSIT
            SET next_accrual_date = v_next_accrual_date,
                curr_accrual_cycle_no = curr_accrual_cycle_no + 1
            WHERE fd_id = v_fd_id;

        END WHILE;

        IF v_maturity_date <= p_run_date THEN

            UPDATE SAVINGS_ACCOUNT
            SET balance = balance + v_principal
            WHERE account_no = v_acc_no;

            SET v_balance = v_balance + v_principal;

            INSERT INTO TRANSACTION_LOG (
                sav_acc_no,
                agent_person_id,
                fd_id,
                txn_type,
                amount,
                balance_after,
                ref_text,
                txn_timestamp
            )
            VALUES (
                v_acc_no,
                NULL,
                v_fd_id,
                'DEPOSIT',
                v_principal,
                v_balance,
                'FD maturity principal return',
                NOW()
            );

            UPDATE FIXED_DEPOSIT
            SET status = 'SETTLED',
                active_acc_no = NULL,
                next_accrual_date = NULL
            WHERE fd_id = v_fd_id;

        END IF;

        COMMIT;

    END LOOP payout_loop;

    CLOSE cur_fd;
END$$

DELIMITER ;