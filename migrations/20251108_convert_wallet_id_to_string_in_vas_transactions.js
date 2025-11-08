'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vas_transactions');
    
    if (!tableDescription.walletId) {
      // Column doesn't exist, add it as STRING
      await queryInterface.addColumn('vas_transactions', 'walletId', {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Wallet ID of the user who made the transaction'
      });
      await queryInterface.addIndex('vas_transactions', ['walletId'], {
        name: 'idx_vas_transactions_wallet_id'
      });
      return;
    }
    
    // Column exists - check if it's INTEGER and needs conversion
    const currentType = tableDescription.walletId.type;
    const isInteger = currentType.includes('INTEGER') || currentType.includes('integer') || currentType === 'INTEGER';
    
    if (isInteger) {
      // First, drop any foreign key constraints on walletId
      const constraints = await queryInterface.sequelize.query(
        `SELECT conname, conrelid::regclass AS table_name
         FROM pg_constraint
         WHERE conrelid = 'vas_transactions'::regclass
         AND contype = 'f'
         AND conkey::text LIKE '%walletId%'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      for (const constraint of constraints) {
        await queryInterface.sequelize.query(
          `ALTER TABLE vas_transactions DROP CONSTRAINT IF EXISTS "${constraint.conname}"`,
          { type: Sequelize.QueryTypes.RAW }
        );
      }
      
      // Convert INTEGER to STRING
      // First, get all records and their corresponding wallet IDs
      const records = await queryInterface.sequelize.query(
        `SELECT vt.id, vt."userId", w."walletId" 
         FROM vas_transactions vt
         LEFT JOIN wallets w ON w."userId" = vt."userId"`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      // Temporarily allow NULL for conversion
      await queryInterface.changeColumn('vas_transactions', 'walletId', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Wallet ID of the user who made the transaction'
      });
      
      // Populate with actual walletId strings
      for (const record of records) {
        if (record.walletId) {
          await queryInterface.sequelize.query(
            `UPDATE vas_transactions SET "walletId" = :walletId WHERE id = :recordId`,
            {
              replacements: { walletId: record.walletId, recordId: record.id },
              type: Sequelize.QueryTypes.UPDATE
            }
          );
        }
      }
      
      // Now make it NOT NULL
      await queryInterface.changeColumn('vas_transactions', 'walletId', {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Wallet ID of the user who made the transaction'
      });
      
      // Ensure index exists
      const indexes = await queryInterface.showIndex('vas_transactions');
      const hasIndex = indexes.some(idx => 
        idx.fields.some(field => field.attribute === 'walletId')
      );
      
      if (!hasIndex) {
        await queryInterface.addIndex('vas_transactions', ['walletId'], {
          name: 'idx_vas_transactions_wallet_id'
        });
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // This migration converts INTEGER to STRING, so rollback would convert back
    // But we can't safely convert STRING back to INTEGER, so we'll leave it as STRING
    // If needed, manually convert back to INTEGER
  }
};

