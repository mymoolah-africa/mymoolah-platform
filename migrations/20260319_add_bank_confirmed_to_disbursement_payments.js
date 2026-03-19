'use strict';

/**
 * Migration: Add bank_confirmed fields to disbursement_payments
 *
 * When an MT940 statement debit is matched to a disbursement payment,
 * we record the bank confirmation date and amount for full reconciliation.
 *
 * @date 2026-03-19
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('disbursement_payments', 'bank_confirmed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date SBSA MT940 statement confirmed funds left the account',
    });

    await queryInterface.addColumn('disbursement_payments', 'bank_confirmed_amount_cents', {
      type: Sequelize.INTEGER,
      allowNull: true,
      comment: 'Amount confirmed by MT940 statement (in cents) — should match amount * 100',
    });

    await queryInterface.addIndex('disbursement_payments', ['bank_confirmed_at'], {
      name: 'idx_disbursement_payments_bank_confirmed_at',
      where: { bank_confirmed_at: { [Sequelize.Op.ne]: null } },
    });

    console.log('✅ Migration: bank_confirmed columns added to disbursement_payments');
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('disbursement_payments', 'idx_disbursement_payments_bank_confirmed_at');
    await queryInterface.removeColumn('disbursement_payments', 'bank_confirmed_amount_cents');
    await queryInterface.removeColumn('disbursement_payments', 'bank_confirmed_at');
    console.log('✅ Rollback: bank_confirmed columns removed from disbursement_payments');
  },
};
