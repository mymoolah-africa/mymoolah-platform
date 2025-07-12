const express = require("express");
const router = express.Router();
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

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
router.post("/", (req, res) => {
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
router.put("/:id", (req, res) => {
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