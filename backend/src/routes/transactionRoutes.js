const express = require('express');
const router = express.Router();
const { deposit, withdraw } = require('../controllers/transactionController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/deposit', verifyToken, authorizeRoles('AGENT', 'ADMIN'), deposit);
router.post('/withdraw', verifyToken, authorizeRoles('AGENT', 'ADMIN'), withdraw);

module.exports = router;