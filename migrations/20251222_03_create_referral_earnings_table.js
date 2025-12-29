'use strict';

/**
 * Migration: Create referral_earnings table for tracking all referral commissions
 * 
 * Records every earning from every transaction across the 4-level chain
 * Includes monthly cap tracking and payout status
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referral_earnings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      
      // Who earned
      earner_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who earned this commission'
      },
      
      // From whose transaction
      transaction_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who made the transaction'
      },
      transaction_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'transactions',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'The transaction that generated this earning'
      },
      
      // Earnings details
      level: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Level in chain: 1 (4%), 2 (3%), 3 (2%), 4 (1%)'
      },
      percentage: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        comment: 'Percentage earned (4.00, 3.00, 2.00, or 1.00)'
      },
      transaction_revenue_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'MyMoolah net revenue from transaction (in cents)'
      },
      earned_amount_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Amount earned by this user (in cents)'
      },
      
      // Monthly cap tracking
      month_year: {
        type: Sequelize.STRING(7),
        allowNull: false,
        comment: 'Month-year for cap tracking (e.g., 2025-12)'
      },
      cumulative_month_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Cumulative earnings this month at this level'
      },
      capped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether this earning was capped (hit monthly limit)'
      },
      original_amount_cents: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Original amount before capping (for tracking)'
      },
      
      // Status
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Status: pending, paid, failed, reversed'
      },
      paid_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When earnings were paid to user wallet'
      },
      payout_batch_id: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Batch ID for daily payout processing'
      },
      
      // Metadata
      transaction_type: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Type of transaction (vas, qr_payment, etc.)'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional metadata for audit trail'
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('referral_earnings', ['earner_user_id', 'month_year'], {
      name: 'idx_earnings_earner_month'
    });
    
    await queryInterface.addIndex('referral_earnings', ['transaction_id'], {
      name: 'idx_earnings_transaction'
    });
    
    await queryInterface.addIndex('referral_earnings', ['status', 'created_at'], {
      name: 'idx_earnings_status_created'
    });
    
    await queryInterface.addIndex('referral_earnings', ['payout_batch_id'], {
      name: 'idx_earnings_batch'
    });
    
    // Add constraint for level values
    await queryInterface.sequelize.query(`
      ALTER TABLE referral_earnings
      ADD CONSTRAINT check_level_range
      CHECK (level BETWEEN 1 AND 4);
    `);

    console.log('✅ Created referral_earnings table with indexes and constraints');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('referral_earnings');
    console.log('✅ Dropped referral_earnings table');
  }
};

