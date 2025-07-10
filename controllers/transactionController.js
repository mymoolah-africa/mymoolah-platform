const transactionModel = require('../models/transactionModel');

// Get all transactions
exports.getAllTransactions = async (req, res) => {
  try {
    const db = require('../models/User').db;
    db.all(`
      SELECT 
        id,
        walletId,
        type,
        amount,
        description,
        status,
        createdAt
      FROM transactions
      ORDER BY createdAt DESC
    `, [], (err, rows) => {
      if (err) {
        console.error('❌ Error getting transactions:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      res.json({ 
        success: true,
        message: 'Transactions retrieved successfully',
        data: { transactions: rows }
      });
    });
  } catch (error) {
    console.error('❌ Error in getAllTransactions:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Get transaction by ID
exports.getTransactionById = async (req, res) => {
  try {
    const { id } = req.params;
    const db = require('../models/User').db;
    
    db.get(`
      SELECT 
        id,
        walletId,
        type,
        amount,
        description,
        status,
        createdAt
      FROM transactions
      WHERE id = ?
    `, [id], (err, row) => {
      if (err) {
        console.error('❌ Error getting transaction:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      
      if (!row) {
        return res.status(404).json({ 
          success: false,
          message: 'Transaction not found' 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Transaction retrieved successfully',
        data: { transaction: row }
      });
    });
  } catch (error) {
    console.error('❌ Error in getTransactionById:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};

// Get transactions by wallet ID
exports.getTransactionsByWallet = async (req, res) => {
  try {
    const { walletId } = req.params;
    const db = require('../models/User').db;
    
    db.all(`
      SELECT 
        id,
        walletId,
        type,
        amount,
        description,
        status,
        createdAt
      FROM transactions
      WHERE walletId = ?
      ORDER BY createdAt DESC
    `, [walletId], (err, rows) => {
      if (err) {
        console.error('❌ Error getting wallet transactions:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Database error', 
          details: err.message 
        });
      }
      
      res.json({ 
        success: true,
        message: 'Wallet transactions retrieved successfully',
        data: { 
          walletId,
          transactions: rows,
          count: rows.length
        }
      });
    });
  } catch (error) {
    console.error('❌ Error in getTransactionsByWallet:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error', 
      details: error.message 
    });
  }
};