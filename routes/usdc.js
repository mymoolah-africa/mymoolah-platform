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
const authenticateToken = require('../middleware/auth');
const { body, query, param, validationResult } = require('express-validator');

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
  authenticateToken,
  body('zarAmount')
    .isFloat({ min: 10, max: 5000 })
    .withMessage('Amount must be between R10 and R5,000'),
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
  authenticateToken,
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
  authenticateToken,
  usdcController.getTransactions.bind(usdcController)
);

/**
 * GET /api/v1/usdc/transactions/:transactionId
 * Get transaction details by ID
 */
router.get(
  '/transactions/:transactionId',
  authenticateToken,
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
  authenticateToken,
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
