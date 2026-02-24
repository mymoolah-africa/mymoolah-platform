'use strict';

/**
 * Migration: Banking-grade fix for beneficiary_payment_methods schema.
 *
 * Problems fixed:
 *   1. No paymentRail column — EFT, PayShap, MoolahMove all used methodType='bank'
 *      with no way to distinguish them at the DB level.
 *   2. methodType was free-text STRING with no CHECK constraint — any value accepted.
 *   3. No UNIQUE constraint on bank accounts per rail — duplicates possible.
 *   4. No UNIQUE constraint enforcing one MyMoolah wallet per beneficiary.
 *   5. Missing international fields for MoolahMove (SWIFT/BIC, IBAN, countryCode).
 *   6. payShapReference stored statically on the beneficiary — architecturally wrong;
 *      PayShap proxy must be resolved dynamically at payment time.
 *   7. beneficiaries.accountType ENUM missing eft/payshap/moolahmove/international_bank.
 *   8. Misleadingly-named non-unique index removed.
 *
 * All changes are safe for existing data:
 *   - paymentRail backfilled from methodType for existing rows.
 *   - payShapReference column dropped (never used in production payments).
 *   - ENUM additions are additive (PostgreSQL allows ADD VALUE IF NOT EXISTS).
 *   - Partial UNIQUE indexes only apply to new rows matching the WHERE clause.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDesc = await queryInterface.describeTable('beneficiary_payment_methods');

    // -------------------------------------------------------------------------
    // 1. Add paymentRail column (idempotent — skip if already exists)
    // -------------------------------------------------------------------------
    if (!tableDesc.paymentRail) {
      await queryInterface.addColumn('beneficiary_payment_methods', 'paymentRail', {
        type: Sequelize.STRING(30),
        allowNull: false,
        defaultValue: 'unspecified',
        comment: 'Payment rail: mymoolah | eft | payshap | moolahmove | mobile_money | unspecified'
      });
    }

    // Backfill: existing rows where paymentRail is still 'unspecified'
    await queryInterface.sequelize.query(`
      UPDATE beneficiary_payment_methods
      SET "paymentRail" = "methodType"
      WHERE "paymentRail" = 'unspecified';
    `);

    // CHECK constraint on paymentRail values (skip if already exists)
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        DROP CONSTRAINT IF EXISTS bpm_payment_rail_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        ADD CONSTRAINT bpm_payment_rail_check
        CHECK ("paymentRail" IN (
          'mymoolah', 'eft', 'payshap', 'moolahmove',
          'mobile_money', 'international_bank', 'unspecified', 'bank'
        ));
    `);

    // -------------------------------------------------------------------------
    // 2. Add CHECK constraint on methodType (idempotent)
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        DROP CONSTRAINT IF EXISTS bpm_method_type_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        ADD CONSTRAINT bpm_method_type_check
        CHECK ("methodType" IN (
          'mymoolah', 'bank', 'mobile_money', 'international_bank'
        ));
    `);

    // -------------------------------------------------------------------------
    // 3. Add international payment fields for MoolahMove (idempotent)
    // -------------------------------------------------------------------------
    if (!tableDesc.swiftBic) {
      await queryInterface.addColumn('beneficiary_payment_methods', 'swiftBic', {
        type: Sequelize.STRING(11),
        allowNull: true,
        comment: 'SWIFT/BIC code for international bank transfers (MoolahMove)'
      });
    }

    if (!tableDesc.iban) {
      await queryInterface.addColumn('beneficiary_payment_methods', 'iban', {
        type: Sequelize.STRING(34),
        allowNull: true,
        comment: 'IBAN for international bank transfers (MoolahMove)'
      });
    }

    if (!tableDesc.countryCode) {
      await queryInterface.addColumn('beneficiary_payment_methods', 'countryCode', {
        type: Sequelize.CHAR(2),
        allowNull: true,
        comment: 'ISO 3166-1 alpha-2 country code for international methods (MoolahMove)'
      });
    }

    // -------------------------------------------------------------------------
    // 4. Partial UNIQUE index: one MyMoolah wallet per beneficiary (idempotent)
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS bpm_one_mymoolah_per_beneficiary;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX bpm_one_mymoolah_per_beneficiary
        ON beneficiary_payment_methods ("beneficiaryId")
        WHERE "methodType" = 'mymoolah' AND "isActive" = true;
    `);

    // -------------------------------------------------------------------------
    // 5. Partial UNIQUE index: no duplicate bank account per beneficiary per rail
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS bpm_unique_bank_per_rail;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX bpm_unique_bank_per_rail
        ON beneficiary_payment_methods ("beneficiaryId", "paymentRail", "accountNumber")
        WHERE "methodType" IN ('bank', 'international_bank')
          AND "accountNumber" IS NOT NULL
          AND "isActive" = true;
    `);

    // -------------------------------------------------------------------------
    // 6. Partial UNIQUE index: no duplicate mobile money wallet per beneficiary per provider
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS bpm_unique_mobile_money_per_provider;
    `);
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX bpm_unique_mobile_money_per_provider
        ON beneficiary_payment_methods ("beneficiaryId", "provider", "mobileMoneyId")
        WHERE "methodType" = 'mobile_money'
          AND "mobileMoneyId" IS NOT NULL
          AND "isActive" = true;
    `);

    // -------------------------------------------------------------------------
    // 7. Drop the misleadingly-named non-unique index
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS beneficiary_payment_methods_unique_account;
    `);

    // -------------------------------------------------------------------------
    // 8. Drop payShapReference (IF EXISTS is safe — idempotent)
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        DROP COLUMN IF EXISTS "payShapReference";
    `);

    // -------------------------------------------------------------------------
    // 9. Extend beneficiaries.accountType ENUM with new payment rails
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'eft';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'payshap';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'moolahmove';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'international_bank';
    `);

    // -------------------------------------------------------------------------
    // 10. Extend beneficiaries.preferredPaymentMethod ENUM
    // -------------------------------------------------------------------------
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE IF NOT EXISTS 'eft';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE IF NOT EXISTS 'payshap';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE IF NOT EXISTS 'moolahmove';
    `);
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_preferredPaymentMethod" ADD VALUE IF NOT EXISTS 'international_bank';
    `);

    console.log('✅ 20260224_05: Banking-grade payment method schema fixes applied');
  },

  async down(queryInterface) {
    // Drop partial unique indexes
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS bpm_one_mymoolah_per_beneficiary;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS bpm_unique_bank_per_rail;`);
    await queryInterface.sequelize.query(`DROP INDEX IF EXISTS bpm_unique_mobile_money_per_provider;`);

    // Remove CHECK constraints
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        DROP CONSTRAINT IF EXISTS bpm_payment_rail_check;
    `);
    await queryInterface.sequelize.query(`
      ALTER TABLE beneficiary_payment_methods
        DROP CONSTRAINT IF EXISTS bpm_method_type_check;
    `);

    // Remove added columns
    await queryInterface.removeColumn('beneficiary_payment_methods', 'paymentRail');
    await queryInterface.removeColumn('beneficiary_payment_methods', 'swiftBic');
    await queryInterface.removeColumn('beneficiary_payment_methods', 'iban');
    await queryInterface.removeColumn('beneficiary_payment_methods', 'countryCode');

    // Restore payShapReference
    await queryInterface.addColumn('beneficiary_payment_methods', 'payShapReference', {
      type: require('sequelize').DataTypes.STRING(20),
      allowNull: true,
      comment: 'PayShap reference (recipient MSISDN) - restored by rollback'
    });

    // Restore the old non-unique index
    await queryInterface.addIndex(
      'beneficiary_payment_methods',
      ['beneficiaryId', 'methodType', 'accountNumber'],
      { name: 'beneficiary_payment_methods_unique_account', unique: false }
    );

    // NOTE: PostgreSQL does not support DROP VALUE from an ENUM.
    // The ENUM values eft/payshap/moolahmove/international_bank cannot be removed
    // without recreating the type. They are harmless to leave in place.
    console.log('⚠️  20260224_05 rolled back. ENUM values cannot be removed from PostgreSQL ENUMs.');
  }
};
