#!/usr/bin/env node

/**
 * Check Migration Status: Compare executed migrations between UAT and Staging
 *
 * Purpose: Identify which migrations have run in each environment
 * Uses db-connection-helper.js for all database connections
 *
 * Usage:
 *   node scripts/check-migration-status.js           # Full check (UAT + Staging, both proxies required)
 *   node scripts/check-migration-status.js --uat-only # UAT only (when Staging proxy not running)
 *   node scripts/check-migration-status.js --debug   # Show sample SequelizeMeta vs file format (for diagnosis)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const {
  getUATClient,
  getStagingClient,
  detectProxyPort,
  closeAll,
  CONFIG,
  getStagingPassword,
} = require('./db-connection-helper');

const UAT_ONLY = process.argv.includes('--uat-only');
const DEBUG = process.argv.includes('--debug');

// Get executed migrations
async function getExecutedMigrations(client) {
  try {
    const result = await client.query(`SELECT name FROM "SequelizeMeta" ORDER BY name ASC`);
    return new Set(result.rows.map(row => row.name));
  } catch {
    return new Set();
  }
}

// Get all migration files
function getAllMigrationFiles() {
  const migrationsDir = path.join(__dirname, '..', 'migrations');
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.js'))
    .map(f => ({
      filename: f,
      name: f.replace(/\.js$/, '')
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return files;
}

// Check if migration is in executed set (SequelizeMeta may store filename, name, or path)
function isExecuted(executedSet, m) {
  if (executedSet.has(m.filename) || executedSet.has(m.name)) return true;
  // Handle path format: "migrations/20260218_create_vas_best_offers.js" or full path
  for (const v of executedSet) {
    const base = v.replace(/^.*[/\\]/, ''); // basename
    if (base === m.filename || base === m.name) return true;
  }
  return false;
}

async function main() {
  const title = UAT_ONLY ? 'UAT ONLY' : 'UAT vs STAGING';
  console.log('\n' + '='.repeat(80));
  console.log(`  📋 MIGRATION STATUS CHECK: ${title}`);
  console.log('='.repeat(80) + '\n');

  // Use db-connection-helper for all DB connections
  console.log('🔍 Detecting Cloud SQL Auth Proxy ports...\n');
  const uatProxyPort = detectProxyPort(CONFIG.UAT.PROXY_PORTS, 'UAT');
  console.log(`✅ UAT proxy running on port ${uatProxyPort}`);
  if (!UAT_ONLY) {
    getStagingPassword(); // Pre-fetch to validate Secret Manager access
    console.log('✅ Staging password retrieved from Secret Manager');
    const stagingProxyPort = detectProxyPort(CONFIG.STAGING.PROXY_PORTS, 'Staging');
    console.log(`✅ Staging proxy running on port ${stagingProxyPort}\n`);
  } else {
    console.log('   (Staging skipped: --uat-only)\n');
  }

  let uatClient;
  let stagingClient = null;

  try {
    uatClient = await getUATClient();
    if (!UAT_ONLY) {
      stagingClient = await getStagingClient();
    }

    try {
      console.log('📋 Fetching executed migrations...\n');

      const uatMigrations = await getExecutedMigrations(uatClient);
      const stagingMigrations = stagingClient
        ? await getExecutedMigrations(stagingClient)
        : new Set();
      const allMigrations = getAllMigrationFiles();

      console.log(`   UAT: ${uatMigrations.size} migrations executed`);
      if (!UAT_ONLY) {
        console.log(`   Staging: ${stagingMigrations.size} migrations executed`);
      }
      console.log(`   Total migration files: ${allMigrations.length}\n`);

      if (DEBUG) {
        const migrationsDir = path.join(__dirname, '..', 'migrations');
        const uatSample = [...uatMigrations].sort().slice(0, 5);
        const fileSample = allMigrations.slice(0, 5).map(m => ({ filename: m.filename, name: m.name }));
        console.log('🔍 DEBUG - Migrations directory:', migrationsDir);
        console.log('🔍 DEBUG - Sample from SequelizeMeta (UAT), first 5:');
        uatSample.forEach((v, i) => console.log(`      [${i}] "${v}" (len=${v.length})`));
        console.log('🔍 DEBUG - Sample from migration files, first 5:');
        fileSample.forEach((m, i) => console.log(`      [${i}] filename="${m.filename}" name="${m.name}"`));
        console.log('🔍 DEBUG - Checking if first file matches:', isExecuted(uatMigrations, fileSample[0]));
        console.log('');
      }

      // SequelizeMeta may store filename with or without .js depending on version/config
      const missingInUAT = [...stagingMigrations].filter(m => !uatMigrations.has(m));
      const extraInUAT = [...uatMigrations].filter(m => !stagingMigrations.has(m));
      const pendingInUAT = allMigrations.filter(m => !isExecuted(uatMigrations, m));
      const pendingInBoth = allMigrations.filter(m =>
        !isExecuted(uatMigrations, m) && !isExecuted(stagingMigrations, m)
      );

      if (!UAT_ONLY) {
        const relevantMigrations = [
        '20250814_create_reseller_compliance_tax',
        '20250814_create_mobilemart_tables',
        '20250829075831-add-commission-to-flash-transactions-and-tiers',
        '20251203_01_create_sync_audit_logs_table'
      ];

      console.log('='.repeat(80));
      console.log('  🔍 RELEVANT MIGRATIONS FOR EXTRA TABLES');
      console.log('='.repeat(80) + '\n');

        relevantMigrations.forEach(migrationName => {
          const m = { filename: `${migrationName}.js`, name: migrationName };
          const inUAT = isExecuted(uatMigrations, m);
          const inStaging = isExecuted(stagingMigrations, m);
          const status = inUAT && inStaging ? '✅ Both' :
            inStaging && !inUAT ? '⚠️  Staging only' :
              inUAT && !inStaging ? '❌ UAT only' : '❌ Neither';
          console.log(`   ${status}: ${migrationName}`);
        });
      }

      console.log('\n' + '='.repeat(80));
      console.log(`  📊 ${UAT_ONLY ? 'UAT STATUS' : 'MIGRATION DIFFERENCES'}`);
      console.log('='.repeat(80) + '\n');

      if (!UAT_ONLY && missingInUAT.length > 0) {
        console.log(`⚠️  ${missingInUAT.length} migration(s) in Staging but NOT in UAT:\n`);
        missingInUAT.forEach(m => {
          console.log(`   - ${m}`);
        });
        console.log();
      }

      if (!UAT_ONLY && extraInUAT.length > 0) {
        console.log(`ℹ️  ${extraInUAT.length} migration(s) in UAT but NOT in Staging:\n`);
        extraInUAT.forEach(m => {
          console.log(`   - ${m}`);
        });
        console.log();
      }

      const pendingToShow = UAT_ONLY ? pendingInUAT : pendingInBoth;
      if (pendingToShow.length > 0) {
        console.log(`📋 ${pendingToShow.length} migration(s) ${UAT_ONLY ? 'pending in UAT' : 'not executed in either environment'}:\n`);
        pendingToShow.forEach(m => {
          console.log(`   - ${m.name}`);
        });
        console.log();
      }

      if (UAT_ONLY && pendingToShow.length === 0) {
        console.log('✅ All migrations are executed in UAT!\n');
      } else if (!UAT_ONLY && missingInUAT.length === 0 && extraInUAT.length === 0 && pendingInBoth.length === 0) {
        console.log('✅ All migrations are synchronized!\n');
      }

    } finally {
      uatClient.release();
      if (stagingClient) stagingClient.release();
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    if (uatClient) uatClient.release();
    if (stagingClient) stagingClient.release();
    await closeAll();
  }
}

main().catch(error => {
  console.error(`\n❌ Unhandled error: ${error.message}`);
  process.exit(1);
});
