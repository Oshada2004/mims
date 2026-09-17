const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/deposit',verifyToken,authorizeRoles('AGENT','ADMIN'),transactionController.deposit);
router.post('/withdraw',verifyToken,authorizeRoles('AGENT','ADMIN'),transactionController.withdraw);

module.exports=router;