const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Wallet {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
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
  async createWallet(userId, walletId) {
    return new Promise((resolve, reject) => {
      const sql = `INSERT INTO wallets (userId, walletId, balance, currency, status) VALUES (?, ?, 0.00, 'ZAR', 'active')`;
      this.db.run(sql, [userId, walletId], function(err) {
        if (err) {
          console.error('❌ Error creating wallet:', err.message);
          reject(err);
        } else {
          resolve({ id: this.lastID, userId, walletId, balance: 0.00, currency: 'ZAR', status: 'active' });
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

  // Get balance by userId
  async getBalanceByUserId(userId) {
    return new Promise((resolve, reject) => {
      const sql = `SELECT balance FROM wallets WHERE userId = ?`;
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          console.error('❌ Error getting balance:', err.message);
          reject(err);
        } else {
          resolve(row ? row.balance : null);
        }
      });
    });
  }
}

module.exports = Wallet;