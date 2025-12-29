'use strict';

/**
 * Migration: Create referral_payouts table for daily batch processing
 * 
 * Tracks daily payout batches for audit trail and reconciliation
 * Runs at 2:00 AM SAST daily
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referral_payouts', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      batch_id: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true,
        comment: 'Unique batch ID (e.g., PAYOUT-2025-12-22)'
      },
      
      payout_date: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        comment: 'Date of payout batch'
      },
      total_users: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of users paid in this batch'
      },
      total_amount_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total amount paid in this batch (cents)'
      },
      total_earnings_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of earning records processed'
      },
      
      // Status tracking
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'processing',
        comment: 'Status: processing, completed, failed, reversed'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When batch processing started'
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When batch processing completed'
      },
      failed_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When batch processing failed'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if batch failed'
      },
      
      // Audit
      processed_by: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'System user or admin who triggered batch'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional batch metadata (stats, logs, etc.)'
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes
    await queryInterface.addIndex('referral_payouts', ['batch_id'], {
      name: 'idx_payouts_batch',
      unique: true
    });
    
    await queryInterface.addIndex('referral_payouts', ['payout_date'], {
      name: 'idx_payouts_date'
    });
    
    await queryInterface.addIndex('referral_payouts', ['status'], {
      name: 'idx_payouts_status'
    });

    console.log('✅ Created referral_payouts table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('referral_payouts');
    console.log('✅ Dropped referral_payouts table');
  }
};

