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
        // Add the correct foreign key constraint
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

