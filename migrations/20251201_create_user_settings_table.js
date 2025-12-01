'use strict';

/**
 * Migration: Create UserSettings Table
 * 
 * This migration creates the UserSettings table to store user preferences
 * including quick access services, display settings, security settings, etc.
 * 
 * @date 2025-12-01
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table already exists
    const tableExists = await queryInterface.sequelize.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'UserSettings'
      );`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (tableExists[0].exists) {
      console.log('ℹ️  UserSettings table already exists, skipping creation');
      return;
    }

    console.log('🔄 Creating UserSettings table...');

    await queryInterface.createTable('UserSettings', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      // Quick Access Services (JSON array of service IDs)
      quickAccessServices: {
        type: Sequelize.JSON,
        allowNull: false,
        defaultValue: ['send_money', 'vouchers']
      },
      // Wallet Display Settings
      showBalance: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Security Settings
      biometricEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Notification Settings
      notificationsEnabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Transaction Limits
      dailyTransactionLimit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 5000.00
      },
      monthlyTransactionLimit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 25000.00
      },
      // Privacy Settings
      shareAnalytics: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      // Theme/Display Settings
      darkMode: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      // Language Settings
      language: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'en'
      },
      // Currency Display
      displayCurrency: {
        type: Sequelize.STRING(3),
        allowNull: false,
        defaultValue: 'ZAR'
      },
      // Timestamps
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create index on userId for fast lookups
    await queryInterface.addIndex('UserSettings', ['userId'], {
      unique: true,
      name: 'idx_user_settings_user_id'
    });

    console.log('✅ UserSettings table created successfully');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Dropping UserSettings table...');
    await queryInterface.dropTable('UserSettings');
    console.log('✅ UserSettings table dropped');
  }
};
