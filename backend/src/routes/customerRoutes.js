
const express = require('express');
const router = express.Router();

const customerController = require('../controllers/customerController');
const {
  verifySession,
  requireRole
} = require('../middleware/auth');
const { paginate } = require('../middleware/pagination');

// Search customers (adult and minor). Staff and admin only.
router.get(
  '/',
  verifySession,
  requireRole('STAFF', 'ADMIN'),
  paginate,
  customerController.listCustomers
);

router.post(
  '/adult',
  verifySession,
  requireRole('STAFF'),
  customerController.createAdultCustomer
);

router.post(
  '/minor/new-guardian',
  verifySession,
  requireRole('STAFF'),
  customerController.createMinorWithNewGuardian
);

router.post(
  '/minor/existing-guardian',
  verifySession,
  requireRole('STAFF'),
  customerController.createMinorWithExistingGuardian
);

router.get(
  '/:personId/accounts',
  verifySession,
  requireRole('CUSTOMER', 'STAFF', 'ADMIN'),
  customerController.getCustomerAccounts
);

module.exports = router;