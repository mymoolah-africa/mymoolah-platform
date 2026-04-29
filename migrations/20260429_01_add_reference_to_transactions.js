'use strict';

/**
 * Repair schema parity for Transaction.reference.
 *
 * Some environments have the historical "missing transaction columns" migration
 * recorded without the reference column being present. EasyPay V5 callback rows
 * now persist their deposit/fee references for audit and reconciliation, so the
 * physical transactions table must match the Sequelize model.
 */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      ALTER TABLE transactions
      ADD COLUMN IF NOT EXISTS "reference" VARCHAR(255);
    `, { transaction: null });

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN transactions."reference"
      IS 'External reference number for payments';
    `, { transaction: null });

    await queryInterface.sequelize.query(`
      CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_reference
      ON transactions ("reference");
    `, { transaction: null });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_reference;
    `, { transaction: null });

    await queryInterface.sequelize.query(`
      ALTER TABLE transactions
      DROP COLUMN IF EXISTS "reference";
    `, { transaction: null });
  }
};
