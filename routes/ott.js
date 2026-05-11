'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, param, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/auth');
const { requireKYCVerification } = require('../middleware/kycMiddleware');
const { idempotencyMiddleware } = require('../middleware/idempotency');
const ottPayoutService = require('../services/ott/ottPayoutService');
const { OttClient, buildRequestHash, getConfig } = require('../services/ott/ottClient');
const { isApprovedCashPayoutProvider } = require('../services/ott/ottAuthorizedProviderPolicy');
const db = require('../models');

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

function handleError(res, err, req = null) {
  const statusCode = err.statusCode || 500;
  const safeContext = {
    method: req?.method,
    path: req?.originalUrl,
    userId: req?.user?.id,
    providerCode: req?.body?.providerCode,
    amount: req?.body?.amount,
    code: err.code || null,
    statusCode,
    message: err.message,
    endpointKey: err.endpointKey || null,
    details: err.details || null,
  };
  console.error('[OTT] Request failed:', safeContext);
  if (statusCode >= 500 && err.stack) {
    console.error('[OTT] Stack:', err.stack.split('\n').slice(0, 6).join('\n'));
  }
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

function mapOttIdType(idType) {
  const normalized = String(idType || '').trim().toLowerCase();
  if (normalized.includes('passport')) return 'PASSPT';
  return 'RSAID';
}

async function buildVerifiedRecipient(req) {
  const user = await db.User.findByPk(req.user.id, {
    attributes: ['id', 'firstName', 'lastName', 'email', 'phoneNumber', 'idNumber', 'idType', 'kycStatus'],
  });

  if (!user || user.kycStatus !== 'verified') {
    const err = new Error('Verified user profile is required for OTT payouts');
    err.statusCode = 403;
    err.code = 'KYC_VERIFICATION_REQUIRED';
    throw err;
  }

  if (!user.firstName || !user.lastName || !user.phoneNumber || !user.idNumber || !user.idType) {
    const err = new Error('Verified profile details are incomplete');
    err.statusCode = 400;
    err.code = 'VERIFIED_PROFILE_INCOMPLETE';
    throw err;
  }

  return {
    ...(req.body.recipient || {}),
    firstName: user.firstName,
    surname: user.lastName,
    mobile: user.phoneNumber,
    email: user.email,
    idType: mapOttIdType(user.idType),
    idNumber: user.idNumber,
    title: (req.body.recipient || {}).title || 'MR',
    countryOfIssue: (req.body.recipient || {}).countryOfIssue || 'ZA',
    nationality: (req.body.recipient || {}).nationality || 'ZA',
    kycTier: req.kycStatus?.kycTier,
  };
}

function verifyWebhookPayload(payload) {
  const config = getConfig();
  if (!config.apiKey) {
    const err = new Error('OTT API key is required for webhook verification');
    err.statusCode = 503;
    err.code = 'OTT_WEBHOOK_API_KEY_NOT_CONFIGURED';
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
  const expectedHash = buildRequestHash(signingPayload, order, config.apiKey);

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

function buildReadOnlyOttPayload(req, purpose) {
  return {
    ...(req.body || {}),
    requestdate: req.body?.requestdate || new Date().toISOString(),
    yourUniqueReference: req.body?.yourUniqueReference || `MM-OTT-RO-${Date.now()}-${purpose}`.slice(0, 50),
  };
}

function ottProviderCodeOf(provider = {}) {
  return String(
    provider.providerCode ||
    provider.ProviderCode ||
    provider.code ||
    provider.id ||
    provider.providerId ||
    ''
  ).trim();
}

function filterApprovedCashProviders(data) {
  if (Array.isArray(data)) {
    return data.filter((provider) => isApprovedCashPayoutProvider({
      providerCode: ottProviderCodeOf(provider),
      providerName: provider.providerName || provider.ProviderName || provider.name || provider.description,
    }));
  }
  if (!data || typeof data !== 'object') return data;

  const next = { ...data };
  for (const key of ['providers', 'Providers', 'data', 'Data']) {
    if (Array.isArray(next[key])) {
      next[key] = filterApprovedCashProviders(next[key]);
    }
  }
  return next;
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
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getActiveProviders(buildReadOnlyOttPayload(req, 'providers'));
    return res.json({ success: true, data: filterApprovedCashProviders(response.data) });
  } catch (err) {
    return handleError(res, err, req);
  }
});

router.post('/provider-limits', [
  ottPayoutLimiter,
  authMiddleware,
], async (req, res) => {
  try {
    const client = new OttClient();
    const response = await client.getActiveProviderLimits(buildReadOnlyOttPayload(req, 'limits'));
    return res.json({ success: true, data: filterApprovedCashProviders(response.data) });
  } catch (err) {
    return handleError(res, err, req);
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
    return handleError(res, err, req);
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
    return handleError(res, err, req);
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
    return handleError(res, err, req);
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
  body('providerName').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Provider name must be 80 characters or less'),
  body('recipient.mobile').optional({ nullable: true }).isString().isLength({ max: 32 }).withMessage('Mobile must be 32 characters or less'),
  body('recipient.firstName').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('First name must be 80 characters or less'),
  body('recipient.surname').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Surname must be 80 characters or less'),
  body('recipient.idType').optional({ nullable: true }).isString().isLength({ max: 12 }).withMessage('ID type must be 12 characters or less'),
  body('recipient.idNumber').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('ID number must be 40 characters or less'),
  body('recipient.accountName').optional({ nullable: true }).isString().isLength({ max: 120 }).withMessage('Account name must be 120 characters or less'),
  body('recipient.accountNumber').optional({ nullable: true }).isString().isLength({ max: 40 }).withMessage('Account number must be 40 characters or less'),
  body('recipient.bankId').optional({ nullable: true }).isString().isLength({ max: 16 }).withMessage('Bank ID must be 16 characters or less'),
  body('recipient.branchCode').optional({ nullable: true }).isString().isLength({ max: 16 }).withMessage('Branch code must be 16 characters or less'),
  body('recipient.branchName').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Branch name must be 80 characters or less'),
  body('recipient.countryOfIssue').optional({ nullable: true }).isString().isLength({ max: 3 }).withMessage('Country of issue must be 3 characters or less'),
  body('recipient.dateOfBirth').optional({ nullable: true }).isString().isLength({ max: 20 }).withMessage('Date of birth must be 20 characters or less'),
  body('recipient.email').optional({ nullable: true }).isEmail().normalizeEmail().withMessage('Email must be valid'),
  body('recipient.middleName').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Middle name must be 80 characters or less'),
  body('recipient.nationality').optional({ nullable: true }).isString().isLength({ max: 3 }).withMessage('Nationality must be 3 characters or less'),
  body('recipient.swiftCode').optional({ nullable: true }).isString().isLength({ max: 16 }).withMessage('Swift code must be 16 characters or less'),
  body('recipient.title').optional({ nullable: true }).isString().isLength({ max: 20 }).withMessage('Title must be 20 characters or less'),
  body('reference').optional({ nullable: true }).isString().isLength({ max: 80 }).withMessage('Reference must be 80 characters or less'),
  validateRequest,
], async (req, res) => {
  try {
    const recipient = await buildVerifiedRecipient(req);
    const result = await ottPayoutService.submitOttPayout({
      userId: req.user.id,
      amount: Number(req.body.amount),
      providerCode: req.body.providerCode,
      providerName: req.body.providerName,
      recipient,
      reference: req.body.reference,
      idempotencyKey: req.idempotencyKey,
    });
    return res.status(201).json({ success: true, data: result });
  } catch (err) {
    return handleError(res, err, req);
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
    return handleError(res, err, req);
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
    return handleError(res, err, req);
  }
});

router.post('/webhook', async (req, res) => {
  try {
    verifyWebhookPayload(req.body || {});
    const result = await ottPayoutService.updatePayoutFromWebhook(req.body || {});
    return res.status(200).json({ success: true, received: true, data: result });
  } catch (err) {
    return handleError(res, err, req);
  }
});

router._private = {
  filterApprovedCashProviders,
  ottProviderCodeOf,
  verifyWebhookPayload,
};

module.exports = router;
