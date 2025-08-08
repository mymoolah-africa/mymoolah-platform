const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const { body, validationResult } = require('express-validator');
const { requireKYCVerification } = require('../middleware/kycMiddleware');

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

// Initialize SQLite database
const dbPath = path.join(__dirname, "../data/mymoolah.db");
const db = new sqlite3.Database(dbPath);

// GET /api/transactions - List all transactions
router.get("/", (req, res) => {
  try {
    db.all("SELECT * FROM transactions ORDER BY createdAt DESC", (err, rows) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "Database error" });
      }
      res.json(rows || []);
    });
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
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
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
], (req, res) => {
  const { 
    senderWalletId,
    receiverWalletId,
    type, 
    amount, 
    description, 
    fee = 0.00,
    currency = "ZAR"
  } = req.body;
  
  if (!type || !amount) {
    return res.status(400).json({ 
      error: "Type and amount are required" 
    });
  }

  // Generate unique transaction ID
  const transactionId = `TXN${Date.now()}${Math.random().toString(36).substring(2, 8)}`;

  const sql = `INSERT INTO transactions 
    (transactionId, senderWalletId, receiverWalletId, type, amount, description, fee, currency, createdAt) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
  const params = [
    transactionId,
    senderWalletId || null,
    receiverWalletId || null,
    type, 
    amount, 
    description || null, 
    fee,
    currency, 
    new Date().toISOString()
  ];

  db.run(sql, params, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.status(201).json({ 
      id: this.lastID,
      transactionId,
      senderWalletId,
      receiverWalletId,
      type, 
      amount, 
      description, 
      fee,
      currency,
      status: 'pending',
      message: "Transaction created successfully" 
    });
  });
});

// GET /api/transactions/:id - Get a specific transaction
router.get("/:id", (req, res) => {
  const { id } = req.params;
  
  db.get("SELECT * FROM transactions WHERE id = ?", [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    if (!row) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json(row);
  });
});

// GET /api/transactions/wallet/:walletId - Get transactions for a specific wallet
router.get("/wallet/:walletId", (req, res) => {
  const { walletId } = req.params;
  
  db.all("SELECT * FROM transactions WHERE senderWalletId = ? OR receiverWalletId = ? ORDER BY createdAt DESC", [walletId, walletId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    res.json(rows || []);
  });
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
], (req, res) => {
  const { id } = req.params;
  const { status, description } = req.body;
  
  if (!status) {
    return res.status(400).json({ error: "Status is required" });
  }

  const sql = "UPDATE transactions SET status = ?, description = ?, updatedAt = ? WHERE id = ?";
  const params = [status, description || null, new Date().toISOString(), id];

  db.run(sql, params, function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Database error" });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: "Transaction not found" });
    }
    res.json({ 
      id, 
      status, 
      description,
      message: "Transaction updated successfully" 
    });
  });
});

module.exports = router; 