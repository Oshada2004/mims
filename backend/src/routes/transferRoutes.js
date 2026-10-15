const express = require('express');
const transferController = require('../controllers/transferController');
const { verifySession, requireRole } = require('../middleware/auth');

const router = express.Router();

// Customer-initiated account-to-account transfers, confirmed with an emailed one-time code.
router.use(verifySession, requireRole('CUSTOMER'));

router.get('/recipient/:accountNo', transferController.lookupRecipient);
router.post('/initiate', transferController.initiate);
router.post('/resend', transferController.resend);
router.post('/confirm', transferController.confirm);

module.exports = router;
