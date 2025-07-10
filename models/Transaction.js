const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Transaction {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  // Initialize transactions table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        transactionId TEXT UNIQUE NOT NULL,
        senderWalletId TEXT,
        receiverWalletId TEXT,
        amount REAL NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('send', 'receive', 'deposit', 'withdraw')),
        status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'failed', 'cancelled')),
        description TEXT,
        fee REAL DEFAULT 0.00,
        currency TEXT DEFAULT 'ZAR',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (senderWalletId) REFERENCES users (wallet_id),
        FOREIGN KEY (receiverWalletId) REFERENCES users (wallet_id)
      )
    `;

    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating transactions table:', err.message);
      } else {
        console.log('✅ Transactions table ready');
      }
    });
  }

  // Generate unique transaction ID
  generateTransactionId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `TXN${timestamp}${random}`;
  }

  // Create a new transaction
  async createTransaction(transactionData) {
    return new Promise((resolve, reject) => {
      const {
        senderWalletId,
        receiverWalletId,
        amount,
        type,
        description = '',
        fee = 0.00,
        currency = 'ZAR'
      } = transactionData;

      const transactionId = this.generateTransactionId();
      const sql = `
        INSERT INTO transactions (
          transactionId, senderWalletId, receiverWalletId, 
          amount, type, description, fee, currency
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        transactionId, senderWalletId, receiverWalletId,
        amount, type, description, fee, currency
      ], function(err) {
        if (err) {
          console.error('❌ Error creating transaction:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            transactionId,
            senderWalletId,
            receiverWalletId,
            amount,
            type,
            status: 'pending',
            description,
            fee,
            currency,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
  }

  // Get transaction by ID
  async getTransactionById(transactionId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM transactions WHERE transactionId = ?';
      
      this.db.get(sql, [transactionId], (err, row) => {
        if (err) {
          console.error('❌ Error getting transaction:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get transactions for a wallet
  async getWalletTransactions(walletId, limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM transactions 
        WHERE senderWalletId = ? OR receiverWalletId = ?
        ORDER BY createdAt DESC
        LIMIT ? OFFSET ?
      `;
      
      this.db.all(sql, [walletId, walletId, limit, offset], (err, rows) => {
        if (err) {
          console.error('❌ Error getting wallet transactions:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Update transaction status
  async updateTransactionStatus(transactionId, status) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE transactions 
        SET status = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE transactionId = ?
      `;
      
      this.db.run(sql, [status, transactionId], function(err) {
        if (err) {
          console.error('❌ Error updating transaction status:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Get transaction statistics for a wallet
  async getWalletStats(walletId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as totalTransactions,
          SUM(CASE WHEN type = 'send' THEN amount ELSE 0 END) as totalSent,
          SUM(CASE WHEN type = 'receive' THEN amount ELSE 0 END) as totalReceived,
          SUM(CASE WHEN type = 'deposit' THEN amount ELSE 0 END) as totalDeposited,
          SUM(CASE WHEN type = 'withdraw' THEN amount ELSE 0 END) as totalWithdrawn,
          SUM(fee) as totalFees
        FROM transactions 
        WHERE (senderWalletId = ? OR receiverWalletId = ?) 
        AND status = 'completed'
      `;
      
      this.db.get(sql, [walletId, walletId], (err, row) => {
        if (err) {
          console.error('❌ Error getting wallet stats:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get recent transactions (for dashboard)
  async getRecentTransactions(walletId, limit = 10) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT * FROM transactions 
        WHERE senderWalletId = ? OR receiverWalletId = ?
        ORDER BY createdAt DESC
        LIMIT ?
      `;
      
      this.db.all(sql, [walletId, walletId, limit], (err, rows) => {
        if (err) {
          console.error('❌ Error getting recent transactions:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

module.exports = Transaction;