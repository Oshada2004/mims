const express = require('express');
const bankController = require('../controllers/bankController');

const router = express.Router();

router.get('/metadata', bankController.getMetadata);

module.exports = router;
