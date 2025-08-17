const express = require("express");
const router = express.Router();
const { body, validationResult } = require('express-validator');
const { requireKYCVerification } = require('../middleware/kycMiddleware');
const { Transaction } = require('../models');

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

// PostgreSQL database is handled by Sequelize models

// GET /api/transactions - List all transactions
router.get("/", async (req, res) => {
  try {
    const transactions = await Transaction.findAll({
      order: [['createdAt', 'DESC']]
    });
    
    res.json(transactions || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
});

// POST /api/transactions - Create a new transaction
router.post("/", [
  body('type')
    .isIn(['transfer', 'deposit', 'withdrawal', 'payment'])
    .withMessage('Transaction type must be transfer, deposit, withdrawal, or payment'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a non-negative number'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 500 })
    .trim()
    .escape()
    .withMessage('Description must be between 1 and 500 characters'),
  body('senderWalletId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Sender wallet ID must be a positive integer'),
  body('receiverWalletId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Receiver wallet ID must be a positive integer'),
  body('fee')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fee must be a non-negative number'),
  body('currency')
    .optional()
    .isIn(['ZAR', 'USD', 'EUR', 'GBP'])
    .withMessage('Currency must be ZAR, USD, EUR, or GBP'),
  validateRequest,
  requireKYCVerification // Add KYC check for debit transactions
], async (req, res) => {
  try {
    const { 
      transactionId,
      walletId,
      senderWalletId,
      receiverWalletId,
      type, 
      amount, 
      description, 
      fee = 0.00,
      currency = "ZAR",
      status = 'completed',
      reference
    } = req.body;
    
    if (!type || !amount) {
      return res.status(400).json({ 
        error: "Type and amount are required" 
      });
    }

    // Create transaction using Sequelize
    const transaction = await Transaction.create({
      transactionId: transactionId || `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`,
      walletId: walletId || senderWalletId,
      senderWalletId: senderWalletId || null,
      receiverWalletId: receiverWalletId || null,
      type, 
      amount, 
      description: description || null, 
      fee,
      currency,
      status,
      reference: reference || null
    });

    res.status(201).json({ 
      success: true,
      data: transaction,
      message: "Transaction created successfully" 
    });
  } catch (error) {
    console.error('❌ Error creating transaction:', error);
    res.status(500).json({ 
      success: false,
      error: "Database error",
      details: error.message
    });
  }
});

// GET /api/transactions/:id - Get a specific transaction
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    
    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(transaction);
  } catch (error) {
    console.error('❌ Error getting transaction:', error);
    res.status(500).json({ error: "Database error" });
  }
});

// GET /api/transactions/wallet/:walletId - Get transactions for a specific wallet
router.get("/wallet/:walletId", async (req, res) => {
  try {
    const { walletId } = req.params;
    
    const transactions = await Transaction.findAll({
      where: {
        [Transaction.Sequelize.Op.or]: [
          { senderWalletId: walletId },
          { receiverWalletId: walletId }
        ]
      },
      order: [['createdAt', 'DESC']]
    });
    
    res.json(transactions || []);
  } catch (error) {
    console.error('❌ Error getting wallet transactions:', error);
    res.status(500).json({ error: "Database error" });
  }
});

// PUT /api/transactions/:id - Update a transaction status
router.put("/:id", [
  body('status')
    .isIn(['pending', 'completed', 'failed', 'cancelled'])
    .withMessage('Status must be pending, completed, failed, or cancelled'),
  body('description')
    .optional()
    .isLength({ min: 1, max: 500 })
    .trim()
    .escape()
    .withMessage('Description must be between 1 and 500 characters'),
  validateRequest
], async (req, res) => {
  try {
    const { id } = req.params;
    const { status, description } = req.body;
    
    if (!status) {
      return res.status(400).json({ error: "Status is required" });
    }

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    await transaction.update({
      status,
      description: description || transaction.description,
      updatedAt: new Date()
    });

    res.json({ 
      id, 
      status, 
      description: transaction.description,
      message: "Transaction updated successfully" 
    });
  } catch (error) {
    console.error('❌ Error updating transaction:', error);
    res.status(500).json({ error: "Database error" });
  }
});

module.exports = router; 