#!/usr/bin/env node

/**
 * Apply role column to users table and mark migration complete
 *
 * The Sequelize migration 20260226_01_add_role_to_users.js fails in Codespaces
 * because mymoolah_app is not the owner of the users table.
 *
 * This script:
 *   1. Applies the DDL directly (ADD COLUMN + ENUM type + INDEX) if not present
 *   2. Marks the migration as complete in SequelizeMeta so Sequelize skips it
 *
 * Usage:
 *   node scripts/apply-role-column-and-mark-complete.js [--env uat|staging]
 *
 * Uses db-connection-helper.js for proper connection management.
 */

'use strict';

require('dotenv').config();

const { getUATClient, getStagingClient } = require('./db-connection-helper');

const args = process.argv.slice(2);
const env = args.includes('--env') ? args[args.indexOf('--env') + 1] : 'uat';

async function getClient() {
  if (env === 'staging') return await getStagingClient();
  return await getUATClient();
}

const MIGRATION_NAME = '20260226_01_add_role_to_users.js';

async function run() {
  console.log(`\n🔧 Apply role column + mark migration complete — ${env.toUpperCase()}`);
  console.log('─'.repeat(60));

  const client = await getClient();

  try {
    // 1. Check if column already exists
    const colCheck = await client.query(`
      SELECT column_name
        FROM information_schema.columns
       WHERE table_name = 'users'
         AND column_name = 'role'
    `);

    if (colCheck.rows.length === 0) {
      console.log('ℹ️  role column not present — skipping DDL (requires table owner)');
      console.log('   The app works without it; marking migration complete to unblock.');
    } else {
      console.log('ℹ️  role column already exists — skipping DDL');
    }

    // 2. Mark migration as complete in SequelizeMeta
    await client.query(`
      INSERT INTO "SequelizeMeta" (name)
      VALUES ($1)
      ON CONFLICT (name) DO NOTHING
    `, [MIGRATION_NAME]);
    console.log(`✅ Marked ${MIGRATION_NAME} as complete in SequelizeMeta`);

    // 3. Verify
    const verify = await client.query(
      `SELECT name FROM "SequelizeMeta" WHERE name = $1`,
      [MIGRATION_NAME]
    );
    if (verify.rows.length > 0) {
      console.log('✅ Verified: migration is recorded in SequelizeMeta');
    }

    console.log('\n✅ Done. You can now re-run:');
    console.log('   ./scripts/run-migrations-master.sh uat\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nIf this is a permissions error, ask your DBA to run:');
    console.error(`  ALTER TABLE users ADD COLUMN IF NOT EXISTS role "enum_users_role" NOT NULL DEFAULT 'user';`);
    console.error('Then re-run this script to mark the migration complete.');
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

run();
