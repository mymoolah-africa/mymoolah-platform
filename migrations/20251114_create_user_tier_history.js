'use strict';

/**
 * Migration: Create User Tier History (Audit Trail)
 * 
 * Tracks all tier changes for compliance and analytics
 * Banking-grade audit trail for tier promotions/demotions
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create user_tier_history table
    await queryInterface.createTable('user_tier_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      
      // User reference
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User who had tier change'
      },
      
      // Tier change details
      old_tier: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'Previous tier level (NULL for initial assignment)'
      },
      new_tier: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'New tier level'
      },
      change_reason: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reason for change: monthly_review, admin_override, manual_adjustment, etc.'
      },
      
      // Activity metrics at time of change
      monthly_transaction_count: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of transactions in evaluation period'
      },
      monthly_transaction_value_cents: {
        type: Sequelize.BIGINT,
        allowNull: true,
        comment: 'Total transaction value in evaluation period (cents)'
      },
      
      // Effective date
      effective_from: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
        comment: 'When this tier change became effective'
      },
      
      // Audit
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Admin user ID if manual change'
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex('user_tier_history', 
      ['user_id', 'created_at'], 
      { name: 'idx_user_tier_history_user' }
    );
    
    await queryInterface.addIndex('user_tier_history', 
      ['created_at'], 
      { name: 'idx_user_tier_history_date' }
    );
    
    await queryInterface.addIndex('user_tier_history', 
      ['change_reason'], 
      { name: 'idx_user_tier_history_reason' }
    );

    // Add constraints
    await queryInterface.addConstraint('user_tier_history', {
      fields: ['old_tier'],
      type: 'check',
      name: 'check_old_tier_level',
      where: {
        [Sequelize.Op.or]: [
          { old_tier: null },
          { old_tier: ['bronze', 'silver', 'gold', 'platinum'] }
        ]
      }
    });

    await queryInterface.addConstraint('user_tier_history', {
      fields: ['new_tier'],
      type: 'check',
      name: 'check_new_tier_level',
      where: {
        new_tier: ['bronze', 'silver', 'gold', 'platinum']
      }
    });

    console.log('✅ User tier history table created');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('user_tier_history');
  }
};

