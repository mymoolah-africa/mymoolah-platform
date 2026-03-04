'use strict';

/**
 * Fix Global PIN products — set type to 'international_pin'.
 *
 * Previous migration set them to 'airtime' but Global PIN products are
 * PIN-based (not pinless), so they must not appear in the airtime overlay.
 * Using a dedicated 'international_pin' type excludes them from both
 * the airtime overlay and the voucher overlay until a dedicated overlay
 * is built for them.
 *
 * Run via: ./scripts/run-migrations-master.sh uat
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'international_pin',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%global pin%'
          AND type IN ('voucher', 'airtime')`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('✅ Global PIN products → international_pin');

    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'international_pin',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%global pin%'
          AND pv."vasType" IN ('voucher', 'airtime')`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('✅ Global PIN product_variants → international_pin');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'voucher',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%global pin%'
          AND type = 'international_pin'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'voucher',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%global pin%'
          AND pv."vasType" = 'international_pin'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('↩️  Rolled back Global PIN: international_pin → voucher');
  }
};
