'use strict';

/**
 * Migration: Add Tier Level to Users Table
 * 
 * Adds tier_level and related fields to users table
 * All existing users default to 'bronze' tier
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding tier fields to users table...');

    // Add tier_level column
    await queryInterface.addColumn('users', 'tier_level', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'bronze',
      comment: 'User tier: bronze, silver, gold, platinum'
    });

    // Add tier_effective_from timestamp
    await queryInterface.addColumn('users', 'tier_effective_from', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: Sequelize.fn('NOW'),
      comment: 'When current tier became effective'
    });

    // Add tier_last_reviewed_at timestamp
    await queryInterface.addColumn('users', 'tier_last_reviewed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Last time tier was reviewed (monthly process)'
    });

    // Create index on tier_level for performance
    await queryInterface.addIndex('users', 
      ['tier_level'], 
      { name: 'idx_users_tier_level' }
    );

    // Add constraint
    await queryInterface.addConstraint('users', {
      fields: ['tier_level'],
      type: 'check',
      name: 'check_users_tier_level',
      where: {
        tier_level: ['bronze', 'silver', 'gold', 'platinum']
      }
    });

    // Set all existing users to bronze tier and log in history
    console.log('Setting all existing users to bronze tier...');
    
    await queryInterface.sequelize.query(`
      UPDATE users 
      SET tier_level = 'bronze', 
          tier_effective_from = NOW(),
          tier_last_reviewed_at = NOW()
      WHERE tier_level IS NULL OR tier_level = ''
    `);

    // Create initial history records for existing users
    await queryInterface.sequelize.query(`
      INSERT INTO user_tier_history (user_id, old_tier, new_tier, change_reason, effective_from, created_at)
      SELECT 
        id,
        NULL,
        'bronze',
        'initial_migration',
        NOW(),
        NOW()
      FROM users
      WHERE NOT EXISTS (
        SELECT 1 FROM user_tier_history WHERE user_tier_history.user_id = users.id
      )
    `);

    console.log('✅ Tier fields added to users table');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('users', 'check_users_tier_level');
    await queryInterface.removeIndex('users', 'idx_users_tier_level');
    await queryInterface.removeColumn('users', 'tier_last_reviewed_at');
    await queryInterface.removeColumn('users', 'tier_effective_from');
    await queryInterface.removeColumn('users', 'tier_level');
  }
};

