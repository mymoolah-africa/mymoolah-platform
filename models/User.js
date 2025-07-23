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
        name,
        identifier,
        identifierType
      } = userData;

      // Hash password
      const saltRounds = 12;
      const passwordHash = bcrypt.hashSync(password, saltRounds);

      // Generate wallet ID before database operation
      const walletId = this.generateWalletId();

      // Set phone number based on identifier type
      let phoneNumber = '';
      if (identifierType === 'phone') {
        phoneNumber = identifier;
      }

      const sql = `
        INSERT INTO users (
          email, password_hash, firstName, lastName, 
          phoneNumber, balance, username, accountNumber
        ) VALUES (?, ?, ?, ?, ?, 0.00, ?, ?)
      `;

      // Set firstName to name and lastName to empty for now
      const firstName = name;
      const lastName = '';
      const username = identifierType === 'username' ? identifier : null;
      const accountNumber = identifierType === 'account' ? identifier : null;

      this.db.run(sql, [
        email, passwordHash, firstName, lastName, 
        phoneNumber, username, accountNumber
      ], function(err) {
        if (err) {
          console.error('❌ Error creating user:', err.message);
          reject(err);
        } else {
          const userId = this.lastID;
          
          // Create wallet record
          const walletModel = require('./Wallet');
          
          walletModel.createWallet(userId, walletId)
            .then(() => {
              resolve({
                id: userId,
                email,
                name: firstName,
                phone: phoneNumber,
                username,
                accountNumber,
                walletId,
                balance: 0.00,
                status: 'active',
                kycStatus: 'pending',
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

  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE username = ?';
      
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by username:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  async getUserByAccount(accountNumber) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE accountNumber = ?';
      
      this.db.get(sql, [accountNumber], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by account:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get user by phone number
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

  // Get user by username (using email as username for now)
  async getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM users WHERE email = ?';
      
      this.db.get(sql, [username], (err, row) => {
        if (err) {
          console.error('❌ Error getting user by username:', err.message);
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

  // Create table method (for compatibility)
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

  // Validate password method (for compatibility)
  async validatePassword(user, password) {
    return bcrypt.compareSync(password, user.password_hash);
  }

  // Get user by wallet ID (now queries wallets table)
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

  // Verify password
  verifyPassword(password, hashedPassword) {
    return bcrypt.compareSync(password, hashedPassword);
  }

  // Update user profile
  async updateUser(userId, updateData) {
    return new Promise((resolve, reject) => {
      const { firstName, lastName, phoneNumber } = updateData;
      
      const sql = `
        UPDATE users 
        SET firstName = ?, lastName = ?, phoneNumber = ?, updatedAt = CURRENT_TIMESTAMP 
        WHERE id = ?
      `;
      
      this.db.run(sql, [firstName, lastName, phoneNumber, userId], function(err) {
        if (err) {
          console.error('❌ Error updating user:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Get all users (for admin)
  async getAllUsers() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, email, firstName, lastName, phoneNumber, balance, status, createdAt FROM users ORDER BY createdAt DESC';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error getting all users:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Update user status
  async updateUserStatus(userId, status) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET status = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?';
      
      this.db.run(sql, [status, userId], function(err) {
        if (err) {
          console.error('❌ Error updating user status:', err.message);
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Get user statistics
  async getUserStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          COUNT(*) as totalUsers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as activeUsers,
          COUNT(CASE WHEN status = 'inactive' THEN 1 END) as inactiveUsers,
          AVG(balance) as averageBalance,
          SUM(balance) as totalBalance
        FROM users
      `;
      
      this.db.get(sql, [], (err, row) => {
        if (err) {
          console.error('❌ Error getting user stats:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Delete user by email (for test cleanup)
  async deleteUserByEmail(email) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM users WHERE email = ?';
      this.db.run(sql, [email], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ changes: this.changes });
        }
      });
    });
  }

  // Close database connection
  close() {
    this.db.close();
  }

  // Alias for close (for compatibility)
  closeConnection() {
    this.close();
  }
}

module.exports = User;