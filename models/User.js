const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

class User {
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
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          phone_number TEXT,
          wallet_id TEXT UNIQUE,
          balance REAL DEFAULT 0.00,
          status TEXT DEFAULT 'active',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating users table:', err);
          reject(err);
        } else {
          console.log('✅ Users table created successfully');
          resolve();
        }
      });
    });
  }

  async createUser(userData) {
    const db = await this.getConnection();
    
    return new Promise(async (resolve, reject) => {
      try {
        // Hash the password
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash(userData.password, saltRounds);
        
        // Generate a unique wallet ID
        const walletId = `WAL${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        
        const insertSQL = `
          INSERT INTO users (email, password_hash, first_name, last_name, phone_number, wallet_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertSQL, [
          userData.email,
          passwordHash,
          userData.firstName,
          userData.lastName,
          userData.phoneNumber || null,
          walletId
        ], function(err) {
          if (err) {
            console.error('❌ Error creating user:', err);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              email: userData.email,
              firstName: userData.firstName,
              lastName: userData.lastName,
              phoneNumber: userData.phoneNumber,
              walletId: walletId,
              balance: 0.00
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async findUserByEmail(email) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM users WHERE email = ?';
      db.get(selectSQL, [email], (err, row) => {
        if (err) {
          console.error('❌ Error finding user by email:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async findUserById(id) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM users WHERE id = ?';
      db.get(selectSQL, [id], (err, row) => {
        if (err) {
          console.error('❌ Error finding user by ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async validatePassword(user, password) {
    return await bcrypt.compare(password, user.password_hash);
  }

  async updateBalance(userId, newBalance) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const updateSQL = 'UPDATE users SET balance = ? WHERE id = ?';
      db.run(updateSQL, [newBalance, userId], (err) => {
        if (err) {
          console.error('❌ Error updating balance:', err);
          reject(err);
        } else {
          resolve(true);
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

module.exports = User; 