'use strict';

/**
 * Migration: Add commissionType to product_variants and supplier_commission_tiers
 *
 * Distinguishes percentage-based vs fixed-amount commissions:
 *   - product_variants.commissionType  — informational, used by catalog sync
 *   - supplier_commission_tiers.commissionType + fixedAmountCents — used at purchase time
 *
 * Existing data defaults to 'percentage' (backward compatible).
 *
 * @date 2026-03-31
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_commission_type') THEN
          CREATE TYPE "enum_commission_type" AS ENUM ('percentage', 'fixed_amount');
        END IF;
      END $$;
    `);

    const [pvCols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'product_variants' AND column_name = 'commissionType'
    `);
    if (pvCols.length === 0) {
      await queryInterface.addColumn('product_variants', 'commissionType', {
        type: Sequelize.ENUM('percentage', 'fixed_amount'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Commission type: percentage (use commission column) or fixed_amount (use fixedFee column)',
      });
      console.log('  Added commissionType to product_variants');
    } else {
      console.log('  commissionType already exists on product_variants — skipping');
    }

    const [sctTypeCols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'supplier_commission_tiers' AND column_name = 'commissionType'
    `);
    if (sctTypeCols.length === 0) {
      await queryInterface.addColumn('supplier_commission_tiers', 'commissionType', {
        type: Sequelize.ENUM('percentage', 'fixed_amount'),
        allowNull: false,
        defaultValue: 'percentage',
        comment: 'Commission type: percentage (use ratePct) or fixed_amount (use fixedAmountCents)',
      });
      console.log('  Added commissionType to supplier_commission_tiers');
    } else {
      console.log('  commissionType already exists on supplier_commission_tiers — skipping');
    }

    const [sctFixedCols] = await queryInterface.sequelize.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'supplier_commission_tiers' AND column_name = 'fixedAmountCents'
    `);
    if (sctFixedCols.length === 0) {
      await queryInterface.addColumn('supplier_commission_tiers', 'fixedAmountCents', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Fixed commission amount in cents (used when commissionType = fixed_amount)',
      });
      console.log('  Added fixedAmountCents to supplier_commission_tiers');
    } else {
      console.log('  fixedAmountCents already exists on supplier_commission_tiers — skipping');
    }

    console.log('Migration complete: commission type columns added');
  },

  async down(queryInterface) {
    const safeRemove = async (table, col) => {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = '${table}' AND column_name = '${col}'
      `);
      if (rows.length > 0) {
        await queryInterface.removeColumn(table, col);
        console.log(`  Removed ${col} from ${table}`);
      }
    };

    await safeRemove('supplier_commission_tiers', 'fixedAmountCents');
    await safeRemove('supplier_commission_tiers', 'commissionType');
    await safeRemove('product_variants', 'commissionType');

    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_commission_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_product_variants_commissionType";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_supplier_commission_tiers_commissionType";');

    console.log('Rollback complete: commission type columns removed');
  },
};
