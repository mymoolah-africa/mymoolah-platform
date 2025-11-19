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
        // Check if transactionId has a unique constraint/index (required for foreign key)
        // Use a savepoint to handle errors without aborting the transaction
        await queryInterface.sequelize.query('SAVEPOINT check_unique_constraint', { transaction });
        
        let hasUniqueConstraint = false;
        try {
          // Check for unique constraints
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

          // Check for unique indexes
          const [uniqueIndexes] = await queryInterface.sequelize.query(`
            SELECT indexname, indexdef
            FROM pg_indexes
            WHERE tablename = 'transactions'
              AND schemaname = 'public'
              AND indexdef LIKE '%transactionId%'
              AND (indexdef LIKE '%UNIQUE%' OR indexdef LIKE 'CREATE UNIQUE%')
          `, { transaction });

          hasUniqueConstraint = uniqueConstraints.length > 0 || uniqueIndexes.length > 0;

          if (!hasUniqueConstraint) {
            // Try to create unique index, but handle permission errors gracefully
            await queryInterface.sequelize.query(`
              CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
              ON transactions("transactionId")
              WHERE "transactionId" IS NOT NULL
            `, { transaction });
            console.log('✅ Created unique index on transactions.transactionId');
            hasUniqueConstraint = true;
          } else {
            console.log('✅ Unique constraint/index already exists on transactions.transactionId');
          }
          
          await queryInterface.sequelize.query('RELEASE SAVEPOINT check_unique_constraint', { transaction });
        } catch (indexError) {
          // Rollback to savepoint to continue transaction
          await queryInterface.sequelize.query('ROLLBACK TO SAVEPOINT check_unique_constraint', { transaction });
          
          if (indexError.message.includes('permission') || indexError.message.includes('owner')) {
            console.warn('⚠️ Cannot create unique index (permission denied). Checking if unique constraint exists...');
            // Check if unique constraint exists via a different method
            const [allIndexes] = await queryInterface.sequelize.query(`
              SELECT indexname, indexdef
              FROM pg_indexes
              WHERE tablename = 'transactions'
                AND schemaname = 'public'
            `, { transaction });
            
            // Check if any index on transactionId exists (might be unique but not showing in our query)
            const hasTransactionIdIndex = allIndexes.some(idx => 
              idx.indexdef && idx.indexdef.includes('transactionId')
            );
            
            if (hasTransactionIdIndex) {
              console.log('✅ Found existing index on transactionId, assuming it includes unique constraint');
              hasUniqueConstraint = true;
            } else {
              console.warn('⚠️ No unique constraint/index found on transactions.transactionId.');
              console.warn('⚠️ Foreign key cannot be created without unique constraint.');
              console.warn('⚠️ VAT transactions will still work, but without foreign key constraint.');
              hasUniqueConstraint = false;
            }
          } else {
            throw indexError; // Re-throw if it's a different error
          }
        }

        // Add the correct foreign key constraint only if unique constraint exists
        if (hasUniqueConstraint) {
          await queryInterface.sequelize.query('SAVEPOINT create_foreign_key', { transaction });
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
            await queryInterface.sequelize.query('RELEASE SAVEPOINT create_foreign_key', { transaction });
          } catch (fkError) {
            // Rollback to savepoint
            await queryInterface.sequelize.query('ROLLBACK TO SAVEPOINT create_foreign_key', { transaction });
            
            if (fkError.message.includes('unique constraint') || fkError.message.includes('does not exist')) {
              console.warn('⚠️ Foreign key creation failed: unique constraint required. VAT transactions will work without foreign key.');
            } else {
              console.warn(`⚠️ Foreign key creation failed: ${fkError.message}. VAT transactions will work without foreign key.`);
            }
          }
        }
      } else {
        console.warn('⚠️ transactions table not found, skipping foreign key constraint creation');
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

