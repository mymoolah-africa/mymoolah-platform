'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vas_transactions');

    // Add vasProductId column if it doesn't exist
    if (!tableDescription.vasProductId) {
      await queryInterface.addColumn('vas_transactions', 'vasProductId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'VAS Product ID from vas_products table'
      });
      await queryInterface.addIndex('vas_transactions', ['vasProductId'], {
        name: 'idx_vas_transactions_vas_product_id'
      });
    } else {
      // Column exists, ensure it's NOT NULL
      if (tableDescription.vasProductId.allowNull) {
        // Make it NOT NULL
        await queryInterface.changeColumn('vas_transactions', 'vasProductId', {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'VAS Product ID from vas_products table'
        });
      }
      
      // Ensure index exists
      const indexes = await queryInterface.showIndex('vas_transactions');
      const hasIndex = indexes.some(idx => 
        idx.fields.some(field => field.attribute === 'vasProductId')
      );
      
      if (!hasIndex) {
        await queryInterface.addIndex('vas_transactions', ['vasProductId'], {
          name: 'idx_vas_transactions_vas_product_id'
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    try {
      await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_vas_product_id');
    } catch (error) {
      // Index might not exist, ignore
    }
    
    // Remove column
    try {
      await queryInterface.removeColumn('vas_transactions', 'vasProductId');
    } catch (error) {
      // Column might not exist, ignore
    }
  }
};

