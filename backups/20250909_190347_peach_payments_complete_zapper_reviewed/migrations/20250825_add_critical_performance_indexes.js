/**
 * Critical Performance Indexes Migration
 * 
 * Adds essential indexes for banking-grade performance at scale
 * - Transactions: User, wallet, status, and type-based indexes
 * - Wallets: User and balance optimization indexes
 * - Users: Phone and account number indexes
 * - Composite indexes for common query patterns
 * 
 * These indexes are critical for handling millions of transactions
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding critical performance indexes...');

    // ========================================
    // TRANSACTIONS TABLE INDEXES
    // ========================================
    
    // User-based transaction queries (most common)
    try {
      await queryInterface.addIndex('transactions', ['userId', 'createdAt'], {
        name: 'idx_transactions_user_created',
        order: [['userId', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_transactions_user_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_user_created might already exist:', error.message);
    }

    // Wallet-based transaction queries
    try {
      await queryInterface.addIndex('transactions', ['walletId', 'createdAt'], {
        name: 'idx_transactions_wallet_created',
        order: [['walletId', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_transactions_wallet_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_wallet_created might already exist:', error.message);
    }

    // Status-based filtering (for pending, completed, failed transactions)
    try {
      await queryInterface.addIndex('transactions', ['status', 'createdAt'], {
        name: 'idx_transactions_status_created',
        order: [['status', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_transactions_status_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_status_created might already exist:', error.message);
    }

    // Transaction type filtering (airtime, voucher, transfer, etc.)
    try {
      await queryInterface.addIndex('transactions', ['type', 'createdAt'], {
        name: 'idx_transactions_type_created',
        order: [['type', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_transactions_type_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_type_created might already exist:', error.message);
    }

    // Transaction ID for quick lookups
    try {
      await queryInterface.addIndex('transactions', ['transactionId'], {
        name: 'idx_transactions_transaction_id',
        unique: true
      });
      console.log('✅ Added idx_transactions_transaction_id');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_transaction_id might already exist:', error.message);
    }

    // ========================================
    // WALLETS TABLE INDEXES
    // ========================================
    
    // User wallet queries
    try {
      await queryInterface.addIndex('wallets', ['userId', 'status'], {
        name: 'idx_wallets_user_status',
        order: [['userId', 'ASC'], ['status', 'ASC']]
      });
      console.log('✅ Added idx_wallets_user_status');
    } catch (error) {
      console.log('⚠️ Index idx_wallets_user_status might already exist:', error.message);
    }

    // Active wallet balance queries
    try {
      await queryInterface.addIndex('wallets', ['balance'], {
        name: 'idx_wallets_balance_active',
        where: "status = 'active'"
      });
      console.log('✅ Added idx_wallets_balance_active');
    } catch (error) {
      console.log('⚠️ Index idx_wallets_balance_active might already exist:', error.message);
    }

    // ========================================
    // USERS TABLE INDEXES
    // ========================================
    
    // Phone number lookups
    try {
      await queryInterface.addIndex('users', ['phoneNumber'], {
        name: 'idx_users_phone_number',
        where: "phoneNumber IS NOT NULL"
      });
      console.log('✅ Added idx_users_phone_number');
    } catch (error) {
      console.log('⚠️ Index idx_users_phone_number might already exist:', error.message);
    }

    // Account number lookups
    try {
      await queryInterface.addIndex('users', ['accountNumber'], {
        name: 'idx_users_account_number',
        where: "accountNumber IS NOT NULL"
      });
      console.log('✅ Added idx_users_account_number');
    } catch (error) {
      console.log('⚠️ Index idx_users_account_number might already exist:', error.message);
    }

    // KYC status queries
    try {
      await queryInterface.addIndex('users', ['kycStatus', 'kycVerifiedAt'], {
        name: 'idx_users_kyc_status',
        order: [['kycStatus', 'ASC'], ['kycVerifiedAt', 'DESC']]
      });
      console.log('✅ Added idx_users_kyc_status');
    } catch (error) {
      console.log('⚠️ Index idx_users_kyc_status might already exist:', error.message);
    }

    // ========================================
    // KYC TABLE INDEXES
    // ========================================
    
    // User KYC status queries
    try {
      await queryInterface.addIndex('kyc', ['userId', 'status'], {
        name: 'idx_kyc_user_status',
        order: [['userId', 'ASC'], ['status', 'ASC']]
      });
      console.log('✅ Added idx_kyc_user_status');
    } catch (error) {
      console.log('⚠️ Index idx_kyc_user_status might already exist:', error.message);
    }

    // KYC validation status queries
    try {
      await queryInterface.addIndex('kyc', ['validationStatus', 'createdAt'], {
        name: 'idx_kyc_validation_status',
        order: [['validationStatus', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_kyc_validation_status');
    } catch (error) {
      console.log('⚠️ Index idx_kyc_validation_status might already exist:', error.message);
    }

    // ========================================
    // VOUCHERS TABLE INDEXES
    // ========================================
    
    // User voucher queries
    try {
      await queryInterface.addIndex('vouchers', ['userId', 'status', 'createdAt'], {
        name: 'idx_vouchers_user_status_created',
        order: [['userId', 'ASC'], ['status', 'ASC'], ['createdAt', 'DESC']]
      });
      console.log('✅ Added idx_vouchers_user_status_created');
    } catch (error) {
      console.log('⚠️ Index idx_vouchers_user_status_created might already exist:', error.message);
    }

    // Expiring vouchers queries
    try {
      await queryInterface.addIndex('vouchers', ['status', 'expiresAt'], {
        name: 'idx_vouchers_status_expires',
        order: [['status', 'ASC'], ['expiresAt', 'ASC']]
      });
      console.log('✅ Added idx_vouchers_status_expires');
    } catch (error) {
      console.log('⚠️ Index idx_vouchers_status_expires might already exist:', error.message);
    }

    console.log('🎉 Critical performance indexes migration completed!');
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Removing critical performance indexes...');

    const indexes = [
      'idx_transactions_user_created',
      'idx_transactions_wallet_created',
      'idx_transactions_status_created',
      'idx_transactions_type_created',
      'idx_transactions_transaction_id',
      'idx_wallets_user_status',
      'idx_wallets_balance_active',
      'idx_users_phone_number',
      'idx_users_account_number',
      'idx_users_kyc_status',
      'idx_kyc_user_status',
      'idx_kyc_validation_status',
      'idx_vouchers_user_status_created',
      'idx_vouchers_status_expires'
    ];

    for (const indexName of indexes) {
      try {
        // Determine table name from index name
        let tableName = 'transactions';
        if (indexName.includes('wallets')) tableName = 'wallets';
        else if (indexName.includes('users')) tableName = 'users';
        else if (indexName.includes('kyc')) tableName = 'kyc';
        else if (indexName.includes('vouchers')) tableName = 'vouchers';

        await queryInterface.removeIndex(tableName, indexName);
        console.log(`✅ Removed ${indexName}`);
      } catch (error) {
        console.log(`⚠️ Index ${indexName} might not exist:`, error.message);
      }
    }

    console.log('🎉 Critical performance indexes removal completed!');
  }
};
