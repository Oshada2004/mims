const express = require('express');
const reportController = require('../controllers/reportController');
const {
    verifySession,
    requireRole
} = require('../middleware/auth');


const router = express.Router();

router.use(verifySession);
router.use(requireRole('ADMIN'));

router.get('/active-fds', reportController.getActiveFDReport);
router.get('/transactions/:accountNo', reportController.getTransactionHistory);
router.get('/account-summary', reportController.getAccountTransactionSummaryReport);
router.get('/interest-distribution', reportController.getMonthlyInterestDistributionReport);
router.get('/agent-transactions', reportController.getAgentTransactionsReport);
router.get('/customer-activity/:customer_id', reportController.getCustomerActivityReport);
module.exports = router;