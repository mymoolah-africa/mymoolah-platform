'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get current table structure
    const tableDescription = await queryInterface.describeTable('vas_transactions');
    
    // Add mobileNumber if missing
    if (!tableDescription.mobileNumber) {
      await queryInterface.addColumn('vas_transactions', 'mobileNumber', {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Mobile number or account identifier'
      });
    }
    
    // Add supplierReference if missing
    if (!tableDescription.supplierReference) {
      await queryInterface.addColumn('vas_transactions', 'supplierReference', {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Reference from supplier'
      });
    }
    
    // Add errorMessage if missing
    if (!tableDescription.errorMessage) {
      await queryInterface.addColumn('vas_transactions', 'errorMessage', {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Error message if transaction failed'
      });
    }
    
    // Add processedAt if missing
    if (!tableDescription.processedAt) {
      await queryInterface.addColumn('vas_transactions', 'processedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When transaction was processed'
      });
    }
    
    // Add metadata if missing (JSONB)
    if (!tableDescription.metadata) {
      await queryInterface.addColumn('vas_transactions', 'metadata', {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Additional transaction metadata'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove columns in reverse order
    const columnsToRemove = ['processedAt', 'errorMessage', 'supplierReference', 'mobileNumber', 'metadata'];
    
    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('vas_transactions', column);
      } catch (e) {
        // Column might not exist, ignore
      }
    }
  }
};

