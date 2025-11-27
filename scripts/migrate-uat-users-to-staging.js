#!/usr/bin/env node
/**
 * Migrate Users from UAT to Staging Database
 * 
 * This script copies all users (and optionally wallets) from UAT database to staging database.
 * 
 * Usage:
 *   node scripts/migrate-uat-users-to-staging.js [--include-wallets] [--dry-run]
 * 
 * Options:
 *   --include-wallets: Also migrate wallet data
 *   --dry-run: Show what would be migrated without actually doing it
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// UAT Database Connection
const UAT_CONNECTION_NAME = 'mymoolah-db:africa-south1:mmtp-pg';
const UAT_DATABASE = 'mymoolah';
const UAT_USER = 'mymoolah_app';

// Staging Database Connection
const STAGING_CONNECTION_NAME = 'mymoolah-db:africa-south1:mmtp-pg-staging';
const STAGING_DATABASE = 'mymoolah_staging';
const STAGING_USER = 'mymoolah_app';

// Get database passwords
function getDatabasePassword(secretName, isUAT = false) {
  // For UAT, try environment variable first, then Secret Manager
  if (isUAT) {
    // Try DATABASE_URL from .env
    if (process.env.DATABASE_URL) {
      try {
        const url = new URL(process.env.DATABASE_URL);
        if (url.password) {
          return decodeURIComponent(url.password);
        }
      } catch (e) {
        // Not a valid URL, continue
      }
    }
    
    // Try DB_PASSWORD or DATABASE_PASSWORD env vars
    if (process.env.DB_PASSWORD) {
      return process.env.DB_PASSWORD;
    }
    if (process.env.DATABASE_PASSWORD) {
      return process.env.DATABASE_PASSWORD;
    }
    
    // Try to get from Cloud SQL user directly (if we have access)
    console.log('⚠️  UAT password not found in environment variables');
    console.log('   Please set DB_PASSWORD or DATABASE_URL environment variable');
    console.log('   Or provide UAT password when prompted');
    process.exit(1);
  }
  
  // For staging, get from Secret Manager
  const { execSync } = require('child_process');
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="${secretName}" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    console.error(`❌ Failed to get password from Secret Manager: ${secretName}`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const includeWallets = args.includes('--include-wallets');
const dryRun = args.includes('--dry-run');

console.log('🚀 Migrating Users from UAT to Staging');
console.log(`   Include Wallets: ${includeWallets ? 'Yes' : 'No'}`);
console.log(`   Dry Run: ${dryRun ? 'Yes (no changes will be made)' : 'No'}`);
console.log('');

// Get passwords
console.log('📋 Retrieving database passwords...');
const uatPassword = getDatabasePassword('db-mmtp-pg-password', true); // UAT - try env vars first
const stagingPassword = getDatabasePassword('db-mmtp-pg-staging-password', false); // Staging - from Secret Manager

// Determine proxy ports (UAT typically uses 5433, staging uses 5434)
const UAT_PROXY_PORT = process.env.UAT_PROXY_PORT || '5433';
const STAGING_PROXY_PORT = process.env.STAGING_PROXY_PORT || '5434';

// Build connection URLs
const uatUrl = `postgres://${UAT_USER}:${encodeURIComponent(uatPassword)}@127.0.0.1:${UAT_PROXY_PORT}/${UAT_DATABASE}?sslmode=disable`;
const stagingUrl = `postgres://${STAGING_USER}:${encodeURIComponent(stagingPassword)}@127.0.0.1:${STAGING_PROXY_PORT}/${STAGING_DATABASE}?sslmode=disable`;

console.log('📋 Connecting to databases...');
console.log(`   UAT: ${UAT_DATABASE}@127.0.0.1:${UAT_PROXY_PORT}`);
console.log(`   Staging: ${STAGING_DATABASE}@127.0.0.1:${STAGING_PROXY_PORT}`);
console.log('');

// Create Sequelize instances
const uatSequelize = new Sequelize(uatUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: false }
});

const stagingSequelize = new Sequelize(stagingUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: false }
});

async function migrateUsers() {
  try {
    // Test connections
    console.log('🔍 Testing database connections...');
    await uatSequelize.authenticate();
    console.log('✅ UAT database connected');
    
    await stagingSequelize.authenticate();
    console.log('✅ Staging database connected');
    console.log('');

    // Get all users from UAT
    console.log('📋 Fetching users from UAT...');
    const [uatUsers] = await uatSequelize.query(`
      SELECT id, email, password_hash, "firstName", "lastName", "phoneNumber", 
             "accountNumber", "idNumber", "idType", "idVerified", balance, status, 
             "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
      FROM users
      WHERE status = 'active'
      ORDER BY id
    `);

    console.log(`📊 Found ${uatUsers.length} active users in UAT`);
    console.log('');

    if (uatUsers.length === 0) {
      console.log('⚠️  No active users found in UAT database');
      return;
    }

    // Check which users already exist in staging
    console.log('🔍 Checking existing users in staging...');
    const [existingUsers] = await stagingSequelize.query(`
      SELECT email, "phoneNumber" FROM users
    `);
    const existingEmails = new Set(existingUsers.map(u => u.email.toLowerCase()));
    const existingPhones = new Set(existingUsers.map(u => u.phoneNumber).filter(Boolean));

    const usersToMigrate = uatUsers.filter(user => {
      const emailExists = existingEmails.has(user.email.toLowerCase());
      const phoneExists = user.phoneNumber && existingPhones.has(user.phoneNumber);
      return !emailExists && !phoneExists;
    });

    const usersToSkip = uatUsers.length - usersToMigrate.length;

    console.log(`📊 Users to migrate: ${usersToMigrate.length}`);
    console.log(`📊 Users to skip (already exist): ${usersToSkip}`);
    console.log('');

    if (usersToMigrate.length === 0) {
      console.log('✅ All users already exist in staging');
      return;
    }

    // Show users that will be migrated
    console.log('📋 Users to be migrated:');
    usersToMigrate.slice(0, 10).forEach((user, idx) => {
      console.log(`   ${idx + 1}. ${user.email} (${user.phoneNumber || 'no phone'})`);
    });
    if (usersToMigrate.length > 10) {
      console.log(`   ... and ${usersToMigrate.length - 10} more`);
    }
    console.log('');

    if (dryRun) {
      console.log('🔍 DRY RUN: No changes made');
      console.log(`   Would migrate ${usersToMigrate.length} users`);
      if (includeWallets) {
        console.log('   Would also migrate wallet data');
      }
      return;
    }

    // Migrate users
    console.log('📦 Migrating users...');
    let migrated = 0;
    let errors = 0;

    for (const user of usersToMigrate) {
      try {
        await stagingSequelize.query(`
          INSERT INTO users (
            email, password_hash, "firstName", "lastName", "phoneNumber",
            "accountNumber", "idNumber", "idType", "idVerified", balance, status,
            "kycStatus", "kycVerifiedAt", "kycVerifiedBy", "createdAt", "updatedAt"
          ) VALUES (
            :email, :password_hash, :firstName, :lastName, :phoneNumber,
            :accountNumber, :idNumber, :idType, :idVerified, :balance, :status,
            :kycStatus, :kycVerifiedAt, :kycVerifiedBy, :createdAt, :updatedAt
          )
        `, {
          replacements: {
            email: user.email,
            password_hash: user.password_hash,
            firstName: user.firstName,
            lastName: user.lastName,
            phoneNumber: user.phoneNumber,
            accountNumber: user.accountNumber,
            idNumber: user.idNumber,
            idType: user.idType,
            idVerified: user.idVerified,
            balance: user.balance,
            status: user.status,
            kycStatus: user.kycStatus,
            kycVerifiedAt: user.kycVerifiedAt,
            kycVerifiedBy: user.kycVerifiedBy,
            createdAt: user.createdAt,
            updatedAt: user.updatedAt
          }
        });

        migrated++;
        if (migrated % 10 === 0) {
          console.log(`   ✅ Migrated ${migrated}/${usersToMigrate.length} users...`);
        }
      } catch (error) {
        errors++;
        console.error(`   ❌ Failed to migrate user ${user.email}: ${error.message}`);
      }
    }

    console.log('');
    console.log(`✅ Migration complete!`);
    console.log(`   Migrated: ${migrated} users`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} users`);
    }

    // Migrate wallets if requested
    if (includeWallets) {
      console.log('');
      console.log('📦 Migrating wallets...');
      // TODO: Implement wallet migration
      console.log('   ⚠️  Wallet migration not yet implemented');
    }

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await uatSequelize.close();
    await stagingSequelize.close();
  }
}

// Check if proxies are running
async function checkProxies() {
  const { execSync } = require('child_process');
  
  try {
    execSync(`lsof -i :${UAT_PROXY_PORT}`, { stdio: 'ignore' });
    console.log(`✅ UAT proxy running on port ${UAT_PROXY_PORT}`);
  } catch {
    console.error(`❌ UAT proxy not running on port ${UAT_PROXY_PORT}`);
    console.error(`   Start it with: ./bin/cloud-sql-proxy ${UAT_CONNECTION_NAME} --port=${UAT_PROXY_PORT}`);
    process.exit(1);
  }

  try {
    execSync(`lsof -i :${STAGING_PROXY_PORT}`, { stdio: 'ignore' });
    console.log(`✅ Staging proxy running on port ${STAGING_PROXY_PORT}`);
  } catch {
    console.error(`❌ Staging proxy not running on port ${STAGING_PROXY_PORT}`);
    console.error(`   Start it with: ./bin/cloud-sql-proxy ${STAGING_CONNECTION_NAME} --port=${STAGING_PROXY_PORT}`);
    process.exit(1);
  }
  console.log('');
}

// Main execution
(async () => {
  await checkProxies();
  await migrateUsers();
})();

