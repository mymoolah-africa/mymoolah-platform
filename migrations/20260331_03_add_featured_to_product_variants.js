'use strict';

/**
 * Migration: Add featured column to product_variants
 *
 * Used to curate which data products are displayed to end users.
 * Airtime (variable) products are always shown; only data bundles
 * need curation since there are 340+ pinless data products across networks.
 *
 * @date 2026-03-31
 */

module.exports = {
  async up(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    const [cols] = await q(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'featured'"
    );
    if (cols.length === 0) {
      await q(
        'ALTER TABLE product_variants ADD COLUMN featured BOOLEAN NOT NULL DEFAULT false'
      );
      console.log('  Added featured column to product_variants');

      // All airtime products should be featured by default (one variable card per network)
      await q(
        `UPDATE product_variants SET featured = true WHERE "vasType" = 'airtime' AND status = 'active'`
      );
      console.log('  Set featured=true for all active airtime products');
    } else {
      console.log('  featured column already exists on product_variants');
    }

    // Index for fast catalog queries
    const [idx] = await q(
      "SELECT 1 FROM pg_indexes WHERE tablename = 'product_variants' AND indexname = 'idx_product_variants_featured'"
    );
    if (idx.length === 0) {
      await q(
        'CREATE INDEX idx_product_variants_featured ON product_variants (featured) WHERE featured = true'
      );
      console.log('  Created partial index idx_product_variants_featured');
    }

    console.log('Migration complete: featured column added');
  },

  async down(queryInterface) {
    const q = (sql) => queryInterface.sequelize.query(sql);

    await q('DROP INDEX IF EXISTS idx_product_variants_featured');

    const [cols] = await q(
      "SELECT 1 FROM information_schema.columns WHERE table_name = 'product_variants' AND column_name = 'featured'"
    );
    if (cols.length > 0) {
      await q('ALTER TABLE product_variants DROP COLUMN featured');
      console.log('  Removed featured column from product_variants');
    }

    console.log('Rollback complete: featured column removed');
  },
};
