/**
 * Performance optimizations: critical indexes to support scale
 * - transactions: composite indexes for userId/walletId + createdAt desc
 * - vouchers: composite index for (userId, status, createdAt), and (status, expiresAt)
 *
 * Note: Partitioning strategy to be added in a separate migration after evaluation of
 * data volume and retention policies. This migration is safe to run repeatedly.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Transactions indexes
      await queryInterface.addIndex('transactions', ['userId', 'createdAt', 'id'], {
        name: 'idx_tx_user_createdat',
        order: [['userId', 'ASC'], ['createdAt', 'DESC'], ['id', 'DESC']]
      });
    } catch (error) {
      console.log('Index idx_tx_user_createdat might already exist:', error.message);
    }

    try {
      await queryInterface.addIndex('transactions', ['walletId', 'createdAt', 'id'], {
        name: 'idx_tx_wallet_createdat',
        order: [['walletId', 'ASC'], ['createdAt', 'DESC'], ['id', 'DESC']]
      });
    } catch (error) {
      console.log('Index idx_tx_wallet_createdat might already exist:', error.message);
    }

    // Vouchers indexes
    try {
      await queryInterface.addIndex('vouchers', ['userId', 'status', 'createdAt'], {
        name: 'idx_vch_user_status_createdat',
        order: [['userId', 'ASC'], ['status', 'ASC'], ['createdAt', 'DESC']]
      });
    } catch (error) {
      console.log('Index idx_vch_user_status_createdat might already exist:', error.message);
    }

    try {
      await queryInterface.addIndex('vouchers', ['status', 'expiresAt'], {
        name: 'idx_vch_status_expiresat',
        order: [['status', 'ASC'], ['expiresAt', 'ASC']]
      });
    } catch (error) {
      console.log('Index idx_vch_status_expiresat might already exist:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('transactions', 'idx_tx_user_createdat');
    } catch (error) {
      console.log('Index idx_tx_user_createdat might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('transactions', 'idx_tx_wallet_createdat');
    } catch (error) {
      console.log('Index idx_tx_wallet_createdat might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('vouchers', 'idx_vch_user_status_createdat');
    } catch (error) {
      console.log('Index idx_vch_user_status_createdat might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('vouchers', 'idx_vch_status_expiresat');
    } catch (error) {
      console.log('Index idx_vch_status_expiresat might not exist:', error.message);
    }
  }
};


