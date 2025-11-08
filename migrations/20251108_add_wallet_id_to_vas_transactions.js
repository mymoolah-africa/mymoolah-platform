'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('vas_transactions');

    // Add walletId column if it doesn't exist
    if (!tableDescription.walletId) {
      await queryInterface.addColumn('vas_transactions', 'walletId', {
        type: Sequelize.STRING,
        allowNull: false,
        comment: 'Wallet ID of the user who made the transaction'
      });
      await queryInterface.addIndex('vas_transactions', ['walletId'], {
        name: 'idx_vas_transactions_wallet_id'
      });
    } else {
      // Column exists - check if it needs type conversion from INTEGER to STRING
      const currentType = tableDescription.walletId.type;
      const isInteger = currentType.includes('INTEGER') || currentType.includes('integer');
      
      if (isInteger) {
        // Need to convert INTEGER to STRING
        // First, populate any NULL or integer values with wallet IDs from users
        const records = await queryInterface.sequelize.query(
          `SELECT vt.id, vt."userId", w."walletId" 
           FROM vas_transactions vt
           LEFT JOIN wallets w ON w."userId" = vt."userId"`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        // Change column type to STRING first (PostgreSQL will convert)
        await queryInterface.changeColumn('vas_transactions', 'walletId', {
          type: Sequelize.STRING,
          allowNull: true, // Temporarily allow NULL for conversion
          comment: 'Wallet ID of the user who made the transaction'
        });
        
        // Now populate with actual walletId strings
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
      } else if (tableDescription.walletId.allowNull) {
        // Column is STRING but allows NULL - populate and make NOT NULL
        const nullRecords = await queryInterface.sequelize.query(
          `SELECT vt.id, vt."userId", w."walletId" 
           FROM vas_transactions vt
           LEFT JOIN wallets w ON w."userId" = vt."userId"
           WHERE vt."walletId" IS NULL`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        for (const record of nullRecords) {
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
      }
      
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
    // Remove index first
    try {
      await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_wallet_id');
    } catch (error) {
      // Index might not exist, ignore
    }
    
    // Remove column
    try {
      await queryInterface.removeColumn('vas_transactions', 'walletId');
    } catch (error) {
      // Column might not exist, ignore
    }
  }
};

