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
        walletId TEXT UNIQUE,
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
          walletId TEXT UNIQUE,
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

  // Create a new user
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

      // Generate wallet ID
      const walletId = this.generateWalletId();

      const sql = `
        INSERT INTO users (
          email, password_hash, firstName, lastName, 
          phoneNumber, walletId, balance
        ) VALUES (?, ?, ?, ?, ?, ?, 0.00)
      `;

      this.db.run(sql, [
        email, passwordHash, firstName, lastName, 
        phoneNumber, walletId
      ], function(err) {
        if (err) {
          console.error('❌ Error creating user:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            email,
            firstName,
            lastName,
            phoneNumber,
            walletId,
            balance: 0.00,
            status: 'active',
            createdAt: new Date().toISOString()
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

  // Find user by email (alias for compatibility)
  async findUserByEmail(email) {
    return this.getUserByEmail(email);
  }

  // Find user by reset token
  async findUserByResetToken(resetToken) {
    return this.getUserByResetToken(resetToken);
  }

  // Find user by email (static method for compatibility)
  static async findByEmail(email) {
    const user = new User();
    return user.getUserByEmail(email);
  }

  // Find user by ID (alias for compatibility)
  async findUserById(id) {
    return this.getUserById(id);
  }

  // Validate password
  async validatePassword(user, password) {
    return this.verifyPassword(password, user.password_hash);
  }

  // Get user by wallet ID
  async getUserByWalletId(walletId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE walletId = ?';
      
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

  // Update user balance
  async updateBalance(userId, newBalance) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET balance = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [newBalance, userId], function(err) {
        if (err) {
          console.error('❌ Error updating user balance:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Update reset token
  async updateResetToken(userId, resetToken, resetTokenExpiry) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET resetToken = ?, resetTokenExpiry = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [resetToken, resetTokenExpiry, userId], function(err) {
        if (err) {
          console.error('❌ Error updating reset token:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Get user by reset token
  async getUserByResetToken(resetToken) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE resetToken = ?';
      
      this.db.get(sql, [resetToken], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by reset token:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Clear reset token
  async clearResetToken(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET resetToken = NULL, resetTokenExpiry = NULL, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [userId], function(err) {
        if (err) {
          console.error('❌ Error clearing reset token:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Update password
  async updatePassword(userId, newPassword) {
    return new Promise((resolve, reject) => {
      const saltRounds = 10;
      const passwordHash = bcrypt.hashSync(newPassword, saltRounds);
      
      const sql = 'UPDATE users SET password_hash = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [passwordHash, userId], function(err) {
        if (err) {
          console.error('❌ Error updating password:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Verify password
  verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  // Close database connection
  close() {
    this.db.close();
  }
}

module.exports = new User();
module.exports.User = User;