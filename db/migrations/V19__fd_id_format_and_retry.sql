DELIMITER $$

DROP PROCEDURE IF EXISTS sp_open_fixed_deposit$$

CREATE PROCEDURE sp_open_fixed_deposit(
    IN p_savings_acc_no VARCHAR(15),
    IN p_term_code VARCHAR(5),
    IN p_principal DECIMAL(14,2),
    IN p_agent_id INT,
    OUT p_fd_id CHAR(20)
)
BEGIN
    DECLARE v_duration_months INT DEFAULT NULL;
    DECLARE v_rate DECIMAL(5,2) DEFAULT NULL;
    DECLARE v_balance DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_min_balance DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_status VARCHAR(10) DEFAULT NULL;
    DECLARE v_account_agent_id INT DEFAULT NULL;
    DECLARE v_attempts INT DEFAULT 0;
    DECLARE v_duplicate BOOLEAN DEFAULT FALSE;
    DECLARE v_candidate_id CHAR(20);
    DECLARE v_existing_fd_id CHAR(20) DEFAULT NULL;
    DECLARE v_txn_id BIGINT;

    SET p_fd_id = NULL; -- ie no fd has been created yet

    IF p_savings_acc_no IS NULL
       OR TRIM(p_savings_acc_no) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Savings account number is required.';
    END IF;

    IF p_principal IS NULL OR p_principal <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FD principal must be greater than zero.';
    END IF;

    IF p_agent_id IS NULL OR p_agent_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A valid agent ID is required.';
    END IF;

    IF p_term_code IS NULL
       OR p_term_code NOT IN ('6M', '1Y', '3Y') THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Invalid FD term code.';
    END IF;

    SELECT duration_months, annual_interest_rate
    INTO v_duration_months, v_rate
    FROM FD_ACC_PLAN
    WHERE term_code = p_term_code;

    IF v_duration_months IS NULL OR v_rate IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'FD plan has not been configured.';
    END IF;

    BEGIN
    -- error handling
    -- if an sql exception occurs rollback and throw the error again
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            RESIGNAL;
        END;

        START TRANSACTION;

        SELECT balance, contracted_min_balance, status,
               agent_person_id
        INTO v_balance, v_min_balance, v_status,
             v_account_agent_id
        FROM SAVINGS_ACCOUNT
        WHERE account_no = p_savings_acc_no
        FOR UPDATE;

        IF v_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Savings account does not exist.';
        END IF;

        IF v_status <> 'ACTIVE' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Savings account must be ACTIVE.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM STAFF_PROFILE
            WHERE person_id = p_agent_id
            AND staff_role = 'AGENT'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Provided person is not a banking agent.';
        END IF;

        IF v_account_agent_id IS NULL
        OR v_account_agent_id <> p_agent_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Agent is not assigned to this savings account.';
        END IF;

        IF fn_has_active_fd(p_savings_acc_no) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Account already has an active fixed deposit.';
        END IF;

        IF (v_balance - p_principal) < v_min_balance THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Insufficient balance to fund the fixed deposit.';
        END IF;

        fd_id_retry: LOOP -- creating a unique id for fd
            SET v_attempts = v_attempts + 1;
            SET v_duplicate = FALSE;

            SET v_candidate_id = CONCAT(
                'FD',
                LPAD(UNIX_TIMESTAMP(), 10, '0'),
                LPAD(FLOOR(RAND() * 100000000), 8, '0')
            );

            BEGIN
                DECLARE CONTINUE HANDLER FOR 1062 -- duplicate key error
                    SET v_duplicate = TRUE;

                INSERT INTO FIXED_DEPOSIT (
                    fd_id,
                    active_acc_no,
                    acc_no,
                    term_code,
                    principal_amount,
                    opened_date,
                    maturity_date,
                    next_accrual_date,
                    contracted_interest_rate,
                    curr_accrual_cycle_no,
                    status
                )
                VALUES (
                    v_candidate_id,
                    p_savings_acc_no,
                    p_savings_acc_no,
                    p_term_code,
                    p_principal,
                    CURDATE(),
                    DATE_ADD(
                        CURDATE(),
                        INTERVAL v_duration_months MONTH
                    ),
                    DATE_ADD(CURDATE(), INTERVAL 30 DAY),
                    v_rate,
                    0,
                    'ACTIVE'
                );
            END;

            IF NOT v_duplicate THEN
                SET p_fd_id = v_candidate_id;
                LEAVE fd_id_retry;
            END IF;

           
            SET v_existing_fd_id = NULL;

            BEGIN
                DECLARE CONTINUE HANDLER FOR NOT FOUND
                    SET v_existing_fd_id = NULL;

                SELECT fd_id
                INTO v_existing_fd_id
                FROM FIXED_DEPOSIT
                WHERE active_acc_no = p_savings_acc_no
                FOR UPDATE;
            END;

            IF v_existing_fd_id IS NOT NULL THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Account already has an active fixed deposit.';
            END IF;

            IF v_attempts >= 5 THEN
                SIGNAL SQLSTATE '45000'
                SET MESSAGE_TEXT =
                    'Could not allocate an FD ID after 5 attempts. Retry.';
            END IF;

        END LOOP fd_id_retry;
        INSERT INTO TRANSACTION_LOG (
            txn_type,
            txn_timestamp
        )
        VALUES (
            'DEPOSIT_WITHDRAWAL',
            NOW()
        );

        SET v_txn_id = LAST_INSERT_ID();

        INSERT INTO DEPOSIT_WITHDRAW_LOG (
            txn_id,
            txn_type,
            agent_person_id,
            sav_acc_no,
            fd_id,
            amount,
            balance_after,
            ref_text
        )
        VALUES (
            v_txn_id,
            'FD_FUNDING',
            p_agent_id,
            p_savings_acc_no,
            p_fd_id,
            p_principal,
            v_balance - p_principal,
            'Principal allocation to fixed deposit'
        );
        UPDATE SAVINGS_ACCOUNT
        SET balance = balance - p_principal,
            last_txn_date = CURDATE()
        WHERE account_no = p_savings_acc_no;

        COMMIT;
    END;
    END$$

    DELIMITER ;

    
