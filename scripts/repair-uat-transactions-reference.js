#!/usr/bin/env node
'use strict';

/**
 * UAT-only repair for public.transactions.reference.
 *
 * Context:
 * - Normal migrations run as mymoolah_app.
 * - UAT public.transactions is owned by postgres.
 * - EasyPay V5 cash-in now writes Transaction.reference for deposit/fee audit rows.
 *
 * This script uses the approved db-connection-helper admin connection and is
 * intentionally limited to UAT.
 */

const { getUATAdminClient, closeAll } = require('./db-connection-helper');

const apply = process.argv.includes('--apply');

async function getSchemaState(client) {
  const result = await client.query(`
    SELECT
      current_user AS current_user,
      pg_get_userbyid(c.relowner) AS table_owner,
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
  `);

  if (!result.rows[0]) {
    throw new Error('public.transactions table not found in UAT');
  }
  return result.rows[0];
}

async function main() {
  const client = await getUATAdminClient();
  try {
    const before = await getSchemaState(client);
    console.log('[repair-uat-transactions-reference] Before:', before);

    if (!apply) {
      console.log('[repair-uat-transactions-reference] Dry run only. Re-run with --apply to execute the repair.');
      return;
    }

    if (!before.has_reference_column) {
      await client.query('ALTER TABLE public.transactions ADD COLUMN "reference" VARCHAR(255);');
      await client.query(`
        COMMENT ON COLUMN public.transactions."reference"
        IS 'External reference number for payments';
      `);
      console.log('[repair-uat-transactions-reference] Added public.transactions.reference');
    } else {
      await client.query(`
        COMMENT ON COLUMN public.transactions."reference"
        IS 'External reference number for payments';
      `);
      console.log('[repair-uat-transactions-reference] public.transactions.reference already exists');
    }

    if (!before.has_reference_index) {
      await client.query(`
        CREATE INDEX CONCURRENTLY idx_transactions_reference
        ON public.transactions ("reference");
      `);
      console.log('[repair-uat-transactions-reference] Created idx_transactions_reference');
    } else {
      console.log('[repair-uat-transactions-reference] idx_transactions_reference already exists');
    }

    const after = await getSchemaState(client);
    console.log('[repair-uat-transactions-reference] After:', after);
    console.log('[repair-uat-transactions-reference] Repair complete. Re-run ./scripts/run-migrations-master.sh uat');
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch(async (error) => {
  console.error('[repair-uat-transactions-reference] ERROR:', error.message);
  await closeAll();
  process.exit(1);
});
