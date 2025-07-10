const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class TransactionModel {
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
        walletId TEXT NOT NULL,
        type TEXT NOT NULL,
        amount REAL NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'completed',
        reference TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(walletId) REFERENCES wallets(walletId)
      )
    `;
    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating transactions table:', err.message);
      } else {
        console.log('✅ Transactions table created successfully');
      }
    });
  }

  // Create a new transaction
  async createTransaction(transactionData) {
    return new Promise((resolve, reject) => {
      const {
        walletId,
        type,
        amount,
        description,
        status = 'completed',
        reference,
        metadata
      } = transactionData;

      const sql = `
        INSERT INTO transactions (
          walletId, type, amount, description, status, reference, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        walletId, type, amount, description, status, reference, metadata
      ], function(err) {
        console.log('DEBUG: createTransaction callback', { err, lastID: this && this.lastID });
        if (err) {
          console.error('❌ Error creating transaction:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            walletId,
            type,
            amount,
            description,
            status,
            reference,
            metadata,
            createdAt: new Date().toISOString()
          });
        }
      });
    });
  }

  // Get transaction by ID
  async getTransactionById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM transactions WHERE id = ?';
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('❌ Error getting transaction by ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get transactions by wallet ID
  async getTransactionsByWalletId(walletId, options = {}) {
    return new Promise((resolve, reject) => {
      const { page = 1, limit = 20, type, startDate, endDate } = options;
      const offset = (page - 1) * limit;

      let sql = 'SELECT * FROM transactions WHERE walletId = ?';
      const params = [walletId];

      // Add filters
      if (type) {
        sql += ' AND type = ?';
        params.push(type);
      }
      if (startDate) {
        sql += ' AND createdAt >= ?';
        params.push(startDate);
      }
      if (endDate) {
        sql += ' AND createdAt <= ?';
        params.push(endDate);
      }

      // Add ordering and pagination
      sql += ' ORDER BY createdAt DESC LIMIT ? OFFSET ?';
      params.push(limit, offset);

      this.db.all(sql, params, (err, rows) => {
        if (err) {
          console.error('❌ Error getting transactions by wallet ID:', err.message);
          reject(err);
        } else {
          // Get total count for pagination
          let countSql = 'SELECT COUNT(*) as total FROM transactions WHERE walletId = ?';
          const countParams = [walletId];
          
          if (type) {
            countSql += ' AND type = ?';
            countParams.push(type);
          }
          if (startDate) {
            countSql += ' AND createdAt >= ?';
            countParams.push(startDate);
          }
          if (endDate) {
            countSql += ' AND createdAt <= ?';
            countParams.push(endDate);
          }

          this.db.get(countSql, countParams, (err, countRow) => {
            if (err) {
              reject(err);
            } else {
              resolve({
                page,
                limit,
                total: countRow.total,
                transactions: rows
              });
            }
          });
        }
      });
    });
  }

  // Get transaction summary for a wallet
  async getTransactionSummary(walletId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as totalTransactions,
          SUM(CASE WHEN type = 'credit' THEN amount ELSE 0 END) as totalCredits,
          SUM(CASE WHEN type = 'debit' THEN amount ELSE 0 END) as totalDebits,
          MAX(createdAt) as lastTransactionDate
        FROM transactions 
        WHERE walletId = ?
      `;
      
      this.db.get(sql, [walletId], (err, row) => {
        if (err) {
          console.error('❌ Error getting transaction summary:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }
}

module.exports = new TransactionModel(); 