const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { verifyToken, authorizeRoles } = require('../middleware/auth');

router.post('/interest/savings', verifyToken, authorizeRoles('ADMIN', 'QA_TESTER'), jobController.triggerSavingsInterest);
router.post('/interest/fd', verifyToken, authorizeRoles('ADMIN', 'QA_TESTER'), jobController.triggerFDInterest);
router.post('/dormancy/check', verifyToken, authorizeRoles('ADMIN', 'QA_TESTER'), jobController.triggerDormancyCheck);

module.exports = router;