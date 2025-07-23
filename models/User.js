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
        accountNumber TEXT,
        balance REAL DEFAULT 0.00,
        status TEXT DEFAULT 'active',
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

  // Generate unique wallet ID
  generateWalletId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `WAL${timestamp}${random}`;
  }

  // Create a new user
  async createUser(userData) {
    return new Promise((resolve, reject) => {
      const {
        email,
        password,
        phoneNumber,
        firstName = '',
        lastName = ''
      } = userData;
      const saltRounds = 12;
      const passwordHash = bcrypt.hashSync(password, saltRounds);
      const walletId = this.generateWalletId();
      const sql = `
        INSERT INTO users (
          email, password_hash, firstName, lastName, 
          phoneNumber, accountNumber, balance, status, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, 0.00, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `;
      this.db.run(sql, [
        email, passwordHash, firstName, lastName, phoneNumber, phoneNumber
      ], function(err) {
        if (err) {
          console.error('\u274c Error creating user:', err.message);
          reject(err);
        } else {
          const userId = this.lastID;
          const walletModel = require('./Wallet');
          walletModel.createWallet(userId, walletId)
            .then(() => {
              resolve({
                id: userId,
                email,
                phoneNumber,
                accountNumber: phoneNumber,
                firstName,
                lastName,
                walletId,
                balance: 0.00,
                status: 'active',
                kycStatus: 'pending',
                createdAt: new Date().toISOString()
              });
            })
            .catch(walletErr => {
              console.error('\u274c Error creating wallet:', walletErr.message);
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

  // Get user by phone
  async getUserByPhone(phone) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE phoneNumber = ?';
      this.db.get(sql, [phone], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by phone:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Alias for getUserByEmail (for compatibility)
  async findUserByEmail(email) {
    return this.getUserByEmail(email);
  }

  // Alias for getUserById (for compatibility)
  async findUserById(id) {
    return this.getUserById(id);
  }

  // ... rest of your model unchanged ...
}

module.exports = User;