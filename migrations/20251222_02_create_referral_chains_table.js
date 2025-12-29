'use strict';

/**
 * Migration: Create referral_chains table for 4-level network tracking
 * 
 * Tracks the complete 4-level referral chain for each user
 * Enables fast lookup of who earns from each transaction
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('referral_chains', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
        comment: 'User whose chain this is'
      },
      level_1_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Direct referrer (earns 4%)'
      },
      level_2_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Level 2 referrer (earns 3%)'
      },
      level_3_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Level 3 referrer (earns 2%)'
      },
      level_4_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Level 4 referrer (earns 1%)'
      },
      chain_depth: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'How many levels in the chain (0-4)'
      },
      
      // Timestamps
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()')
      }
    });

    // Create indexes for fast lookups
    await queryInterface.addIndex('referral_chains', ['user_id'], {
      name: 'idx_chains_user',
      unique: true
    });
    
    await queryInterface.addIndex('referral_chains', ['level_1_user_id'], {
      name: 'idx_chains_l1'
    });
    
    await queryInterface.addIndex('referral_chains', ['level_2_user_id'], {
      name: 'idx_chains_l2'
    });
    
    await queryInterface.addIndex('referral_chains', ['level_3_user_id'], {
      name: 'idx_chains_l3'
    });
    
    await queryInterface.addIndex('referral_chains', ['level_4_user_id'], {
      name: 'idx_chains_l4'
    });

    console.log('✅ Created referral_chains table with indexes');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('referral_chains');
    console.log('✅ Dropped referral_chains table');
  }
};

