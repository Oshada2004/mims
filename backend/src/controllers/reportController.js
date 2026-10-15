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
import client from '../client';
import { endpoints } from '../endpoints';
import { listParams, toNumber, toPage } from '../../utils/normalize';

const rows = (body) => (Array.isArray(body?.data) ? body.data : []);


export async function getTransactionHistory(accountNo, { limit, offset } = {}, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.transactions(accountNo.trim()), {
        params: listParams({ limit, offset }),
        signal,
    });
    return toPage(data, (row) => ({
        txnId: row.txn_id,
        accountNo: row.sav_acc_no,
        agentPersonId: row.agent_person_id,
        fdId: row.fd_id,
        type: row.txn_type, // e.g. 'DEPOSIT', 'WITHDRAWAL', interest types
        amount: toNumber(row.amount),
        balanceAfter: toNumber(row.balance_after),
        reference: row.ref_text,
        timestamp: row.txn_timestamp,
    }));
}


export async function getActiveFds(dueBy, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.activeFds, {
        params: dueBy ? { due_by: dueBy } : undefined,
        signal,
    });
    return rows(data).map((row) => ({
        fdId: row.fd_id,
        accountNo: row.linked_savings_account,
        termCode: row.term_code,
        principal: toNumber(row.principal_amount),
        interestRate: toNumber(row.contracted_interest_rate),
        openedDate: row.opened_date,
        maturityDate: row.maturity_date,
        nextPayoutDate: row.upcoming_payout_date,
        expectedMonthlyInterest: toNumber(row.expected_30_day_interest),
    }));
}


export async function getAccountSummary({ planCode, status } = {}, { signal } = {}) {
    const params = {};
    if (planCode) params.plan_code = planCode;
    if (status) params.status = status;
    const { data } = await client.get(endpoints.reports.accountSummary, { params, signal });
    return rows(data).map((row) => ({
        accountNo: row.account_no,
        planCode: row.plan_code,
        planName: row.plan_name,
        holderNames: row.holder_names,
        balance: toNumber(row.current_balance),
        totalDeposits: toNumber(row.total_deposits),
        totalWithdrawals: toNumber(row.total_withdrawals),
        totalInterest: toNumber(row.total_interest_credited),
        transactionCount: toNumber(row.transaction_count),
        lastTransactionDate: row.last_transaction_date,
        status: row.account_status,
        openedDate: row.opened_date,
    }));
}


export async function getAgentTransactions({ startDate, endDate }, { signal } = {}) {
    const { data } = await client.get(endpoints.reports.agentTransactions, {
        params: { start_date: startDate, end_date: endDate },
        signal,
    });
    return rows(data).map((row) => ({
        agentId: row.agent_id,
        agentName: row.agent_name ?? [row.first_name, row.last_name].filter(Boolean).join(' ') ?? `Agent ${row.agent_id}`,
        branchName: row.branch_name ?? '—',
        totalTransactions: toNumber(row.total_transactions),
        grossValue: toNumber(row.gross_value_lkr ?? row.total_value),
        netValue: toNumber(row.net_value_lkr ?? row.total_value),
    }));
}


export async function getInterestDistribution({ year, month, planCode } = {}, { signal } = {}) {
    const params = {};
    if (year) params.year = year;
    if (month) params.month = month;
    if (planCode) params.plan_code = planCode;
    const { data } = await client.get(endpoints.reports.interestDistribution, { params, signal });
    return rows(data).map((row) => ({
        year: toNumber(row.txn_year),
        month: toNumber(row.txn_month),
        label: row.month_year_name ?? row.year_month_label,
        planCode: row.plan_code,
        accountType: row.account_type,
        accountsReceivingInterest: toNumber(row.accounts_receiving_interest),
        payoutCount: toNumber(row.total_interest_payouts),
        savingsInterest: toNumber(row.total_savings_interest),
        fdInterest: toNumber(row.total_fd_interest),
        totalInterest: toNumber(row.total_interest_paid),
    }));
}


export async function getCustomerActivity(customerId, { startDate, endDate } = {}, { signal } = {}) {
    const params = {};
    if (startDate) params.start_date = startDate;
    if (endDate) params.end_date = endDate;
    const { data } = await client.get(endpoints.reports.customerActivity(customerId), { params, signal });
    const row = data?.data ?? {};
    return {
        customerId: row.customer_id,
        customerName: row.customer_name,
        branchName: row.branch_name,
        agentName: row.agent_name,
        accountCount: toNumber(row.number_of_accounts),
        totalDeposits: toNumber(row.total_deposits),
        totalWithdrawals: toNumber(row.total_withdrawals),
        netBalance: toNumber(row.net_balance),
        hasActiveFd: row.has_active_fd === 'YES',
    };
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

        const [[{ total }]] = await db.query(
            'SELECT COUNT(*) AS total FROM TRANSACTION_LOG WHERE sav_acc_no = ?',
            [accountNo]
        );


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
