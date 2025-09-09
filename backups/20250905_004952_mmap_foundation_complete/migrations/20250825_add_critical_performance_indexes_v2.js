/**
 * Critical Performance Indexes Migration v2
 * 
 * Adds essential indexes for banking-grade performance at scale
 * Compatible with current Sequelize version and database permissions
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Adding critical performance indexes (v2)...');

    // ========================================
    // TRANSACTIONS TABLE INDEXES
    // ========================================
    
    // User-based transaction queries (most common)
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_created 
        ON transactions("userId", "createdAt" DESC)
      `);
      console.log('✅ Added idx_transactions_user_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_user_created:', error.message);
    }

    // Wallet-based transaction queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_wallet_created 
        ON transactions("walletId", "createdAt" DESC)
      `);
      console.log('✅ Added idx_transactions_wallet_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_wallet_created:', error.message);
    }

    // Status-based filtering
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_status_created 
        ON transactions(status, "createdAt" DESC)
      `);
      console.log('✅ Added idx_transactions_status_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_status_created:', error.message);
    }

    // Transaction type filtering
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type_created 
        ON transactions(type, "createdAt" DESC)
      `);
      console.log('✅ Added idx_transactions_type_created');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_type_created:', error.message);
    }

    // Transaction ID for quick lookups
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_transaction_id 
        ON transactions("transactionId")
      `);
      console.log('✅ Added idx_transactions_transaction_id');
    } catch (error) {
      console.log('⚠️ Index idx_transactions_transaction_id:', error.message);
    }

    // ========================================
    // WALLETS TABLE INDEXES
    // ========================================
    
    // User wallet queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_user_status 
        ON wallets("userId", status)
      `);
      console.log('✅ Added idx_wallets_user_status');
    } catch (error) {
      console.log('⚠️ Index idx_wallets_user_status:', error.message);
    }

    // Active wallet balance queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_wallets_balance_active 
        ON wallets(balance) WHERE status = 'active'
      `);
      console.log('✅ Added idx_wallets_balance_active');
    } catch (error) {
      console.log('⚠️ Index idx_wallets_balance_active:', error.message);
    }

    // ========================================
    // USERS TABLE INDEXES
    // ========================================
    
    // Phone number lookups
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_phone_number 
        ON users("phoneNumber") WHERE "phoneNumber" IS NOT NULL
      `);
      console.log('✅ Added idx_users_phone_number');
    } catch (error) {
      console.log('⚠️ Index idx_users_phone_number:', error.message);
    }

    // Account number lookups
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_account_number 
        ON users("accountNumber") WHERE "accountNumber" IS NOT NULL
      `);
      console.log('✅ Added idx_users_account_number');
    } catch (error) {
      console.log('⚠️ Index idx_users_account_number:', error.message);
    }

    // KYC status queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_kyc_status 
        ON users("kycStatus", "kycVerifiedAt" DESC)
      `);
      console.log('✅ Added idx_users_kyc_status');
    } catch (error) {
      console.log('⚠️ Index idx_users_kyc_status:', error.message);
    }

    // ========================================
    // KYC TABLE INDEXES
    // ========================================
    
    // User KYC status queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_user_status 
        ON kyc("userId", status)
      `);
      console.log('✅ Added idx_kyc_user_status');
    } catch (error) {
      console.log('⚠️ Index idx_kyc_user_status:', error.message);
    }

    // KYC validation status queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kyc_validation_status 
        ON kyc("validationStatus", "createdAt" DESC)
      `);
      console.log('✅ Added idx_kyc_validation_status');
    } catch (error) {
      console.log('⚠️ Index idx_kyc_validation_status:', error.message);
    }

    // ========================================
    // VOUCHERS TABLE INDEXES
    // ========================================
    
    // User voucher queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_user_status_created 
        ON vouchers("userId", status, "createdAt" DESC)
      `);
      console.log('✅ Added idx_vouchers_user_status_created');
    } catch (error) {
      console.log('⚠️ Index idx_vouchers_user_status_created:', error.message);
    }

    // Expiring vouchers queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vouchers_status_expires 
        ON vouchers(status, "expiresAt")
      `);
      console.log('✅ Added idx_vouchers_status_expires');
    } catch (error) {
      console.log('⚠️ Index idx_vouchers_status_expires:', error.message);
    }

    console.log('🎉 Critical performance indexes migration v2 completed!');
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
        await queryInterface.sequelize.query(`DROP INDEX CONCURRENTLY IF EXISTS ${indexName}`);
        console.log(`✅ Removed ${indexName}`);
      } catch (error) {
        console.log(`⚠️ Index ${indexName}:`, error.message);
      }
    }

    console.log('🎉 Critical performance indexes removal completed!');
  }
};
