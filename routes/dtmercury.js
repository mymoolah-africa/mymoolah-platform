const express = require('express');
const router = express.Router();
const dtMercuryController = require('../controllers/dtMercuryController');
const { body, param, query } = require('express-validator');

/**
 * dtMercury PayShap API Routes
 * 
 * PayShap is South Africa's real-time payment system that enables:
 * - RPP (Rapid Payments Programme): PayShap outbound payments to customer bank accounts
 * - RTP (Request to Pay): Part of RPP, send payment requests to customer banks (inbound)
 * 
 * KYC Requirements:
 * - Tier 1: Identification confirmed (any amount)
 * - Tier 2: Proof of address required (R5000+ transactions)
 */

// ========================================
// HEALTH & STATUS ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dtmercury/health
 * @desc    Health check for dtMercury service
 * @access  Public
 */
router.get('/health', dtMercuryController.healthCheck);

// ========================================
// BANK MANAGEMENT ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dtmercury/banks
 * @desc    Get list of supported banks
 * @access  Public
 */
router.get('/banks', [
  query('paymentType')
    .optional()
    .isIn(['rpp', 'rtp'])
    .withMessage('paymentType must be either "rpp" or "rtp"'),
  query('active')
    .optional()
    .isBoolean()
    .withMessage('active must be a boolean')
], dtMercuryController.getBanks);

/**
 * @route   GET /api/v1/dtmercury/banks/:bankCode
 * @desc    Get bank details by code
 * @access  Public
 */
router.get('/banks/:bankCode', [
  param('bankCode')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('bankCode must be a string between 1-10 characters')
], dtMercuryController.getBankByCode);

// ========================================
// PAYMENT ENDPOINTS
// ========================================

/**
 * @route   POST /api/v1/dtmercury/payments
 * @desc    Initiate a PayShap payment (RPP - outbound or RTP - inbound)
 * @access  Private
 */
router.post('/payments', [
  body('paymentType')
    .isIn(['rpp', 'rtp'])
    .withMessage('paymentType must be either "rpp" or "rtp"'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('amount must be a positive number'),
  body('recipientAccountNumber')
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('recipientAccountNumber must be a string between 1-50 characters'),
  body('recipientBankCode')
    .isString()
    .isLength({ min: 1, max: 10 })
    .withMessage('recipientBankCode must be a string between 1-10 characters'),
  body('recipientName')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('recipientName must be a string between 1-255 characters'),
  body('recipientReference')
    .optional()
    .isString()
    .isLength({ max: 255 })
    .withMessage('recipientReference must be a string up to 255 characters'),
  body('userId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer')
], dtMercuryController.initiatePayment);

/**
 * @route   GET /api/v1/dtmercury/payments/:reference
 * @desc    Get payment status by reference
 * @access  Private
 */
router.get('/payments/:reference', [
  param('reference')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('reference must be a string between 1-255 characters')
], dtMercuryController.getTransactionStatus);

/**
 * @route   DELETE /api/v1/dtmercury/payments/:reference
 * @desc    Cancel a pending payment
 * @access  Private
 */
router.delete('/payments/:reference', [
  param('reference')
    .isString()
    .isLength({ min: 1, max: 255 })
    .withMessage('reference must be a string between 1-255 characters')
], dtMercuryController.cancelTransaction);

// ========================================
// USER TRANSACTION ENDPOINTS
// ========================================

/**
 * @route   GET /api/v1/dtmercury/users/:userId/transactions
 * @desc    Get user's PayShap transactions
 * @access  Private
 */
router.get('/users/:userId/transactions', [
  param('userId')
    .isInt({ min: 1 })
    .withMessage('userId must be a positive integer'),
  query('status')
    .optional()
    .isIn(['pending', 'processing', 'completed', 'failed', 'cancelled'])
    .withMessage('status must be a valid transaction status'),
  query('paymentType')
    .optional()
    .isIn(['rpp', 'rtp'])
    .withMessage('paymentType must be either "rpp" or "rtp"'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('limit must be between 1 and 100')
], dtMercuryController.getUserTransactions);

// ========================================
// KYC ENDPOINTS (Future Implementation)
// ========================================

/**
 * @route   GET /api/v1/dtmercury/kyc/requirements/:amount
 * @desc    Get KYC requirements for a specific amount
 * @access  Public
 */
router.get('/kyc/requirements/:amount', [
  param('amount')
    .isFloat({ min: 0.01 })
    .withMessage('amount must be a positive number')
], (req, res) => {
  const amount = parseFloat(req.params.amount);
  const kycTier = amount >= 5000 ? 'tier2' : 'tier1';
  
  const requirements = {
    tier1: {
      name: 'Tier 1 - Basic Verification',
      description: 'Identification confirmed',
      requirements: [
        'Valid South African ID document',
        'Mobile number verification',
        'Email verification'
      ],
      maxAmount: 4999.99,
      processingTime: 'Instant'
    },
    tier2: {
      name: 'Tier 2 - Enhanced Verification',
      description: 'Proof of address required',
      requirements: [
        'All Tier 1 requirements',
        'Proof of residential address',
        'Utility bill or bank statement (not older than 3 months)',
        'Additional identity verification'
      ],
      minAmount: 5000.00,
      maxAmount: 100000.00,
      processingTime: '24-48 hours'
    }
  };
  
  res.json({
    success: true,
    data: {
      amount,
      kycTier,
      requirements: requirements[kycTier],
      message: `Amount R${amount.toFixed(2)} requires ${requirements[kycTier].name}`
    }
  });
});

// ========================================
// ERROR HANDLING MIDDLEWARE
// ========================================

// Handle validation errors
router.use((error, req, res, next) => {
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON'
    });
  }
  
  if (error.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload too large',
      message: 'Request body is too large'
    });
  }
  
  next(error);
});

