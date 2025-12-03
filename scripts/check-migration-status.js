#!/usr/bin/env node

/**
 * Check Migration Status: Compare executed migrations between UAT and Staging
 * 
 * Purpose: Identify which migrations have run in each environment
 * 
 * Usage: node scripts/check-migration-status.js
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get password from Secret Manager
function getPasswordFromSecretManager(secretName) {
  try {
    const password = execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get password from Secret Manager: ${secretName} - ${error.message}`);
  }
}

// Get UAT password from .env
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) return decodeURIComponent(url.password);
    } catch (e) {
      const urlString = process.env.DATABASE_URL;
      const hostPattern = '@127.0.0.1:';
      const hostIndex = urlString.indexOf(hostPattern);
      if (hostIndex > 0) {
        const userPassStart = urlString.indexOf('://') + 3;
        const passwordStart = urlString.indexOf(':', userPassStart) + 1;
        if (passwordStart > userPassStart && passwordStart < hostIndex) {
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      }
    }
  }
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  throw new Error('UAT password not found. Set DATABASE_URL or DB_PASSWORD in .env file.');
}

// Detect proxy port
function detectProxyPort(ports, name) {
  for (const port of ports) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(`${name} proxy not running. Start it on port ${ports[0]} or ${ports[1]}`);
}

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

async function main() {
  console.log('\n' + '='.repeat(80));
  console.log('  📋 MIGRATION STATUS CHECK: UAT vs STAGING');
  console.log('='.repeat(80) + '\n');

  // Get passwords
  const uatPassword = getUATPassword();
  let stagingPassword;
  
  try {
    stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');
    console.log('✅ Staging password retrieved from Secret Manager\n');
  } catch (error) {
    throw new Error(`Failed to retrieve Staging password from Secret Manager: ${error.message}`);
  }

  // Detect proxy ports
  console.log('🔍 Detecting Cloud SQL Auth Proxy ports...\n');
  const uatProxyPort = detectProxyPort([6543, 5432], 'UAT');
  const stagingProxyPort = detectProxyPort([6544, 5432], 'Staging');
  console.log(`✅ UAT proxy running on port ${uatProxyPort}`);
  console.log(`✅ Staging proxy running on port ${stagingProxyPort}\n`);

  // Create connection pools
  const uatConfig = {
    host: '127.0.0.1',
    port: uatProxyPort,
    database: 'mymoolah',
    user: 'mymoolah_app',
    password: uatPassword,
    ssl: false
  };

  const stagingConfig = {
    host: '127.0.0.1',
    port: stagingProxyPort,
    database: 'mymoolah_staging',
    user: 'mymoolah_app',
    password: stagingPassword,
    ssl: false
  };

  const uatPool = new Pool(uatConfig);
  const stagingPool = new Pool(stagingConfig);

  try {
    const uatClient = await uatPool.connect();
    const stagingClient = await stagingPool.connect();

    try {
      console.log('📋 Fetching executed migrations...\n');
      
      const uatMigrations = await getExecutedMigrations(uatClient);
      const stagingMigrations = await getExecutedMigrations(stagingClient);
      const allMigrations = getAllMigrationFiles();

      console.log(`   UAT: ${uatMigrations.size} migrations executed`);
      console.log(`   Staging: ${stagingMigrations.size} migrations executed`);
      console.log(`   Total migration files: ${allMigrations.length}\n`);

      // Find migrations in Staging but not in UAT
      const missingInUAT = [...stagingMigrations].filter(m => !uatMigrations.has(m));
      const extraInUAT = [...uatMigrations].filter(m => !stagingMigrations.has(m));
      const pendingInBoth = allMigrations.filter(m => 
        !uatMigrations.has(m.name) && !stagingMigrations.has(m.name)
      );

      // Check for our 6 extra tables' migrations
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
        const inUAT = uatMigrations.has(migrationName);
        const inStaging = stagingMigrations.has(migrationName);
        const status = inUAT && inStaging ? '✅ Both' :
                      inStaging && !inUAT ? '⚠️  Staging only' :
                      inUAT && !inStaging ? '❌ UAT only' : '❌ Neither';
        console.log(`   ${status}: ${migrationName}`);
      });

      console.log('\n' + '='.repeat(80));
      console.log(`  📊 MIGRATION DIFFERENCES`);
      console.log('='.repeat(80) + '\n');

      if (missingInUAT.length > 0) {
        console.log(`⚠️  ${missingInUAT.length} migration(s) in Staging but NOT in UAT:\n`);
        missingInUAT.forEach(m => {
          console.log(`   - ${m}`);
        });
        console.log();
      }

      if (extraInUAT.length > 0) {
        console.log(`ℹ️  ${extraInUAT.length} migration(s) in UAT but NOT in Staging:\n`);
        extraInUAT.forEach(m => {
          console.log(`   - ${m}`);
        });
        console.log();
      }

      if (pendingInBoth.length > 0) {
        console.log(`📋 ${pendingInBoth.length} migration(s) not executed in either environment:\n`);
        pendingInBoth.forEach(m => {
          console.log(`   - ${m.name}`);
        });
        console.log();
      }

      if (missingInUAT.length === 0 && extraInUAT.length === 0 && pendingInBoth.length === 0) {
        console.log('✅ All migrations are synchronized!\n');
      }

    } finally {
      uatClient.release();
      stagingClient.release();
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  } finally {
    await uatPool.end();
    await stagingPool.end();
  }
}

main().catch(error => {
  console.error(`\n❌ Unhandled error: ${error.message}`);
  process.exit(1);
});
