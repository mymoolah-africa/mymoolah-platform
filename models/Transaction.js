const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Transaction {
  constructor() {
    // SQLite database file path
    this.dbPath = path.join(__dirname, '..', 'data', 'mymoolah.db');
    this.db = null;
  }

  async getConnection() {
    if (!this.db) {
      this.db = new sqlite3.Database(this.dbPath);
    }
    return this.db;
  }

  async createTable() {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          wallet_id TEXT NOT NULL,
          transaction_type TEXT NOT NULL,
          transaction_category TEXT NOT NULL,
          amount REAL NOT NULL,
          currency TEXT DEFAULT 'ZAR',
          status TEXT DEFAULT 'pending',
          reference_number TEXT UNIQUE,
          description TEXT,
          
          -- Transaction Details
          recipient_name TEXT,
          recipient_account TEXT,
          recipient_bank TEXT,
          recipient_wallet_id TEXT,
          
          -- Voucher Details
          voucher_code TEXT,
          voucher_provider TEXT,
          voucher_limit REAL,
          
          -- Integration Details
          integration_provider TEXT,
          integration_reference TEXT,
          integration_status TEXT,
          
          -- Metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          processed_at DATETIME,
          
          -- Foreign Key
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating transactions table:', err);
          reject(err);
        } else {
          console.log('✅ Transactions table created successfully');
          resolve();
        }
      });
    });
  }

  async createTransaction(transactionData) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      try {
        // Generate unique reference number
        const referenceNumber = `TXN${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        
        const insertSQL = `
          INSERT INTO transactions (
            user_id, wallet_id, transaction_type, transaction_category,
            amount, currency, status, reference_number, description,
            recipient_name, recipient_account, recipient_bank, recipient_wallet_id,
            voucher_code, voucher_provider, voucher_limit,
            integration_provider, integration_reference, integration_status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertSQL, [
          transactionData.userId,
          transactionData.walletId,
          transactionData.transactionType,
          transactionData.transactionCategory,
          transactionData.amount,
          transactionData.currency || 'ZAR',
          transactionData.status || 'pending',
          referenceNumber,
          transactionData.description,
          transactionData.recipientName,
          transactionData.recipientAccount,
          transactionData.recipientBank,
          transactionData.recipientWalletId,
          transactionData.voucherCode,
          transactionData.voucherProvider,
          transactionData.voucherLimit,
          transactionData.integrationProvider,
          transactionData.integrationReference,
          transactionData.integrationStatus
        ], function(err) {
          if (err) {
            console.error('❌ Error creating transaction:', err);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              referenceNumber: referenceNumber,
              ...transactionData
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getTransactionById(id) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM transactions WHERE id = ?';
      db.get(selectSQL, [id], (err, row) => {
        if (err) {
          console.error('❌ Error finding transaction by ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getTransactionByReference(referenceNumber) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM transactions WHERE reference_number = ?';
      db.get(selectSQL, [referenceNumber], (err, row) => {
        if (err) {
          console.error('❌ Error finding transaction by reference:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getTransactionsByUserId(userId, limit = 50, offset = 0) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT * FROM transactions 
        WHERE user_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      db.all(selectSQL, [userId, limit, offset], (err, rows) => {
        if (err) {
          console.error('❌ Error finding transactions by user ID:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async getTransactionsByWalletId(walletId, limit = 50, offset = 0) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT * FROM transactions 
        WHERE wallet_id = ? 
        ORDER BY created_at DESC 
        LIMIT ? OFFSET ?
      `;
      db.all(selectSQL, [walletId, limit, offset], (err, rows) => {
        if (err) {
          console.error('❌ Error finding transactions by wallet ID:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async updateTransactionStatus(id, status, processedAt = null) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const updateSQL = `
        UPDATE transactions 
        SET status = ?, processed_at = ?, updated_at = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      db.run(updateSQL, [status, processedAt, id], (err) => {
        if (err) {
          console.error('❌ Error updating transaction status:', err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async getTransactionSummary(userId) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = `
        SELECT 
          transaction_type,
          transaction_category,
          COUNT(*) as count,
          SUM(amount) as total_amount,
          AVG(amount) as avg_amount
        FROM transactions 
        WHERE user_id = ? 
        GROUP BY transaction_type, transaction_category
      `;
      db.all(selectSQL, [userId], (err, rows) => {
        if (err) {
          console.error('❌ Error getting transaction summary:', err);
          reject(err);
        } else {
          resolve(rows || []);
        }
      });
    });
  }

  async closeConnection() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

module.exports = Transaction;