const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/active-fds', reportController.getActiveFDReport);
router.get('/transactions/:accountNo', reportController.getTransactionHistory);

module.exports = router;