'use strict';

/**
 * Migration: Add priceType to product_variants
 *
 * Adds a priceType column to product_variants to explicitly distinguish:
 *   - 'variable' : user enters any amount between minAmount and maxAmount
 *   - 'fixed'    : product has discrete predefined denominations
 *
 * Also adds minAmount / maxAmount columns for variable products so the API
 * can return them without computing from the denominations array.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Adding priceType to product_variants (minAmount/maxAmount already exist)...');

    // Check which columns already exist so this migration is safe to re-run
    const existingCols = (await queryInterface.sequelize.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'product_variants'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    )).map(r => r.column_name);

    // priceType — only add if missing
    if (!existingCols.includes('priceType')) {
      // Create ENUM type first (ignore if it already exists)
      await queryInterface.sequelize.query(`
        DO $$ BEGIN
          CREATE TYPE "enum_product_variants_priceType" AS ENUM ('variable', 'fixed');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$;
      `);
      await queryInterface.addColumn('product_variants', 'priceType', {
        type: Sequelize.ENUM('variable', 'fixed'),
        allowNull: false,
        defaultValue: 'fixed',
        comment: "variable = user enters amount within min/max range; fixed = discrete denominations only"
      });
      console.log('  ✅ priceType column added');
    } else {
      console.log('  ℹ️  priceType column already exists — skipping');
    }

    // minAmount — only add if missing
    if (!existingCols.includes('minAmount')) {
      await queryInterface.addColumn('product_variants', 'minAmount', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Minimum purchase amount in cents (variable products only)'
      });
      console.log('  ✅ minAmount column added');
    } else {
      console.log('  ℹ️  minAmount column already exists — skipping');
    }

    // maxAmount — only add if missing
    if (!existingCols.includes('maxAmount')) {
      await queryInterface.addColumn('product_variants', 'maxAmount', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Maximum purchase amount in cents (variable products only)'
      });
      console.log('  ✅ maxAmount column added');
    } else {
      console.log('  ℹ️  maxAmount column already exists — skipping');
    }

    // Index — only add if missing
    const existingIndexes = (await queryInterface.sequelize.query(
      `SELECT indexname FROM pg_indexes
       WHERE tablename = 'product_variants' AND indexname = 'idx_product_variants_price_type'`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    ));
    if (existingIndexes.length === 0) {
      await queryInterface.addIndex('product_variants', ['priceType'], {
        name: 'idx_product_variants_price_type'
      });
      console.log('  ✅ idx_product_variants_price_type index added');
    } else {
      console.log('  ℹ️  idx_product_variants_price_type index already exists — skipping');
    }

    console.log('✅ product_variants priceType schema ready');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back priceType from product_variants...');

    // Only remove priceType — minAmount/maxAmount existed before this migration
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS idx_product_variants_price_type;`
    );
    await queryInterface.sequelize.query(
      `ALTER TABLE product_variants DROP COLUMN IF EXISTS "priceType";`
    );
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_product_variants_priceType";`
    );

    console.log('✅ priceType rolled back');
  }
};
