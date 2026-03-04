'use strict';

/**
 * Fix eeziAirtime products miscategorised as 'voucher'.
 *
 * Root cause: catalogSynchronizationService.mapFlashCategory() checked for
 * the word 'voucher' before checking for 'eezi', so Flash products in the
 * "Eezi Vouchers" productGroup were stored with type='voucher' instead of
 * type='airtime'.
 *
 * This migration corrects existing rows in the products table.
 * Rollback restores them to 'voucher' (the incorrect previous state).
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Update products whose name contains 'eezi' (case-insensitive) that are
    // currently typed as 'voucher' — they should be 'airtime'.
    const [updated] = await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'airtime',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%eezi%'
          AND type = 'voucher'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log(`✅ Fixed ${updated ?? 'unknown'} eezi product(s): voucher → airtime`);

    // Also fix any product_variants whose vasType is 'voucher' for eezi products
    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'airtime',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%eezi%'
          AND pv."vasType" = 'voucher'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('✅ Fixed eezi product_variants: vasType voucher → airtime');
  },

  async down(queryInterface, Sequelize) {
    // Rollback: restore eezi products back to 'voucher' (previous incorrect state)
    await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'voucher',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%eezi%'
          AND type = 'airtime'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );

    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'voucher',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%eezi%'
          AND pv."vasType" = 'airtime'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('↩️  Rolled back eezi products: airtime → voucher');
  }
};
