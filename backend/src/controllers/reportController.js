const db = require('../config/db');

<<<<<<< HEAD
exports.getAgentReport = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_rep1_agent_transaction_summary');
        res.status(200).json({ success: true, data: rows });
    } catch (err) { next(err); }
};

exports.getAccountReport = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_rep2_account_summary');
        res.status(200).json({ success: true, data: rows });
    } catch (err) { next(err); }
};

=======
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
>>>>>>> docker
exports.getActiveFDReport = async (req, res, next) => {
    const { due_by } = req.query;

    if (due_by !== undefined && !isValidDate(due_by)) {
        return res.status(400).json({
            success: false,
            message: 'due_by must be a valid date in YYYY-MM-DD format.'
        });
    }

    try {
<<<<<<< HEAD
        const [rows] = await db.query('SELECT * FROM vw_rep3_active_fd_schedules');
        res.status(200).json({ success: true, data: rows });
    } catch (err) { next(err); }
};

exports.getInterestReport = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_rep4_monthly_interest_distribution');
        res.status(200).json({ success: true, data: rows });
    } catch (err) { next(err); }
};

exports.getCustomerActivityReport = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM vw_rep5_customer_activity');
        res.status(200).json({ success: true, data: rows });
    } catch (err) { next(err); }
=======
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

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM TRANSACTION_LOG WHERE sav_acc_no = ?',
            [accountNo]
        );

        // txn_id is used as a tie breaker because several transactions can share
        // the same timestamp, and we always want them in the order they happened.
        const [rows] = await db.query(
            `SELECT txn_id, sav_acc_no, agent_person_id, fd_id, txn_type,
                    amount, balance_after, ref_text, txn_timestamp
             FROM TRANSACTION_LOG
             WHERE sav_acc_no = ?
             ORDER BY txn_timestamp DESC, txn_id DESC
             LIMIT ? OFFSET ?`,
            [accountNo, limit, offset]
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
>>>>>>> docker
};