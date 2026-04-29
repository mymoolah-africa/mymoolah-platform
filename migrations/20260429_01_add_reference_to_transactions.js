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
    const schema = await getTransactionsReferenceSchema(queryInterface);
    const hasReferenceColumn = Boolean(schema.has_reference_column);
    const hasReferenceIndex = Boolean(schema.has_reference_index);
    const currentUserIsOwnerMember = Boolean(schema.current_user_is_owner_member);

    console.log(
      `[migration:transactions.reference] current_user=${schema.current_user}, ` +
      `table_owner=${schema.table_owner}, owner_member=${currentUserIsOwnerMember}, ` +
      `has_column=${hasReferenceColumn}, has_index=${hasReferenceIndex}`
    );

    if (!currentUserIsOwnerMember && !hasReferenceColumn) {
      throw new Error(
        'transactions.reference is missing, but current migration role does not own public.transactions. ' +
        `current_user=${schema.current_user}, table_owner=${schema.table_owner}. ` +
        'Run this migration with the table owner/admin role or repair table ownership before retrying.'
      );
    }

    if (!hasReferenceColumn) {
      await queryInterface.sequelize.query(`
        ALTER TABLE transactions
        ADD COLUMN "reference" VARCHAR(255);
      `, { transaction: null });

      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN transactions."reference"
        IS 'External reference number for payments';
      `, { transaction: null });
    } else if (currentUserIsOwnerMember) {
      await queryInterface.sequelize.query(`
        COMMENT ON COLUMN transactions."reference"
        IS 'External reference number for payments';
      `, { transaction: null });
    }

    if (!hasReferenceIndex) {
      if (!currentUserIsOwnerMember) {
        console.warn(
          '[migration:transactions.reference] Skipping idx_transactions_reference creation because ' +
          `current_user=${schema.current_user} is not owner/member of public.transactions. ` +
          'The column exists, so EasyPay V5 cash-in can proceed; add the index later with the owner/admin role.'
        );
        return;
      }

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY idx_transactions_reference
        ON transactions ("reference");
      `, { transaction: null });
    }
  },

  async down(queryInterface) {
    const schema = await getTransactionsReferenceSchema(queryInterface);
    if (!schema || !schema.current_user_is_owner_member) {
      console.warn('[migration:transactions.reference] Skipping rollback because current role does not own public.transactions.');
      return;
    }

    if (schema.has_reference_index) {
      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_transactions_reference;
      `, { transaction: null });
    }

    if (schema.has_reference_column) {
      await queryInterface.sequelize.query(`
        ALTER TABLE transactions
        DROP COLUMN "reference";
      `, { transaction: null });
    }
  }
};

async function getTransactionsReferenceSchema(queryInterface) {
  const [schemaRows] = await queryInterface.sequelize.query(`
    SELECT
      current_user AS current_user,
      pg_get_userbyid(c.relowner) AS table_owner,
      pg_has_role(c.relowner, 'MEMBER') AS current_user_is_owner_member,
      EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'transactions'
          AND column_name = 'reference'
      ) AS has_reference_column,
      EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND indexname = 'idx_transactions_reference'
      ) AS has_reference_index
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'transactions'
      AND c.relkind IN ('r', 'p')
    LIMIT 1;
  `, { transaction: null });

  const schema = schemaRows[0];
  if (!schema) {
    throw new Error('transactions table not found in public schema');
  }
  return schema;
}
