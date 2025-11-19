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
    console.log('🔧 Ensuring banking-grade referential integrity for tax_transactions...');
    
    // Step 1: Verify transactions table exists (outside transaction for safety)
    const [tables] = await queryInterface.sequelize.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'transactions'
        AND table_schema = 'public'
    `);

    if (tables.length === 0) {
      throw new Error('CRITICAL: transactions table not found. Cannot ensure referential integrity.');
    }

    // Step 2: Check for NULL transactionIds (data integrity issue) - outside transaction
    const [nullCheck] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as null_count
      FROM transactions
      WHERE "transactionId" IS NULL
    `);
    
    if (nullCheck[0] && parseInt(nullCheck[0].null_count) > 0) {
      throw new Error(`CRITICAL: Found ${nullCheck[0].null_count} transactions with NULL transactionId. All transactions must have a transactionId for banking-grade integrity.`);
    }

    // Step 3: Check for duplicate transactionIds (data integrity issue) - outside transaction
    const [duplicates] = await queryInterface.sequelize.query(`
      SELECT "transactionId", COUNT(*) as count
      FROM transactions
      WHERE "transactionId" IS NOT NULL
      GROUP BY "transactionId"
      HAVING COUNT(*) > 1
      LIMIT 10
    `);
    
    if (duplicates.length > 0) {
      const duplicateList = duplicates.map(d => `${d.transactionId} (${d.count}x)`).join(', ');
      throw new Error(`CRITICAL: Found duplicate transactionIds: ${duplicateList}. This violates banking-grade data integrity.`);
    }

    // Step 4: Check if unique constraint/index exists (outside transaction - just SELECT queries)
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
    `);

    const [uniqueIndexes] = await queryInterface.sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'transactions'
        AND schemaname = 'public'
        AND (
          indexname LIKE '%transaction_id%' OR 
          indexdef LIKE '%transactionId%'
        )
    `);

    const hasUniqueIndex = uniqueIndexes.some(idx => 
      idx.indexdef && (
        idx.indexdef.includes('UNIQUE') || 
        idx.indexname === 'idx_transactions_transaction_id' ||
        idx.indexname === 'idx_transactions_transaction_id_unique'
      )
    );

    const hasUniqueConstraint = uniqueConstraints.length > 0 || hasUniqueIndex;

    // Step 5: Create unique index if it doesn't exist (outside transaction - DDL best practice)
    if (!hasUniqueConstraint) {
      console.log('🔧 Creating unique index on transactions.transactionId...');
      
      // Try with WHERE clause first (allows NULLs, but we've already checked for NULLs)
      try {
        await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
          ON transactions("transactionId")
          WHERE "transactionId" IS NOT NULL
        `);
        console.log('✅ Created unique index on transactions.transactionId');
      } catch (indexError) {
        if (indexError.message.includes('already exists') || indexError.message.includes('duplicate key value')) {
          console.log('✅ Unique index already exists');
        } else if (indexError.message.includes('permission') || indexError.message.includes('owner')) {
          // Permission denied - check if index exists (maybe created by DBA)
          console.warn('⚠️ Permission denied to create index. Checking if index exists...');
          
          const [recheckIndexes] = await queryInterface.sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'transactions'
              AND schemaname = 'public'
              AND (
                indexname LIKE '%transaction_id%' OR 
                indexdef LIKE '%transactionId%'
              )
          `);
          
          const hasUniqueIndexAfterCheck = recheckIndexes.some(idx => 
            idx.indexdef && (
              idx.indexdef.includes('UNIQUE') || 
              idx.indexname === 'idx_transactions_transaction_id' ||
              idx.indexname === 'idx_transactions_transaction_id_unique'
            )
          );
          
          if (hasUniqueIndexAfterCheck) {
            console.log('✅ Unique index exists (created by DBA). Proceeding with foreign key creation.');
          } else {
            // Index doesn't exist and we can't create it - provide instructions
            console.error('\n❌ CRITICAL: Cannot create unique index due to permissions.');
            console.error('📋 A database administrator must create the index manually:');
            console.error('\n   CREATE UNIQUE INDEX idx_transactions_transaction_id_unique');
            console.error('   ON transactions("transactionId")');
            console.error('   WHERE "transactionId" IS NOT NULL;');
            console.error('\n   OR (if NULLs are not allowed):');
            console.error('\n   CREATE UNIQUE INDEX idx_transactions_transaction_id_unique');
            console.error('   ON transactions("transactionId");');
            console.error('\n⚠️  Foreign key constraint cannot be created without this index.');
            throw new Error(`CRITICAL: Unique index required but cannot be created due to permissions. DBA must create index manually. See error output above for SQL.`);
          }
        } else {
          // Try without WHERE clause
          try {
            await queryInterface.sequelize.query(`
              CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
              ON transactions("transactionId")
            `);
            console.log('✅ Created unique index on transactions.transactionId (without WHERE clause)');
          } catch (indexError2) {
            if (indexError2.message.includes('already exists') || indexError2.message.includes('duplicate key value')) {
              console.log('✅ Unique index already exists');
            } else if (indexError2.message.includes('permission') || indexError2.message.includes('owner')) {
              // Same permission check as above
              console.warn('⚠️ Permission denied to create index. Checking if index exists...');
              
              const [recheckIndexes2] = await queryInterface.sequelize.query(`
                SELECT indexname, indexdef
                FROM pg_indexes
                WHERE tablename = 'transactions'
                  AND schemaname = 'public'
                  AND (
                    indexname LIKE '%transaction_id%' OR 
                    indexdef LIKE '%transactionId%'
                  )
              `);
              
              const hasUniqueIndexAfterCheck2 = recheckIndexes2.some(idx => 
                idx.indexdef && (
                  idx.indexdef.includes('UNIQUE') || 
                  idx.indexname === 'idx_transactions_transaction_id' ||
                  idx.indexname === 'idx_transactions_transaction_id_unique'
                )
              );
              
              if (hasUniqueIndexAfterCheck2) {
                console.log('✅ Unique index exists (created by DBA). Proceeding with foreign key creation.');
              } else {
                console.error('\n❌ CRITICAL: Cannot create unique index due to permissions.');
                console.error('📋 A database administrator must create the index manually:');
                console.error('\n   CREATE UNIQUE INDEX idx_transactions_transaction_id_unique');
                console.error('   ON transactions("transactionId");');
                console.error('\n⚠️  Foreign key constraint cannot be created without this index.');
                throw new Error(`CRITICAL: Unique index required but cannot be created due to permissions. DBA must create index manually. See error output above for SQL.`);
              }
            } else {
              throw new Error(`CRITICAL: Failed to create unique index: ${indexError2.message}. This is required for banking-grade referential integrity.`);
            }
          }
        }
      }
    } else {
      console.log('✅ Unique constraint/index already exists on transactions.transactionId');
    }

    // Step 6: Final verification - ensure unique constraint/index exists before creating foreign key
    const [finalCheckConstraints] = await queryInterface.sequelize.query(`
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
    `);

    const [finalCheckIndexes] = await queryInterface.sequelize.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'transactions'
        AND schemaname = 'public'
        AND (
          indexname LIKE '%transaction_id%' OR 
          indexdef LIKE '%transactionId%'
        )
    `);

    const finalHasUniqueIndex = finalCheckIndexes.some(idx => 
      idx.indexdef && (
        idx.indexdef.includes('UNIQUE') || 
        idx.indexname === 'idx_transactions_transaction_id' ||
        idx.indexname === 'idx_transactions_transaction_id_unique'
      )
    );

    const finalHasUniqueConstraint = finalCheckConstraints.length > 0 || finalHasUniqueIndex;

    if (!finalHasUniqueConstraint) {
      throw new Error('CRITICAL: Unique constraint/index on transactions.transactionId does not exist and could not be created. Foreign key constraint cannot be created without this. Please ensure the unique index exists before running this migration.');
    }

    // Step 7: Check if foreign key constraint exists (outside transaction)
    const [existingFk] = await queryInterface.sequelize.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = 'tax_transactions'
        AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
        AND constraint_type = 'FOREIGN KEY'
    `);

    // Step 8: Create foreign key constraint if it doesn't exist (in transaction for atomicity)
    if (existingFk.length === 0) {
      console.log('🔧 Creating foreign key constraint for banking-grade referential integrity...');
      
      const transaction = await queryInterface.sequelize.transaction();
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
        
        await transaction.commit();
        console.log('✅ Banking-grade referential integrity ensured for tax_transactions');
      } catch (fkError) {
        await transaction.rollback();
        
        if (fkError.message.includes('already exists') || fkError.message.includes('duplicate')) {
          console.log('✅ Foreign key constraint already exists');
        } else {
          console.error('❌ CRITICAL ERROR:', fkError.message);
          throw new Error(`CRITICAL: Failed to create foreign key constraint: ${fkError.message}. Referential integrity is required for banking-grade systems.`);
        }
      }
    } else {
      console.log('✅ Foreign key constraint already exists');
      console.log('✅ Banking-grade referential integrity ensured for tax_transactions');
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

