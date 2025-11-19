'use strict';

/**
 * Migration: Fix tax_transactions foreign key constraint
 * 
 * The foreign key was incorrectly referencing 'mymoolah_transactions' table,
 * but the actual table name is 'transactions'. This migration fixes the constraint
 * to reference the correct table.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if the constraint exists
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'tax_transactions'
          AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
          AND constraint_type = 'FOREIGN KEY'
      `, { transaction });

      // Drop the existing constraint if it exists
      if (constraints.length > 0) {
        await queryInterface.removeConstraint(
          'tax_transactions',
          'tax_transactions_originalTransactionId_fkey',
          { transaction }
        );
      }

      // Check if transactions table exists
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'transactions'
          AND table_schema = 'public'
      `, { transaction });

      if (tables.length > 0) {
        // CRITICAL: Ensure unique constraint exists on transactionId for referential integrity
        // This is required for banking-grade data integrity
        
        let hasUniqueConstraint = false;
        
        // Step 1: Check for existing unique constraint/index
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

        // Check if any of the indexes are unique
        const hasUniqueIndex = uniqueIndexes.some(idx => 
          idx.indexdef && (
            idx.indexdef.includes('UNIQUE') || 
            idx.indexname === 'idx_transactions_transaction_id' ||
            idx.indexname === 'idx_transactions_transaction_id_unique'
          )
        );

        hasUniqueConstraint = uniqueConstraints.length > 0 || hasUniqueIndex;

        // Step 2: Create unique index if it doesn't exist
        if (!hasUniqueConstraint) {
          console.log('🔧 Creating unique index on transactions.transactionId for referential integrity...');
          
          // First, check if there are any NULL values (which would prevent unique index)
          const [nullCheck] = await queryInterface.sequelize.query(`
            SELECT COUNT(*) as null_count
            FROM transactions
            WHERE "transactionId" IS NULL
          `, { transaction });
          
          if (nullCheck[0] && parseInt(nullCheck[0].null_count) > 0) {
            console.warn(`⚠️ Found ${nullCheck[0].null_count} transactions with NULL transactionId. These must be fixed before creating unique constraint.`);
            throw new Error(`Cannot create unique constraint: ${nullCheck[0].null_count} transactions have NULL transactionId. All transactions must have a transactionId for banking-grade integrity.`);
          }
          
          // Try multiple index creation strategies
          let indexCreated = false;
          
          // Strategy 1: Try with WHERE clause (allows NULLs in unique index)
          try {
            await queryInterface.sequelize.query(`
              CREATE UNIQUE INDEX idx_transactions_transaction_id_unique
              ON transactions("transactionId")
              WHERE "transactionId" IS NOT NULL
            `, { transaction });
            console.log('✅ Created unique index with WHERE clause');
            indexCreated = true;
            hasUniqueConstraint = true;
          } catch (strategy1Error) {
            if (strategy1Error.message.includes('already exists')) {
              console.log('✅ Unique index already exists');
              indexCreated = true;
              hasUniqueConstraint = true;
            } else if (strategy1Error.message.includes('duplicate key') || strategy1Error.message.includes('unique constraint')) {
              // There are duplicate transactionIds - this is a data integrity issue
              const [duplicates] = await queryInterface.sequelize.query(`
                SELECT "transactionId", COUNT(*) as count
                FROM transactions
                WHERE "transactionId" IS NOT NULL
                GROUP BY "transactionId"
                HAVING COUNT(*) > 1
                LIMIT 10
              `, { transaction });
              
              if (duplicates.length > 0) {
                throw new Error(`Cannot create unique constraint: Found duplicate transactionIds. This violates banking-grade data integrity. First duplicate: ${duplicates[0].transactionId} (appears ${duplicates[0].count} times).`);
              }
              throw strategy1Error;
            } else {
              // Strategy 2: Try without WHERE clause (standard unique index)
              try {
                await queryInterface.sequelize.query(`
                  CREATE UNIQUE INDEX idx_transactions_transaction_id_unique
                  ON transactions("transactionId")
                `, { transaction });
                console.log('✅ Created unique index without WHERE clause');
                indexCreated = true;
                hasUniqueConstraint = true;
              } catch (strategy2Error) {
                if (strategy2Error.message.includes('already exists')) {
                  console.log('✅ Unique index already exists');
                  indexCreated = true;
                  hasUniqueConstraint = true;
                } else {
                  throw new Error(`Failed to create unique index: ${strategy2Error.message}. This is required for banking-grade referential integrity.`);
                }
              }
            }
          }
        } else {
          console.log('✅ Unique constraint/index already exists on transactions.transactionId');
        }

        // Step 3: Create foreign key constraint (CRITICAL for referential integrity)
        if (hasUniqueConstraint) {
          console.log('🔧 Creating foreign key constraint for banking-grade referential integrity...');
          
          // Check if constraint already exists
          const [existingFk] = await queryInterface.sequelize.query(`
            SELECT constraint_name
            FROM information_schema.table_constraints
            WHERE table_name = 'tax_transactions'
              AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
              AND constraint_type = 'FOREIGN KEY'
          `, { transaction });
          
          if (existingFk.length === 0) {
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
              // This is a critical error - we cannot proceed without referential integrity
              throw new Error(`CRITICAL: Failed to create foreign key constraint: ${fkError.message}. Referential integrity is required for banking-grade systems.`);
            }
          } else {
            console.log('✅ Foreign key constraint already exists');
          }
        } else {
          throw new Error('CRITICAL: Cannot create foreign key constraint without unique constraint on transactions.transactionId. This is required for banking-grade referential integrity.');
        }
      } else {
        throw new Error('CRITICAL: transactions table not found. Cannot create foreign key constraint.');
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Check if the constraint exists
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = 'tax_transactions'
          AND constraint_name = 'tax_transactions_originalTransactionId_fkey'
          AND constraint_type = 'FOREIGN KEY'
      `, { transaction });

      // Drop the constraint if it exists
      if (constraints.length > 0) {
        await queryInterface.removeConstraint(
          'tax_transactions',
          'tax_transactions_originalTransactionId_fkey',
          { transaction }
        );
      }

      // Restore the old (incorrect) constraint for rollback
      const [tables] = await queryInterface.sequelize.query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_name = 'mymoolah_transactions'
          AND table_schema = 'public'
      `, { transaction });

      if (tables.length > 0) {
        await queryInterface.addConstraint('tax_transactions', {
          fields: ['originalTransactionId'],
          type: 'foreign key',
          name: 'tax_transactions_originalTransactionId_fkey',
          references: {
            table: 'mymoolah_transactions',
            field: 'transactionId'
          },
          onDelete: 'CASCADE',
          onUpdate: 'CASCADE',
          transaction
        });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};