DELIMITER $$

DROP PROCEDURE IF EXISTS sp_early_close_fixed_deposit$$

CREATE PROCEDURE sp_early_close_fixed_deposit(
    IN p_fd_id CHAR(20),
    IN p_agent_id INT
)
BEGIN
    DECLARE v_acc_no VARCHAR(15) DEFAULT NULL;
    DECLARE v_locked_acc_no VARCHAR(15) DEFAULT NULL;
    DECLARE v_principal DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_fd_status VARCHAR(25) DEFAULT NULL;
    DECLARE v_account_status VARCHAR(10) DEFAULT NULL;
    DECLARE v_balance DECIMAL(14,2) DEFAULT NULL;
    DECLARE v_account_agent_id INT DEFAULT NULL;
    DECLARE v_maturity_date DATE DEFAULT NULL;
    DECLARE v_txn_id BIGINT;

    IF p_fd_id IS NULL OR TRIM(p_fd_id) = '' THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Fixed deposit ID is required.';
    END IF;

    IF p_agent_id IS NULL OR p_agent_id <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'A valid agent ID is required.';
    END IF;

    BEGIN
        DECLARE EXIT HANDLER FOR SQLEXCEPTION
        BEGIN
            ROLLBACK;
            RESIGNAL;
        END;

        START TRANSACTION;

        -- Find the savings account linked to this FD
        SELECT acc_no
        INTO v_acc_no
        FROM FIXED_DEPOSIT
        WHERE fd_id=p_fd_id;

        IF v_acc_no IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Fixed deposit does not exist.';
        END IF;

        -- Lock the savings account for update
        SELECT balance, status, agent_person_id
        INTO v_balance, v_account_status, v_account_agent_id
        FROM SAVINGS_ACCOUNT
        WHERE account_no =v_acc_no
        FOR UPDATE;

        IF v_account_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT= 'Linked savings account does not exist.';
        END IF;

        -- Lock the FD and read its current values.
        SELECT acc_no, principal_amount, status,maturity_date
        INTO v_locked_acc_no, v_principal, v_fd_status,v_maturity_date
        FROM FIXED_DEPOSIT
        WHERE fd_id =p_fd_id
        FOR UPDATE;

        IF v_fd_status IS NULL THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT ='Fixed deposit no longer exists.';
        END IF;

        IF v_locked_acc_no <> v_acc_no THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='FD account linkage changed. Retry the operation.';
        END IF; -- need to check if changing the account linked to the FD is allowed

        IF v_fd_status <> 'ACTIVE' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Only an active fixed deposit can be closed early.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM STAFF_PROFILE
            WHERE person_id = p_agent_id
              AND staff_role = 'AGENT'
        ) THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Provided person is not a banking agent.';
        END IF;

        IF v_account_agent_id IS NULL
           OR v_account_agent_id <> p_agent_id THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Agent is not assigned to this savings account.';
        END IF; 

        IF v_account_status = 'CLOSED' THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='Cannot refund principal to a closed savings account.';
        END IF;

        IF v_maturity_date <= CURDATE() THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT='FD has reached maturity. Use maturity settlement.';
        END IF;

        UPDATE SAVINGS_ACCOUNT
        SET balance = balance + v_principal,
            last_txn_date = CURDATE()
        WHERE account_no = v_acc_no;

        INSERT INTO TRANSACTION_LOG (
            txn_type,
            txn_timestamp
        )
        VALUES (
            'DEPOSIT_WITHDRAWAL',
            NOW()
        );

        SET v_txn_id = LAST_INSERT_ID();

        INSERT INTO DEPOSIT_WITHDRAW_LOG (
            txn_id,
            txn_type,
            agent_person_id,
            sav_acc_no,
            fd_id,
            amount,
            balance_after,
            ref_text
        )
        VALUES (
            v_txn_id,
            'FD_PRINCIPAL_RETURN',
            p_agent_id,
            v_acc_no,
            p_fd_id,
            v_principal,
            v_balance + v_principal,
            'FD early closure principal return'
        );

        UPDATE FIXED_DEPOSIT
        SET status = 'PREMATURELY_CLOSED',
            active_acc_no = NULL,
            next_accrual_date = NULL
        WHERE fd_id = p_fd_id;

        COMMIT;
    END;
