const db = require('../config/db');

// Checks the text is a real date in form , Y-M-D.
function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(text + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

// Reads a whole number from the query string, or uses the default if it's missing.
function readWholeNumber(value, defaultValue) {
    if (value === undefined) return defaultValue;
    return /^\d+$/.test(value) ? Number(value) : NaN;
}

// Report - active fixed deposits and when their next payout is due.
// Optional filter to only show payouts due on or before that date.
exports.getActiveFDReport = async (req, res, next) => {
    const { due_by } = req.query;

    if (due_by !== undefined && !isValidDate(due_by)) {
        return res.status(400).json({
            success: false,
            message: 'due_by must be a valid date in YYYY-MM-DD format.'
        });
    }

    try {
        const [results] = await db.query(
            'CALL sp_get_active_fd_schedule(?)',
            [due_by || null]
        );
        const rows = results[0];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};

// Report: transaction history for one savings account, newest first.
// Optional paging, limit can be at most 200
exports.getTransactionHistory = async (req, res, next) => {
    const accountNo = (req.params.accountNo || '').trim();
    const limit = readWholeNumber(req.query.limit, 50);
    const offset = readWholeNumber(req.query.offset, 0);

    if (accountNo === '' || accountNo.length > 15) {
        return res.status(400).json({
            success: false,
            message: 'A savings account number of up to 15 characters is required.'
        });
    }
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        return res.status(400).json({ success: false, message: 'limit must be a whole number from 1 to 200.' });
    }
    if (!Number.isInteger(offset)) {
        return res.status(400).json({ success: false, message: 'offset must be a whole number of 0 or more.' });
    }

    try {
        // Make sure the account exists, so a wrong number gives 404 instead of an empty list.
        const [accounts] = await db.query(
            'SELECT account_no FROM SAVINGS_ACCOUNT WHERE account_no = ?',
            [accountNo]
        );
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Savings account not found.' });
        }

        // TRANSACTION_LOG only holds txn_id, type and time; the per-account details live in the
        // detail tables. Each movement of this account becomes one row, seen from this account:
        // a transfer is TRANSFER_OUT for the sender and TRANSFER_IN for the receiver.
        const movements = `
            SELECT dw.txn_id, dw.txn_type,
                   CASE WHEN dw.txn_type IN ('WITHDRAWAL', 'FD_FUNDING') THEN 'DEBIT' ELSE 'CREDIT' END AS direction,
                   dw.agent_person_id, dw.fd_id, dw.amount, dw.balance_after, dw.ref_text,
                   NULL AS counterparty_acc_no
              FROM DEPOSIT_WITHDRAW_LOG dw
             WHERE dw.sav_acc_no = ?
            UNION ALL
            SELECT il.txn_id,
                   CASE WHEN il.account_type = 'FIXED' THEN 'FD_INTEREST' ELSE 'SAVINGS_INTEREST' END,
                   'CREDIT', NULL, il.fd_id, il.amount, il.balance_after, il.ref_text, NULL
              FROM INTEREST_LOG il
             WHERE il.sav_acc_no = ?
            UNION ALL
            SELECT a.txn_id, 'TRANSFER_OUT', 'DEBIT', a.agent_person_id, NULL, a.amount,
                   a.sender_balance_after, a.ref_text, a.receiver_acc_no
              FROM AtoA_TRANSFER_LOG a
             WHERE a.sender_acc_no = ?
            UNION ALL
            SELECT a.txn_id, 'TRANSFER_IN', 'CREDIT', a.agent_person_id, NULL, a.amount,
                   a.receiver_balance_after, a.ref_text, a.sender_acc_no
              FROM AtoA_TRANSFER_LOG a
             WHERE a.receiver_acc_no = ?`;
        const movementParams = [accountNo, accountNo, accountNo, accountNo];

        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM (${movements}) m`,
            movementParams
        );

        // txn_id is used as a tie breaker because several transactions can share
        // the same timestamp, and we always want them in the order they happened.
        const [rows] = await db.query(
            `SELECT m.txn_id, ? AS sav_acc_no, m.agent_person_id, m.fd_id, m.txn_type, m.direction,
                    m.amount, m.balance_after, m.ref_text, m.counterparty_acc_no, t.txn_timestamp
               FROM (${movements}) m
               JOIN TRANSACTION_LOG t ON t.txn_id = m.txn_id
              ORDER BY t.txn_timestamp DESC, m.txn_id DESC
              LIMIT ? OFFSET ?`,
            [accountNo, ...movementParams, limit, offset]
        );

        return res.status(200).json({
            success: true,
            accountNo,
            total,
            limit,
            offset,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};

// Report 2: Account-wise transaction summary and current balance
exports.getAgentTransactionsReport = async (req, res, next) => {
    const { start_date, end_date } = req.query;
    if (!start_date || !isValidDate(start_date)) {
        return res.status(400).json({
            success: false,
            message: 'start_date is required and must be in YYYY-MM-DD format.'
        });
    }
    if (!end_date || !isValidDate(end_date)) {
        return res.status(400).json({
            success: false,
            message: 'end_date is required and must be in YYYY-MM-DD format.'
        });
    }
    if (new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({
            success: false,
            message: 'start_date cannot be after end_date.'
        });
    }
    try {
        const [results] = await db.query(
            'CALL sp_agent_transactions_report(?, ?)',
            [start_date, end_date]
        );
        const rows = results[0];
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};
// 2. Procedure: sp_get_customer_activity_report(IN p_customer_id INT, IN p_start_date DATE, IN p_end_date DATE)
exports.getCustomerActivityReport = async (req, res, next) => {
    const { customer_id } = req.params;
    const { start_date, end_date } = req.query;
    const customerIdNum = parseInt(customer_id, 10);
    if (isNaN(customerIdNum) || customerIdNum <= 0) {
        return res.status(400).json({
            success: false,
            message: 'A valid numeric customer_id is required.'
        });
    }
    if (start_date !== undefined && !isValidDate(start_date)) {
        return res.status(400).json({
            success: false,
            message: 'start_date must be in YYYY-MM-DD format.'
        });
    }
    if (end_date !== undefined && !isValidDate(end_date)) {
        return res.status(400).json({
            success: false,
            message: 'end_date must be in YYYY-MM-DD format.'
        });
    }
    if (start_date && end_date && new Date(start_date) > new Date(end_date)) {
        return res.status(400).json({
            success: false,
            message: 'start_date cannot be after end_date.'
        });
    }
    try {
        const [results] = await db.query(
            'CALL sp_get_customer_activity_report(?, ?, ?)',
            [customerIdNum, start_date || null, end_date || null]
        );
        const rows = results[0];
        if (!rows || rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No activity found for the specified customer.'
            });
        }
        return res.status(200).json({
            success: true,
            data: rows[0]
        });
    } catch (err) {
        if (err.sqlState === '45404') {
            return res.status(404).json({
                success: false,
                error: 'NotFound',
                message: err.sqlMessage || err.message
            });
        }

        if (err.sqlState === '45000') {
            return res.status(422).json({
                success: false,
                error: 'BusinessRuleViolation',
                message: err.sqlMessage || err.message
            });
        }
        next(err);
    }
};
// 3. Procedure: sp_get_account_transaction_summary(IN p_plan_code VARCHAR(10), IN p_account_status VARCHAR(10))
exports.getAccountTransactionSummaryReport = async (req, res, next) => {
    const { plan_code, status } = req.query;
    const allowedPlans = ['CHILD', 'TEEN', 'ADULT', 'SENIOR', 'JOINT'];
    const allowedStatuses = ['ACTIVE', 'DORMANT', 'CLOSED'];
    if (plan_code && !allowedPlans.includes(plan_code.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid plan_code. Allowed values: ${allowedPlans.join(', ')}`
        });
    }
    if (status && !allowedStatuses.includes(status.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid status. Allowed values: ${allowedStatuses.join(', ')}`
        });
    }
    try {
        const [results] = await db.query(
            'CALL sp_get_account_transaction_summary(?, ?)',
            [plan_code ? plan_code.toUpperCase() : null, status ? status.toUpperCase() : null]
        );
        const rows = results[0];
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};
// 4. Procedure: sp_get_monthly_interest_distribution(IN p_year INT, IN p_month INT, IN p_plan_code VARCHAR(10))
exports.getMonthlyInterestDistributionReport = async (req, res, next) => {
    const { year, month, plan_code } = req.query;
    let parsedYear = null;
    let parsedMonth = null;
    if (year !== undefined) {
        parsedYear = parseInt(year, 10);
        if (isNaN(parsedYear) || parsedYear < 1900 || parsedYear > 2100) {
            return res.status(400).json({
                success: false,
                message: 'year must be a valid 4-digit integer between 1900 and 2100.'
            });
        }
    }
    if (month !== undefined) {
        parsedMonth = parseInt(month, 10);
        if (isNaN(parsedMonth) || parsedMonth < 1 || parsedMonth > 12) {
            return res.status(400).json({
                success: false,
                message: 'month must be an integer between 1 and 12.'
            });
        }
    }
    const allowedPlans = ['CHILD', 'TEEN', 'ADULT', 'SENIOR', 'JOINT'];
    if (plan_code && !allowedPlans.includes(plan_code.toUpperCase())) {
        return res.status(400).json({
            success: false,
            message: `Invalid plan_code. Allowed values: ${allowedPlans.join(', ')}`
        });
    }
    try {
        const [results] = await db.query(
            'CALL sp_get_monthly_interest_distribution(?, ?, ?)',
            [parsedYear, parsedMonth, plan_code ? plan_code.toUpperCase() : null]
        );
        const rows = results[0];
        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};