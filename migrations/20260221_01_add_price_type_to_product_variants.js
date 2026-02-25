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
    console.log('🔄 Adding priceType, minAmount, maxAmount to product_variants...');

    // priceType column
    await queryInterface.addColumn('product_variants', 'priceType', {
      type: Sequelize.ENUM('variable', 'fixed'),
      allowNull: false,
      defaultValue: 'fixed',
      comment: "variable = user enters amount within min/max range; fixed = discrete denominations only"
    });

    // minAmount in cents (for variable products)
    await queryInterface.addColumn('product_variants', 'minAmount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Minimum purchase amount in cents (variable products only)'
    });

    // maxAmount in cents (for variable products)
    await queryInterface.addColumn('product_variants', 'maxAmount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Maximum purchase amount in cents (variable products only)'
    });

    // Index to speed up variable-first ordering
    await queryInterface.addIndex('product_variants', ['priceType'], {
      name: 'idx_product_variants_price_type'
    });

    console.log('✅ priceType, minAmount, maxAmount added to product_variants');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Rolling back priceType, minAmount, maxAmount from product_variants...');

    await queryInterface.removeIndex('product_variants', 'idx_product_variants_price_type');
    await queryInterface.removeColumn('product_variants', 'maxAmount');
    await queryInterface.removeColumn('product_variants', 'minAmount');
    await queryInterface.removeColumn('product_variants', 'priceType');

    // Drop the ENUM type created by Sequelize
    await queryInterface.sequelize.query(
      `DROP TYPE IF EXISTS "enum_product_variants_priceType";`
    );

    console.log('✅ priceType, minAmount, maxAmount rolled back');
  }
};
