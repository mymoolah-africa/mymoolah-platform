'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get current table structure
    const tableDescription = await queryInterface.describeTable('vas_transactions');
    
    // Add supplierProductId if missing
    if (!tableDescription.supplierProductId) {
      await queryInterface.addColumn('vas_transactions', 'supplierProductId', {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
        comment: 'Product ID from supplier'
      });
    }
    
    // Add any other missing columns that the model expects
    // Note: We already added beneficiaryId in the previous migration
    
    // Add index for supplierProductId if column was added
    if (!tableDescription.supplierProductId) {
      await queryInterface.addIndex('vas_transactions', ['supplierProductId'], {
        name: 'idx_vas_transactions_supplier_product'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    try {
      await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_supplier_product');
    } catch (e) {
      // Index might not exist
    }
    
    // Remove column
    try {
      await queryInterface.removeColumn('vas_transactions', 'supplierProductId');
    } catch (e) {
      // Column might not exist
    }
  }
};

