'use strict';

/**
 * Migration: Create Tier Criteria Configuration
 * 
 * Defines the thresholds for automatic tier promotion/demotion
 * Reviewed monthly on 1st of each month
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Create tier_criteria table
    await queryInterface.createTable('tier_criteria', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      
      // Tier identification
      tier_level: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: 'User tier: bronze, silver, gold, platinum'
      },
      
      // Eligibility criteria (both conditions must be met with AND logic)
      min_monthly_transactions: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Minimum number of transactions in a calendar month'
      },
      min_monthly_value_cents: {
        type: Sequelize.BIGINT,
        allowNull: false,
        comment: 'Minimum total transaction value in cents in a calendar month'
      },
      
      // Configuration
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this tier criteria is active'
      },
      
      // Audit
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW')
      }
    });

    // Create index
    await queryInterface.addIndex('tier_criteria', 
      ['tier_level', 'is_active'], 
      { name: 'idx_tier_criteria_lookup' }
    );

    // Add constraint
    await queryInterface.addConstraint('tier_criteria', {
      fields: ['tier_level'],
      type: 'check',
      name: 'check_tier_criteria_level',
      where: {
        tier_level: ['bronze', 'silver', 'gold', 'platinum']
      }
    });

    // Seed tier criteria
    console.log('Seeding tier criteria...');

    await queryInterface.bulkInsert('tier_criteria', [
      {
        tier_level: 'bronze',
        min_monthly_transactions: 0,
        min_monthly_value_cents: 0,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        tier_level: 'silver',
        min_monthly_transactions: 10,
        min_monthly_value_cents: 500000, // R5,000
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        tier_level: 'gold',
        min_monthly_transactions: 25,
        min_monthly_value_cents: 1500000, // R15,000
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        tier_level: 'platinum',
        min_monthly_transactions: 50,
        min_monthly_value_cents: 3000000, // R30,000
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);

    console.log('✅ Tier criteria table created and seeded');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('tier_criteria');
  }
};

