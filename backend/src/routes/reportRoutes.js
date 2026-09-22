const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.get('/agent-performance', verifyToken, authorizeRoles('MANAGER', 'ADMIN'), reportController.getAgentReport);
router.get('/account-summary', verifyToken, authorizeRoles('MANAGER', 'ADMIN'), reportController.getAccountReport);
router.get('/active-fds', verifyToken, authorizeRoles('MANAGER', 'ADMIN'), reportController.getActiveFDReport);
router.get('/monthly-interest', verifyToken, authorizeRoles('MANAGER', 'ADMIN'), reportController.getInterestReport);
router.get('/customer-activity', verifyToken, authorizeRoles('MANAGER', 'ADMIN'), reportController.getCustomerActivityReport);

module.exports = router;