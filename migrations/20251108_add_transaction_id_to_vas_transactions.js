'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vas_transactions');

    // Add transactionId column if it doesn't exist
    if (!tableDescription.transactionId) {
      await queryInterface.addColumn('vas_transactions', 'transactionId', {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
        comment: 'Unique transaction identifier'
      });
      await queryInterface.addIndex('vas_transactions', ['transactionId'], {
        name: 'idx_vas_transactions_transaction_id',
        unique: true
      });
    } else {
      // Column exists, ensure it's NOT NULL and has unique constraint
      if (tableDescription.transactionId.allowNull) {
        // First, populate any NULL values with generated IDs
        const nullRecords = await queryInterface.sequelize.query(
          `SELECT id FROM vas_transactions WHERE "transactionId" IS NULL`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        for (const record of nullRecords) {
          const generatedId = `VAS-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
          await queryInterface.sequelize.query(
            `UPDATE vas_transactions SET "transactionId" = :id WHERE id = :recordId`,
            {
              replacements: { id: generatedId, recordId: record.id },
              type: Sequelize.QueryTypes.UPDATE
            }
          );
        }
        
        // Now make it NOT NULL
        await queryInterface.changeColumn('vas_transactions', 'transactionId', {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          comment: 'Unique transaction identifier'
        });
      }
      
      // Ensure unique index exists
      const indexes = await queryInterface.showIndex('vas_transactions');
      const hasUniqueIndex = indexes.some(idx => 
        idx.fields.some(field => field.attribute === 'transactionId') && idx.unique
      );
      
      if (!hasUniqueIndex) {
        await queryInterface.addIndex('vas_transactions', ['transactionId'], {
          name: 'idx_vas_transactions_transaction_id',
          unique: true
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove unique index first
    try {
      await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_transaction_id');
    } catch (error) {
      // Index might not exist, ignore
    }
    
    // Remove column
    try {
      await queryInterface.removeColumn('vas_transactions', 'transactionId');
    } catch (error) {
      // Column might not exist, ignore
    }
  }
};

