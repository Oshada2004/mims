const express = require('express');
const router = express.Router();

const staffController = require('../controllers/staffController');
const { verifySession, requireRole } = require('../middleware/auth');

// Creates a staff member and their login. Only admin is allowed.
router.post(
  '/',
  verifySession,
  requireRole('ADMIN'),
  staffController.createStaff
);

module.exports = router;