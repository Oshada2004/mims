const express = require('express');
const router = express.Router();

const fdController = require('../controllers/fdController');
const { verifySession } = require('../middleware/auth');

function requireAgent(req, res, next) {
    if (
        req.user?.user_role !== 'STAFF' ||
        req.user?.staff_role !== 'AGENT'
    ) {
        return res.status(403).json({
            success: false,
            message: 'Only banking agents can perform this operation.'
        });
    }

    next();
}


router.post(
    '/open',
    verifySession,
    requireAgent,
    fdController.openFD
);

router.post(
    '/:id/close-early',
    verifySession,
    requireAgent,
    fdController.closeEarly
);

module.exports = router;