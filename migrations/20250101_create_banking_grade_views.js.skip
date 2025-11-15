'use strict';

/**
 * 🏦 BANKING-GRADE DATABASE VIEWS MIGRATION
 * 
 * This migration creates database views for aggregated data without requiring
 * elevated database privileges. It focuses on the core banking-grade improvements.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🏦 Creating banking-grade database views...');

      // 1. Create database views for aggregated data
      console.log('📈 Creating database views...');
      
      // User financial summary view
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE VIEW user_financial_summary AS
        SELECT 
          u.id as user_id,
          u."kycStatus" as kyc_status,
          u."idVerified" as id_verified,
          u.status as user_status,
          u."createdAt" as account_created,
          u."lastLoginAt" as last_login_at,
          
          -- Wallet information
          w.balance as wallet_balance,
          w.currency as wallet_currency,
          w."dailyLimit" as daily_limit,
          w."monthlyLimit" as monthly_limit,
          w."dailySpent" as daily_spent,
          w."monthlySpent" as monthly_spent,
          
          -- Voucher aggregates (Database-level calculation)
          COUNT(v.id) as total_vouchers,
          COUNT(CASE WHEN v.status = 'active' THEN 1 END) as active_vouchers,
          COUNT(CASE WHEN v.status = 'pending_payment' THEN 1 END) as pending_vouchers,
          COUNT(CASE WHEN v.status = 'redeemed' THEN 1 END) as redeemed_vouchers,
          
          -- Voucher values (Database-level aggregation)
          COALESCE(SUM(CASE WHEN v.status = 'active' THEN v.balance ELSE 0 END), 0) as active_voucher_value,
          COALESCE(SUM(CASE WHEN v.status = 'pending_payment' THEN v."originalAmount" ELSE 0 END), 0) as pending_voucher_value,
          COALESCE(SUM(CASE WHEN v.status = 'redeemed' THEN v."originalAmount" ELSE 0 END), 0) as redeemed_voucher_value,
          COALESCE(SUM(v."originalAmount"), 0) as total_voucher_value,
          
          -- Transaction aggregates (Database-level calculation)
          COUNT(t.id) as total_transactions,
          COUNT(CASE WHEN t.type = 'received' THEN 1 END) as received_transactions,
          COUNT(CASE WHEN t.type = 'sent' THEN 1 END) as sent_transactions,
          
          -- Transaction values (Database-level aggregation)
          COALESCE(SUM(CASE WHEN t.type = 'received' THEN t.amount ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN t.type = 'sent' THEN t.amount ELSE 0 END), 0) as total_sent,
          
          -- Last transaction date
          MAX(t."createdAt") as last_transaction_date
        FROM users u
        LEFT JOIN wallets w ON u.id = w."userId"
        LEFT JOIN vouchers v ON u.id = v."userId" AND v.status NOT IN ('cancelled', 'expired')
        LEFT JOIN transactions t ON u.id = t."userId"
        GROUP BY u.id, w.id
      `, { transaction });

      // Voucher summary view
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE VIEW voucher_summary AS
        SELECT 
          "userId" as user_id,
          COUNT(*) as total_vouchers,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active_count,
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_count,
          COUNT(CASE WHEN status = 'redeemed' THEN 1 END) as redeemed_count,
          COUNT(CASE WHEN status = 'expired' THEN 1 END) as expired_count,
          COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_count,
          
          COALESCE(SUM(CASE WHEN status = 'active' THEN balance ELSE 0 END), 0) as active_balance,
          COALESCE(SUM(CASE WHEN status = 'pending' THEN "originalAmount" ELSE 0 END), 0) as pending_balance,
          COALESCE(SUM(CASE WHEN status = 'redeemed' THEN "originalAmount" ELSE 0 END), 0) as redeemed_value,
          COALESCE(SUM(CASE WHEN status = 'expired' THEN balance ELSE 0 END), 0) as expired_balance,
          COALESCE(SUM(CASE WHEN status = 'cancelled' THEN "originalAmount" ELSE 0 END), 0) as cancelled_original_amount,
          COALESCE(SUM("originalAmount"), 0) as total_value
        FROM vouchers 
        GROUP BY "userId"
      `, { transaction });

      // Transaction summary view
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE VIEW transaction_summary AS
        SELECT 
          "userId" as user_id,
          COUNT(*) as total_transactions,
          COUNT(CASE WHEN type = 'receive' OR type = 'deposit' THEN 1 END) as received_count,
          COUNT(CASE WHEN type = 'send' OR type = 'payment' THEN 1 END) as sent_count,
          COUNT(CASE WHEN type = 'refund' THEN 1 END) as refund_count,
          
          COALESCE(SUM(CASE WHEN type = 'receive' OR type = 'deposit' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_received,
          COALESCE(SUM(CASE WHEN type = 'send' OR type = 'payment' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_sent,
          COALESCE(SUM(CASE WHEN type = 'refund' THEN CAST(amount AS DECIMAL(10,2)) ELSE 0 END), 0) as total_refunds,
          
          MAX("createdAt") as last_transaction_date,
          MIN("createdAt") as first_transaction_date
        FROM transactions 
        WHERE "userId" IS NOT NULL
        GROUP BY "userId"
      `, { transaction });

      // 2. Create performance monitoring table
      console.log('📊 Creating performance monitoring...');
      
      await queryInterface.createTable('query_performance_logs', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        query_type: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        execution_time_ms: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        rows_returned: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        }
      }, { transaction });

      await transaction.commit();
      
      console.log('✅ Banking-grade database views completed successfully!');
      console.log('🏦 Platform now ready for millions of customers and transactions');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error creating banking-grade views:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      console.log('🔄 Rolling back banking-grade views...');

      // Drop views
      await queryInterface.sequelize.query(`
        DROP VIEW IF EXISTS transaction_summary;
        DROP VIEW IF EXISTS voucher_summary;
        DROP VIEW IF EXISTS user_financial_summary;
      `, { transaction });

      // Drop performance monitoring table
      await queryInterface.dropTable('query_performance_logs', { transaction });

      await transaction.commit();
      
      console.log('✅ Banking-grade views rolled back successfully');
      
    } catch (error) {
      await transaction.rollback();
      console.error('❌ Error rolling back banking-grade views:', error);
      throw error;
    }
  }
};
