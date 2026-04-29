'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { requireKYCVerification } = require('../middleware/kycMiddleware');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const ottPayoutService = require('../services/ott/ottPayoutService');
const { OttClient, buildRequestHash, getConfig } = require('../services/ott/ottClient');

const router = express.Router();
const ottPayoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'RATE_LIMITED', message: 'Too many OTT payout requests. Please try again shortly.' },
});

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Validation failed',
      details: errors.array().map((error) => ({
        field: error.path,
        message: error.msg,
      })),
    });
  }
  return next();
}

function handleError(res, err) {
  const statusCode = err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.code || (statusCode >= 500 ? 'OTT_ERROR' : 'OTT_REQUEST_FAILED'),
    message: statusCode >= 500 ? 'Could not process OTT request. Please try again.' : err.message,
    ...(err.details ? { details: err.details } : {}),
  });
}

function requireIdempotencyKey(req, res, next) {
  const key = req.headers['x-idempotency-key'];
  if (!key) {
    return res.status(400).json({
      success: false,
      error: 'IDEMPOTENCY_KEY_REQUIRED',
      message: 'X-Idempotency-Key header is required for OTT payouts.',
    });
  }
  return next();
}

function verifyWebhookPayload(payload) {
  const config = getConfig();
  if (!config.webhookSecret) {
    const err = new Error('OTT webhook secret is not configured');
    err.statusCode = 503;
    err.code = 'OTT_WEBHOOK_NOT_CONFIGURED';
    throw err;
  }

  const receivedHash = payload[config.hashFieldName] || payload.hash || payload.Hash;
  if (!receivedHash) {
    const err = new Error('OTT webhook hash is required');
    err.statusCode = 401;
    err.code = 'OTT_WEBHOOK_HASH_MISSING';
    throw err;
  }

  const order = config.hashParamOrder.webhook;
  const signingPayload = { ...payload };
  delete signingPayload[config.hashFieldName];
  delete signingPayload.hash;
  delete signingPayload.Hash;
  const expectedHash = buildRequestHash(signingPayload, order, `${config.webhookSecret}${config.apiKey || ''}`);

  const expected = Buffer.from(expectedHash, 'hex');
  const received = Buffer.from(String(receivedHash), 'hex');
  if (expected.length !== received.length || !cryptoSafeEqual(expected, received)) {
    const err = new Error('OTT webhook hash is invalid');
    err.statusCode = 401;
    err.code = 'OTT_WEBHOOK_HASH_INVALID';
    throw err;
  }
}

function cryptoSafeEqual(a, b) {
  const crypto = require('crypto');
  return crypto.timingSafeEqual(a, b);
}

router.get('/health', (req, res) => {
  res.json({
    success: true,
    data: {
      enabled: ottPayoutService.isEnabled(),
      webhookPath: '/api/v1/ott/webhook',
    },
  });
});

router.post('/providers', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getActiveProviders(req.body || {});
    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/provider-limits', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getActiveProviderLimits(req.body || {});
    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/country-codes', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getCountryCodes(req.body || {});
    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/branch-codes', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getUniversalBranchCodes(req.body || {});
    return res.json({ success: true, data: response.data });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/payouts/quote', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least R1'),
  body('providerCode').isString().trim().notEmpty().isLength({ max: 64 }).withMessage('Provider code is required'),
  validateRequest,
], async (req, res) => {
  try {
    const quote = await ottPayoutService.quoteOttPayout({
      amount: Number(req.body.amount),
      providerCode: req.body.providerCode,
    });
    return res.json({ success: true, data: quote });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/payouts', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
  requireIdempotencyKey,
  idempotencyMiddleware,
  body('amount').isFloat({ min: 1 }).withMessage('Amount must be at least R1'),
  body('providerCode').isString().trim().notEmpty().isLength({ max: 64 }).withMessage('Provider code is required'),
  body('recipient.mobile').optional({ nullable: true }).isString().isLength({ max: 32 }).withMessage('Mobile must be 32 characters or less'),
  body('recipient.firstName').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('First name must be 80 characters or less'),
  body('recipient.surname').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Surname must be 80 characters or less'),
  body('recipient.accountName').optional({ nullable: true }).isString().isLength({ max: 120 }).withMessage('Account name must be 120 characters or less'),
  body('recipient.accountNumber').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('Account number must be 40 characters or less'),
  body('recipient.branchCode').optional({ nullable: true }).isString().isLength({ max: 16 }).withMessage('Branch code must be 16 characters or less'),
  body('reference').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Reference must be 80 characters or less'),
  validateRequest,
], async (req, res) => {
  try {
    const result = await ottPayoutService.submitOttPayout({
      userId: req.user.id,
      amount: Number(req.body.amount),
      providerCode: req.body.providerCode,
      recipient: {
        ...(req.body.recipient || {}),
        kycTier: req.kycStatus?.kycTier,
      },
      reference: req.body.reference,
      idempotencyKey: req.idempotencyKey,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err);
  }
});

router.get('/payouts/:payoutId', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
  param('payoutId').isString().trim().notEmpty().isLength({ max: 64 }).withMessage('Valid payout ID is required'),
  validateRequest,
], async (req, res) => {
  try {
    const payment = await ottPayoutService.getPayoutStatus({
      userId: req.user.id,
      payoutId: req.params.payoutId,
    });
    return res.json({ success: true, data: payment });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/payouts/:payoutId/poll', [
  ottPayoutLimiter,
  authMiddleware,
  requireKYCVerification,
  param('payoutId').isString().trim().notEmpty().isLength({ max: 64 }).withMessage('Valid payout ID is required'),
  validateRequest,
], async (req, res) => {
  try {
    const result = await ottPayoutService.pollPayoutStatus({
      userId: req.user.id,
      payoutId: req.params.payoutId,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err);
  }
});

router.post('/webhook', async (req, res) => {
  try {
    verifyWebhookPayload(req.body || {});
    const result = await ottPayoutService.updatePayoutFromWebhook(req.body || {});
    return res.status(200).json({ success: true, received: true, data: result });
  } catch (err) {
    return handleError(res, err);
  }
});

module.exports = router;
