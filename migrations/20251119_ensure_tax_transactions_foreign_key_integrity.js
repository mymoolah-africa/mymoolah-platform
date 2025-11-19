'use strict';

/**
 * Migration: Ensure tax_transactions foreign key integrity
 * 
 * Banking-Grade Referential Integrity Enforcement
 * 
 * This migration ensures:
 * 1. Unique constraint exists on transactions.transactionId
 * 2. Foreign key constraint exists on tax_transactions.originalTransactionId
 * 
 * This is CRITICAL for banking-grade data integrity.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      console.log('🔧 Ensuring banking-grade referential integrity for tax_transactions...');
      
      // Step 1: Verify transactions table exists
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'transactions'
          AND table_schema = 'public'
      `, { transaction });

      if (tables.length === 0) {
        throw new Error('CRITICAL: transactions table not found. Cannot ensure referential integrity.');
      }

      // Step 2: Check for NULL transactionIds (data integrity issue)
      const [nullCheck] = await queryInterface.sequelize.query(`
        SELECT COUNT(*) as null_count
        FROM transactions
        WHERE "transactionId" IS NULL
      `, { transaction });
      
      if (nullCheck[0] && parseInt(nullCheck[0].null_count) > 0) {
        throw new Error(`CRITICAL: Found ${nullCheck[0].null_count} transactions with NULL transactionId. All transactions must have a transactionId for banking-grade integrity.`);
      }

      // Step 3: Check for duplicate transactionIds (data integrity issue)
      const [duplicates] = await queryInterface.sequelize.query(`
        SELECT "transactionId", COUNT(*) as count
        FROM transactions
        WHERE "transactionId" IS NOT NULL
        GROUP BY "transactionId"
        HAVING COUNT(*) > 1
        LIMIT 10
      `, { transaction });
      
      if (duplicates.length > 0) {
        const duplicateList = duplicates.map(d => `${d.transactionId} (${d.count}x)`).join(', ');
        throw new Error(`CRITICAL: Found duplicate transactionIds: ${duplicateList}. This violates banking-grade data integrity.`);
      }

      // Step 4: Check if unique constraint/index exists
      const [uniqueConstraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'transactions'
          AND constraint_type = 'UNIQUE'
          AND constraint_name IN (
            SELECT constraint_name
            FROM information_schema.key_column_usage
            WHERE table_name = 'transactions'
              AND column_name = 'transactionId'
          )
      `, { transaction });

      const [uniqueIndexes] = await queryInterface.sequelize.query(`
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'transactions'
          AND schemaname = 'public'
          AND (
            indexname LIKE '%transaction_id%' OR 
            indexdef LIKE '%transactionId%'
          )
      `, { transaction });

      const hasUniqueIndex = uniqueIndexes.some(idx => 
        idx.indexdef && (
          idx.indexdef.includes('UNIQUE') || 
          idx.indexname === 'idx_transactions_transaction_id' ||
          idx.indexname === 'idx_transactions_transaction_id_unique'
        )
      );

      const hasUniqueConstraint = uniqueConstraints.length > 0 || hasUniqueIndex;

      // Step 5: Create unique index if it doesn't exist
      if (!hasUniqueConstraint) {
        console.log('🔧 Creating unique index on transactions.transactionId...');
        
        // Try with WHERE clause first (allows NULLs, but we've already checked for NULLs)
        try {
          await queryInterface.sequelize.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
            ON transactions("transactionId")
            WHERE "transactionId" IS NOT NULL
          `, { transaction });
          console.log('✅ Created unique index on transactions.transactionId');
        } catch (indexError) {
          if (indexError.message.includes('already exists')) {
            console.log('✅ Unique index already exists');
          } else {
            // Try without WHERE clause
            try {
              await queryInterface.sequelize.query(`
                CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
                ON transactions("transactionId")
              `, { transaction });
              console.log('✅ Created unique index on transactions.transactionId (without WHERE clause)');
            } catch (indexError2) {
              if (indexError2.message.includes('already exists')) {
                console.log('✅ Unique index already exists');
              } else {
                throw new Error(`CRITICAL: Failed to create unique index: ${indexError2.message}. This is required for banking-grade referential integrity.`);
              }
            }
          }
        }
      } else {
        console.log('✅ Unique constraint/index already exists on transactions.transactionId');
      }

      // Step 6: Check if foreign key constraint exists
      const [existingFk] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'tax_transactions'
          AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
          AND constraint_type = 'FOREIGN KEY'
      `, { transaction });

      // Step 7: Create foreign key constraint if it doesn't exist
      if (existingFk.length === 0) {
        console.log('🔧 Creating foreign key constraint for banking-grade referential integrity...');
        
        try {
          await queryInterface.addConstraint('tax_transactions', {
            fields: ['originalTransactionId'],
            type: 'foreign key',
            name: 'tax_transactions_originalTransactionId_fkey',
            references: {
              table: 'transactions',
              field: 'transactionId'
            },
            onDelete: 'CASCADE',
            onUpdate: 'CASCADE',
            transaction
          });
          console.log('✅ Created foreign key constraint on tax_transactions.originalTransactionId');
        } catch (fkError) {
          throw new Error(`CRITICAL: Failed to create foreign key constraint: ${fkError.message}. Referential integrity is required for banking-grade systems.`);
        }
      } else {
        console.log('✅ Foreign key constraint already exists');
      }

      await transaction.commit();
      console.log('✅ Banking-grade referential integrity ensured for tax_transactions');
    } catch (error) {
      await transaction.rollback();
      console.error('❌ CRITICAL ERROR:', error.message);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Remove foreign key constraint
      const [existingFk] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'tax_transactions'
          AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
          AND constraint_type = 'FOREIGN KEY'
      `, { transaction });

      if (existingFk.length > 0) {
        await queryInterface.removeConstraint(
          'tax_transactions',
          'tax_transactions_originalTransactionId_fkey',
          { transaction }
        );
        console.log('✅ Removed foreign key constraint');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

