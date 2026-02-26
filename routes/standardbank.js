'use strict';

/**
 * Standard Bank PayShap Routes
 * RPP (Rapid Payments) and RTP (Request to Pay)
 * Banking-grade input validation on all initiation endpoints
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();
const auth = require('../middleware/auth');
const standardbankController = require('../controllers/standardbankController');

const rawBodyMiddleware = express.raw({ type: 'application/json', limit: '10mb' });

const parseJsonBody = (req, res, next) => {
  if (Buffer.isBuffer(req.body)) {
    try {
      req.body = JSON.parse(req.body.toString('utf8'));
    } catch (e) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  next();
};

/**
 * Validation result handler - returns 422 with structured errors
 */
function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
    });
  }
  next();
}

// RPP validation rules — PBAC (bank account) only, no proxy
const rppValidation = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['ZAR'])
    .withMessage('currency must be ZAR'),
  body('creditorAccountNumber')
    .notEmpty()
    .withMessage('creditorAccountNumber is required')
    .isAlphanumeric()
    .isLength({ min: 6, max: 20 })
    .withMessage('creditorAccountNumber must be 6-20 alphanumeric characters'),
  body('creditorBankBranchCode')
    .optional()
    .isAlphanumeric()
    .isLength({ min: 4, max: 10 })
    .withMessage('creditorBankBranchCode must be 4-10 alphanumeric characters'),
  body('creditorName')
    .optional()
    .isLength({ max: 140 })
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 140 })
    .trim()
    .escape(),
  body('reference')
    .optional()
    .isLength({ max: 35 })
    .trim()
    .escape(),
];

// RTP validation rules — mobile number (proxy) required; SBSA RTP only supports MOBILE_NUMBER proxy for debtors
const rtpValidation = [
  body('amount')
    .isFloat({ gt: 0 })
    .withMessage('amount must be a positive number'),
  body('currency')
    .optional()
    .isIn(['ZAR'])
    .withMessage('currency must be ZAR'),
  body('payerName')
    .notEmpty()
    .withMessage('payerName is required')
    .isLength({ max: 140 })
    .trim()
    .escape(),
  body('payerMobileNumber')
    .notEmpty()
    .withMessage('payerMobileNumber is required (SBSA RTP only supports mobile number proxy for debtors)')
    .matches(/^(\+27|27|0)[0-9]{8,9}$/)
    .withMessage('payerMobileNumber must be a valid South African mobile number'),
  body('payerBankName')
    .optional()
    .isLength({ max: 100 })
    .trim()
    .escape(),
  body('description')
    .optional()
    .isLength({ max: 140 })
    .trim()
    .escape(),
  body('reference')
    .optional()
    .isLength({ max: 35 })
    .trim()
    .escape(),
  body('expiryMinutes')
    .optional()
    .isInt({ min: 5, max: 1440 })
    .withMessage('expiryMinutes must be between 5 and 1440'),
];

// RPP initiation (Send Money)
router.post('/payshap/rpp', auth, rppValidation, handleValidation, standardbankController.initiatePayShapRpp);

// RPP status polling fallback (Gustaf: poll every 10s, UETR = transactionIdentifier)
router.get('/payshap/rpp/:uetr/status', auth, standardbankController.getRppStatus);

// RTP initiation (Request Money)
router.post('/payshap/rtp', auth, rtpValidation, handleValidation, standardbankController.initiatePayShapRtp);

// RTP status polling fallback
router.get('/payshap/rtp/:uetr/status', auth, standardbankController.getRtpStatus);

// Deposit notification (when money hits MM SBSA main account; reference = CID = MSISDN)
router.post(
  '/notification',
  rawBodyMiddleware,
  (req, res, next) => {
    req.rawBody = req.body.toString('utf8');
    parseJsonBody(req, res, next);
  },
  standardbankController.handleDepositNotification
);

// ─── RPP Callbacks (no auth — validated via x-GroupHeader-Hash HMAC-SHA256) ───
//
// SBSA appends path parameters to our base callback URL.
// We register both the flat base route AND the parameterised variants so that
// SBSA callbacks resolve correctly regardless of which path they hit.
//
// RPP Batch (Pain.002):
//   POST /callback
//   POST /callback/paymentInitiation/:clientMessageId
//   POST /callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId
router.post('/callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRppCallback);
router.post(
  '/callback/paymentInitiation/:clientMessageId',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRppCallbackWithParams
);
router.post(
  '/callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRppCallbackWithParams
);

// RPP Realtime (Pain.002 per-transaction):
//   POST /realtime-callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId/transactions/:transactionIdentifier
router.post('/realtime-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRppRealtimeCallback);
router.post(
  '/realtime-callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId/transactions/:transactionIdentifier',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRppRealtimeCallback
);

// ─── RTP Callbacks ────────────────────────────────────────────────────────────
//
// RTP Batch (Pain.014):
//   POST /rtp-callback
//   POST /rtp-callback/paymentInitiation/:clientMessageId
//   POST /rtp-callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId
router.post('/rtp-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpCallback);
router.post(
  '/rtp-callback/paymentInitiation/:clientMessageId',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpCallbackWithParams
);
router.post(
  '/rtp-callback/paymentInitiation/:clientMessageId/paymentInstructions/:paymentInformationId',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpCallbackWithParams
);

// RTP Realtime (Pain.014 per-transaction):
//   POST /rtp-realtime-callback/paymentRequestInitiation/:clientMessageId/paymentRequestInstructions/:requestToPayInformationId/requests/:transactionIdentifier
router.post('/rtp-realtime-callback', rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpRealtimeCallback);
router.post(
  '/rtp-realtime-callback/paymentRequestInitiation/:clientMessageId/paymentRequestInstructions/:requestToPayInformationId/requests/:transactionIdentifier',
  rawBodyMiddleware, parseJsonBody, standardbankController.handleRtpRealtimeCallback
);

module.exports = router;
