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
        const urlString = process.env.DATABASE_URL;
        
        // If password contains @ and is not URL-encoded, we need special handling
        // Example: postgres://user:pass@word@host -> password is "pass@word"
        // But URL parser will see password as "pass" and host as "word@host"
        
        // Try to parse as-is first (works if password is URL-encoded)
        try {
          const url = new URL(urlString);
          if (url.password) {
            const decoded = decodeURIComponent(url.password);
            // Test if this works by checking if host looks valid
            if (url.hostname && !url.hostname.includes('@')) {
              return decoded;
            }
          }
        } catch (e) {
          // URL parsing failed, try manual parsing
        }
        
        // Manual parsing for passwords with @ symbol
        // Format: postgres://user:password@host:port/db
        // If password has @, we need to find the @ before host:port
        // Since host is 127.0.0.1, find @127.0.0.1 and extract password before it
        const hostPattern = '@127.0.0.1:';
        const hostIndex = urlString.indexOf(hostPattern);
        if (hostIndex > 0) {
          // Find the : after postgres://
          const userPassStart = urlString.indexOf('://') + 3;
          const passwordStart = urlString.indexOf(':', userPassStart) + 1;
          const password = urlString.substring(passwordStart, hostIndex);
          
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
        
        // Fallback: try to find @host:port pattern
        const dbMatch = urlString.match(/postgres:\/\/([^:]+):(.+)@([^:]+):(\d+)\/(.+)/);
        if (dbMatch) {
          const [, username, passwordPart, host, port, database] = dbMatch;
          // If host contains @, password wasn't extracted correctly
          // Find the last @ before the known host
          if (host.includes('@')) {
            const knownHost = host.split('@').pop(); // Get part after last @
            const hostPattern2 = `@${knownHost}:`;
            const hostIndex2 = urlString.indexOf(hostPattern2);
            if (hostIndex2 > 0) {
              const userPassStart2 = urlString.indexOf('://') + 3;
              const passwordStart2 = urlString.indexOf(':', userPassStart2) + 1;
              const password2 = urlString.substring(passwordStart2, hostIndex2);
              try {
                return decodeURIComponent(password2);
              } catch {
                return password2;
              }
            }
          }
        }
        
        // Fallback: simple regex (will fail if password has @)
        const match = urlString.match(/postgres:\/\/([^:]+):([^@]+)@/);
        if (match) {
          const [, username, password] = match;
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      } catch (e) {
        console.log(`⚠️  Could not parse DATABASE_URL: ${e.message}`);
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

