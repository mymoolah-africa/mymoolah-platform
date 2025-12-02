#!/usr/bin/env node

/**
 * Quick check: Compare wallets table columns between UAT and Staging
 */

const { Client } = require('pg');
const { execSync } = require('child_process');

// Get password from Secret Manager (same as sync script)
function getPasswordFromSecretManager(secretName) {
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    throw new Error(`Failed to get password from Secret Manager: ${secretName}`);
  }
}

// Get UAT password
function getUATPassword() {
  if (process.env.DATABASE_URL) {
    try {
      const urlString = process.env.DATABASE_URL;
      const hostPattern = '@127.0.0.1:';
      const hostIndex = urlString.indexOf(hostPattern);
      if (hostIndex > 0) {
        const passwordStart = urlString.indexOf(':', urlString.indexOf('://') + 3) + 1;
        const password = urlString.substring(passwordStart, hostIndex);
        try {
          return decodeURIComponent(password);
        } catch {
          return password;
        }
      }
    } catch (e) {}
  }
  if (process.env.DB_PASSWORD) return process.env.DB_PASSWORD;
  return getPasswordFromSecretManager('db-mmtp-pg-password');
}

// Get database name from DATABASE_URL
function getDatabaseNameFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    return url.pathname.replace('/', '') || 'mymoolah';
  } catch (e) {
    const match = urlString.match(/\/\/([^:]+):([^@]+)@[^\/]+\/([^?]+)/);
    return match && match[3] ? match[3] : 'mymoolah';
  }
}

const uatDatabaseName = process.env.DATABASE_URL 
  ? getDatabaseNameFromUrl(process.env.DATABASE_URL) || 'mymoolah'
  : 'mymoolah';

const uatPassword = getUATPassword();
const stagingPassword = getPasswordFromSecretManager('db-mmtp-pg-staging-password');

const uatConfig = {
  host: '127.0.0.1',
  port: 5433,
  database: uatDatabaseName,
  user: 'mymoolah_app',
  password: uatPassword
};

const stagingConfig = {
  host: '127.0.0.1',
  port: 5434,
  database: 'mymoolah_staging',
  user: 'mymoolah_app',
  password: stagingPassword
};

async function main() {
  const uatClient = new Client(uatConfig);
  const stagingClient = new Client(stagingConfig);

  try {
    await uatClient.connect();
    await stagingClient.connect();

    console.log('📋 Comparing wallets table columns...\n');

    // Get UAT columns
    const uatResult = await uatClient.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallets'
      ORDER BY ordinal_position
    `);

    // Get Staging columns
    const stagingResult = await stagingClient.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'wallets'
      ORDER BY ordinal_position
    `);

    const uatColumns = uatResult.rows.map(r => r.column_name);
    const stagingColumns = stagingResult.rows.map(r => r.column_name);

    console.log(`UAT columns (${uatColumns.length}):`);
    uatResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
    });

    console.log(`\nStaging columns (${stagingColumns.length}):`);
    stagingResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}${col.is_nullable === 'YES' ? ', nullable' : ''})`);
    });

    // Find differences
    const onlyInUat = uatColumns.filter(c => !stagingColumns.includes(c));
    const onlyInStaging = stagingColumns.filter(c => !uatColumns.includes(c));

    console.log('\n📊 Differences:');
    if (onlyInUat.length > 0) {
      console.log(`\n❌ Columns only in UAT (${onlyInUat.length}):`);
      onlyInUat.forEach(col => {
        const colInfo = uatResult.rows.find(r => r.column_name === col);
        console.log(`  - ${col} (${colInfo.data_type})`);
      });
    }

    if (onlyInStaging.length > 0) {
      console.log(`\n⚠️  Columns only in Staging (${onlyInStaging.length}):`);
      onlyInStaging.forEach(col => {
        const colInfo = stagingResult.rows.find(r => r.column_name === col);
        console.log(`  - ${col} (${colInfo.data_type}${colInfo.is_nullable === 'YES' ? ', nullable' : ''})`);
      });
    }

    if (onlyInUat.length === 0 && onlyInStaging.length === 0) {
      console.log('\n✅ No column differences found!');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await uatClient.end();
    await stagingClient.end();
  }
}

main();
