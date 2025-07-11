const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

class User {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  // Initialize users table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        firstName TEXT NOT NULL,
        lastName TEXT NOT NULL,
        phoneNumber TEXT,
        balance REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
        resetToken TEXT,
        resetTokenExpiry DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;
    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating users table:', err.message);
      } else {
        console.log('✅ Users table created successfully');
      }
    });
  }

  // Create table method for compatibility
  async createTable() {
    return new Promise((resolve, reject) => {
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          firstName TEXT NOT NULL,
          lastName TEXT NOT NULL,
          phoneNumber TEXT,
          balance REAL DEFAULT 0.00,
          status TEXT DEFAULT 'active',
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      this.db.run(createTableSQL, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err.message);
          reject(err);
        } else {
          console.log('✅ Users table created successfully');
          resolve();
        }
      });
    });
  }

  // Generate unique wallet ID
  generateWalletId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `WAL${timestamp}${random}`;
  }

  // Create a new user and wallet
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const {
        email,
        password,
        firstName,
        lastName,
        phoneNumber
      } = userData;

      // Hash password
      const saltRounds = 10;
      const passwordHash = bcrypt.hashSync(password, saltRounds);

      const sql = `
        INSERT INTO users (
          email, password_hash, firstName, lastName, 
          phoneNumber, balance
        ) VALUES (?, ?, ?, ?, ?, 0.00)
      `;

      this.db.run(sql, [
        email, passwordHash, firstName, lastName, phoneNumber
      ], function(err) {
        if (err) {
          console.error('❌ Error creating user:', err.message);
          reject(err);
        } else {
          const userId = this.lastID;
          const walletId = (new User()).generateWalletId();
          // Create wallet record
          const Wallet = require('./Wallet');
          const walletModel = new Wallet();
          walletModel.createWallet(userId, walletId)
            .then(() => {
              resolve({
                id: userId,
                email,
                firstName,
                lastName,
                phoneNumber,
                walletId,
                balance: 0.00,
                status: 'active',
                createdAt: new Date().toISOString()
              });
            })
            .catch(walletErr => {
              console.error('❌ Error creating wallet:', walletErr.message);
              reject(walletErr);
            });
        }
      });
    });
  }

  // Get user by ID
  async getUserById(id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE id = ?';
      this.db.get(sql, [id], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get user by email
  async getUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      this.db.get(sql, [email], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by email:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Find user by wallet ID (join with wallets table)
  async getUserByWalletId(walletId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT u.*, w.walletId, w.balance as walletBalance
        FROM users u
        JOIN wallets w ON u.id = w.userId
        WHERE w.walletId = ?
      `;
      this.db.get(sql, [walletId], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by wallet ID:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // ... (rest of your methods remain unchanged)
}

module.exports = User;