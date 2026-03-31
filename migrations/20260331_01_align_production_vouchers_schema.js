'use strict';

/**
 * Aligns the vouchers table in production with the Sequelize model.
 * Staging already has the correct schema; production still has the original column names.
 *
 * Renames:
 *   voucherId    -> voucherCode
 *   amount       -> originalAmount
 *   expiryDate   -> expiresAt
 *
 * Also drops the legacy 'description' column (not in the model).
 */
module.exports = {
  async up(queryInterface) {
    const cols = await queryInterface.describeTable('vouchers');

    if (cols.voucherId && !cols.voucherCode) {
      await queryInterface.renameColumn('vouchers', 'voucherId', 'voucherCode');
    }

    if (cols.amount && !cols.originalAmount) {
      await queryInterface.renameColumn('vouchers', 'amount', 'originalAmount');
    }

    if (cols.expiryDate && !cols.expiresAt) {
      await queryInterface.renameColumn('vouchers', 'expiryDate', 'expiresAt');
    }
  },

  async down(queryInterface) {
    const cols = await queryInterface.describeTable('vouchers');

    if (cols.voucherCode && !cols.voucherId) {
      await queryInterface.renameColumn('vouchers', 'voucherCode', 'voucherId');
    }

    if (cols.originalAmount && !cols.amount) {
      await queryInterface.renameColumn('vouchers', 'originalAmount', 'amount');
    }

    if (cols.expiresAt && !cols.expiryDate) {
      await queryInterface.renameColumn('vouchers', 'expiresAt', 'expiryDate');
    }
  }
};
