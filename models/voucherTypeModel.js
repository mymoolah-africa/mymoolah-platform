const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class VoucherTypeModel {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/mymoolah.db');
    this.db = new sqlite3.Database(this.dbPath);
    this.initTable();
  }

  // Initialize voucher_types table
  initTable() {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS voucher_types (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type_name TEXT UNIQUE NOT NULL,
        display_name TEXT NOT NULL,
        description TEXT,
        pricing_model TEXT DEFAULT 'fixed_rate',
        base_rate REAL DEFAULT 1.0,
        min_amount REAL DEFAULT 5.0,
        max_amount REAL DEFAULT 4000.0,
        validation_rules TEXT,
        redemption_rules TEXT,
        expiration_rules TEXT,
        merchant_rules TEXT,
        route_rules TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    this.db.run(createTableSQL, (err) => {
      if (err) {
        console.error('❌ Error creating voucher_types table:', err.message);
      } else {
        console.log('✅ Voucher types table created successfully');
        this.initializeDefaultTypes();
      }
    });
  }

  // Initialize default voucher types
  async initializeDefaultTypes() {
    const defaultTypes = [
      {
        type_name: 'standard',
        display_name: 'Standard Voucher',
        description: 'General purpose voucher with fixed value',
        pricing_model: 'fixed_rate',
        base_rate: 1.0,
        min_amount: 5.0,
        max_amount: 4000.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: true,
          require_merchant_validation: false,
          allow_multiple_redemptions: true
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 1.0,
          max_redemption_amount: null,
          allow_partial: true
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 365,
          allow_extension: false
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: [],
          restricted_merchants: [],
          require_merchant_approval: false
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['general_purchase'],
          restricted_routes: []
        })
      },
      {
        type_name: 'airtime',
        display_name: 'Airtime Voucher',
        description: 'Voucher for airtime purchases',
        pricing_model: 'fixed_rate',
        base_rate: 1.0,
        min_amount: 10.0,
        max_amount: 500.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: false,
          require_merchant_validation: true,
          allow_multiple_redemptions: false
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 10.0,
          max_redemption_amount: 500.0,
          allow_partial: false
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 30,
          allow_extension: false
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: ['vodacom', 'mtn', 'cell_c', 'telkom'],
          restricted_merchants: [],
          require_merchant_approval: true
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['airtime_purchase'],
          restricted_routes: []
        })
      },
      {
        type_name: 'data',
        display_name: 'Data Bundle Voucher',
        description: 'Voucher for data bundle purchases',
        pricing_model: 'bundle_rate',
        base_rate: 1.0,
        min_amount: 20.0,
        max_amount: 1000.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: false,
          require_merchant_validation: true,
          allow_multiple_redemptions: false
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 20.0,
          max_redemption_amount: 1000.0,
          allow_partial: false
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 60,
          allow_extension: true
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: ['vodacom', 'mtn', 'cell_c', 'telkom'],
          restricted_merchants: [],
          require_merchant_approval: true
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['data_purchase'],
          restricted_routes: []
        })
      },
      {
        type_name: 'grocery',
        display_name: 'Grocery Voucher',
        description: 'Voucher for grocery store purchases',
        pricing_model: 'fixed_rate',
        base_rate: 1.0,
        min_amount: 25.0,
        max_amount: 2000.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: true,
          require_merchant_validation: false,
          allow_multiple_redemptions: true
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 5.0,
          max_redemption_amount: null,
          allow_partial: true
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 90,
          allow_extension: false
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: ['checkers', 'pick_n_pay', 'woolworths', 'spar'],
          restricted_merchants: [],
          require_merchant_approval: false
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['grocery_purchase'],
          restricted_routes: []
        })
      },
      {
        type_name: 'fuel',
        display_name: 'Fuel Voucher',
        description: 'Voucher for fuel purchases',
        pricing_model: 'fixed_rate',
        base_rate: 1.0,
        min_amount: 50.0,
        max_amount: 1000.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: true,
          require_merchant_validation: false,
          allow_multiple_redemptions: true
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 10.0,
          max_redemption_amount: null,
          allow_partial: true
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 180,
          allow_extension: false
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: ['shell', 'bp', 'caltex', 'engen'],
          restricted_merchants: [],
          require_merchant_approval: false
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['fuel_purchase'],
          restricted_routes: []
        })
      },
      {
        type_name: 'easypay_mm',
        display_name: 'EasyPay/MMVoucher',
        description: 'EasyPay settlement voucher for MyMoolah wallet top-up',
        pricing_model: 'fixed_rate',
        base_rate: 1.0,
        min_amount: 10.0,
        max_amount: 4000.0,
        validation_rules: JSON.stringify({
          allow_partial_redemption: true,
          require_merchant_validation: false,
          allow_multiple_redemptions: true
        }),
        redemption_rules: JSON.stringify({
          min_redemption_amount: 1.0,
          max_redemption_amount: null,
          allow_partial: true
        }),
        expiration_rules: JSON.stringify({
          expires_in_days: 365,
          allow_extension: false
        }),
        merchant_rules: JSON.stringify({
          allowed_merchants: [],
          restricted_merchants: [],
          require_merchant_approval: false
        }),
        route_rules: JSON.stringify({
          allowed_routes: ['wallet_topup', 'general_purchase'],
          restricted_routes: []
        })
      }
    ];

    for (const type of defaultTypes) {
      await this.createVoucherType(type);
    }
  }

  // Create a new voucher type
  async createVoucherType(typeData) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR IGNORE INTO voucher_types (
          type_name, display_name, description, pricing_model, base_rate,
          min_amount, max_amount, validation_rules, redemption_rules,
          expiration_rules, merchant_rules, route_rules, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        typeData.type_name,
        typeData.display_name,
        typeData.description,
        typeData.pricing_model,
        typeData.base_rate,
        typeData.min_amount,
        typeData.max_amount,
        typeData.validation_rules,
        typeData.redemption_rules,
        typeData.expiration_rules,
        typeData.merchant_rules,
        typeData.route_rules,
        typeData.is_active !== undefined ? typeData.is_active : 1
      ], function(err) {
        if (err) {
          console.error('❌ Error creating voucher type:', err.message);
          reject(err);
        } else {
          resolve({
            id: this.lastID,
            type_name: typeData.type_name,
            display_name: typeData.display_name
          });
        }
      });
    });
  }

  // Get voucher type by name
  async getVoucherType(typeName) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM voucher_types WHERE type_name = ? AND is_active = 1';
      
      this.db.get(sql, [typeName], (err, row) => {
        if (err) {
          console.error('❌ Error getting voucher type:', err.message);
          reject(err);
        } else {
          if (row) {
            // Parse JSON fields
            row.validation_rules = JSON.parse(row.validation_rules || '{}');
            row.redemption_rules = JSON.parse(row.redemption_rules || '{}');
            row.expiration_rules = JSON.parse(row.expiration_rules || '{}');
            row.merchant_rules = JSON.parse(row.merchant_rules || '{}');
            row.route_rules = JSON.parse(row.route_rules || '{}');
          }
          resolve(row);
        }
      });
    });
  }

  // Get all active voucher types
  async getAllVoucherTypes() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT * FROM voucher_types WHERE is_active = 1 ORDER BY display_name';
      
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          console.error('❌ Error getting voucher types:', err.message);
          reject(err);
        } else {
          // Parse JSON fields for each row
          rows.forEach(row => {
            row.validation_rules = JSON.parse(row.validation_rules || '{}');
            row.redemption_rules = JSON.parse(row.redemption_rules || '{}');
            row.expiration_rules = JSON.parse(row.expiration_rules || '{}');
            row.merchant_rules = JSON.parse(row.merchant_rules || '{}');
            row.route_rules = JSON.parse(row.route_rules || '{}');
          });
          resolve(rows);
        }
      });
    });
  }

  // Update voucher type
  async updateVoucherType(typeName, updateData) {
    return new Promise((resolve, reject) => {
      const sql = `
        UPDATE voucher_types SET 
          display_name = ?, description = ?, pricing_model = ?, base_rate = ?,
          min_amount = ?, max_amount = ?, validation_rules = ?, redemption_rules = ?,
          expiration_rules = ?, merchant_rules = ?, route_rules = ?, 
          is_active = ?, updated_at = CURRENT_TIMESTAMP
        WHERE type_name = ?
      `;

      this.db.run(sql, [
        updateData.display_name,
        updateData.description,
        updateData.pricing_model,
        updateData.base_rate,
        updateData.min_amount,
        updateData.max_amount,
        JSON.stringify(updateData.validation_rules || {}),
        JSON.stringify(updateData.redemption_rules || {}),
        JSON.stringify(updateData.expiration_rules || {}),
        JSON.stringify(updateData.merchant_rules || {}),
        JSON.stringify(updateData.route_rules || {}),
        updateData.is_active !== undefined ? updateData.is_active : 1,
        typeName
      ], function(err) {
        if (err) {
          console.error('❌ Error updating voucher type:', err.message);
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  // Delete voucher type (soft delete)
  async deleteVoucherType(typeName) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE voucher_types SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE type_name = ?';
      
      this.db.run(sql, [typeName], function(err) {
        if (err) {
          console.error('❌ Error deleting voucher type:', err.message);
          reject(err);
        } else {
          resolve({ success: true, changes: this.changes });
        }
      });
    });
  }

  // Validate voucher against type rules
  async validateVoucherAgainstType(voucherData, typeName) {
    const voucherType = await this.getVoucherType(typeName);
    if (!voucherType) {
      throw new Error(`Voucher type '${typeName}' not found`);
    }

    const amount = Number(voucherData.original_amount);
    const errors = [];

    // Validate amount range
    if (amount < voucherType.min_amount) {
      errors.push(`Amount must be at least ${voucherType.min_amount}`);
    }
    if (amount > voucherType.max_amount) {
      errors.push(`Amount cannot exceed ${voucherType.max_amount}`);
    }

    // Validate pricing model
    if (voucherType.pricing_model === 'bundle_rate' && !voucherData.bundle_size) {
      errors.push('Bundle size is required for bundle rate vouchers');
    }

    return {
      isValid: errors.length === 0,
      errors,
      voucherType
    };
  }

  // Close database connection
  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = VoucherTypeModel; 