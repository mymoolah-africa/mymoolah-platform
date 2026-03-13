#!/usr/bin/env node
'use strict';

/**
 * One-time setup: Grant mymoolah_app DDL privileges
 * ==================================================
 * Connects as postgres (admin) and grants mymoolah_app the ability to
 * ALTER TABLE, CREATE INDEX, ADD COLUMN etc. on all existing and future tables.
 *
 * This is required because mymoolah_app is a data user (SELECT/INSERT/UPDATE/DELETE)
 * but Sequelize CLI migrations need DDL rights to modify the schema.
 *
 * Run ONCE per environment:
 *   node scripts/grant-migration-privileges.js uat
 *   node scripts/grant-migration-privileges.js staging
 *   node scripts/grant-migration-privileges.js production
 */

require('dotenv').config();

const { getUATAdminClient, getStagingAdminClient, getProductionAdminClient, closeAll } = require('./db-connection-helper');

const APP_USER = 'mymoolah_app';
const environment = process.argv[2];

if (!['uat', 'staging', 'production'].includes(environment)) {
  console.error('Usage: node scripts/grant-migration-privileges.js [uat|staging|production]');
  process.exit(1);
}

async function run() {
  console.log('');
  console.log(`🔑 Granting DDL privileges to ${APP_USER} on ${environment.toUpperCase()}...`);
  console.log('');

  let client;
  try {
    if (environment === 'uat') client = await getUATAdminClient();
    else if (environment === 'staging') client = await getStagingAdminClient();
    else client = await getProductionAdminClient();

    const grants = [
      // All existing tables: full privileges
      `GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO ${APP_USER}`,
      // All existing sequences (for auto-increment IDs)
      `GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO ${APP_USER}`,
      // Future tables created by any user
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO ${APP_USER}`,
      // Future sequences
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO ${APP_USER}`,
      // Allow creating new tables/indexes
      `GRANT CREATE ON SCHEMA public TO ${APP_USER}`,
    ];

    for (const sql of grants) {
      await client.query(sql);
      console.log(`  ✅ ${sql}`);
    }

    console.log('');
    console.log(`✅ Done. ${APP_USER} now has full DDL rights on ${environment.toUpperCase()}.`);
    console.log('   Migrations can now run as mymoolah_app as normal.');
    console.log('');
  } finally {
    if (client) client.release();
    await closeAll();
  }
}

run().catch((err) => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
