const express = require('express');
const router = express.Router();
const easyPayController = require('../controllers/easyPayController');

router.get('/ping', easyPayController.ping);
router.post('/infoRequest', easyPayController.infoRequest);
router.post('/authorisationRequest', easyPayController.authorisationRequest);
router.post('/paymentNotification', easyPayController.paymentNotification);

module.exports = router;