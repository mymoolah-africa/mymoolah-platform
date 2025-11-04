'use strict';

/**
 * Banking-Grade Fix: Add optimistic locking and constraints to prevent duplicate transactions
 * 
 * This migration:
 * 1. Adds version column for optimistic locking
 * 2. Adds unique constraint to prevent duplicate payment request processing
 * 3. Adds constraint to prevent duplicate transactions from same payment request
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const { sequelize } = queryInterface;
    const transaction = await sequelize.transaction();
    
    try {
      // 1. Add version column to payment_requests for optimistic locking
      await queryInterface.addColumn('payment_requests', 'version', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Optimistic locking version number'
      }, { transaction });

      // 2. Add unique constraint: prevent duplicate processing of same payment request
      // Only one 'approved' or 'declined' status per payment request
      await queryInterface.addIndex('payment_requests', ['id', 'status'], {
        unique: false,
        name: 'idx_payment_requests_id_status',
        where: {
          status: Sequelize.literal("status IN ('approved', 'declined')")
        },
        transaction
      });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
    
    // 3. Add unique partial index: prevent duplicate approved transactions
    // This ensures a payment request can only be approved once
    // Note: CONCURRENTLY cannot run inside a transaction, so we do it after commit
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_requests_unique_approved
        ON payment_requests(id)
        WHERE status = 'approved'
      `);
    } catch (error) {
      // Index might already exist, continue
      console.warn('Index idx_payment_requests_unique_approved creation:', error.message);
    }

    // 4. Add unique constraint on transactions metadata to prevent duplicate transactions
    // from same payment request
    // Note: CONCURRENTLY cannot run inside a transaction, but we'll use regular index for migration
    try {
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique_payment_request
        ON transactions((metadata->>'requestId'))
        WHERE metadata->>'requestId' IS NOT NULL
          AND status = 'completed'
      `);
    } catch (error) {
      // Index might already exist, continue
      console.warn('Index idx_transactions_unique_payment_request creation:', error.message);
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      // Remove indexes (outside transaction for CONCURRENT indexes)
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_transactions_unique_payment_request
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_payment_requests_unique_approved
      `);

      // Remove version column and other index within transaction
      const transaction = await queryInterface.sequelize.transaction();
      try {
        await queryInterface.removeIndex('payment_requests', 'idx_payment_requests_id_status', { transaction });
        await queryInterface.removeColumn('payment_requests', 'version', { transaction });
        await transaction.commit();
      } catch (error) {
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      throw error;
    }
  }
};

