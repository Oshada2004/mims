const express = require('express');
const router = express.Router();

const fdController = require('../controllers/fdController');
const {
    verifyToken,
    authorizeRoles
} = require('../middleware/auth');

router.post(
    '/open',
    verifyToken,
    authorizeRoles('AGENT'),
    fdController.openFD
);

router.post(
    '/:id/close-early',
    verifyToken,
    authorizeRoles('AGENT'),
    fdController.closeEarly
);

module.exports = router;