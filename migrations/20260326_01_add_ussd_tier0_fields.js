'use strict';

/**
 * Migration: Add USSD Tier 0 fields to users table
 *
 * Supports USSD channel registration with lightweight KYC:
 * - ussd_pin: bcrypt-hashed 5-digit PIN for USSD authentication
 * - ussd_pin_attempts / ussd_locked_until: progressive lockout
 * - registration_channel: tracks how the user registered (app, ussd, agent)
 * - preferred_language: for multi-language USSD menus (Phase 2)
 * - kycStatus enum extended with 'ussd_basic' for Tier 0 wallets
 *
 * @date 2026-03-26
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'ussd_pin', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Bcrypt-hashed 5-digit USSD PIN',
    });

    await queryInterface.addColumn('users', 'ussd_pin_attempts', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Failed USSD PIN attempts — progressive lockout at 3',
    });

    await queryInterface.addColumn('users', 'ussd_locked_until', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'USSD PIN lockout expiry — progressive: 30min, 2hr, 24hr',
    });

    await queryInterface.addColumn('users', 'registration_channel', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'app',
      comment: 'How the user registered: app, ussd, or agent',
    });

    await queryInterface.addColumn('users', 'preferred_language', {
      type: Sequelize.STRING(5),
      allowNull: false,
      defaultValue: 'en',
      comment: 'Preferred language code for USSD menus (en, zu, af, st, etc.)',
    });

    // Extend kycStatus enum to include ussd_basic
    // PostgreSQL requires ALTER TYPE to add a new value to an existing enum
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_users_kycStatus" ADD VALUE IF NOT EXISTS 'ussd_basic';`
    );

    await queryInterface.addIndex('users', ['registration_channel'], {
      name: 'idx_users_registration_channel',
    });

    console.log('✅ Migration: USSD Tier 0 fields added to users table');
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_registration_channel');
    await queryInterface.removeColumn('users', 'preferred_language');
    await queryInterface.removeColumn('users', 'registration_channel');
    await queryInterface.removeColumn('users', 'ussd_locked_until');
    await queryInterface.removeColumn('users', 'ussd_pin_attempts');
    await queryInterface.removeColumn('users', 'ussd_pin');
    // Note: PostgreSQL does not support removing enum values.
    // 'ussd_basic' will remain in the enum but is harmless if unused.
    console.log('✅ Rollback: USSD Tier 0 fields removed from users table');
  },
};
