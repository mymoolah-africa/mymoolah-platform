'use strict';

/**
 * Migration: Add referral_code column to users table
 * 
 * Each user gets a stable, unique referral code (REF-XXXXXX).
 * Generated once on first access, persisted forever.
 * Replaces the ephemeral code generation that changed on every page load.
 * 
 * @date 2026-04-03
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'referral_code', {
      type: Sequelize.STRING(20),
      allowNull: true,
      unique: true,
      comment: 'Stable referral code for this user (REF-XXXXXX)'
    });

    await queryInterface.addIndex('users', ['referral_code'], {
      name: 'idx_users_referral_code',
      unique: true,
      where: { referral_code: { [Sequelize.Op.ne]: null } }
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_referral_code');
    await queryInterface.removeColumn('users', 'referral_code');
  }
};
