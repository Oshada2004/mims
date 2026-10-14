const db = require('./../config/db');

function handleError(res, error, action) {
  if (error.statusCode === 404) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }

  if (error.sqlState === '45000') {
    return res.status(422).json({
      success: false,
      error: 'BusinessRuleViolation',
      message: error.sqlMessage || error.message
    });
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({
      success: false,
      error: 'InvalidReference',
      message: 'Referenced customer, agent, branch, or operator does not exist.'
    });
  }

  console.error(`Error during ${action}:`, error);
  return res.status(500).json({
    success: false,
    error: 'InternalServerError',
    message: `Failed to ${action}`
  });
}

async function openSavingsAccount(req, res) {
  const { customerId, planCode, initialDeposit } = req.body || {};
  // The agent and branch always come from the session, never from the request body.
  const agentPersonId = req.user?.personId;
  const branchId = req.user?.branch_id;

  if (!agentPersonId || !branchId) {
    return res.status(403).json({
      success: false,
      message: 'Only an agent assigned to a branch can open accounts.'
    });
  }

  if (!customerId || !planCode || initialDeposit == null) {
    return res.status(400).json({
      success: false,
      message: 'customerId, planCode, and initialDeposit are required.'
    });
  }

  if (isNaN(initialDeposit) || Number(initialDeposit) < 0) {
    return res.status(400).json({
      success: false,
      message: 'initialDeposit must be a valid non-negative number.'
    });
  }

  let conn;
  try {
    conn = await db.getConnection();
    await conn.query('SET @p_account_no = NULL');
    await conn.query(
      'CALL sp_open_savings_account(?, ?, ?, ?, ?, @p_account_no)',
      [branchId, agentPersonId, customerId, planCode, initialDeposit]
    );
    const [rows] = await conn.query('SELECT @p_account_no AS accountNo');
    const accountNo = rows[0]?.accountNo;

    return res.status(201).json({
      success: true,
      message: `Savings account created successfully. Your account number is ${accountNo}`,
      data: { accountNo }
    });
  } catch (error) {
    return handleError(res, error, 'open savings account');
  } finally {
    if (conn) conn.release();
  }
}


async function getAccountByNo(req, res) {
  const { accountNo } = req.params;

  if (!accountNo || typeof accountNo !== 'string') {
    return res.status(400).json({ success: false, message: 'Account number is required.' });
  }

  try {
    const [accounts] = await db.query(
      'SELECT * FROM SAVINGS_ACCOUNT WHERE account_no = ?',
      [accountNo]
    );

    if (accounts.length === 0) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }

    const [holders] = await db.query(
      `SELECT p.person_id, p.first_name, p.last_name, ah.holder_role
       FROM ACCOUNT_HOLDER ah
       JOIN PERSON p ON p.person_id = ah.customer_person_id
       WHERE ah.account_no = ?`,
      [accountNo]
    );

    return res.status(200).json({
      success: true,
      data: { ...accounts[0], holders }
    });
  } catch (error) {
    return handleError(res, error, 'fetch account');
  }
}


async function addJointHolder(req, res) {
  const { accountNo } = req.params;
  const coCustomerId = req.body?.coCustomerId || req.body?.customerId;

  if (!coCustomerId) {
    return res.status(400).json({ success: false, message: 'coCustomerId is required' });
  }

  try {
    await db.query('CALL sp_add_joint_holder(?, ?)', [accountNo, coCustomerId]);
    return res.status(201).json({
      success: true,
      message: 'Joint holder added successfully'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This customer is already a holder of the account'
      });
    }
    return handleError(res, error, 'add joint holder');
  }
}


async function reactivateAccount(req, res) {
  const { accountNo } = req.params;
  const operatorId = req.user?.personId;

  if (!operatorId) {
    return res.status(400).json({ success: false, message: 'operatorId is required' });
  }

  try {
    await db.query('CALL sp_reactivate_dormant_account(?, ?)', [accountNo, operatorId]);
    return res.status(200).json({
      success: true,
      message: 'Account reactivated successfully'
    });
  } catch (error) {
    return handleError(res, error, 'reactivate account');
  }
}

async function closeAccount(req, res) {
  const { accountNo } = req.params;
  const operatorId = req.user?.personId;

  if (!operatorId) {
    return res.status(400).json({ success: false, message: 'operatorId is required' });
  }

  try {
    await db.query('CALL sp_close_savings_account(?, ?)', [accountNo, operatorId]);
    return res.status(200).json({
      success: true,
      message: 'Account closed successfully'
    });
  } catch (error) {
    return handleError(res, error, 'close account');
  }
}


module.exports = {
  openSavingsAccount,
  getAccountByNo,
  addJointHolder,
  reactivateAccount,
  closeAccount
};