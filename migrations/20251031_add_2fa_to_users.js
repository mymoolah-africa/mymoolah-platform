'use strict';

/**
 * Migration: Add 2FA (Two-Factor Authentication) fields to users table
 * Banking-Grade: TOTP-based 2FA implementation
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('users', 'twoFactorEnabled', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether 2FA is enabled for this user'
    });

    await queryInterface.addColumn('users', 'twoFactorSecret', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: '2FA secret key (base32 encoded, encrypted in production)'
    });

    await queryInterface.addColumn('users', 'twoFactorBackupCodes', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Backup codes for 2FA recovery (encrypted in production)'
    });

    await queryInterface.addColumn('users', 'twoFactorEnabledAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when 2FA was enabled'
    });

    await queryInterface.addColumn('users', 'lastLoginIP', {
      type: Sequelize.STRING(45),
      allowNull: true,
      comment: 'Last successful login IP address'
    });

    await queryInterface.addColumn('users', 'lastLoginUserAgent', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Last successful login user agent'
    });

    await queryInterface.addColumn('users', 'knownDevices', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: [],
      comment: 'List of known/trusted devices for this user'
    });

    // Add index for faster lookups
    await queryInterface.addIndex('users', ['twoFactorEnabled'], {
      name: 'idx_users_two_factor_enabled'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('users', 'idx_users_two_factor_enabled');
    await queryInterface.removeColumn('users', 'knownDevices');
    await queryInterface.removeColumn('users', 'lastLoginUserAgent');
    await queryInterface.removeColumn('users', 'lastLoginIP');
    await queryInterface.removeColumn('users', 'twoFactorEnabledAt');
    await queryInterface.removeColumn('users', 'twoFactorBackupCodes');
    await queryInterface.removeColumn('users', 'twoFactorSecret');
    await queryInterface.removeColumn('users', 'twoFactorEnabled');
  }
};

