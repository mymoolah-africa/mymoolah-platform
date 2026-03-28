'use strict';

/**
 * Migration: Add kyc_tier column to users table
 *
 * Tracks the KYC verification level for each user:
 *   0 = USSD basic (ID/passport format-validated via USSD)
 *   1 = Web ID verified (ID document uploaded and OCR-validated)
 *   2 = Web fully verified (ID document + proof of address, both OCR-validated)
 *
 * Separate from kycStatus (workflow state) to avoid enum proliferation
 * and enable simple numeric comparisons (WHERE kyc_tier >= 1).
 *
 * @date 2026-03-28
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'kyc_tier', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
      comment: 'KYC verification tier: 0=USSD basic, 1=web ID verified, 2=web ID+POA verified',
    });

    // Backfill existing users based on current kycStatus
    // USSD users (ussd_basic) → tier 0
    await queryInterface.sequelize.query(
      `UPDATE users SET kyc_tier = 0 WHERE "kycStatus" = 'ussd_basic' AND kyc_tier IS NULL`
    );

    // Web users already verified (with kycStatus='verified') → tier 1
    // (They only had ID validated; POA was never enabled)
    await queryInterface.sequelize.query(
      `UPDATE users SET kyc_tier = 1 WHERE "kycStatus" = 'verified' AND kyc_tier IS NULL AND registration_channel = 'app'`
    );

    await queryInterface.addIndex('users', ['kyc_tier'], {
      name: 'idx_users_kyc_tier',
    });

    console.log('✅ Migration: kyc_tier column added to users table');
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('users', 'idx_users_kyc_tier');
    await queryInterface.removeColumn('users', 'kyc_tier');
    console.log('✅ Rollback: kyc_tier column removed from users table');
  },
};
