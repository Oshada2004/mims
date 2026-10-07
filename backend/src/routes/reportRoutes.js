const express = require('express');
const reportController = require('../controllers/reportController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.get(
    '/active-fds',
    verifyToken,
    authorizeRoles('ADMIN', 'MANAGER', 'OFFICER'),
    reportController.getActiveFDReport
);

module.exports = router;