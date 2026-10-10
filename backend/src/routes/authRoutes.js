const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

<<<<<<< HEAD
router.post('/login', authController.login);
=======
router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getProfile);
router.post('/logout', authController.logout);
>>>>>>> docker

module.exports = router;