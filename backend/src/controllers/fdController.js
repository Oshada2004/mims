const db = require('../config/db');

exports.openFD = async (req, res, next) => {
    const agentId = req.user?.personId;

    if (!Number.isInteger(agentId) || agentId <= 0) {
        return res.status(401).json({
            success: false,
            message: 'Please log in with a valid agent account.'
        });
    }

    const { savingsAccountNo, termCode, principal } = req.body || {};

    if (
        typeof savingsAccountNo !== 'string' ||
        savingsAccountNo.trim() === '' ||
        savingsAccountNo.length > 15
    ) {
        return res.status(400).json({
            success: false,
            message: 'A savings account number of up to 15 characters is required.'
        });
    }

    if (!['6M', '1Y', '3Y'].includes(termCode)) {
        return res.status(400).json({
            success: false,
            message: 'Term must be 6M, 1Y, or 3Y.'
        });
    }
    const principalText =
        typeof principal === 'string'
            ? principal.trim()
            : typeof principal === 'number'
                ? String(principal)
                : '';

    if (
        !/^\d{1,12}(\.\d{1,2})?$/.test(principalText) ||
        Number(principalText) <= 0
    ) {
        return res.status(400).json({
            success: false,
            message: 'Principal must be positive with at most two decimal places.'
        });
    }

    let connection;

    try {
        connection = await db.getConnection();

        await connection.query('SET @p_fd_id = NULL');

        await connection.query(
            'CALL sp_open_fixed_deposit(?, ?, ?, ?, @p_fd_id)',
            [
                savingsAccountNo.trim(),
                termCode,
                principalText,
                agentId
            ]
        );

        const [rows] = await connection.query(
            'SELECT @p_fd_id AS fdId'
        );

        return res.status(201).json({
            success: true,
            message: 'Fixed Deposit opened successfully.',
            data: {
                fdId: rows[0].fdId,
                linkedAccount: savingsAccountNo.trim(),
                principal: principalText,
                termCode
            }
        });
    } catch (err) {
        if (err.sqlState === '45000') {
            return res.status(422).json({
                success: false,
                error: 'BusinessRuleViolation',
                message: err.sqlMessage || err.message
            });
        }

        next(err);
    } finally {
        if (connection) {
            connection.release();
        }
    }
};
exports.closeEarly = async (req, res, next) => {
    const agentId = req.user?.personId;
    const fdId = req.params.id;

    if (!Number.isInteger(agentId) || agentId <= 0) {
        return res.status(401).json({
            success: false,
            message: 'Please log in with a valid agent account.'
        });
    }

    if (
        typeof fdId !== 'string' ||
        fdId.trim() === '' ||
        fdId.length > 15
    ) {
        return res.status(400).json({
            success: false,
            message: 'A fixed deposit ID of up to 15 characters is required.'
        });
    }

    try {
        await db.query(
            'CALL sp_early_close_fixed_deposit(?, ?)',
            [fdId.trim(), agentId]
        );

        return res.status(200).json({
            success: true,
            message: 'Fixed deposit closed early and principal returned.'
        });
    } catch (err) {
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