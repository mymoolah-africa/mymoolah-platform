const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const VoucherTypeModel = require('./voucherTypeModel');

class VoucherModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.voucherTypeModel = new VoucherTypeModel();
    this.initTable();
  }

  // Initialize vouchers table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS vouchers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_code TEXT UNIQUE NOT NULL,
        original_amount REAL NOT NULL,
        balance REAL NOT NULL,
        status TEXT DEFAULT 'active',
        voucher_type TEXT DEFAULT 'standard',
        issued_to TEXT,
        issued_by TEXT,
        brand_locked BOOLEAN DEFAULT 0,
        locked_to_id TEXT,
        expires_at DATETIME,
        redemption_count INTEGER DEFAULT 0,
        max_redemptions INTEGER DEFAULT 1,
        config TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating vouchers table:', err.message);
      } else {
        console.log('✅ Vouchers table created successfully');
      }
    });

    // Create voucher_redemptions table for history
    const createRedemptionsTableSQL = `
      CREATE TABLE IF NOT EXISTS voucher_redemptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        voucher_id INTEGER,
        redeemer_id TEXT,
        amount REAL NOT NULL,
        merchant_id TEXT,
        service_provider_id TEXT,
        route_used TEXT,
        redeemed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (voucher_id) REFERENCES vouchers(id)
      )
    `;

    this.db.run(createRedemptionsTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating voucher_redemptions table:', err.message);
      } else {
        console.log('✅ Voucher redemptions table created successfully');
      }
    });
  }

  // Generate unique voucher code
  generateVoucherCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `VOUCHER${timestamp}${random}`;
  }

  // Validate voucher against type rules
  async validateVoucherData(voucherData) {
    const voucherType = await this.voucherTypeModel.getVoucherType(voucherData.voucher_type || 'standard');
    if (!voucherType) {
      throw new Error(`Voucher type '${voucherData.voucher_type}' not found`);
    }

    const amount = Number(voucherData.original_amount);
    const errors = [];

    // Validate amount range
    if (amount < voucherType.min_amount) {
      errors.push(`Amount must be at least ${voucherType.min_amount} for ${voucherType.display_name}`);
    }
    if (amount > voucherType.max_amount) {
      errors.push(`Amount cannot exceed ${voucherType.max_amount} for ${voucherType.display_name}`);
    }

    // Validate pricing model specific rules
    if (voucherType.pricing_model === 'bundle_rate' && !voucherData.bundle_size) {
      errors.push('Bundle size is required for bundle rate vouchers');
    }

    return {
      isValid: errors.length === 0,
      errors,
      voucherType
    };
  }

  // Issue a new voucher with type validation
  async issueVoucher(voucherData) {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate voucher data against type rules
        const validation = await this.validateVoucherData(voucherData);
        if (!validation.isValid) {
          reject(new Error(validation.errors.join(', ')));
          return;
        }

        const voucherType = validation.voucherType;
        
        // Generate voucher code if not provided
        const voucherCode = voucherData.voucher_code || this.generateVoucherCode();
        
        // Calculate expiration date based on type rules
        const expiresAt = voucherType.expiration_rules.expires_in_days ? 
          new Date(Date.now() + (voucherType.expiration_rules.expires_in_days * 24 * 60 * 60 * 1000)) : 
          null;

        const sql = `
          INSERT INTO vouchers (
            voucher_code, original_amount, balance, status, voucher_type,
            issued_to, issued_by, brand_locked, locked_to_id, 
            expires_at, max_redemptions, config, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        `;

        this.db.run(sql, [
          voucherCode,
          voucherData.original_amount,
          voucherData.original_amount, // Initial balance equals original amount
          'active',
          voucherData.voucher_type || 'standard',
          voucherData.issued_to || null,
          voucherData.issued_by || null,
          voucherData.brand_locked ? 1 : 0,
          voucherData.locked_to_id || null,
          expiresAt ? expiresAt.toISOString() : null,
          voucherType.validation_rules.allow_multiple_redemptions ? 999 : 1,
          JSON.stringify(voucherData.config || {})
        ], function(err) {
          if (err) {
            console.error('❌ Error issuing voucher:', err.message);
            reject(err);
          } else {
            resolve({
              voucherId: this.lastID,
              voucher_code: voucherCode,
              original_amount: voucherData.original_amount,
              balance: voucherData.original_amount,
              status: 'active',
              voucher_type: voucherData.voucher_type || 'standard',
              expires_at: expiresAt ? expiresAt.toISOString() : null,
              voucher_type_info: {
                display_name: voucherType.display_name,
                description: voucherType.description
              }
            });
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  // Redeem a voucher with type-specific validation
  async redeemVoucher(voucher_code, amount, redeemer_id, merchant_id, service_provider_id, route_used = 'general_purchase') {
    return new Promise(async (resolve, reject) => {
      this.db.serialize(async () => {
        // Start transaction
        this.db.run('BEGIN TRANSACTION');

        // Fetch voucher
        this.db.get('SELECT * FROM vouchers WHERE voucher_code = ?', [voucher_code], async (err, voucher) => {
          if (err) {
            this.db.run('ROLLBACK');
            reject(err);
            return;
          }

          if (!voucher) {
            this.db.run('ROLLBACK');
            reject(new Error('Voucher not found'));
            return;
          }

          try {
            // Get voucher type for validation
            const voucherType = await this.voucherTypeModel.getVoucherType(voucher.voucher_type);
            if (!voucherType) {
              this.db.run('ROLLBACK');
              reject(new Error('Voucher type not found'));
              return;
            }

            // Validate voucher status and expiration
            if (voucher.status !== 'active' || voucher.balance <= 0) {
              this.db.run('ROLLBACK');
              reject(new Error('Voucher not active or already redeemed'));
              return;
            }

            // Check expiration
            if (voucher.expires_at && new Date() > new Date(voucher.expires_at)) {
              this.db.run('ROLLBACK');
              reject(new Error('Voucher has expired'));
              return;
            }

            // Validate redemption amount against type rules
            const amt = Number(amount);
            if (amt < voucherType.redemption_rules.min_redemption_amount) {
              this.db.run('ROLLBACK');
              reject(new Error(`Minimum redemption amount is ${voucherType.redemption_rules.min_redemption_amount}`));
              return;
            }

            if (voucherType.redemption_rules.max_redemption_amount && amt > voucherType.redemption_rules.max_redemption_amount) {
              this.db.run('ROLLBACK');
              reject(new Error(`Maximum redemption amount is ${voucherType.redemption_rules.max_redemption_amount}`));
              return;
            }

            // Check if partial redemption is allowed
            if (!voucherType.redemption_rules.allow_partial && amt !== voucher.balance) {
              this.db.run('ROLLBACK');
              reject(new Error('This voucher type does not allow partial redemption'));
              return;
            }

            // Validate merchant restrictions
            if (voucherType.merchant_rules.allowed_merchants.length > 0) {
              const allowedMerchants = voucherType.merchant_rules.allowed_merchants;
              if (!allowedMerchants.includes(merchant_id)) {
                this.db.run('ROLLBACK');
                reject(new Error(`Voucher can only be redeemed at: ${allowedMerchants.join(', ')}`));
                return;
              }
            }

            // Validate route restrictions
            if (voucherType.route_rules.allowed_routes.length > 0) {
              const allowedRoutes = voucherType.route_rules.allowed_routes;
              if (!allowedRoutes.includes(route_used)) {
                this.db.run('ROLLBACK');
                reject(new Error(`Voucher can only be used for: ${allowedRoutes.join(', ')}`));
                return;
              }
            }

            // Check redemption count limits
            if (voucher.redemption_count >= voucher.max_redemptions) {
              this.db.run('ROLLBACK');
              reject(new Error('Maximum redemption count reached'));
              return;
            }

            // Brand lock check
            if (voucher.brand_locked && voucher.locked_to_id && 
                (voucher.locked_to_id !== merchant_id && voucher.locked_to_id !== service_provider_id)) {
              this.db.run('ROLLBACK');
              reject(new Error('Voucher is brand-locked and cannot be redeemed here'));
              return;
            }

            // Partial redemption logic
            if (amt > voucher.balance) {
              this.db.run('ROLLBACK');
              reject(new Error('Redemption amount exceeds voucher balance'));
              return;
            }

            const newBalance = voucher.balance - amt;
            const newStatus = newBalance === 0 ? 'fully_redeemed' : 'active';
            const newRedemptionCount = voucher.redemption_count + 1;

            // Update voucher
            this.db.run(
              'UPDATE vouchers SET balance = ?, status = ?, redemption_count = ?, updated_at = CURRENT_TIMESTAMP WHERE voucher_code = ?',
              [newBalance, newStatus, newRedemptionCount, voucher_code],
              function(err) {
                if (err) {
                  this.db.run('ROLLBACK');
                  reject(err);
                  return;
                }

                // Log redemption
                this.db.run(
                  'INSERT INTO voucher_redemptions (voucher_id, redeemer_id, amount, merchant_id, service_provider_id, route_used) VALUES (?, ?, ?, ?, ?, ?)',
                  [voucher.id, redeemer_id, amt, merchant_id, service_provider_id, route_used],
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
                          newBalance,
                          status: newStatus,
                          redeemedAmount: amt,
                          redemptionCount: newRedemptionCount,
                          voucherType: voucherType.display_name
                        });
                      }
                    });
                  }.bind(this)
                );
              }.bind(this)
            );
          } catch (error) {
            this.db.run('ROLLBACK');
            reject(error);
          }
        });
      });
    });
  }

  // List all active vouchers with positive balance for a user/wallet
  async listActiveVouchers(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM vouchers WHERE issued_to = ? AND balance > 0 AND status = "active"';
      
      this.db.all(sql, [userId], (err, rows) => {
        if (err) {
          console.error('❌ Error listing active vouchers:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get voucher by code
  async getVoucherByCode(voucher_code) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM vouchers WHERE voucher_code = ?';
      
      this.db.get(sql, [voucher_code], (err, row) => {
        if (err) {
          console.error('❌ Error getting voucher by code:', err.message);
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  // Get voucher redemption history
  async getVoucherRedemptions(voucher_id) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM voucher_redemptions WHERE voucher_id = ? ORDER BY redeemed_at DESC';
      
      this.db.all(sql, [voucher_id], (err, rows) => {
        if (err) {
          console.error('❌ Error getting voucher redemptions:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Get vouchers by type
  async getVouchersByType(typeName) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM vouchers WHERE voucher_type = ? ORDER BY created_at DESC';
      
      this.db.all(sql, [typeName], (err, rows) => {
        if (err) {
          console.error('❌ Error getting vouchers by type:', err.message);
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
    if (this.voucherTypeModel) {
      this.voucherTypeModel.close();
    }
  }
}

module.exports = VoucherModel;