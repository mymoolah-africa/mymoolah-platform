'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vas_transactions');

    // Add transactionType column if it doesn't exist
    if (!tableDescription.transactionType) {
      // First create the enum type if it doesn't exist
      await queryInterface.sequelize.query(
        `DO $$ BEGIN
          CREATE TYPE "enum_vas_transactions_transactionType" AS ENUM ('voucher', 'topup', 'direct');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;`,
        { type: Sequelize.QueryTypes.RAW }
      );
      
      await queryInterface.addColumn('vas_transactions', 'transactionType', {
        type: Sequelize.ENUM('voucher', 'topup', 'direct'),
        allowNull: false,
        defaultValue: 'topup',
        comment: 'Type of transaction (voucher, topup, direct)'
      });
      await queryInterface.addIndex('vas_transactions', ['transactionType'], {
        name: 'idx_vas_transactions_transaction_type'
      });
    } else {
      // Column exists, ensure it's NOT NULL
      if (tableDescription.transactionType.allowNull) {
        // Update any NULL values to 'topup' first
        await queryInterface.sequelize.query(
          `UPDATE vas_transactions SET "transactionType" = 'topup' WHERE "transactionType" IS NULL`,
          { type: Sequelize.QueryTypes.UPDATE }
        );
        
        // Now make it NOT NULL
        await queryInterface.changeColumn('vas_transactions', 'transactionType', {
          type: Sequelize.ENUM('voucher', 'topup', 'direct'),
          allowNull: false,
          defaultValue: 'topup',
          comment: 'Type of transaction (voucher, topup, direct)'
        });
      }
      
      // Ensure index exists
      const indexes = await queryInterface.showIndex('vas_transactions');
      const hasIndex = indexes.some(idx => 
        idx.fields.some(field => field.attribute === 'transactionType')
      );
      
      if (!hasIndex) {
        await queryInterface.addIndex('vas_transactions', ['transactionType'], {
          name: 'idx_vas_transactions_transaction_type'
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    try {
      await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_transaction_type');
    } catch (error) {
      // Index might not exist, ignore
    }
    
    // Remove column
    try {
      await queryInterface.removeColumn('vas_transactions', 'transactionType');
    } catch (error) {
      // Column might not exist, ignore
    }
  }
};

