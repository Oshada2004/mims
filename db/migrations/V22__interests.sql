DELIMITER $$

DROP PROCEDURE IF EXISTS sp_account_transfer$$

CREATE PROCEDURE sp_account_transfer(
    IN p_sender_acc_no   VARCHAR(15),
    IN p_receiver_acc_no VARCHAR(15),
    IN p_agent_person_id INT,
    IN p_amount          NUMERIC(14,2),
    IN p_ref_text        VARCHAR(50),
    OUT p_txn_id         BIGINT,
    OUT p_sender_balance NUMERIC(14,2),
    OUT p_receiver_balance NUMERIC(14,2)
)
BEGIN
    DECLARE v_sender_min_bal   NUMERIC(14,2);
    DECLARE v_sender_status    ENUM('ACTIVE', 'DORMANT', 'CLOSED');
    DECLARE v_receiver_status  ENUM('ACTIVE', 'DORMANT', 'CLOSED');

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Amount must be greater than zero';
    END IF;

    IF p_sender_acc_no = p_receiver_acc_no THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender and receiver must be different';
    END IF;

    START TRANSACTION;

    BEGIN
        DECLARE CONTINUE HANDLER FOR NOT FOUND BEGIN END;

        IF p_sender_acc_no < p_receiver_acc_no THEN
            SELECT balance, contracted_min_balance, status
            INTO p_sender_balance, v_sender_min_bal, v_sender_status
            FROM SAVINGS_ACCOUNT WHERE account_no = p_sender_acc_no FOR UPDATE;

            SELECT balance, status
            INTO p_receiver_balance, v_receiver_status
            FROM SAVINGS_ACCOUNT WHERE account_no = p_receiver_acc_no FOR UPDATE;
        ELSE
            SELECT balance, status
            INTO p_receiver_balance, v_receiver_status
            FROM SAVINGS_ACCOUNT WHERE account_no = p_receiver_acc_no FOR UPDATE;

            SELECT balance, contracted_min_balance, status
            INTO p_sender_balance, v_sender_min_bal, v_sender_status
            FROM SAVINGS_ACCOUNT WHERE account_no = p_sender_acc_no FOR UPDATE;
        END IF;
    END;

    IF v_sender_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender account not found';
    END IF;

    IF v_receiver_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account not found';
    END IF;

    IF v_sender_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender account is not ACTIVE';
    END IF;

    IF v_receiver_status != 'ACTIVE' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account is not ACTIVE';
    END IF;

    IF (p_sender_balance - p_amount) < v_sender_min_bal THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transfer amount breaches sender contracted minimum balance';
    END IF;

    SET p_sender_balance   = p_sender_balance - p_amount;
    SET p_receiver_balance = p_receiver_balance + p_amount;

    UPDATE SAVINGS_ACCOUNT 
    SET balance = p_sender_balance, last_txn_date = CURDATE()
    WHERE account_no = p_sender_acc_no;

    UPDATE SAVINGS_ACCOUNT 
    SET balance = p_receiver_balance, last_txn_date = CURDATE()
    WHERE account_no = p_receiver_acc_no;

    INSERT INTO TRANSACTION_LOG(txn_type) VALUES ('TRANSFER');
    SET p_txn_id = LAST_INSERT_ID();

    INSERT INTO AtoA_TRANSFER_LOG(
        txn_id, sender_acc_no, receiver_acc_no, agent_person_id,
        amount, sender_balance_after, receiver_balance_after, ref_text
    )
    VALUES (
        p_txn_id, p_sender_acc_no, p_receiver_acc_no, p_agent_person_id,
        p_amount, p_sender_balance, p_receiver_balance, p_ref_text
    );

    COMMIT;
END$$


DROP PROCEDURE IF EXISTS sp_run_savings_interest_accrual$$

CREATE PROCEDURE sp_run_savings_interest_accrual(
    IN p_run_date DATE
)
BEGIN
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_acc VARCHAR(15);
    DECLARE v_status ENUM('ACTIVE', 'DORMANT', 'CLOSED');
    DECLARE v_bal DECIMAL(14,2);
    DECLARE v_rate DECIMAL(5,2);
    DECLARE v_min DECIMAL(14,2);
    DECLARE v_cycle INT;
    DECLARE v_next_accrual_date DATE;
    DECLARE v_int DECIMAL(14,2);
    DECLARE v_txn_occurred BOOLEAN;
    DECLARE v_txn_id BIGINT;

    DECLARE cur CURSOR FOR
        SELECT account_no
        FROM SAVINGS_ACCOUNT
        WHERE status = 'ACTIVE'
          AND next_accrual_date IS NOT NULL
          AND next_accrual_date <= p_run_date
        ORDER BY account_no;

    DECLARE CONTINUE HANDLER FOR NOT FOUND
        SET v_done = TRUE;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    IF p_run_date IS NULL THEN
        SET p_run_date = CURDATE();
    END IF;

    START TRANSACTION;
    OPEN cur;

    read_loop: LOOP
        FETCH cur INTO v_acc;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        SET v_status = NULL;
        BEGIN
            DECLARE CONTINUE HANDLER FOR NOT FOUND
                SET v_status = NULL;

            SELECT balance, contracted_interest_rate, contracted_min_balance,
                   curr_accrual_cycle_no, next_accrual_date, status
            INTO v_bal, v_rate, v_min, v_cycle, v_next_accrual_date, v_status
            FROM SAVINGS_ACCOUNT
            WHERE account_no = v_acc
            FOR UPDATE;
        END;

        IF v_status = 'ACTIVE' THEN
            SET v_txn_occurred = FALSE;

            WHILE v_next_accrual_date IS NOT NULL
              AND v_next_accrual_date <= p_run_date DO

                IF v_bal >= v_min AND v_bal > 0.00 THEN
                    SET v_int = fn_calculate_30_day_interest(v_bal, v_rate);

                    IF v_int > 0.00 THEN
                        SET v_bal = v_bal + v_int;
                        SET v_cycle = v_cycle + 1;
                        SET v_txn_occurred = TRUE;

                        INSERT INTO TRANSACTION_LOG (txn_type, txn_timestamp)
                        VALUES ('INTEREST', NOW());

                        SET v_txn_id = LAST_INSERT_ID();

                        INSERT INTO INTEREST_LOG (
                            txn_id,
                            account_type,
                            sav_acc_no,
                            fd_id,
                            amount,
                            balance_after,
                            ref_text
                        ) VALUES (
                            v_txn_id,
                            'SAVINGS',
                            v_acc,
                            NULL,
                            v_int,
                            v_bal,
                            CONCAT('SI-', v_acc, '-', v_cycle)
                        );
                    END IF;
                END IF;

                SET v_next_accrual_date = DATE_ADD(v_next_accrual_date, INTERVAL 30 DAY);
            END WHILE;

            UPDATE SAVINGS_ACCOUNT
            SET balance = v_bal,
                curr_accrual_cycle_no = v_cycle,
                next_accrual_date = v_next_accrual_date,
                last_txn_date = CASE WHEN v_txn_occurred THEN p_run_date ELSE last_txn_date END
            WHERE account_no = v_acc;
        END IF;

    END LOOP read_loop;

    CLOSE cur;
    COMMIT;
END$$

DELIMITER ;

DROP EVENT IF EXISTS evt_daily_interest_calculation;

CREATE EVENT evt_daily_interest_calculation
ON SCHEDULE EVERY 1 DAY
STARTS (TIMESTAMP(CURDATE() + INTERVAL 1 DAY, '00:01:00'))
ON COMPLETION PRESERVE
ENABLE
DO CALL sp_run_savings_interest_accrual(CURDATE());

