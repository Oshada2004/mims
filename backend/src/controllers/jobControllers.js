const db = require('../config/db');

exports.triggerSavingsInterest = async (req, res, next) => {
    const runDate = req.body.runDate || new Date().toISOString().slice(0, 10);
    try {
        await db.query('CALL sp_run_savings_interest_accrual(?)', [runDate]);
        return res.status(200).json({
            success: true,
            message: `Savings interest process executed for cutoff: ${runDate}`
        });
    } catch (err) {
        next(err);
    }
};

exports.triggerFDInterest = async (req, res, next) => {
    const runDate = req.body.runDate || new Date().toISOString().slice(0, 10);
    try {
        await db.query('CALL sp_run_fd_interest_payout(?)', [runDate]);
        return res.status(200).json({
            success: true,
            message: `Fixed Deposit payouts executed for cutoff: ${runDate}`
        });
    } catch (err) {
        next(err);
    }
};

exports.triggerDormancyCheck = async (req, res, next) => {
    try {
        await db.query('CALL sp_run_daily_dormancy_check()');
        return res.status(200).json({
            success: true,
            message: 'Daily account dormancy evaluation completed.'
        });
    } catch (err) {
        next(err);
    }
};