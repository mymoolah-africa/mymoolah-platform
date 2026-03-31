'use strict';

/**
 * Migration: Add commissionType to product_variants and supplier_commission_tiers
 *
 * Uses raw SQL to avoid Sequelize ENUM handling bugs in PostgreSQL.
 *
 * @date 2026-03-31
 */

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    // Create shared ENUM type (idempotent)
    const [existingTypes] = await q(
      "SELECT 1 FROM pg_type WHERE typname = 'enum_commission_type'"
    );
    if (existingTypes.length === 0) {
      await q("CREATE TYPE enum_commission_type AS ENUM ('percentage', 'fixed_amount')");
      console.log('  Created enum_commission_type');
    }

    // product_variants.commissionType
    const [pvCols] = await q(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'commissionType'"
    );
    if (pvCols.length === 0) {
      await q(
        "ALTER TABLE product_variants ADD COLUMN \"commissionType\" enum_commission_type NOT NULL DEFAULT 'percentage'"
      );
      console.log('  Added commissionType to product_variants');
    } else {
      console.log('  commissionType already exists on product_variants');
    }

    // supplier_commission_tiers.commissionType
    const [sctCols] = await q(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_commission_tiers' AND column_name = 'commissionType'"
    );
    if (sctCols.length === 0) {
      await q(
        "ALTER TABLE supplier_commission_tiers ADD COLUMN \"commissionType\" enum_commission_type NOT NULL DEFAULT 'percentage'"
      );
      console.log('  Added commissionType to supplier_commission_tiers');
    } else {
      console.log('  commissionType already exists on supplier_commission_tiers');
    }

    // supplier_commission_tiers.fixedAmountCents
    const [fixedCols] = await q(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_commission_tiers' AND column_name = 'fixedAmountCents'"
    );
    if (fixedCols.length === 0) {
      await q(
        'ALTER TABLE supplier_commission_tiers ADD COLUMN "fixedAmountCents" INTEGER NOT NULL DEFAULT 0'
      );
      console.log('  Added fixedAmountCents to supplier_commission_tiers');
    } else {
      console.log('  fixedAmountCents already exists on supplier_commission_tiers');
    }

    console.log('Migration complete: commission type columns added');
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    const safeDrop = async (table, col) => {
      const [rows] = await q(
        "SELECT 1 FROM information_schema.columns WHERE table_name = '" + table + "' AND column_name = '" + col + "'"
      );
      if (rows.length > 0) {
        await q('ALTER TABLE ' + table + ' DROP COLUMN "' + col + '"');
        console.log('  Removed ' + col + ' from ' + table);
      }
    };

    await safeDrop('supplier_commission_tiers', 'fixedAmountCents');
    await safeDrop('supplier_commission_tiers', 'commissionType');
    await safeDrop('product_variants', 'commissionType');
    await q('DROP TYPE IF EXISTS enum_commission_type');

    console.log('Rollback complete: commission type columns removed');
  },
};
