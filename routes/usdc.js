/**
 * USDC Routes
 *
 * API endpoints for USDC purchase and transfer feature.
 * Banking-grade: all inputs validated at boundary; no workarounds.
 *
 * All endpoints require authentication (JWT token).
 */

const express = require('express');
const router = express.Router();
const usdcController = require('../controllers/usdcController');
const authenticateToken = require('../middleware/auth');
const { body, query, param, validationResult } = require('express-validator');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: errors.array().map(e => e.msg).join('; '),
        details: errors.array()
      }
    });
  }
  next();
}

router.use(authenticateToken);

/**
 * GET /api/v1/usdc/rate
 * Get current USDC/ZAR exchange rate
 */
router.get('/rate', usdcController.getRate.bind(usdcController));

/**
 * POST /api/v1/usdc/quote
 * Body: zarAmount (number, required, 10–5000)
 */
router.post(
  '/quote',
  [
    body('zarAmount')
      .isFloat({ min: 10, max: 5000 })
      .withMessage('Amount must be between R10 and R5,000')
  ],
  handleValidation,
  usdcController.getQuote.bind(usdcController)
);

/**
 * POST /api/v1/usdc/send
 * Body: zarAmount (number), beneficiaryId (int), purpose (optional), idempotencyKey (optional)
 */
router.post(
  '/send',
  [
    body('zarAmount').isFloat({ min: 10, max: 5000 }).withMessage('zarAmount must be between 10 and 5000'),
    body('beneficiaryId').isInt({ min: 1 }).withMessage('beneficiaryId must be a positive integer'),
    body('purpose').optional().isString().isLength({ max: 64 }).withMessage('purpose max 64 characters'),
    body('idempotencyKey').optional().isString().isLength({ max: 128 }).withMessage('idempotencyKey max 128 characters')
  ],
  handleValidation,
  usdcController.executeSend.bind(usdcController)
);

/**
 * GET /api/v1/usdc/transactions
 * Query: limit (1–100), offset (≥0), status (optional)
 */
router.get(
  '/transactions',
  [
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be 1–100').toInt(),
    query('offset').optional().isInt({ min: 0 }).withMessage('offset must be ≥0').toInt(),
    query('status').optional().isString().isIn(['pending', 'completed', 'failed']).withMessage('status must be pending|completed|failed')
  ],
  handleValidation,
  usdcController.getTransactions.bind(usdcController)
);

/**
 * GET /api/v1/usdc/transactions/:transactionId
 */
router.get(
  '/transactions/:transactionId',
  [param('transactionId').isString().notEmpty().isLength({ max: 64 }).withMessage('transactionId required, max 64 chars')],
  handleValidation,
  usdcController.getTransaction.bind(usdcController)
);

/**
 * POST /api/v1/usdc/validate-address
 * Body: address (string, required, max 64 chars)
 */
router.post(
  '/validate-address',
  [
    body('address').isString().notEmpty().withMessage('address is required').isLength({ max: 64 }).withMessage('address max 64 characters')
  ],
  handleValidation,
  usdcController.validateAddress.bind(usdcController)
);

/**
 * GET /api/v1/usdc/health
 * Service health check
 */
router.get(
  '/health',
  usdcController.healthCheck.bind(usdcController)
);

module.exports = router;
