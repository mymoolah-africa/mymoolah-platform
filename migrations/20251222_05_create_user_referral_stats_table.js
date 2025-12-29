'use strict';

/**
 * Migration: Create user_referral_stats table for quick access statistics
 * 
 * Denormalized stats table for fast dashboard queries
 * Updated in real-time as referrals and earnings occur
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('user_referral_stats', {
      user_id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User these stats belong to'
      },
      
      // Referral counts
      total_referrals: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total referrals ever sent'
      },
      active_referrals: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Referrals that completed 1st transaction'
      },
      
      // By level (how many people at each level)
      level_1_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Direct referrals (Level 1)'
      },
      level_2_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 2 network size'
      },
      level_3_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 3 network size'
      },
      level_4_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 4 network size'
      },
      
      // Earnings (all time, in cents)
      total_earned_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total earnings all time (cents)'
      },
      total_paid_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Total paid out to wallet (cents)'
      },
      pending_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Pending earnings not yet paid (cents)'
      },
      
      // Current month tracking
      month_year: {
        type: Sequelize.STRING(7),
        allowNull: true,
        comment: 'Current month being tracked (YYYY-MM)'
      },
      month_earned_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Earnings this month (cents)'
      },
      month_paid_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Paid out this month (cents)'
      },
      
      // Monthly cap status (for each level)
      level_1_month_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 1 earnings this month (cents)'
      },
      level_1_capped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Hit Level 1 monthly cap (R10,000)'
      },
      level_2_month_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 2 earnings this month (cents)'
      },
      level_2_capped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Hit Level 2 monthly cap (R5,000)'
      },
      level_3_month_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 3 earnings this month (cents)'
      },
      level_3_capped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Hit Level 3 monthly cap (R2,500)'
      },
      level_4_month_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Level 4 earnings this month (cents)'
      },
      level_4_capped: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Hit Level 4 monthly cap (R1,000)'
      },
      
      // Timestamps
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes
    await queryInterface.addIndex('user_referral_stats', ['user_id'], {
      name: 'idx_stats_user',
      unique: true
    });
    
    await queryInterface.addIndex('user_referral_stats', ['month_year'], {
      name: 'idx_stats_month'
    });

    console.log('✅ Created user_referral_stats table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_referral_stats');
    console.log('✅ Dropped user_referral_stats table');
  }
};

