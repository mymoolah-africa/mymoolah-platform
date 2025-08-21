'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Index for active vouchers query
      await queryInterface.addIndex('vouchers', ['userId', 'status'], {
        name: 'idx_vouchers_user_status',
        order: [['userId', 'ASC'], ['status', 'ASC']]
      });
      console.log('✅ Added index: idx_vouchers_user_status');
    } catch (error) {
      console.log('Index idx_vouchers_user_status might already exist:', error.message);
    }

    try {
      // Index for pending EasyPay vouchers query
      await queryInterface.addIndex('vouchers', ['userId', 'status', 'voucherType'], {
        name: 'idx_vouchers_user_status_type',
        order: [['userId', 'ASC'], ['status', 'ASC'], ['voucherType', 'ASC']]
      });
      console.log('✅ Added index: idx_vouchers_user_status_type');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_type might already exist:', error.message);
    }

    try {
      // Index for total vouchers query (excluding cancelled/expired)
      await queryInterface.addIndex('vouchers', ['userId', 'status'], {
        name: 'idx_vouchers_user_status_exclude',
        order: [['userId', 'ASC'], ['status', 'ASC']]
      });
      console.log('✅ Added index: idx_vouchers_user_status_exclude');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_exclude might already exist:', error.message);
    }

    try {
      // Composite index for balance calculations
      await queryInterface.addIndex('vouchers', ['userId', 'status', 'balance'], {
        name: 'idx_vouchers_user_status_balance',
        order: [['userId', 'ASC'], ['status', 'ASC'], ['balance', 'ASC']]
      });
      console.log('✅ Added index: idx_vouchers_user_status_balance');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_balance might already exist:', error.message);
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      await queryInterface.removeIndex('vouchers', 'idx_vouchers_user_status');
    } catch (error) {
      console.log('Index idx_vouchers_user_status might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('vouchers', 'idx_vouchers_user_status_type');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_type might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('vouchers', 'idx_vouchers_user_status_exclude');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_exclude might not exist:', error.message);
    }

    try {
      await queryInterface.removeIndex('vouchers', 'idx_vouchers_user_status_balance');
    } catch (error) {
      console.log('Index idx_vouchers_user_status_balance might not exist:', error.message);
    }
  }
};
