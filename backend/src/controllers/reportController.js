const db = require('../config/db');

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

exports.getActiveFDReport = async (req, res, next) => {
    try {
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
};