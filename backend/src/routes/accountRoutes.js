const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');

/**
 * @route   POST /api/accounts
 * @desc    Open a new savings account
 * @access  Agent / Admin (can be protected with auth middleware)
 */
router.post('/', accountController.openSavingsAccount);

/**
 * @route   GET /api/accounts/customer/:personId
 * @desc    Get all savings accounts associated with a customer
 * @access  Agent / Officer / Customer
 */
router.get('/customer/:personId', accountController.getAccountsByCustomer);

/**
 * @route   GET /api/accounts/:accountNo
 * @desc    Get savings account details by account number
 * @access  Agent / Officer / Customer
 */
router.get('/:accountNo', accountController.getAccountByNo);

/**
 * @route   POST /api/accounts/:accountNo/joint-holder
 * @desc    Add a joint account holder
 * @access  Agent / Officer
 */
router.post('/:accountNo/joint-holder', accountController.addJointHolder);

/**
 * @route   POST /api/accounts/:accountNo/reactivate
 * @desc    Reactivate a dormant savings account
 * @access  Agent / Officer / Admin
 */
router.post('/:accountNo/reactivate', accountController.reactivateAccount);

/**
 * @route   POST /api/accounts/:accountNo/close
 * @desc    Close a savings account (balance must be zero)
 * @access  Agent / Officer / Admin
 */
router.post('/:accountNo/close', accountController.closeAccount);

module.exports = router;