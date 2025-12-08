const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { body } = require('express-validator');
const requestController = require('../controllers/requestController');

// Create a wallet payment request (requester -> payer)
router.post('/wallet', [
  authMiddleware,
  body('payerPhoneNumber').isString().notEmpty().withMessage('payerPhoneNumber required'),
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least R1'),
], requestController.createWalletRequest);

// List my requests (incoming/outgoing)
router.get('/', [authMiddleware], requestController.listMyRequests);

// Respond to a request (payer only): approve or decline
router.post('/:id/respond', [
  authMiddleware,
  body('action').isIn(['approve','decline']).withMessage('Invalid action'),
], requestController.respond);

// Recurring requests
router.post('/wallet/recurring', [
  authMiddleware,
  body('payerPhoneNumber').isString().notEmpty(),
  body('amount').isFloat({ min: 1 }),
  body('frequency').isIn(['daily','weekly','monthly']),
  body('startDate').isString().notEmpty(),
  body('startTime').isString().notEmpty(),
], requestController.createRecurring);

router.get('/wallet/recurring', [authMiddleware], requestController.listRecurring);
router.post('/wallet/recurring/:id', [authMiddleware, body('action').isIn(['pause','resume','cancel'])], requestController.updateRecurringStatus);

// Recent payers for Request Money UX
router.get('/recent-payers', [authMiddleware], requestController.listRecentPayers);
router.post('/recent-payers/hide', [authMiddleware], requestController.hideRecentPayer);
router.post('/recent-payers/unhide', [authMiddleware], requestController.unhideRecentPayer);

module.exports = router;


