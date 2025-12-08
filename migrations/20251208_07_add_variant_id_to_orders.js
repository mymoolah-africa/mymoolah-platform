'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('orders', 'variantId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'product_variants',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional product variant reference'
    });

    await queryInterface.addIndex('orders', ['variantId'], {
      name: 'idx_orders_variant'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('orders', 'idx_orders_variant');
    await queryInterface.removeColumn('orders', 'variantId');
  }
};

