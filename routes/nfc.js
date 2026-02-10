'use strict';

/**
 * NFC Deposit Routes
 * Tap-to-deposit via Halo Dot. MSISDN in reference for Standard Bank T-PPP.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

const express = require('express');
const router = express.Router();
const nfcDepositController = require('../controllers/nfcDepositController');
const authenticateToken = require('../middleware/auth');
const { body, query } = require('express-validator');

function handleValidation(req, res, next) {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errors.array().map((e) => e.msg).join('; '),
        details: errors.array(),
      },
    });
  }
  next();
}

router.use(authenticateToken);

/**
 * POST /api/v1/nfc/deposit/create
 * Create NFC deposit intent. Returns consumerTransactionId, jwt for Halo.Go.
 */
router.post(
  '/deposit/create',
  [
    body('amount')
      .isFloat({ min: 1, max: 50000 })
      .withMessage('Amount must be between R1 and R50,000'),
    body('currencyCode').optional().isString().isLength({ max: 3 }).withMessage('currencyCode max 3 chars'),
  ],
  handleValidation,
  nfcDepositController.createIntent.bind(nfcDepositController)
);

/**
 * POST /api/v1/nfc/deposit/confirm
 * Confirm deposit after Halo returns. Credits wallet.
 */
router.post(
  '/deposit/confirm',
  [
    body('paymentReference').isString().notEmpty().withMessage('paymentReference is required'),
    body('result').isString().isIn(['success', 'failed']).withMessage('result must be success or failed'),
  ],
  handleValidation,
  nfcDepositController.confirmDeposit.bind(nfcDepositController)
);

/**
 * GET /api/v1/nfc/deposit/history
 * List user's NFC deposit intents.
 */
router.get(
  '/deposit/history',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  handleValidation,
  nfcDepositController.getHistory.bind(nfcDepositController)
);

/**
 * GET /api/v1/nfc/health
 * Service health check.
 */
router.get('/health', nfcDepositController.healthCheck.bind(nfcDepositController));

module.exports = router;
