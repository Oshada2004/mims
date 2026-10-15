
const db = require('../config/db');

function isValidDate(text) {
    if (typeof text !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;

    const date = new Date(`${text}T00:00:00Z`);

    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === text
    );
}

function readWholeNumber(value, defaultValue) {
    if (value === undefined) return defaultValue;

    const text = String(value);

    return /^\d+$/.test(text) ? Number(text) : NaN;
}

function sendDatabaseError(err, next) {
    return next(err);
}

/**
 * Active fixed deposit report
 * GET /api/reports/active-fds
 */
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

        const rows = results[0] || [];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        return sendDatabaseError(err, next);
    }
};

/**
 * Transaction history for a savings account
 * GET /api/reports/transactions/:accountNo
 */
exports.getTransactionHistory = async (req, res, next) => {
    const accountNo = String(req.params.accountNo || '').trim();
    const limit = readWholeNumber(req.query.limit, 50);
    const offset = readWholeNumber(req.query.offset, 0);

    if (!accountNo || accountNo.length > 15) {
        return res.status(400).json({
            success: false,
            message: 'A savings account number of up to 15 characters is required.'
        });
    }

    if (!Number.isInteger(limit) || limit < 1 || limit > 200) {
        return res.status(400).json({
            success: false,
            message: 'limit must be a whole number from 1 to 200.'
        });
    }

    if (!Number.isInteger(offset) || offset < 0) {
        return res.status(400).json({
            success: false,
            message: 'offset must be a whole number of 0 or more.'
        });
    }

    try {
        const [accounts] = await db.query(
            `SELECT account_no
             FROM SAVINGS_ACCOUNT
             WHERE account_no = ?`,
            [accountNo]
        );

        if (accounts.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Savings account not found.'
            });
        }

        const accountExpression = `
            COALESCE(
                t.sav_acc_no,
                d.sav_acc_no,
                i.sav_acc_no
            )
        `;

        const joins = `
            FROM TRANSACTION_LOG t
            LEFT JOIN DEPOSIT_WITHDRAW_LOG d
                ON d.txn_id = t.txn_id
            LEFT JOIN INTEREST_LOG i
                ON i.txn_id = t.txn_id
        `;

        const [countRows] = await db.query(
            `SELECT COUNT(DISTINCT t.txn_id) AS total
             ${joins}
             WHERE ${accountExpression} = ?`,
            [accountNo]
        );

        const total = Number(countRows[0]?.total || 0);

        const [rows] = await db.query(
            `SELECT
                t.txn_id,
                ${accountExpression} AS sav_acc_no,
                t.agent_person_id,
                t.fd_id,
                COALESCE(d.txn_type, i.txn_type, t.txn_type) AS txn_type,
                COALESCE(d.amount, i.amount, t.amount) AS amount,
                COALESCE(d.balance_after, t.balance_after) AS balance_after,
                COALESCE(d.ref_text, t.ref_text) AS ref_text,
                t.txn_timestamp
             ${joins}
             WHERE ${accountExpression} = ?
             ORDER BY t.txn_timestamp DESC, t.txn_id DESC
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
        return sendDatabaseError(err, next);
    }
};

/**
 * Customer activity report
 * GET /api/reports/customer-activity/:customer_id
 */
exports.getCustomerActivityReport = async (req, res, next) => {
    const { customer_id } = req.params;
    const { start_date, end_date } = req.query;

    if (!/^\d+$/.test(String(customer_id))) {
        return res.status(400).json({
            success: false,
            message: 'A valid numeric customer_id is required.'
        });
    }

    const customerIdNum = Number(customer_id);

    if (!Number.isSafeInteger(customerIdNum) || customerIdNum <= 0) {
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

    if (start_date && end_date && start_date > end_date) {
        return res.status(400).json({
            success: false,
            message: 'start_date cannot be after end_date.'
        });
    }

    try {
        const [results] = await db.query(
            'CALL sp_get_customer_activity_report(?, ?, ?)',
            [
                customerIdNum,
                start_date || null,
                end_date || null
            ]
        );

        const rows = results[0] || [];

        if (rows.length === 0) {
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

        return sendDatabaseError(err, next);
    }
};

/**
 * Monthly interest distribution report
 * GET /api/reports/interest-distribution
 */
exports.getMonthlyInterestDistributionReport = async (
    req,
    res,
    next
) => {
    const { year, month, plan_code } = req.query;

    let parsedYear = null;
    let parsedMonth = null;

    if (year !== undefined) {
        if (!/^\d{4}$/.test(String(year))) {
            return res.status(400).json({
                success: false,
                message: 'year must be a valid 4-digit integer between 1900 and 2100.'
            });
        }

        parsedYear = Number(year);

        if (parsedYear < 1900 || parsedYear > 2100) {
            return res.status(400).json({
                success: false,
                message: 'year must be between 1900 and 2100.'
            });
        }
    }

    if (month !== undefined) {
        if (!/^\d{1,2}$/.test(String(month))) {
            return res.status(400).json({
                success: false,
                message: 'month must be an integer between 1 and 12.'
            });
        }

        parsedMonth = Number(month);

        if (parsedMonth < 1 || parsedMonth > 12) {
            return res.status(400).json({
                success: false,
                message: 'month must be an integer between 1 and 12.'
            });
        }
    }

    const allowedPlans = [
        'CHILD',
        'TEEN',
        'ADULT',
        'SENIOR',
        'JOINT'
    ];

    const normalizedPlan = plan_code
        ? String(plan_code).toUpperCase()
        : null;

    if (
        normalizedPlan &&
        !allowedPlans.includes(normalizedPlan)
    ) {
        return res.status(400).json({
            success: false,
            message: `Invalid plan_code. Allowed values: ${allowedPlans.join(', ')}`
        });
    }

    try {
        const [results] = await db.query(
            'CALL sp_get_monthly_interest_distribution(?, ?, ?)',
            [parsedYear, parsedMonth, normalizedPlan]
        );

        const rows = results[0] || [];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        return sendDatabaseError(err, next);
    }
};

/**
 * Agent transaction summary
 * GET /api/reports/agent-transactions
 */
exports.getAgentTransactionSummaryReport = async (
    req,
    res,
    next
) => {
    try {
        const [results] = await db.query(
            'CALL GetAgentTransactionSummary()'
        );

        const rows = results[0] || [];

        return res.status(200).json({
            success: true,
            count: rows.length,
            data: rows
        });
    } catch (err) {
        return sendDatabaseError(err, next);
    }
};

/**
 * Account transaction summary
 * GET /api/reports/account-summary
 */
exports.getAccountTransactionSummaryReport = async (
    req,
    res,
    next
) => {
    const { account_no, from_date, to_date } = req.query;

    let accountNo = null;

    if (account_no !== undefined) {
        accountNo = String(account_no).trim();

        if (!accountNo || accountNo.length > 15) {
            return res.status(400).json({
                success: false,
                message: 'account_no must be a non-empty string of up to 15 characters.'
            });
        }
    }

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

    if (from_date && to_date && from_date > to_date) {
        return res.status(400).json({
            success: false,
            message: 'from_date cannot be after to_date.'
        });
    }

    try {
        const [results] = await db.query(
            'CALL sp_account_transaction_summary(?, ?, ?)',
            [
                accountNo,
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
            const isNotFound =
                String(err.sqlMessage || '')
                    .toLowerCase()
                    .includes('not found');

            return res.status(isNotFound ? 404 : 400).json({
                success: false,
                message: err.sqlMessage || err.message
            });
        }

        return sendDatabaseError(err, next);
    }
};
