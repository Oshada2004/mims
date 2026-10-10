const db = require('../config/db');

// Matches DECIMAL(14,2): up to 12 digits before the point, up to 2 after.
const AMOUNT_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

function validateInput(body) {
    const { accountNo, amount, refText } = body || {};

    if (typeof accountNo !== 'string' || accountNo.trim() === '' || accountNo.trim().length > 15) {
        return { error: 'A savings account number of up to 15 characters is required.' };
    }

    const amountText =
        typeof amount === 'string' ? amount.trim()
            : typeof amount === 'number' ? String(amount)
                : '';

    if (!AMOUNT_PATTERN.test(amountText) || Number(amountText) <= 0) {
        return { error: 'Amount must be a positive number with at most two decimal places.' };
    }

    if (refText !== undefined && refText !== null &&
        (typeof refText !== 'string' || refText.length > 50)) {
        return { error: 'refText must be text of at most 50 characters.' };
    }

    return {
        accountNo: accountNo.trim(),
        amount: amountText,
        refText: refText ? refText.trim() : null
    };
}

// This runs the deposit or withdrawal procedure and gets back the transaction id and new balance.
// We grab one connection and use it for every step, because the @ variables only exist on
// the connection that created them. If we used the pool directly, the SELECT might run
// on a different connection and get nothing back.
function processTransaction(procedure, defaultRef, successMessage) {
    return async (req, res, next) => {
        const agentId = req.user?.personId;

        if (!Number.isInteger(agentId) || agentId <= 0) {
            return res.status(401).json({
                success: false,
                message: 'Please log in with a valid agent account.'
            });
        }

        const input = validateInput(req.body);
        if (input.error) {
            return res.status(400).json({ success: false, message: input.error });
        }

        let connection;
        try {
            connection = await db.getConnection();

            await connection.query('SET @p_txn_id = NULL, @p_new_balance = NULL');
            await connection.query(
                `CALL ${procedure}(?, ?, ?, ?, @p_txn_id, @p_new_balance)`,
                [input.accountNo, agentId, input.amount, input.refText || defaultRef]
            );
            const [rows] = await connection.query(
                'SELECT @p_txn_id AS txnId, @p_new_balance AS newBalance'
            );

            return res.status(200).json({
                success: true,
                message: successMessage,
                data: {
                    txnId: rows[0].txnId,
                    accountNo: input.accountNo,
                    amount: input.amount,
                    balanceAfter: rows[0].newBalance
                }
            });
        } catch (err) {
            // Business rule violations raised by the procedures (SIGNAL SQLSTATE '45000')
            if (err.sqlState === '45000') {
                return res.status(422).json({
                    success: false,
                    error: 'BusinessRuleViolation',
                    message: err.sqlMessage || err.message
                });
            }
            if (err.code === 'ER_NO_REFERENCED_ROW_2') {
                return res.status(400).json({
                    success: false,
                    error: 'InvalidReference',
                    message: 'The account or agent does not exist.'
                });
            }
            return next(err);
        } finally {
            if (connection) connection.release();
        }
    };
}

exports.deposit = processTransaction(
    'sp_process_deposit', 'Manual Deposit', 'Deposit successful.'
);

exports.withdraw = processTransaction(
    'sp_process_withdrawal', 'Manual Withdrawal', 'Withdrawal successful.'
);