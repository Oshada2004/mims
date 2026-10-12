const express = require('express');
const reportController = require('../controllers/reportController');
const {
    verifySession,
    authorizeRoles,
    requireAccountAccess
} = require('../middleware/auth');

const router = express.Router();

const REPORT_ROLES = ['AGENT', 'OFFICER', 'MANAGER', 'ADMIN'];

router.use(verifySession);

router.get('/active-fds', authorizeRoles(...REPORT_ROLES), reportController.getActiveFDReport);
// Customers may read the history of accounts they hold (else 404).
router.get('/transactions/:accountNo', requireAccountAccess(...REPORT_ROLES), reportController.getTransactionHistory);
router.get('/account-summary', authorizeRoles(...REPORT_ROLES), reportController.getAccountTransactionSummaryReport);
router.get('/interest-distribution', authorizeRoles(...REPORT_ROLES), reportController.getMonthlyInterestDistributionReport);
router.get('/agent-transactions', authorizeRoles(...REPORT_ROLES), reportController.getAgentTransactionsReport);
router.get('/customer-activity/:customer_id', authorizeRoles(...REPORT_ROLES), reportController.getCustomerActivityReport);

module.exports = router;
