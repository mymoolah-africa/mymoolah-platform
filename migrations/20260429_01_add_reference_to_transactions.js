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
    const columnExists = async () => {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'reference'
        LIMIT 1;
      `, { transaction: null });
      return rows.length > 0;
    };

    const indexExists = async () => {
      const [rows] = await queryInterface.sequelize.query(`
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_transactions_reference'
        LIMIT 1;
      `, { transaction: null });
      return rows.length > 0;
    };

    const hasReferenceColumn = await columnExists();
    if (!hasReferenceColumn) {
      await queryInterface.sequelize.query(`
        ALTER TABLE transactions
        ADD COLUMN "reference" VARCHAR(255);
      `, { transaction: null });

      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN transactions."reference"
        IS 'External reference number for payments';
      `, { transaction: null });
    }

    const hasReferenceIndex = await indexExists();
    if (!hasReferenceIndex) {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY idx_transactions_reference
        ON transactions ("reference");
      `, { transaction: null });
    }
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
