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
      // Try multiple approaches to find and drop the constraint
      try {
        // Method 1: Drop by known constraint name
        await queryInterface.sequelize.query(
          `ALTER TABLE vas_transactions DROP CONSTRAINT IF EXISTS fk_vas_transactions_wallet CASCADE`,
          { type: Sequelize.QueryTypes.RAW }
        );
      } catch (e) {
        // Constraint might not exist or have different name
      }
      
      try {
        // Method 2: Find and drop all foreign keys on walletId column
        const constraints = await queryInterface.sequelize.query(
          `SELECT 
            tc.constraint_name, 
            tc.table_name, 
            kcu.column_name,
            ccu.table_name AS foreign_table_name,
            ccu.column_name AS foreign_column_name
          FROM information_schema.table_constraints AS tc 
          JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY' 
            AND tc.table_name = 'vas_transactions'
            AND kcu.column_name = 'walletId'`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        for (const constraint of constraints) {
          await queryInterface.sequelize.query(
            `ALTER TABLE vas_transactions DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}" CASCADE`,
            { type: Sequelize.QueryTypes.RAW }
          );
        }
      } catch (e) {
        // If query fails, try direct drop
        console.warn('Could not query constraints, trying direct drop');
      }
      
      // Method 3: Try dropping by checking pg_constraint directly
      try {
        const pgConstraints = await queryInterface.sequelize.query(
          `SELECT conname 
           FROM pg_constraint 
           WHERE conrelid = 'vas_transactions'::regclass 
           AND contype = 'f'
           AND (conkey::text LIKE '%walletId%' OR conname LIKE '%wallet%')`,
          { type: Sequelize.QueryTypes.SELECT }
        );
        
        for (const constraint of pgConstraints) {
          await queryInterface.sequelize.query(
            `ALTER TABLE vas_transactions DROP CONSTRAINT IF EXISTS "${constraint.conname}" CASCADE`,
            { type: Sequelize.QueryTypes.RAW }
          );
        }
      } catch (e) {
        console.warn('Could not query pg_constraint');
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

