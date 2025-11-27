#!/usr/bin/env node
/**
 * Sync ALL Users' KYC Status from UAT to Staging
 * 
 * This script ensures all users in staging have the same KYC status as UAT.
 * 
 * Usage:
 *   node scripts/sync-all-users-kyc-from-uat.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// UAT Database Connection
const UAT_DATABASE = 'mymoolah';
const UAT_USER = 'mymoolah_app';
const UAT_PROXY_PORT = process.env.UAT_PROXY_PORT || '5433';

// Staging Database Connection
const STAGING_DATABASE = 'mymoolah_staging';
const STAGING_USER = 'mymoolah_app';
const STAGING_PROXY_PORT = process.env.STAGING_PROXY_PORT || '5434';

// Get database passwords
function getDatabasePassword(isUAT = false) {
  if (isUAT) {
    if (process.env.DATABASE_URL) {
      try {
        const urlString = process.env.DATABASE_URL;
        const hostPattern = '@127.0.0.1:';
        const hostIndex = urlString.indexOf(hostPattern);
        if (hostIndex > 0) {
          const userPassStart = urlString.indexOf('://') + 3;
          const passwordStart = urlString.indexOf(':', userPassStart) + 1;
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      } catch (e) {
        // Ignore
      }
    }
    if (process.env.DB_PASSWORD) {
      return process.env.DB_PASSWORD;
    }
    console.error('❌ UAT password not found in environment variables');
    process.exit(1);
  }
  
  const { execSync } = require('child_process');
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    console.error(`❌ Failed to get password from Secret Manager`);
    process.exit(1);
  }
}

async function syncAllUsersKyc() {
  const uatPassword = getDatabasePassword(true);
  const stagingPassword = getDatabasePassword(false);
  
  const uatUrl = `postgres://${UAT_USER}:${encodeURIComponent(uatPassword)}@127.0.0.1:${UAT_PROXY_PORT}/${UAT_DATABASE}?sslmode=disable`;
  const stagingUrl = `postgres://${STAGING_USER}:${encodeURIComponent(stagingPassword)}@127.0.0.1:${STAGING_PROXY_PORT}/${STAGING_DATABASE}?sslmode=disable`;
  
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

  try {
    // Check proxies
    try {
      execSync(`lsof -i :${UAT_PROXY_PORT}`, { stdio: 'ignore' });
      console.log(`✅ UAT proxy running on port ${UAT_PROXY_PORT}`);
    } catch {
      console.error(`❌ UAT proxy not running on port ${UAT_PROXY_PORT}`);
      process.exit(1);
    }

    try {
      execSync(`lsof -i :${STAGING_PROXY_PORT}`, { stdio: 'ignore' });
      console.log(`✅ Staging proxy running on port ${STAGING_PROXY_PORT}`);
    } catch {
      console.error(`❌ Staging proxy not running on port ${STAGING_PROXY_PORT}`);
      process.exit(1);
    }

    await uatSequelize.authenticate();
    console.log('✅ UAT database connected');
    
    await stagingSequelize.authenticate();
    console.log('✅ Staging database connected');
    console.log('');

    // Get all users from UAT
    const [uatUsers] = await uatSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      WHERE u.status = 'active'
      ORDER BY u.id
    `);

    console.log(`📊 Found ${uatUsers.length} active users in UAT`);
    console.log('');

    let synced = 0;
    let skipped = 0;
    let errors = 0;

    for (const uatUser of uatUsers) {
      try {
        // Get current staging status
        const [stagingUsers] = await stagingSequelize.query(`
          SELECT u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
                 w."kycVerified" as wallet_kyc_verified
          FROM users u
          LEFT JOIN wallets w ON u.id = w."userId"
          WHERE u.id = :userId
        `, {
          replacements: { userId: uatUser.id }
        });

        if (stagingUsers.length === 0) {
          console.log(`⚠️  User ID ${uatUser.id} (${uatUser.firstName} ${uatUser.lastName}) not found in staging - skipping`);
          skipped++;
          continue;
        }

        const stagingUser = stagingUsers[0];

        // Check if already matches
        if (uatUser.kycStatus === stagingUser.kycStatus && 
            uatUser.wallet_kyc_verified === stagingUser.wallet_kyc_verified) {
          console.log(`✅ User ID ${uatUser.id} (${uatUser.firstName} ${uatUser.lastName}) - already matches`);
          skipped++;
          continue;
        }

        // Sync user KYC status
        console.log(`🔄 Syncing User ID ${uatUser.id} (${uatUser.firstName} ${uatUser.lastName})...`);
        console.log(`   UAT: ${uatUser.kycStatus} (wallet: ${uatUser.wallet_kyc_verified ? 'verified' : 'not verified'})`);
        console.log(`   Staging: ${stagingUser.kycStatus} (wallet: ${stagingUser.wallet_kyc_verified ? 'verified' : 'not verified'})`);
        
        await stagingSequelize.query(`
          UPDATE users
          SET "kycStatus" = :kycStatus,
              "kycVerifiedAt" = :kycVerifiedAt,
              "kycVerifiedBy" = :kycVerifiedBy,
              "updatedAt" = :updatedAt
          WHERE id = :userId
        `, {
          replacements: {
            userId: uatUser.id,
            kycStatus: uatUser.kycStatus,
            kycVerifiedAt: uatUser.kycVerifiedAt,
            kycVerifiedBy: uatUser.kycVerifiedBy,
            updatedAt: new Date()
          }
        });

        // Sync wallet KYC status
        await stagingSequelize.query(`
          UPDATE wallets
          SET "kycVerified" = :kycVerified,
              "kycVerifiedAt" = :kycVerifiedAt,
              "kycVerifiedBy" = :kycVerifiedBy,
              updated_at = :updatedAt
          WHERE "userId" = :userId
        `, {
          replacements: {
            userId: uatUser.id,
            kycVerified: uatUser.wallet_kyc_verified || false,
            kycVerifiedAt: uatUser.kycVerifiedAt,
            kycVerifiedBy: uatUser.kycVerifiedBy,
            updatedAt: new Date()
          }
        });

        console.log(`   ✅ Synced successfully`);
        console.log('');
        synced++;

      } catch (error) {
        console.error(`   ❌ Failed to sync User ID ${uatUser.id}: ${error.message}`);
        errors++;
      }
    }

    console.log('═'.repeat(100));
    console.log(`📊 Sync Summary:`);
    console.log(`   Synced: ${synced} users`);
    console.log(`   Skipped (already match): ${skipped} users`);
    if (errors > 0) {
      console.log(`   Errors: ${errors} users`);
    }
    console.log('');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await uatSequelize.close();
    await stagingSequelize.close();
  }
}

syncAllUsersKyc();

