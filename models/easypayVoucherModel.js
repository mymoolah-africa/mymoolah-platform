const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class EasyPayVoucherModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
    
    // EasyPay configuration
    this.EASYPAY_PREFIX = '9';
    this.RECEIVER_ID = '1234'; // MyMoolah's EasyPay receiver ID
    this.ACCOUNT_LENGTH = 8; // Fixed account length for MyMoolah
  }

  // Initialize easypay_vouchers table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS easypay_vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        easypay_code TEXT UNIQUE NOT NULL,
        mm_voucher_code TEXT UNIQUE NOT NULL,
        original_amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        issued_to TEXT NOT NULL,
        issued_by TEXT,
        expires_at DATETIME,
        settlement_amount REAL,
        settlement_merchant TEXT,
        settlement_timestamp DATETIME,
        callback_received BOOLEAN DEFAULT 0,
        sms_sent BOOLEAN DEFAULT 0,
        sms_timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating easypay_vouchers table:', err.message);
      } else {
        console.log('✅ EasyPay vouchers table created successfully');
      }
    });
  }

  // Generate Luhn check digit for EasyPay number
  generateLuhnCheckDigit(digits) {
    let sum = 0;
    let isEven = false;
    
    // Process from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (10 - (sum % 10)) % 10;
  }

  // Generate EasyPay number (14 digits)
  generateEasyPayNumber() {
    // Generate random account number (8 digits)
    const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Combine receiver ID and account number
    const baseDigits = this.RECEIVER_ID + accountNumber;
    
    // Calculate check digit
    const checkDigit = this.generateLuhnCheckDigit(baseDigits);
    
    // Return complete EasyPay number
    return this.EASYPAY_PREFIX + baseDigits + checkDigit;
  }

  // Generate MM voucher code (16 digits)
  generateMMVoucherCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MMVOUCHER${timestamp}${random}`;
  }

  // Create EasyPay voucher
  async createEasyPayVoucher(voucherData) {
    return new Promise((resolve, reject) => {
      try {
        const easypayCode = this.generateEasyPayNumber();
        const mmVoucherCode = this.generateMMVoucherCode();
        
        // Calculate expiration (48 hours)
        const expiresAt = new Date(Date.now() + (48 * 60 * 60 * 1000));
        
        const sql = `
          INSERT INTO easypay_vouchers (
            easypay_code, mm_voucher_code, original_amount, status,
            issued_to, issued_by, expires_at, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        this.db.run(sql, [
          easypayCode,
          mmVoucherCode,
          voucherData.original_amount,
          'pending',
          voucherData.issued_to,
          voucherData.issued_by || null,
          expiresAt.toISOString()
        ], function(err) {
          if (err) {
            console.error('❌ Error creating EasyPay voucher:', err.message);
            reject(err);
          } else {
            resolve({
              id: this.lastID,
              easypay_code: easypayCode,
              mm_voucher_code: mmVoucherCode,
              original_amount: voucherData.original_amount,
              status: 'pending',
              expires_at: expiresAt.toISOString(),
              issued_to: voucherData.issued_to
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Process EasyPay settlement callback
  async processSettlementCallback(easypayCode, settlementData) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION');

        // Find the EasyPay voucher
        this.db.get(
          'SELECT * FROM easypay_vouchers WHERE easypay_code = ? AND status = "pending"',
          [easypayCode],
          (err, voucher) => {
            if (err) {
              this.db.run('ROLLBACK');
              reject(err);
              return;
            }

            if (!voucher) {
              this.db.run('ROLLBACK');
              reject(new Error('EasyPay voucher not found or already processed'));
              return;
            }

            // Check if expired
            if (new Date() > new Date(voucher.expires_at)) {
              this.db.run('ROLLBACK');
              reject(new Error('EasyPay voucher has expired'));
              return;
            }

            // Update voucher with settlement data
            this.db.run(
              `UPDATE easypay_vouchers SET 
                status = ?, settlement_amount = ?, settlement_merchant = ?,
                settlement_timestamp = CURRENT_TIMESTAMP, callback_received = 1,
                updated_at = CURRENT_TIMESTAMP
               WHERE easypay_code = ?`,
              [
                'settled',
                settlementData.amount,
                settlementData.merchant,
                easypayCode
              ],
              function(err) {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Commit transaction
                this.db.run('COMMIT', (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    resolve({
                      success: true,
                      easypay_code: easypayCode,
                      mm_voucher_code: voucher.mm_voucher_code,
                      settlement_amount: settlementData.amount,
                      settlement_merchant: settlementData.merchant,
                      status: 'settled'
                    });
                  }
                });
              }.bind(this)
            );
          }
        );
      });
    });
  }

  // Get EasyPay voucher by code
  async getEasyPayVoucher(easypayCode) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM easypay_vouchers WHERE easypay_code = ?';
      
      this.db.get(sql, [easypayCode], (err, row) => {
        if (err) {
          console.error('❌ Error getting EasyPay voucher:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get MM voucher by code
  async getMMVoucher(mmVoucherCode) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM easypay_vouchers WHERE mm_voucher_code = ?';
      
      this.db.get(sql, [mmVoucherCode], (err, row) => {
        if (err) {
          console.error('❌ Error getting MM voucher:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get pending EasyPay vouchers for a user
  async getPendingEasyPayVouchers(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM easypay_vouchers WHERE issued_to = ? AND status = "pending" ORDER BY created_at DESC';
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          console.error('❌ Error getting pending EasyPay vouchers:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get settled MM vouchers for a user
  async getSettledMMVouchers(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM easypay_vouchers WHERE issued_to = ? AND status = "settled" ORDER BY settlement_timestamp DESC';
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          console.error('❌ Error getting settled MM vouchers:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Mark SMS as sent
  async markSMSSent(easypayCode) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE easypay_vouchers SET sms_sent = 1, sms_timestamp = CURRENT_TIMESTAMP WHERE easypay_code = ?';
      
      this.db.run(sql, [easypayCode], function(err) {
        if (err) {
          console.error('❌ Error marking SMS sent:', err.message);
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  // Clean up expired vouchers
  async cleanupExpiredVouchers() {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE easypay_vouchers SET status = "expired" WHERE status = "pending" AND expires_at < CURRENT_TIMESTAMP';
      
      this.db.run(sql, [], function(err) {
        if (err) {
          console.error('❌ Error cleaning up expired vouchers:', err.message);
          reject(err);
        } else {
          resolve({ success: true, expired_count: this.changes });
        }
      });
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = EasyPayVoucherModel; 