'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('supplier_commission_tiers', 'productId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'products',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Optional product-level commission override'
    });

    await queryInterface.addIndex('supplier_commission_tiers', ['supplierId', 'productId', 'serviceType'], {
      name: 'idx_supplier_commission_tiers_product',
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('supplier_commission_tiers', 'idx_supplier_commission_tiers_product');
    await queryInterface.removeColumn('supplier_commission_tiers', 'productId');
  }
};

