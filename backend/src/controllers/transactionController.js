const db = require('../config/db');

export async function deposit(req, res, next) {
    const agentId = req.user.personId;
    const { accountNo, amount, refText } = req.body;

    try {
        const [results] = await query(
            `CALL sp_process_deposit(?,?,?,?,@p_txn_id,@p_new_balance);
            SELECT @p_txn_id AS txnId,@p_new_balance AS newBalance;`,
            [accountNo, agentId, amount, refText || 'Manual Deposit']
        );

        const out = results[1][0];
        return res.status(200).json({
            success: true,
            message: 'Deposit successful.',
            data: { txnId: out.txnId, accountNo, balanceAfter: out.newBalance }
        });
    } catch (err) {
        if (err.sqlState === '45000') {
            return res.status(422).json({ success: false, error: 'BusinessRuleViolation', message: err.message });
        }
        next(err);
    }
}

export async function withdraw(req, res, next) {
    const agentId = req.user.personId;
    const { accountNo, amount, refText } = req.body;

    try {
        const [results] = await query(
            `CALL sp_process_withdrawal(?,?,?,?,@p_txn_id,@p_new_balance);
            SELECT @p_txn_id AS txnId,@p_new_balance AS newBalance;`,
            [accountNo, agentId, amount, refText || 'Manual Withdrawal']
        );

        const out = results[1][0];
        return res.status(200).json({
            success: true,
            message: 'Withdrawal successful.',
            data: { txnId: out.txnId, accountNo, balanceAfter: out.newBalance }
        });
    } catch (err) {
        if (err.sqlState === '45000') {
            return res.status(422).json({ success: false, error: 'BusinessRuleViolation', message: err.message });
        }
        next(err);
    }
}