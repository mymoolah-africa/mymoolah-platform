#!/usr/bin/env node
'use strict';

/**
 * Audit and repair public schema object ownership for migrations.
 *
 * MyMoolah migrations intentionally run as mymoolah_app. PostgreSQL requires
 * object ownership for ALTER TABLE / ALTER SEQUENCE / ALTER VIEW operations,
 * so grants alone are not enough for legacy objects owned by postgres or old
 * roles. This script is dry-run by default and uses db-connection-helper admin
 * clients only.
 *
 * Usage:
 *   node scripts/repair-table-ownership.js uat
 *   node scripts/repair-table-ownership.js uat --apply
 *   node scripts/repair-table-ownership.js staging --apply
 *   node scripts/repair-table-ownership.js production --apply --confirm-production
 */

const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env.codespaces') });
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const {
  getUATAdminClient,
  getStagingAdminClient,
  getProductionAdminClient,
  closeAll,
} = require('./db-connection-helper');

const APP_OWNER = 'mymoolah_app';
const VALID_ENVIRONMENTS = new Set(['uat', 'staging', 'production']);

const environment = process.argv[2];
const apply = process.argv.includes('--apply');
const confirmProduction = process.argv.includes('--confirm-production');

if (!VALID_ENVIRONMENTS.has(environment)) {
  console.error('Usage: node scripts/repair-table-ownership.js [uat|staging|production] [--apply] [--confirm-production]');
  process.exit(1);
}

if (environment === 'production' && apply && !confirmProduction) {
  console.error('Production ownership repair requires explicit --confirm-production.');
  process.exit(1);
}

const RELKIND_TO_ALTER = {
  r: 'TABLE',
  p: 'TABLE',
  S: 'SEQUENCE',
  v: 'VIEW',
  m: 'MATERIALIZED VIEW',
  f: 'FOREIGN TABLE',
};

async function getAdminClient() {
  if (environment === 'uat') return getUATAdminClient();
  if (environment === 'staging') return getStagingAdminClient();
  return getProductionAdminClient();
}

async function getMismatchedObjects(client) {
  const result = await client.query(`
    SELECT
      c.relkind,
      CASE c.relkind
        WHEN 'r' THEN 'table'
        WHEN 'p' THEN 'partitioned_table'
        WHEN 'S' THEN 'sequence'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized_view'
        WHEN 'f' THEN 'foreign_table'
        ELSE c.relkind::text
      END AS object_type,
      format('%I.%I', n.nspname, c.relname) AS qualified_name,
      pg_get_userbyid(c.relowner) AS current_owner
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'S', 'v', 'm', 'f')
      AND pg_get_userbyid(c.relowner) <> $1
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        JOIN pg_extension e ON e.oid = d.refobjid
        WHERE d.objid = c.oid
          AND d.deptype = 'e'
      )
    ORDER BY object_type, qualified_name;
  `, [APP_OWNER]);

  return result.rows;
}

async function transferOwnership(client, object) {
  const alterType = RELKIND_TO_ALTER[object.relkind];
  if (!alterType) {
    throw new Error(`Unsupported relkind ${object.relkind} for ${object.qualified_name}`);
  }

  await client.query(`ALTER ${alterType} ${object.qualified_name} OWNER TO ${APP_OWNER};`);
}

async function main() {
  console.log('');
  console.log(`[ownership-repair] Environment: ${environment}`);
  console.log(`[ownership-repair] Target owner: ${APP_OWNER}`);
  console.log(`[ownership-repair] Mode: ${apply ? 'APPLY' : 'DRY RUN'}`);
  console.log('');

  const client = await getAdminClient();
  try {
    const mismatches = await getMismatchedObjects(client);

    if (mismatches.length === 0) {
      console.log('[ownership-repair] All public application objects are already owned by mymoolah_app.');
      return;
    }

    console.log(`[ownership-repair] Found ${mismatches.length} public object(s) not owned by ${APP_OWNER}:`);
    for (const object of mismatches) {
      const alterType = RELKIND_TO_ALTER[object.relkind];
      console.log(`  - ${object.object_type}: ${object.qualified_name} owned by ${object.current_owner}`);
      console.log(`    ${apply ? 'Applying' : 'Would run'}: ALTER ${alterType} ${object.qualified_name} OWNER TO ${APP_OWNER};`);
    }

    if (!apply) {
      console.log('');
      console.log('[ownership-repair] Dry run only. Re-run with --apply after reviewing the object list.');
      return;
    }

    for (const object of mismatches) {
      await transferOwnership(client, object);
    }

    const remaining = await getMismatchedObjects(client);
    if (remaining.length > 0) {
      throw new Error(`Ownership repair incomplete: ${remaining.length} object(s) still not owned by ${APP_OWNER}`);
    }

    console.log('');
    console.log(`[ownership-repair] Ownership repair complete. All audited public objects are owned by ${APP_OWNER}.`);
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch(async (error) => {
  console.error('[ownership-repair] ERROR:', error.message);
  await closeAll();
  process.exit(1);
});
