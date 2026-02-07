/**
 * USDC Routes
 * 
 * API endpoints for USDC purchase and transfer feature
 * 
 * All endpoints require authentication (JWT token)
 */

const express = require('express');
const router = express.Router();
const usdcController = require('../controllers/usdcController');
const authenticateToken = require('../middleware/authenticateToken');
const { body, query, param } = require('express-validator');
const validate = require('../middleware/validate');

// Apply authentication to all USDC routes
router.use(authenticateToken);

/**
 * GET /api/v1/usdc/rate
 * Get current USDC/ZAR exchange rate
 */
router.get(
  '/rate',
  usdcController.getRate.bind(usdcController)
);

/**
 * POST /api/v1/usdc/quote
 * Get quote for USDC purchase
 * 
 * Body:
 * - zarAmount: number (required) - Amount in ZAR
 */
router.post(
  '/quote',
  [
    body('zarAmount')
      .isFloat({ min: 10, max: 5000 })
      .withMessage('Amount must be between R10 and R5,000'),
    validate
  ],
  usdcController.getQuote.bind(usdcController)
);

/**
 * POST /api/v1/usdc/send
 * Execute USDC buy and send transaction
 * 
 * Body:
 * - zarAmount: number (required)
 * - beneficiaryId: number (required)
 * - purpose: string (optional)
 * - idempotencyKey: string (optional)
 */
router.post(
  '/send',
  [
    body('zarAmount')
      .isFloat({ min: 10, max: 5000 })
      .withMessage('Amount must be between R10 and R5,000'),
    body('beneficiaryId')
      .isInt({ min: 1 })
      .withMessage('Valid beneficiary ID is required'),
    body('purpose')
      .optional()
      .isString()
      .isLength({ max: 200 })
      .withMessage('Purpose must be a string (max 200 characters)'),
    body('idempotencyKey')
      .optional()
      .isString()
      .isLength({ max: 100 })
      .withMessage('Idempotency key must be a string (max 100 characters)'),
    validate
  ],
  usdcController.executeSend.bind(usdcController)
);

/**
 * GET /api/v1/usdc/transactions
 * Get USDC transaction history
 * 
 * Query params:
 * - limit: number (optional, default: 50, max: 100)
 * - offset: number (optional, default: 0)
 * - status: string (optional) - Filter by status
 */
router.get(
  '/transactions',
  [
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('offset')
      .optional()
      .isInt({ min: 0 })
      .withMessage('Offset must be a positive integer'),
    query('status')
      .optional()
      .isIn(['pending', 'completed', 'failed', 'cancelled'])
      .withMessage('Invalid status value'),
    validate
  ],
  usdcController.getTransactions.bind(usdcController)
);

/**
 * GET /api/v1/usdc/transactions/:transactionId
 * Get transaction details by ID
 */
router.get(
  '/transactions/:transactionId',
  [
    param('transactionId')
      .isString()
      .isLength({ min: 1, max: 100 })
      .withMessage('Valid transaction ID is required'),
    validate
  ],
  usdcController.getTransaction.bind(usdcController)
);

/**
 * POST /api/v1/usdc/validate-address
 * Validate Solana wallet address
 * 
 * Body:
 * - address: string (required)
 */
router.post(
  '/validate-address',
  [
    body('address')
      .isString()
      .trim()
      .isLength({ min: 32, max: 44 })
      .withMessage('Solana address must be 32-44 characters'),
    validate
  ],
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
