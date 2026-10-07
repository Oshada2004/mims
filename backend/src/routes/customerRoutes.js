const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

router.post('/adult', customerController.createAdultCustomer);
router.post('/minor/new-guardian', customerController.createMinorWithNewGuardian);
router.post('/minor/existing-guardian', customerController.createMinorWithExistingGuardian);
router.get('/:personId/accounts', customerController.getCustomerAccounts);

module.exports = router;