const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

// GET /api/v1/wallets/balance
router.get('/balance', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Simulate wallet balance data
    const balanceData = {
      available: 1250.75,
      pending: 150.00,
      total: 1400.75,
      currency: 'ZAR',
      lastUpdated: new Date().toISOString()
    };
    
    return res.json({
      success: true,
      data: balanceData
    });
  } catch (error) {
    console.error('Error getting wallet balance:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet balance'
    });
  }
});

// GET /api/v1/wallets/transactions
router.get('/transactions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10 } = req.query;
    
    // Simulate transaction history
    const transactions = [
      {
        id: 'TXN001',
        type: 'credit',
        amount: 500.00,
        description: 'Deposit from Bank Transfer',
        date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        reference: 'DEP001'
      },
      {
        id: 'TXN002',
        type: 'debit',
        amount: 150.00,
        description: 'Payment to John Doe',
        date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        reference: 'PAY001'
      },
      {
        id: 'TXN003',
        type: 'credit',
        amount: 1000.00,
        description: 'Salary Deposit',
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed',
        reference: 'SAL001'
      }
    ];
    
    return res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: transactions.length,
          pages: Math.ceil(transactions.length / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting wallet transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet transactions'
    });
  }
});

// POST /api/v1/wallets/deposit
router.post('/deposit', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('source')
    .isIn(['bank_transfer', 'card', 'cash'])
    .withMessage('Source must be bank_transfer, card, or cash'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, source } = req.body;
    
    // Simulate deposit processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      message: 'Deposit initiated successfully',
      data: {
        transactionId,
        amount: parseFloat(amount),
        source,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString() // 5 minutes
      }
    });
  } catch (error) {
    console.error('Error processing deposit:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process deposit'
    });
  }
});

// POST /api/v1/wallets/withdraw
router.post('/withdraw', [
  authMiddleware,
  body('amount')
    .isFloat({ min: 1 })
    .withMessage('Amount must be at least R1'),
  body('destination')
    .isIn(['bank_account', 'atm'])
    .withMessage('Destination must be bank_account or atm'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { amount, destination } = req.body;
    
    // Simulate withdrawal processing
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;
    
    return res.json({
      success: true,
      message: 'Withdrawal initiated successfully',
      data: {
        transactionId,
        amount: parseFloat(amount),
        destination,
        status: 'processing',
        estimatedCompletion: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      }
    });
  } catch (error) {
    console.error('Error processing withdrawal:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process withdrawal'
    });
  }
});

// GET /api/v1/wallets/limits
router.get('/limits', authMiddleware, async (req, res) => {
  try {
    const limits = {
      daily: {
        deposit: 50000.00,
        withdrawal: 10000.00,
        transfer: 25000.00
      },
      monthly: {
        deposit: 500000.00,
        withdrawal: 100000.00,
        transfer: 250000.00
      },
      transaction: {
        min: 1.00,
        max: 50000.00
      }
    };
    
    return res.json({
      success: true,
      data: limits
    });
  } catch (error) {
    console.error('Error getting wallet limits:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get wallet limits'
    });
  }
});

module.exports = router;

