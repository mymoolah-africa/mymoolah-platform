'use strict';

/**
 * Fix Global PIN products miscategorised as 'voucher'.
 *
 * Root cause: mapFlashCategory() did not check product name, so Flash
 * "Global PIN" products (international airtime top-up PINs) were stored
 * with type='voucher' instead of type='airtime'.
 *
 * Run via: ./scripts/run-migrations-master.sh uat
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const [prodCount] = await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'airtime',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%global pin%'
          AND type = 'voucher'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log(`✅ Fixed ${prodCount ?? 0} Global PIN product(s): voucher → airtime`);

    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'airtime',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%global pin%'
          AND pv."vasType" = 'voucher'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('✅ Fixed Global PIN product_variants: vasType voucher → airtime');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `UPDATE products
          SET type = 'voucher',
              "updatedAt" = NOW()
        WHERE LOWER(name) LIKE '%global pin%'
          AND type = 'airtime'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    await queryInterface.sequelize.query(
      `UPDATE product_variants pv
          SET "vasType" = 'voucher',
              "updatedAt" = NOW()
         FROM products p
        WHERE pv."productId" = p.id
          AND LOWER(p.name) LIKE '%global pin%'
          AND pv."vasType" = 'airtime'`,
      { type: Sequelize.QueryTypes.UPDATE }
    );
    console.log('↩️  Rolled back Global PIN: airtime → voucher');
  }
};
