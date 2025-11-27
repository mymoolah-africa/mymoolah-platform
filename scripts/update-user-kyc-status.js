#!/usr/bin/env node
/**
 * Update User KYC Status in Staging Database
 * 
 * Usage:
 *   node scripts/update-user-kyc-status.js <userId> <kycStatus>
 * 
 * Example:
 *   node scripts/update-user-kyc-status.js 6 pending
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const { execSync } = require('child_process');

// Staging Database Connection
const STAGING_CONNECTION_NAME = 'mymoolah-db:africa-south1:mmtp-pg-staging';
const STAGING_DATABASE = 'mymoolah_staging';
const STAGING_USER = 'mymoolah_app';
const STAGING_PROXY_PORT = process.env.STAGING_PROXY_PORT || '5434';

// Valid KYC statuses
const VALID_KYC_STATUSES = ['not_started', 'pending', 'verified', 'rejected'];

// Get staging password from Secret Manager
function getStagingPassword() {
  try {
    return execSync(
      `gcloud secrets versions access latest --secret="db-mmtp-pg-staging-password" --project=mymoolah-db`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();
  } catch (error) {
    console.error(`❌ Failed to get password from Secret Manager`);
    console.error(`   Error: ${error.message}`);
    process.exit(1);
  }
}

async function updateUserKycStatus(userId, kycStatus) {
  // Validate KYC status
  if (!VALID_KYC_STATUSES.includes(kycStatus)) {
    console.error(`❌ Invalid KYC status: ${kycStatus}`);
    console.error(`   Valid statuses: ${VALID_KYC_STATUSES.join(', ')}`);
    process.exit(1);
  }

  // Get password
  const stagingPassword = getStagingPassword();
  
  // Build connection URL
  const stagingUrl = `postgres://${STAGING_USER}:${encodeURIComponent(stagingPassword)}@127.0.0.1:${STAGING_PROXY_PORT}/${STAGING_DATABASE}?sslmode=disable`;
  
  // Create Sequelize instance
  const stagingSequelize = new Sequelize(stagingUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: false }
  });

  try {
    // Check if proxy is running
    try {
      execSync(`lsof -i :${STAGING_PROXY_PORT}`, { stdio: 'ignore' });
      console.log(`✅ Staging proxy running on port ${STAGING_PROXY_PORT}`);
    } catch {
      console.error(`❌ Staging proxy not running on port ${STAGING_PROXY_PORT}`);
      console.error(`   Start it with: ./bin/cloud-sql-proxy ${STAGING_CONNECTION_NAME} --port=${STAGING_PROXY_PORT}`);
      process.exit(1);
    }

    // Test connection
    await stagingSequelize.authenticate();
    console.log('✅ Staging database connected');
    console.log('');

    // Get current user info
    const [users] = await stagingSequelize.query(`
      SELECT id, email, "firstName", "lastName", "phoneNumber", "kycStatus", "kycVerifiedAt", "kycVerifiedBy"
      FROM users
      WHERE id = :userId
    `, {
      replacements: { userId: parseInt(userId) }
    });

    if (users.length === 0) {
      console.error(`❌ User ID ${userId} not found in staging database`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`📋 Current user info:`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
    console.log(`   Current KYC Status: ${user.kycStatus}`);
    console.log(`   KYC Verified At: ${user.kycVerifiedAt || 'N/A'}`);
    console.log(`   KYC Verified By: ${user.kycVerifiedBy || 'N/A'}`);
    console.log('');

    // Update KYC status
    console.log(`🔄 Updating KYC status to: ${kycStatus}...`);
    
    // If setting to 'pending', clear verification fields
    // If setting to 'verified', set verification timestamp
    const updateFields = {
      kycStatus: kycStatus,
      updatedAt: new Date()
    };

    if (kycStatus === 'pending') {
      // KYC is required but not verified - clear verification fields
      updateFields.kycVerifiedAt = null;
      updateFields.kycVerifiedBy = null;
    } else if (kycStatus === 'verified') {
      // KYC is verified - set verification timestamp if not already set
      if (!user.kycVerifiedAt) {
        updateFields.kycVerifiedAt = new Date();
      }
      if (!user.kycVerifiedBy) {
        updateFields.kycVerifiedBy = 'system';
      }
    } else if (kycStatus === 'rejected' || kycStatus === 'not_started') {
      // Clear verification fields
      updateFields.kycVerifiedAt = null;
      updateFields.kycVerifiedBy = null;
    }

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
        kycStatus: updateFields.kycStatus,
        kycVerifiedAt: updateFields.kycVerifiedAt,
        kycVerifiedBy: updateFields.kycVerifiedBy,
        updatedAt: updateFields.updatedAt
      }
    });

    // Also update wallet KYC status to match
    const walletKycVerified = kycStatus === 'verified';
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
        kycVerified: walletKycVerified,
        kycVerifiedAt: updateFields.kycVerifiedAt,
        kycVerifiedBy: updateFields.kycVerifiedBy,
        updatedAt: updateFields.updatedAt
      }
    });

    console.log(`✅ KYC status updated successfully!`);
    console.log(`✅ Wallet KYC status updated to match user status`);
    console.log('');

    // Verify update
    const [updatedUsers] = await stagingSequelize.query(`
      SELECT id, email, "firstName", "lastName", "kycStatus", "kycVerifiedAt", "kycVerifiedBy"
      FROM users
      WHERE id = :userId
    `, {
      replacements: { userId: parseInt(userId) }
    });

    const updatedUser = updatedUsers[0];
    console.log(`📋 Updated user info:`);
    console.log(`   KYC Status: ${updatedUser.kycStatus}`);
    console.log(`   KYC Verified At: ${updatedUser.kycVerifiedAt || 'N/A'}`);
    console.log(`   KYC Verified By: ${updatedUser.kycVerifiedBy || 'N/A'}`);

  } catch (error) {
    console.error('❌ Update failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exit(1);
  } finally {
    await stagingSequelize.close();
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('❌ Error: Missing arguments');
  console.log('\nUsage:');
  console.log('  node scripts/update-user-kyc-status.js <userId> <kycStatus>');
  console.log('\nExample:');
  console.log('  node scripts/update-user-kyc-status.js 6 pending');
  console.log('\nValid KYC statuses:');
  VALID_KYC_STATUSES.forEach(status => {
    console.log(`  - ${status}`);
  });
  process.exit(1);
}

const userId = args[0];
const kycStatus = args[1].toLowerCase();

updateUserKycStatus(userId, kycStatus);

