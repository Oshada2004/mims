DELIMITER $$

CREATE PROCEDURE sp_account_transfer(
    IN p_sender_acc_no   VARCHAR(15),
    IN p_receiver_acc_no VARCHAR(15),
    IN p_agent_person_id INT,
    IN p_amount          NUMERIC(14,2),
    IN p_ref_text        VARCHAR(50)
)
BEGIN
    DECLARE v_sender_balance   NUMERIC(14,2);
    DECLARE v_receiver_balance NUMERIC(14,2);
    DECLARE v_txn_id           BIGINT;

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

    IF p_sender_acc_no < p_receiver_acc_no THEN
        SELECT balance INTO v_sender_balance
        FROM SAVINGS_ACCOUNT WHERE account_no = p_sender_acc_no FOR UPDATE;

        SELECT balance INTO v_receiver_balance
        FROM SAVINGS_ACCOUNT WHERE account_no = p_receiver_acc_no FOR UPDATE;
    ELSE
        SELECT balance INTO v_receiver_balance
        FROM SAVINGS_ACCOUNT WHERE account_no = p_receiver_acc_no FOR UPDATE;

        SELECT balance INTO v_sender_balance
        FROM SAVINGS_ACCOUNT WHERE account_no = p_sender_acc_no FOR UPDATE;
    END IF;

    IF v_sender_balance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Sender account not found';
    END IF;

    IF v_receiver_balance IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Receiver account not found';
    END IF;

    IF v_sender_balance < p_amount THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Insufficient balance';
    END IF;

    SET v_sender_balance   = v_sender_balance - p_amount;
    SET v_receiver_balance = v_receiver_balance + p_amount;

    UPDATE SAVINGS_ACCOUNT SET balance = v_sender_balance
    WHERE account_no = p_sender_acc_no;

    UPDATE SAVINGS_ACCOUNT SET balance = v_receiver_balance
    WHERE account_no = p_receiver_acc_no;

    INSERT INTO LOG_TRANSACTIONS(txn_type) VALUES ('TRANSFER');
    SET v_txn_id = LAST_INSERT_ID();

    INSERT INTO AtoA_TRANSFER_LOG(
        txn_id, sender_acc_no, receiver_acc_no, agent_person_id,
        amount, sender_balance_after, receiver_balance_after, ref_text
    )
    VALUES (
        v_txn_id, p_sender_acc_no, p_receiver_acc_no, p_agent_person_id,
        p_amount, v_sender_balance, v_receiver_balance, p_ref_text
    );

    COMMIT;

END$$

DELIMITER ;