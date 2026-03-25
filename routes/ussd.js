'use strict';

const express = require('express');
const router = express.Router();
const ussdIpWhitelist = require('../middleware/ussdIpWhitelist');
const { handleUssdRequest } = require('../controllers/ussdController');

router.get('/', ussdIpWhitelist, handleUssdRequest);

router.post('/', ussdIpWhitelist, handleUssdRequest);

module.exports = router;
