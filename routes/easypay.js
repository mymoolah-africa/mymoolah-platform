const express = require('express');
const router = express.Router();
const easyPayController = require('../controllers/easyPayController');
const { easypayAuthMiddleware } = require('../middleware/easypayAuth');

router.get('/ping', easyPayController.ping);
router.post('/infoRequest', easypayAuthMiddleware, easyPayController.infoRequest);
router.post('/authorisationRequest', easypayAuthMiddleware, easyPayController.authorisationRequest);
router.post('/paymentNotification', easypayAuthMiddleware, easyPayController.paymentNotification);

module.exports = router;
