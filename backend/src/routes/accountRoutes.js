const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const {
  verifySession,
  authorizeRoles,
  requireAccountAccess
} = require('../middleware/auth');

const ACCOUNT_OPERATORS = ['AGENT', 'OFFICER', 'MANAGER', 'ADMIN'];

/**
 * @route   POST /api/accounts
 * @desc    Open a new savings account at the agent's own branch
 * @access  Agent
 */
router.post('/', verifySession, authorizeRoles('AGENT'), accountController.openSavingsAccount);

/**
 * @route   GET /api/accounts/:accountNo
 * @desc    Get savings account details by account number
 * @access  Staff / Admin (any account); Customer (only accounts they hold, else 404)
 */
router.get('/:accountNo', verifySession, requireAccountAccess(), accountController.getAccountByNo);

/**
 * @route   POST /api/accounts/:accountNo/joint-holder
 * @desc    Add a joint account holder
 * @access  Agent
 */
router.post(
  '/:accountNo/joint-holder',
  verifySession,
  authorizeRoles('AGENT'),
  accountController.addJointHolder
);

/**
 * @route   POST /api/accounts/:accountNo/reactivate
 * @desc    Reactivate a dormant savings account
 * @access  Agent / Officer / Manager / Admin
 */
router.post(
  '/:accountNo/reactivate',
  verifySession,
  authorizeRoles(...ACCOUNT_OPERATORS),
  accountController.reactivateAccount
);

/**
 * @route   POST /api/accounts/:accountNo/close
 * @desc    Close a savings account (balance must be zero)
 * @access  Agent / Officer / Manager / Admin
 */
router.post(
  '/:accountNo/close',
  verifySession,
  authorizeRoles(...ACCOUNT_OPERATORS),
  accountController.closeAccount
);

module.exports = router;
