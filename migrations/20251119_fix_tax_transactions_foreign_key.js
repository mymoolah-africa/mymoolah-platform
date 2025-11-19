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

        const hasUniqueConstraint = uniqueConstraints.length > 0 || uniqueIndexes.length > 0;

        if (!hasUniqueConstraint) {
          // Try to create unique index, but handle permission errors gracefully
          try {
            await queryInterface.sequelize.query(`
              CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_transaction_id_unique
              ON transactions("transactionId")
              WHERE "transactionId" IS NOT NULL
            `, { transaction });
            console.log('✅ Created unique index on transactions.transactionId');
          } catch (indexError) {
            if (indexError.message.includes('permission') || indexError.message.includes('owner')) {
              console.warn('⚠️ Cannot create unique index (permission denied). Checking if unique constraint exists via model...');
              // Check if Sequelize model has created it (might exist but not visible in pg_indexes)
              const [modelIndexes] = await queryInterface.sequelize.query(`
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'transactions'
                  AND schemaname = 'public'
              `, { transaction });
              
              // If no indexes at all, we can't create the foreign key
              if (modelIndexes.length === 0) {
                console.warn('⚠️ No unique constraint/index found on transactions.transactionId. Foreign key cannot be created.');
                console.warn('⚠️ VAT transactions will still work, but without foreign key constraint.');
                await transaction.commit();
                return; // Exit early - can't create foreign key without unique constraint
              }
            } else {
              throw indexError; // Re-throw if it's a different error
            }
          }
        } else {
          console.log('✅ Unique constraint/index already exists on transactions.transactionId');
        }

        // Add the correct foreign key constraint
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
          if (fkError.message.includes('unique constraint')) {
            console.warn('⚠️ Foreign key creation failed: unique constraint required. VAT transactions will work without foreign key.');
          } else {
            throw fkError; // Re-throw if it's a different error
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

