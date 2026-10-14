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