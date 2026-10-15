const db = require('../config/db');

function isValidDate(text) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
    const date = new Date(text + 'T00:00:00Z');
    return !isNaN(date) && date.toISOString().slice(0, 10) === text;
}

function readWholeNumber(value, defaultValue) {
    if (value === undefined) return defaultValue;
    return /^\d+$/.test(value) ? Number(value) : NaN;
}


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
        const [accounts] = await db.query(
            'SELECT account_no FROM SAVINGS_ACCOUNT WHERE account_no = ?',
            [accountNo]
        );
        if (accounts.length === 0) {
            return res.status(404).json({ success: false, message: 'Savings account not found.' });
        }

        // 1. Get the total count across all transaction log types for this account
        const [[{ total }]] = await db.query(
            `SELECT COUNT(*) AS total FROM (
                SELECT txn_id FROM DEPOSIT_WITHDRAW_LOG WHERE sav_acc_no = ?
                UNION ALL
                SELECT txn_id FROM INTEREST_LOG WHERE sav_acc_no = ?
                UNION ALL
                SELECT txn_id FROM AtoA_TRANSFER_LOG WHERE sender_acc_no = ?
                UNION ALL
                SELECT txn_id FROM AtoA_TRANSFER_LOG WHERE receiver_acc_no = ?
            ) AS combined_txns`,
            [accountNo, accountNo, accountNo, accountNo]
        );

        // 2. Fetch the paginated transaction history
        const [rows] = await db.query(
            `SELECT txn_id, sav_acc_no, agent_person_id, fd_id, txn_type,
                    amount, balance_after, ref_text, txn_timestamp
             FROM (
                -- Deposits, Withdrawals, FD funding & principal returns
                SELECT 
                    dw.txn_id,
                    dw.sav_acc_no,
                    dw.agent_person_id,
                    dw.fd_id,
                    dw.txn_type,
                    dw.amount,
                    dw.balance_after,
                    dw.ref_text,
                    tl.txn_timestamp
                FROM DEPOSIT_WITHDRAW_LOG dw
                JOIN TRANSACTION_LOG tl ON tl.txn_id = dw.txn_id
                WHERE dw.sav_acc_no = ?

                UNION ALL

                -- Savings Interest and FD Interest credited to this account
                SELECT 
                    i.txn_id,
                    i.sav_acc_no,
                    NULL AS agent_person_id,
                    i.fd_id,
                    CASE 
                        WHEN i.account_type = 'FIXED' THEN 'FD_INTEREST' 
                        ELSE 'SAVINGS_INTEREST' 
                    END AS txn_type,
                    i.amount,
                    i.balance_after,
                    i.ref_text,
                    tl.txn_timestamp
                FROM INTEREST_LOG i
                JOIN TRANSACTION_LOG tl ON tl.txn_id = i.txn_id
                WHERE i.sav_acc_no = ?

                UNION ALL

                -- Transfers sent out from this account
                SELECT 
                    a.txn_id,
                    a.sender_acc_no AS sav_acc_no,
                    a.agent_person_id,
                    NULL AS fd_id,
                    'TRANSFER_OUT' AS txn_type,
                    a.amount,
                    a.sender_balance_after AS balance_after,
                    a.ref_text,
                    tl.txn_timestamp
                FROM AtoA_TRANSFER_LOG a
                JOIN TRANSACTION_LOG tl ON tl.txn_id = a.txn_id
                WHERE a.sender_acc_no = ?

                UNION ALL

                -- Transfers received into this account
                SELECT 
                    a.txn_id,
                    a.receiver_acc_no AS sav_acc_no,
                    a.agent_person_id,
                    NULL AS fd_id,
                    'TRANSFER_IN' AS txn_type,
                    a.amount,
                    a.receiver_balance_after AS balance_after,
                    a.ref_text,
                    tl.txn_timestamp
                FROM AtoA_TRANSFER_LOG a
                JOIN TRANSACTION_LOG tl ON tl.txn_id = a.txn_id
                WHERE a.receiver_acc_no = ?
             ) AS all_txns
             ORDER BY txn_timestamp DESC, txn_id DESC
             LIMIT ? OFFSET ?`,
            [accountNo, accountNo, accountNo, accountNo, limit, offset]
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



exports.getAgentTransactionSummaryReport = async (req, res, next) => {
    try {
        const [results] = await db.query('CALL GetAgentTransactionSummary()');
        const rows = results[0] || [];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        next(err);
    }
};



exports.getAccountTransactionSummaryReport = async (req, res, next) => {
    const { account_no, from_date, to_date } = req.query;

    // Validate account_no if provided
    if (account_no !== undefined) {
        const trimmedAcc = String(account_no).trim();
        if (trimmedAcc === '' || trimmedAcc.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'account_no must be a non-empty string of up to 15 characters.'
            });
        }
    }

    // Validate date format (YYYY-MM-DD)
    if (from_date !== undefined && !isValidDate(from_date)) {
        return res.status(400).json({
            success: false,
            message: 'from_date must be a valid date in YYYY-MM-DD format.'
        });
    }

    if (to_date !== undefined && !isValidDate(to_date)) {
        return res.status(400).json({
            success: false,
            message: 'to_date must be a valid date in YYYY-MM-DD format.'
        });
    }

    // Validate date range
    if (from_date && to_date && new Date(from_date) > new Date(to_date)) {
        return res.status(400).json({
            success: false,
            message: 'from_date cannot be after to_date.'
        });
    }

    try {
        const [results] = await db.query(
            'CALL sp_account_transaction_summary(?, ?, ?)',
            [
                account_no ? String(account_no).trim() : null,
                from_date || null,
                to_date || null
            ]
        );

        const rows = results[0] || [];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        if (err.sqlState === '45000') {
            const isNotFound = err.sqlMessage && err.sqlMessage.toLowerCase().includes('not found');
            return res.status(isNotFound ? 404 : 400).json({
                success: false,
                message: err.sqlMessage || err.message
            });
        }
        next(err);
    }
};
