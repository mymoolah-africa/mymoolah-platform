#!/usr/bin/env node
/**
 * Sync User KYC Status from UAT to Staging
 * 
 * This script copies the KYC status from UAT to staging for a specific user,
 * ensuring staging matches UAT exactly.
 * 
 * Usage:
 *   node scripts/sync-user-kyc-from-uat.js <userId>
 * 
 * Example:
 *   node scripts/sync-user-kyc-from-uat.js 6
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

async function syncKycStatus(userId) {
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

    // Get user from UAT
    const [uatUsers] = await uatSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      WHERE u.id = :userId
    `, {
      replacements: { userId: parseInt(userId) }
    });

    if (uatUsers.length === 0) {
      console.error(`❌ User ID ${userId} not found in UAT database`);
      process.exit(1);
    }

    const uatUser = uatUsers[0];
    console.log(`📋 UAT User Info:`);
    console.log(`   ID: ${uatUser.id}`);
    console.log(`   Name: ${uatUser.firstName} ${uatUser.lastName}`);
    console.log(`   Email: ${uatUser.email}`);
    console.log(`   Phone: ${uatUser.phoneNumber || 'N/A'}`);
    console.log(`   KYC Status: ${uatUser.kycStatus}`);
    console.log(`   KYC Verified At: ${uatUser.kycVerifiedAt || 'N/A'}`);
    console.log(`   KYC Verified By: ${uatUser.kycVerifiedBy || 'N/A'}`);
    console.log(`   Wallet KYC Verified: ${uatUser.wallet_kyc_verified ? 'Yes' : 'No'}`);
    console.log('');

    // Get user from staging
    const [stagingUsers] = await stagingSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      WHERE u.id = :userId
    `, {
      replacements: { userId: parseInt(userId) }
    });

    if (stagingUsers.length === 0) {
      console.error(`❌ User ID ${userId} not found in staging database`);
      process.exit(1);
    }

    const stagingUser = stagingUsers[0];
    console.log(`📋 Current Staging User Info:`);
    console.log(`   KYC Status: ${stagingUser.kycStatus}`);
    console.log(`   KYC Verified At: ${stagingUser.kycVerifiedAt || 'N/A'}`);
    console.log(`   KYC Verified By: ${stagingUser.kycVerifiedBy || 'N/A'}`);
    console.log(`   Wallet KYC Verified: ${stagingUser.wallet_kyc_verified ? 'Yes' : 'No'}`);
    console.log('');

    // Check if already matches
    if (uatUser.kycStatus === stagingUser.kycStatus && 
        uatUser.wallet_kyc_verified === stagingUser.wallet_kyc_verified) {
      console.log(`✅ KYC status already matches UAT - no update needed`);
      return;
    }

    // Sync user KYC status
    console.log(`🔄 Syncing KYC status from UAT to staging...`);
    
    await stagingSequelize.query(`
      UPDATE users
      SET "kycStatus" = :kycStatus,
          "kycVerifiedAt" = :kycVerifiedAt,
          "kycVerifiedBy" = :kycVerifiedBy,
          "updatedAt" = :updatedAt
      WHERE id = :userId
    `, {
      replacements: {
        userId: parseInt(userId),
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
        userId: parseInt(userId),
        kycVerified: uatUser.wallet_kyc_verified || false,
        kycVerifiedAt: uatUser.kycVerifiedAt,
        kycVerifiedBy: uatUser.kycVerifiedBy,
        updatedAt: new Date()
      }
    });

    console.log(`✅ KYC status synced successfully!`);
    console.log('');

    // Verify update
    const [updatedUsers] = await stagingSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      WHERE u.id = :userId
    `, {
      replacements: { userId: parseInt(userId) }
    });

    const updatedUser = updatedUsers[0];
    console.log(`📋 Updated Staging User Info:`);
    console.log(`   KYC Status: ${updatedUser.kycStatus}`);
    console.log(`   KYC Verified At: ${updatedUser.kycVerifiedAt || 'N/A'}`);
    console.log(`   KYC Verified By: ${updatedUser.kycVerifiedBy || 'N/A'}`);
    console.log(`   Wallet KYC Verified: ${updatedUser.wallet_kyc_verified ? 'Yes' : 'No'}`);
    console.log('');

    // Verify match
    if (uatUser.kycStatus === updatedUser.kycStatus && 
        uatUser.wallet_kyc_verified === updatedUser.wallet_kyc_verified) {
      console.log(`✅ KYC status now matches UAT!`);
    } else {
      console.log(`⚠️  Warning: Status may not match exactly`);
    }

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

// Parse command line arguments
const userId = process.argv[2];
if (!userId) {
  console.error('❌ Error: Missing userId argument');
  console.log('\nUsage:');
  console.log('  node scripts/sync-user-kyc-from-uat.js <userId>');
  console.log('\nExample:');
  console.log('  node scripts/sync-user-kyc-from-uat.js 6');
  process.exit(1);
}

syncKycStatus(userId);

