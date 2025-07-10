const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Wallet {
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
        CREATE TABLE IF NOT EXISTS wallets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          wallet_id TEXT UNIQUE NOT NULL,
          wallet_name TEXT DEFAULT 'MyMoolah Wallet',
          balance REAL DEFAULT 0.00,
          available_balance REAL DEFAULT 0.00,
          currency TEXT DEFAULT 'ZAR',
          status TEXT DEFAULT 'active',
          
          -- KYC and Compliance
          kyc_status TEXT DEFAULT 'pending',
          kyc_level TEXT DEFAULT 'basic',
          kyc_verified_at DATETIME,
          
          -- Transaction Limits
          daily_limit REAL DEFAULT 5000.00,
          monthly_limit REAL DEFAULT 50000.00,
          single_transaction_limit REAL DEFAULT 2000.00,
          
          -- Usage Tracking
          daily_spent REAL DEFAULT 0.00,
          monthly_spent REAL DEFAULT 0.00,
          last_transaction_date DATE,
          
          -- Integration Details
          integration_provider TEXT,
          integration_account_id TEXT,
          integration_status TEXT DEFAULT 'pending',
          
          -- Metadata
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_activity_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          
          -- Foreign Key
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `, (err) => {
        if (err) {
          console.error('❌ Error creating wallets table:', err);
          reject(err);
        } else {
          console.log('✅ Wallets table created successfully');
          resolve();
        }
      });
    });
  }

  async createWallet(walletData) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      try {
        // Generate unique wallet ID
        const walletId = `WAL${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        
        const insertSQL = `
          INSERT INTO wallets (
            user_id, wallet_id, wallet_name, balance, available_balance,
            currency, status, kyc_status, kyc_level,
            daily_limit, monthly_limit, single_transaction_limit,
            integration_provider, integration_account_id
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(insertSQL, [
          walletData.userId,
          walletId,
          walletData.walletName || 'MyMoolah Wallet',
          walletData.initialBalance || 0.00,
          walletData.availableBalance || 0.00,
          walletData.currency || 'ZAR',
          walletData.status || 'active',
          walletData.kycStatus || 'pending',
          walletData.kycLevel || 'basic',
          walletData.dailyLimit || 5000.00,
          walletData.monthlyLimit || 50000.00,
          walletData.singleTransactionLimit || 2000.00,
          walletData.integrationProvider,
          walletData.integrationAccountId
        ], function(err) {
          if (err) {
            console.error('❌ Error creating wallet:', err);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              walletId: walletId,
              ...walletData
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async getWalletById(walletId) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM wallets WHERE wallet_id = ?';
      db.get(selectSQL, [walletId], (err, row) => {
        if (err) {
          console.error('❌ Error finding wallet by ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async getWalletByUserId(userId) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM wallets WHERE user_id = ?';
      db.get(selectSQL, [userId], (err, row) => {
        if (err) {
          console.error('❌ Error finding wallet by user ID:', err);
          reject(err);
        } else {
          resolve(row || null);
        }
      });
    });
  }

  async updateBalance(walletId, amount, transactionType) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      try {
        // Get current wallet
        db.get('SELECT * FROM wallets WHERE wallet_id = ?', [walletId], (err, wallet) => {
          if (err) {
            console.error('❌ Error getting wallet for balance update:', err);
            reject(err);
          } else if (!wallet) {
            reject(new Error('Wallet not found'));
          } else {
            // Calculate new balance based on transaction type
            let newBalance = wallet.balance;
            let newAvailableBalance = wallet.available_balance;
            
            switch (transactionType) {
              case 'deposit':
                newBalance += amount;
                newAvailableBalance += amount;
                break;
              case 'withdrawal':
                if (newAvailableBalance < amount) {
                  reject(new Error('Insufficient available balance'));
                  return;
                }
                newBalance -= amount;
                newAvailableBalance -= amount;
                break;
              case 'purchase':
                if (newAvailableBalance < amount) {
                  reject(new Error('Insufficient available balance'));
                  return;
                }
                newBalance -= amount;
                newAvailableBalance -= amount;
                break;
              default:
                reject(new Error('Invalid transaction type'));
                return;
            }
            
            // Update wallet balance
            const updateSQL = `
              UPDATE wallets 
              SET balance = ?, available_balance = ?, updated_at = CURRENT_TIMESTAMP, last_activity_at = CURRENT_TIMESTAMP
              WHERE wallet_id = ?
            `;
            
            db.run(updateSQL, [newBalance, newAvailableBalance, walletId], (err) => {
              if (err) {
                console.error('❌ Error updating wallet balance:', err);
                reject(err);
              } else {
                resolve({
                  walletId: walletId,
                  oldBalance: wallet.balance,
                  newBalance: newBalance,
                  oldAvailableBalance: wallet.available_balance,
                  newAvailableBalance: newAvailableBalance,
                  transactionAmount: amount,
                  transactionType: transactionType
                });
              }
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async updateKYCStatus(walletId, kycStatus, kycLevel = null) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const updateSQL = `
        UPDATE wallets 
        SET kyc_status = ?, kyc_level = ?, kyc_verified_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
        WHERE wallet_id = ?
      `;
      
      db.run(updateSQL, [kycStatus, kycLevel, walletId], (err) => {
        if (err) {
          console.error('❌ Error updating KYC status:', err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async updateTransactionLimits(walletId, limits) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const updateSQL = `
        UPDATE wallets 
        SET daily_limit = ?, monthly_limit = ?, single_transaction_limit = ?, updated_at = CURRENT_TIMESTAMP
        WHERE wallet_id = ?
      `;
      
      db.run(updateSQL, [
        limits.dailyLimit,
        limits.monthlyLimit,
        limits.singleTransactionLimit,
        walletId
      ], (err) => {
        if (err) {
          console.error('❌ Error updating transaction limits:', err);
          reject(err);
        } else {
          resolve(true);
        }
      });
    });
  }

  async checkTransactionLimits(walletId, amount) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM wallets WHERE wallet_id = ?';
      db.get(selectSQL, [walletId], (err, wallet) => {
        if (err) {
          console.error('❌ Error checking transaction limits:', err);
          reject(err);
        } else if (!wallet) {
          reject(new Error('Wallet not found'));
        } else {
          // Check single transaction limit
          if (amount > wallet.single_transaction_limit) {
            reject(new Error(`Transaction amount exceeds single transaction limit of R${wallet.single_transaction_limit}`));
            return;
          }
          
          // Check daily limit (simplified - in production you'd check actual daily spent)
          if (wallet.daily_spent + amount > wallet.daily_limit) {
            reject(new Error(`Transaction would exceed daily limit of R${wallet.daily_limit}`));
            return;
          }
          
          // Check monthly limit (simplified - in production you'd check actual monthly spent)
          if (wallet.monthly_spent + amount > wallet.monthly_limit) {
            reject(new Error(`Transaction would exceed monthly limit of R${wallet.monthly_limit}`));
            return;
          }
          
          resolve({
            walletId: walletId,
            canProceed: true,
            limits: {
              singleTransaction: wallet.single_transaction_limit,
              daily: wallet.daily_limit,
              monthly: wallet.monthly_limit
            }
          });
        }
      });
    });
  }

  async getWalletSummary(walletId) {
    const db = await this.getConnection();
    
    return new Promise((resolve, reject) => {
      const selectSQL = 'SELECT * FROM wallets WHERE wallet_id = ?';
      db.get(selectSQL, [walletId], (err, wallet) => {
        if (err) {
          console.error('❌ Error getting wallet summary:', err);
          reject(err);
        } else if (!wallet) {
          reject(new Error('Wallet not found'));
        } else {
          resolve({
            walletId: wallet.wallet_id,
            walletName: wallet.wallet_name,
            balance: wallet.balance,
            availableBalance: wallet.available_balance,
            currency: wallet.currency,
            status: wallet.status,
            kycStatus: wallet.kyc_status,
            kycLevel: wallet.kyc_level,
            limits: {
              daily: wallet.daily_limit,
              monthly: wallet.monthly_limit,
              singleTransaction: wallet.single_transaction_limit
            },
            usage: {
              dailySpent: wallet.daily_spent,
              monthlySpent: wallet.monthly_spent
            },
            lastActivity: wallet.last_activity_at,
            createdAt: wallet.created_at
          });
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

module.exports = Wallet;