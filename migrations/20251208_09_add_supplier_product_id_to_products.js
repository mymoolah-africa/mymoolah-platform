'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('products', 'supplierProductId', {
      type: Sequelize.STRING(255),
      allowNull: true,
      comment: 'Product ID from supplier system'
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('products', 'supplierProductId');
  }
};
