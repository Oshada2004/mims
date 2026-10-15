const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifySession } = require('../middleware/auth');

router.post('/login', authController.login);
router.get('/me', authController.getProfile);
router.post('/logout', authController.logout);
router.post('/change-password', verifySession, authController.changePassword);
router.get('/preferences', verifySession, authController.getPreferences);
router.put('/preferences', verifySession, authController.updatePreferences);

module.exports = router;