END$$

DELIMITER ;


DELIMITER $$

DROP PROCEDURE IF EXISTS sp_run_fd_interest_payout$$

CREATE PROCEDURE sp_run_fd_interest_payout(
    IN p_run_date DATE
)
BEGIN
    DECLARE v_done BOOLEAN DEFAULT FALSE;
    DECLARE v_fd_id CHAR(20);
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
    DECLARE v_txn_id BIGINT;

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
    START TRANSACTION;
    OPEN cur_fd;

    payout_loop: LOOP
        FETCH cur_fd INTO v_fd_id, v_acc_no;

        IF v_done THEN
            LEAVE payout_loop;
        END IF;

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
            ITERATE payout_loop;
        END IF;

        IF (v_next_accrual_date IS NULL
            OR v_next_accrual_date > p_run_date)
           AND v_maturity_date > p_run_date THEN
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
            )
            VALUES (
                v_txn_id,
                'FIXED',
                v_acc_no,
                v_fd_id,
                v_interest,
                v_balance,
                CONCAT('FD interest due ', v_next_accrual_date)
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

            INSERT INTO TRANSACTION_LOG (txn_type, txn_timestamp)
            VALUES ('DEPOSIT_WITHDRAWAL', NOW());

            SET v_txn_id = LAST_INSERT_ID();

            INSERT INTO DEPOSIT_WITHDRAW_LOG (
                txn_id,
                txn_type,
                agent_person_id,
                sav_acc_no,
                fd_id,
                amount,
                balance_after,
                ref_text
            )
            VALUES (
                v_txn_id,
                'FD_PRINCIPAL_RETURN',
                NULL,
                v_acc_no,
                v_fd_id,
                v_principal,
                v_balance,
                'FD maturity principal return'
            );

            UPDATE FIXED_DEPOSIT
            SET status = 'SETTLED',
                active_acc_no = NULL,
                next_accrual_date = NULL
            WHERE fd_id = v_fd_id;

        END IF;

    END LOOP payout_loop;

    CLOSE cur_fd;
    COMMIT;
END$$

DELIMITER ;

DELIMITER $$

DROP FUNCTION IF EXISTS get_fixed_deposit_by_id$$
CREATE FUNCTION get_fixed_deposit_by_id(p_fd_id CHAR(20))
RETURNS JSON
READS SQL DATA
BEGIN
    DECLARE v_res JSON;
    SELECT JSON_OBJECT(
        'fd_id',fd_id,
        'acc_no',acc_no,
        'principal_amount',principal_amount,
        'term_code',term_code,
        'contracted_interest_rate',contracted_interest_rate,
        'opened_date',opened_date,
        'maturity_date',maturity_date,
        'status',status
    ) INTO v_res
    FROM FIXED_DEPOSIT
    WHERE fd_id=p_fd_id;
    RETURN v_res;
END$$

DELIMITER ;