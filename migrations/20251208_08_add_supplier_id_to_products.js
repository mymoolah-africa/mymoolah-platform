'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'supplierId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'suppliers', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Owning supplier for product'
    });

    await queryInterface.addIndex('products', ['supplierId', 'type'], {
      name: 'idx_products_supplier_type'
    });

    // Fallback: set supplier to FLASH where missing (adjust if needed)
    await queryInterface.sequelize.query(`UPDATE products SET "supplierId" = (SELECT id FROM suppliers WHERE code = 'FLASH' LIMIT 1) WHERE "supplierId" IS NULL;`);
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex('products', 'idx_products_supplier_type');
    await queryInterface.removeColumn('products', 'supplierId');
  }
};
