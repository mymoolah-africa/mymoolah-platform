#!/usr/bin/env node
/**
 * Check User KYC Status in UAT and Staging Databases
 * 
 * Usage:
 *   node scripts/check-user-kyc-status.js [userId]
 * 
 * Example:
 *   node scripts/check-user-kyc-status.js 6
 *   node scripts/check-user-kyc-status.js  # Shows all users
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

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
    // Try DATABASE_URL from .env
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
  
  // For staging, get from Secret Manager
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

async function checkKycStatus(userId = null) {
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
    await uatSequelize.authenticate();
    console.log('✅ UAT database connected');
    
    await stagingSequelize.authenticate();
    console.log('✅ Staging database connected');
    console.log('');

    // Build query
    const whereClause = userId ? 'WHERE u.id = :userId' : '';
    const replacements = userId ? { userId: parseInt(userId) } : {};

    // Get UAT users
    const [uatUsers] = await uatSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      ${whereClause}
      ORDER BY u.id
    `, { replacements });

    // Get staging users
    const [stagingUsers] = await stagingSequelize.query(`
      SELECT u.id, u.email, u."firstName", u."lastName", u."phoneNumber",
             u."kycStatus", u."kycVerifiedAt", u."kycVerifiedBy",
             w."kycVerified" as wallet_kyc_verified
      FROM users u
      LEFT JOIN wallets w ON u.id = w."userId"
      ${whereClause}
      ORDER BY u.id
    `, { replacements });

    console.log('📊 KYC Status Comparison:');
    console.log('═'.repeat(100));
    console.log('');

    // Create maps for easy lookup
    const stagingMap = new Map();
    stagingUsers.forEach(u => stagingMap.set(u.id, u));

    uatUsers.forEach(uatUser => {
      const stagingUser = stagingMap.get(uatUser.id);
      
      console.log(`👤 User ID ${uatUser.id}: ${uatUser.firstName} ${uatUser.lastName}`);
      console.log(`   Email: ${uatUser.email}`);
      console.log(`   Phone: ${uatUser.phoneNumber || 'N/A'}`);
      console.log('');
      console.log(`   UAT Status:`);
      console.log(`     KYC Status: ${uatUser.kycStatus}`);
      console.log(`     KYC Verified At: ${uatUser.kycVerifiedAt || 'N/A'}`);
      console.log(`     KYC Verified By: ${uatUser.kycVerifiedBy || 'N/A'}`);
      console.log(`     Wallet KYC Verified: ${uatUser.wallet_kyc_verified ? 'Yes' : 'No'}`);
      console.log('');
      
      if (stagingUser) {
        console.log(`   Staging Status:`);
        console.log(`     KYC Status: ${stagingUser.kycStatus}`);
        console.log(`     KYC Verified At: ${stagingUser.kycVerifiedAt || 'N/A'}`);
        console.log(`     KYC Verified By: ${stagingUser.kycVerifiedBy || 'N/A'}`);
        console.log(`     Wallet KYC Verified: ${stagingUser.wallet_kyc_verified ? 'Yes' : 'No'}`);
        console.log('');
        
        // Check if they match
        const statusMatch = uatUser.kycStatus === stagingUser.kycStatus;
        const walletMatch = uatUser.wallet_kyc_verified === stagingUser.wallet_kyc_verified;
        
        if (statusMatch && walletMatch) {
          console.log(`   ✅ Status matches UAT`);
        } else {
          console.log(`   ⚠️  Status MISMATCH:`);
          if (!statusMatch) {
            console.log(`      - KYC Status: UAT=${uatUser.kycStatus}, Staging=${stagingUser.kycStatus}`);
          }
          if (!walletMatch) {
            console.log(`      - Wallet KYC: UAT=${uatUser.wallet_kyc_verified}, Staging=${stagingUser.wallet_kyc_verified}`);
          }
        }
      } else {
        console.log(`   ❌ User not found in staging`);
      }
      console.log('');
      console.log('─'.repeat(100));
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
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
const userId = process.argv[2] ? parseInt(process.argv[2]) : null;

checkKycStatus(userId);

