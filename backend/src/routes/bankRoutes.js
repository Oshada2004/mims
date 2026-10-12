const express = require('express');
const bankController = require('../controllers/bankController');
const { verifySession } = require('../middleware/auth');
const { paginate } = require('../middleware/pagination');

const router = express.Router();

// Public: bank name, contact details and opening hours.
router.get('/metadata', bankController.getMetadata);

// Any logged-in user.
router.get('/branches', verifySession, paginate, bankController.listBranches);
router.get('/savings-plans', verifySession, paginate, bankController.listSavingsPlans);
router.get('/fd-plans', verifySession, paginate, bankController.listFdPlans);

module.exports = router;