// ========================================
// API DOCUMENTATION
// ========================================

/**
 * @route   GET /api/v1/dtmercury/docs
 * @desc    Get dtMercury API documentation
 * @access  Public
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      service: 'dtMercury PayShap Integration',
      version: '1.0.0',
      description: 'South Africa real-time payment system integration',
      endpoints: {
        health: {
          method: 'GET',
          path: '/health',
          description: 'Service health check'
        },
        banks: {
          method: 'GET',
          path: '/banks',
          description: 'Get supported banks',
          query: {
            paymentType: 'Filter by payment type (rpp|rtp)',
            active: 'Filter by active status (true|false)'
          }
        },
        bankDetails: {
          method: 'GET',
          path: '/banks/:bankCode',
          description: 'Get bank details by code'
        },
        initiatePayment: {
          method: 'POST',
          path: '/payments',
          description: 'Initiate PayShap payment',
          body: {
            paymentType: 'rpp|rtp',
            amount: 'Payment amount in Rands',
            recipientAccountNumber: 'Recipient account number',
            recipientBankCode: 'Recipient bank code',
            recipientName: 'Recipient name',
            recipientReference: 'Payment reference (optional)',
            userId: 'User ID (optional)'
          }
        },
        paymentStatus: {
          method: 'GET',
          path: '/payments/:reference',
          description: 'Get payment status'
        },
        cancelPayment: {
          method: 'DELETE',
          path: '/payments/:reference',
          description: 'Cancel pending payment'
        },
        userTransactions: {
          method: 'GET',
          path: '/users/:userId/transactions',
          description: 'Get user transactions',
          query: {
            status: 'Filter by status',
            paymentType: 'Filter by payment type',
            page: 'Page number',
            limit: 'Items per page'
          }
        },
        kycRequirements: {
          method: 'GET',
          path: '/kyc/requirements/:amount',
          description: 'Get KYC requirements for amount'
        }
      },
      kycTiers: {
        tier1: {
          description: 'Identification confirmed',
          maxAmount: 'R4,999.99',
          requirements: ['SA ID', 'Mobile verification', 'Email verification']
        },
        tier2: {
          description: 'Proof of address required',
          minAmount: 'R5,000.00',
          requirements: ['Tier 1 + Proof of address', 'Utility bill', 'Enhanced verification']
        }
      },
      paymentTypes: {
        rpp: 'Rapid Payments Programme (PayShap) - Outbound payments to customer bank accounts',
        rtp: 'Request to Pay - Part of RPP, send payment requests to customer banks (inbound)'
      }
    }
  });
});

module.exports = router;
