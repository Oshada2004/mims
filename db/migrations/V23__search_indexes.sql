DELIMITER $$

DROP PROCEDURE IF EXISTS sp_tmp_add_index$$
CREATE PROCEDURE sp_tmp_add_index(
    IN p_table   VARCHAR(64),
    IN p_index   VARCHAR(64),
    IN p_columns VARCHAR(255)
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name   = p_table
          AND index_name   = p_index
    ) THEN
        SET @idx_ddl = CONCAT(
            'CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_columns, ')'
        );
        PREPARE idx_stmt FROM @idx_ddl;
        EXECUTE idx_stmt;
        DEALLOCATE PREPARE idx_stmt;
    END IF;
END$$

DELIMITER ;

CALL sp_tmp_add_index('TRANSACTION_LOG', 'idx_txn_acc_time',
                      'sav_acc_no, txn_timestamp');

CALL sp_tmp_add_index('TRANSACTION_LOG', 'idx_txn_agent_time',
                      'agent_person_id, txn_timestamp');

CALL sp_tmp_add_index('TRANSACTION_LOG', 'idx_txn_type_time',
                      'txn_type, txn_timestamp');

CALL sp_tmp_add_index('FIXED_DEPOSIT', 'idx_fd_status_next_accrual',
                      'status, next_accrual_date');

CALL sp_tmp_add_index('FIXED_DEPOSIT', 'idx_fd_acc_status',
                      'acc_no, status');

DROP PROCEDURE IF EXISTS sp_tmp_add_index;


DELIMITER $$

DROP FUNCTION IF EXISTS fn_get_agent_daily_withdrawn$$
CREATE FUNCTION fn_get_agent_daily_withdrawn(p_account_no VARCHAR(15))
RETURNS DECIMAL(14,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(14,2);
    SELECT COALESCE(SUM(amount), 0.00) INTO v_total
    FROM TRANSACTION_LOG
    WHERE sav_acc_no = p_account_no
      AND txn_type = 'WITHDRAWAL'
      AND txn_timestamp >= CURDATE()
      AND txn_timestamp <  CURDATE() + INTERVAL 1 DAY
      AND agent_person_id IS NOT NULL;
    RETURN v_total;
END$$

DELIMITER ;