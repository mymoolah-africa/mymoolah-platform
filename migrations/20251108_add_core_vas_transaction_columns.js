'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get current table structure
    const tableDescription = await queryInterface.describeTable('vas_transactions');
    
    // Add reference if missing (critical for idempotency)
    if (!tableDescription.reference) {
      await queryInterface.addColumn('vas_transactions', 'reference', {
        type: Sequelize.STRING(255),
        allowNull: false,
        defaultValue: '',
        comment: 'Unique transaction reference'
      });
      
      // Add unique index on reference for idempotency
      await queryInterface.addIndex('vas_transactions', ['reference'], {
        name: 'idx_vas_transactions_reference',
        unique: true
      });
    }
    
    // Add vasType if missing (critical column)
    if (!tableDescription.vasType) {
      await queryInterface.addColumn('vas_transactions', 'vasType', {
        type: Sequelize.ENUM('airtime', 'data', 'electricity', 'bill_payment'),
        allowNull: false,
        defaultValue: 'airtime',
        comment: 'Type of VAS transaction'
      });
      
      await queryInterface.addIndex('vas_transactions', ['vasType'], {
        name: 'idx_vas_transactions_vas_type'
      });
    }
    
    // Add supplierId if missing (critical column)
    if (!tableDescription.supplierId) {
      await queryInterface.addColumn('vas_transactions', 'supplierId', {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: '',
        comment: 'Supplier identifier (flash, mobilemart, etc.)'
      });
      
      await queryInterface.addIndex('vas_transactions', ['supplierId'], {
        name: 'idx_vas_transactions_supplier'
      });
    }
    
    // Add status if missing (critical column)
    if (!tableDescription.status) {
      await queryInterface.addColumn('vas_transactions', 'status', {
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'Transaction status'
      });
      
      await queryInterface.addIndex('vas_transactions', ['status'], {
        name: 'idx_vas_transactions_status'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    const indexesToRemove = [
      'idx_vas_transactions_status',
      'idx_vas_transactions_supplier',
      'idx_vas_transactions_vas_type',
      'idx_vas_transactions_reference'
    ];
    
    for (const indexName of indexesToRemove) {
      try {
        await queryInterface.removeIndex('vas_transactions', indexName);
      } catch (e) {
        // Index might not exist, ignore
      }
    }
    
    // Remove columns
    const columnsToRemove = ['status', 'supplierId', 'vasType', 'reference'];
    
    for (const column of columnsToRemove) {
      try {
        await queryInterface.removeColumn('vas_transactions', column);
      } catch (e) {
        // Column might not exist, ignore
      }
    }
  }
};

