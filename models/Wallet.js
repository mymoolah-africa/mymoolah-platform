 const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class WalletModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }
  
  // Get all wallets
    async getAllWallets() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, userId, walletId, balance, status, account_number, created_at, updated_at FROM wallets ORDER BY created_at DESC';
      this.db.all(sql, (err, rows) => {
        if (err) {
          console.error('❌ Error getting all wallets:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Initialize wallets table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS wallets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId INTEGER NOT NULL,
        walletId TEXT UNIQUE NOT NULL,
        balance REAL DEFAULT 0.00,
        currency TEXT DEFAULT 'ZAR',
        status TEXT DEFAULT 'active',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(userId) REFERENCES users(id)
      )
    `;
    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating wallets table:', err.message);
      } else {
        console.log('✅ Wallets table created successfully');
      }
    });
  }

  // Create a wallet for a user
  async createWallet(userId, accountNumber = null) {
    return new Promise((resolve, reject) => {
      const walletId = accountNumber || `WAL-${Date.now()}-${userId}`;
      const sql = `INSERT INTO wallets (userId, walletId, balance, currency, status) VALUES (?, ?, 0.00, 'ZAR', 'active')`;
      this.db.run(sql, [userId, walletId], function(err) {
        if (err) {
          console.error('❌ Error creating wallet:', err.message);
          reject(err);
        } else {
          resolve({ 
            id: this.lastID,
            walletId: walletId, 
            accountNumber: walletId,
            userId: userId,
            balance: 0.00,
            status: 'active'
          });
        }
      });
    });
  }

  // Get wallet by wallet ID
  async getWalletById(walletId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM wallets WHERE walletId = ?`;
      this.db.get(sql, [walletId], (err, row) => {
        if (err) {
          console.error('❌ Error getting wallet by ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get wallet by numeric ID
  async getWalletByNumericId(id) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM wallets WHERE id = ?`;
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('❌ Error getting wallet by numeric ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get wallet balance
  async getWalletBalance(walletId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT balance FROM wallets WHERE walletId = ?`;
      this.db.get(sql, [walletId], (err, row) => {
        if (err) {
          console.error('❌ Error getting wallet balance:', err.message);
          reject(err);
        } else {
          resolve(row ? row.balance : null);
        }
      });
    });
  }

  // Credit wallet (deposit, voucher, etc.)
  async creditWallet(walletId, amount) {
    return new Promise((resolve, reject) => {
      if (amount <= 0) {
        reject(new Error('Invalid amount'));
        return;
      }

      const sql = `UPDATE wallets SET balance = balance + ?, updatedAt = CURRENT_TIMESTAMP WHERE walletId = ?`;
      this.db.run(sql, [amount, walletId], (err) => {
        if (err) {
          console.error('❌ Error crediting wallet:', err.message);
          reject(err);
        } else {
          // Get the new balance using the same database instance
          this.db.get('SELECT balance FROM wallets WHERE walletId = ?', [walletId], (err, row) => {
            if (err) {
              console.error('❌ Error getting new balance:', err.message);
              reject(err);
            } else if (!row) {
              reject(new Error('Wallet not found'));
            } else {
              resolve({ newBalance: row.balance });
            }
          });
        }
      });
    });
  }

  // Debit wallet (spend, transfer, etc.)
  async debitWallet(walletId, amount) {
    return new Promise((resolve, reject) => {
      if (amount <= 0) {
        reject(new Error('Invalid amount'));
        return;
      }

      // First check current balance
      this.db.get('SELECT balance FROM wallets WHERE walletId = ?', [walletId], (err, row) => {
        if (err) {
          reject(err);
        } else if (!row) {
          reject(new Error('Wallet not found'));
        } else if (row.balance < amount) {
          reject(new Error('Insufficient funds'));
        } else {
          // Proceed with debit
          const sql = `UPDATE wallets SET balance = balance - ?, updatedAt = CURRENT_TIMESTAMP WHERE walletId = ?`;
          this.db.run(sql, [amount, walletId], function(err) {
            if (err) {
              console.error('❌ Error debiting wallet:', err.message);
              reject(err);
            } else {
              resolve({ newBalance: row.balance - amount });
            }
          });
        }
      });
    });
  }

  // Get wallet by userId
  async getWalletByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT * FROM wallets WHERE userId = ?`;
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error('❌ Error getting wallet by userId:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // List wallet transactions
  async listWalletTransactions(walletId, { page = 1, limit = 20, type, startDate, endDate } = {}) {
    return new Promise((resolve, reject) => {
      const offset = (page - 1) * limit;
      
      let sql = `SELECT * FROM transactions WHERE walletId = ?`;
      const params = [walletId];
      
      if (type) {
        sql += ` AND type = ?`;
        params.push(type);
      }
      
      if (startDate) {
        sql += ` AND createdAt >= ?`;
        params.push(startDate);
      }
      
      if (endDate) {
        sql += ` AND createdAt <= ?`;
        params.push(endDate);
      }
      
      sql += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
      params.push(limit, offset);
      
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Error listing wallet transactions:', err.message);
          reject(err);
        } else {
          // Get total count for pagination
          let countSql = `SELECT COUNT(*) as total FROM transactions WHERE walletId = ?`;
          const countParams = [walletId];
          
          if (type) {
            countSql += ` AND type = ?`;
            countParams.push(type);
          }
          
          if (startDate) {
            countSql += ` AND createdAt >= ?`;
            countParams.push(startDate);
          }
          
          if (endDate) {
            countSql += ` AND createdAt <= ?`;
            countParams.push(endDate);
          }
          
          this.db.get(countSql, countParams, (countErr, countRow) => {
            if (countErr) {
              console.error('❌ Error getting transaction count:', countErr.message);
              reject(countErr);
            } else {
              resolve({
                page: parseInt(page),
                limit: parseInt(limit),
                total: countRow.total,
                transactions: rows || []
              });
            }
          });
        }
      });
    });
  }
}

module.exports = new WalletModel();