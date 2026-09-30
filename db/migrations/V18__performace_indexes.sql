
--The primary key and foreign key columns are already indexed, so only composite indexes are added here.

--The helper function below creates an index only if it doesn't exist. The call lines below this part uses this function.
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
        SET @v18_ddl = CONCAT(
            'CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_columns, ')'
        );
        PREPARE v18_stmt FROM @v18_ddl;
        EXECUTE v18_stmt;
        DEALLOCATE PREPARE v18_stmt;
    END IF;
END$$
 
DELIMITER ;


-- Transaction log: Daily withdrawal limit check
CALL sp_tmp_add_index('TRANSACTION_LOG', 'idx_txn_acc_time',
                      'sav_acc_no, txn_timestamp');
 
-- Fixed deposit: monthly interest accrual job.
CALL sp_tmp_add_index('FIXED_DEPOSIT', 'idx_fd_status_next_accrual',
                      'status, next_accrual_date');
 
-- Fixed deposit: daily dormancy check.
CALL sp_tmp_add_index('FIXED_DEPOSIT', 'idx_fd_acc_status',
                      'acc_no, status');
 
-- savings account: monthly interest accrual job.
CALL sp_tmp_add_index('SAVINGS_ACCOUNT', 'idx_savings_status_next_accrual',
                      'status, next_accrual_date');
 
-- savings account: daily dormancy check.
CALL sp_tmp_add_index('SAVINGS_ACCOUNT', 'idx_savings_status_last_txn','status, last_txn_date');

--This removes the helper once the calls are done running
DROP PROCEDURE IF EXISTS sp_tmp_add_index;


--The code block below replaces the function that calculates how much has already been withdrawn from an account today through agents.
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