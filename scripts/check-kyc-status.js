#!/usr/bin/env node

/**
 * Check KYC Status Script
 * 
 * Usage:
 *   node scripts/check-kyc-status.js <identifier>
 * 
 * Examples:
 *   node scripts/check-kyc-status.js 0686772469
 *   node scripts/check-kyc-status.js "Denise Botes"
 *   node scripts/check-kyc-status.js 8
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Database connection setup
const getDatabaseUrl = () => {
  const dbUrl = process.env.DATABASE_URL || '';
  if (dbUrl.includes('127.0.0.1:6543') || dbUrl.includes('localhost:6543') || 
      dbUrl.includes('127.0.0.1:5433') || dbUrl.includes('localhost:5433')) {
    return dbUrl.replace(/[?&]sslmode=[^&]*/g, '').replace(/[?&]ssl=[^&]*/g, '');
  } else {
    const match = dbUrl.match(/postgres:\/\/([^:]+):([^@]+)@([^\/]+)\/([^?]+)/);
    if (match) {
      const [, user, password, , database] = match;
      const proxyPort = process.env.PROXY_PORT || '6543';
      return `postgres://${user}:${password}@127.0.0.1:${proxyPort}/${database}`;
    }
  }
  return dbUrl;
};

const dbUrl = getDatabaseUrl();
const sequelize = new Sequelize(dbUrl, {
  dialect: 'postgres',
  logging: false,
  pool: { max: 5, min: 0, acquire: 10000, idle: 10000 },
  dialectOptions: { ssl: false }
});

// Find user (same logic as lookup-user.js)
const findUser = async (identifier) => {
  let query;
  let queryParams = {};
  
  if (/^\d+$/.test(identifier.trim()) && identifier.trim().length <= 10) {
    query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "kycStatus", "idNumber", "idType", "createdAt", "updatedAt" FROM users WHERE id = :id LIMIT 1`;
    queryParams = { id: parseInt(identifier.trim()) };
  } else if (/^[\d\s\+\-\(\)]+$/.test(identifier.trim())) {
    const phoneClean = identifier.trim().replace(/[\s\+\-\(\)]/g, '');
    let phoneVariants = [identifier.trim()];
    if (phoneClean !== identifier.trim()) phoneVariants.push(phoneClean);
    if (phoneClean.startsWith('0') && phoneClean.length === 10) {
      const withoutZero = phoneClean.substring(1);
      phoneVariants.push(withoutZero, `+27${withoutZero}`, `27${withoutZero}`);
    } else if (phoneClean.startsWith('27') && phoneClean.length === 11) {
      phoneVariants.push(`+${phoneClean}`, `0${phoneClean.substring(2)}`);
    } else if (phoneClean.startsWith('+27') && phoneClean.length === 12) {
      phoneVariants.push(phoneClean.substring(1), `0${phoneClean.substring(3)}`);
    }
    phoneVariants = [...new Set(phoneVariants)];
    const conditions = phoneVariants.map((v, i) => {
      queryParams[`phone${i+1}`] = `%${v}%`;
      return `"phoneNumber" LIKE :phone${i+1}`;
    }).join(' OR ');
    query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "kycStatus", "idNumber", "idType", "createdAt", "updatedAt" FROM users WHERE ${conditions} LIMIT 1`;
  } else {
    const nameParts = identifier.trim().split(/\s+/);
    if (nameParts.length >= 2) {
      query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "kycStatus", "idNumber", "idType", "createdAt", "updatedAt" FROM users WHERE "firstName" ILIKE :firstName AND "lastName" ILIKE :lastName LIMIT 1`;
      queryParams = { firstName: `%${nameParts[0]}%`, lastName: `%${nameParts.slice(1).join(' ')}%` };
    } else {
      query = `SELECT id, email, "firstName", "lastName", "phoneNumber", "kycStatus", "idNumber", "idType", "createdAt", "updatedAt" FROM users WHERE "firstName" ILIKE :firstName OR "lastName" ILIKE :lastName LIMIT 1`;
      queryParams = { firstName: `%${nameParts[0]}%`, lastName: `%${nameParts[0]}%` };
    }
  }
  
  const [results] = await sequelize.query(query, {
    replacements: queryParams,
    type: Sequelize.QueryTypes.SELECT
  });
  return results;
};

// Get KYC records for user
const getKYCRecords = async (userId) => {
  const [results] = await sequelize.query(
    `SELECT id, "userId", status, "documentType", "createdAt", "updatedAt", "verifiedAt", "verifiedBy"
     FROM kyc
     WHERE "userId" = :userId
     ORDER BY "createdAt" DESC
     LIMIT 5`,
    {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT
    }
  );
  return results;
};

// Get wallet KYC status
const getWalletKYCStatus = async (userId) => {
  const [results] = await sequelize.query(
    `SELECT "kycVerified", "kycVerifiedAt", "kycVerifiedBy"
     FROM wallets
     WHERE "userId" = :userId
     LIMIT 1`,
    {
      replacements: { userId },
      type: Sequelize.QueryTypes.SELECT
    }
  );
  return results;
};

const main = async () => {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Usage: node scripts/check-kyc-status.js <identifier>');
    console.error('Examples:');
    console.error('  node scripts/check-kyc-status.js 0686772469');
    console.error('  node scripts/check-kyc-status.js "Denise Botes"');
    console.error('  node scripts/check-kyc-status.js 8');
    process.exit(1);
  }
  
  try {
    console.log('🔍 Searching for user...');
    const user = await findUser(args[0]);
    
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log('');
    console.log('👤 User Information:');
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.firstName} ${user.lastName}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Phone: ${user.phoneNumber}`);
    console.log(`   ID Number: ${user.idNumber || 'N/A'}`);
    console.log(`   ID Type: ${user.idType || 'N/A'}`);
    console.log(`   User KYC Status: ${user.kycStatus || 'not_started'}`);
    console.log(`   Created: ${user.createdAt}`);
    console.log(`   Updated: ${user.updatedAt}`);
    console.log('');
    
    // Get wallet KYC status
    const wallet = await getWalletKYCStatus(user.id);
    if (wallet) {
      console.log('💼 Wallet KYC Status:');
      console.log(`   KYC Verified: ${wallet.kycVerified ? '✅ YES' : '❌ NO'}`);
      if (wallet.kycVerifiedAt) {
        console.log(`   Verified At: ${wallet.kycVerifiedAt}`);
        console.log(`   Verified By: ${wallet.kycVerifiedBy || 'N/A'}`);
      }
      console.log('');
    }
    
    // Get KYC records
    const kycRecords = await getKYCRecords(user.id);
    if (kycRecords && kycRecords.length > 0) {
      console.log(`📋 KYC Records (${kycRecords.length}):`);
      kycRecords.forEach((record, index) => {
        console.log(`   ${index + 1}. Record ID: ${record.id}`);
        console.log(`      Status: ${record.status}`);
        console.log(`      Document Type: ${record.documentType || 'N/A'}`);
        console.log(`      Created: ${record.createdAt}`);
        if (record.verifiedAt) {
          console.log(`      Verified: ${record.verifiedAt} by ${record.verifiedBy || 'N/A'}`);
        }
        console.log(`      Updated: ${record.updatedAt}`);
        console.log('');
      });
    } else {
      console.log('📋 KYC Records: None found');
      console.log('');
    }
    
    // Summary
    console.log('📊 Summary:');
    const isVerified = (user.kycStatus === 'verified') || (wallet && wallet.kycVerified);
    if (isVerified) {
      console.log('   ✅ KYC VERIFIED');
    } else {
      console.log('   ⏳ KYC NOT VERIFIED');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (process.env.DEBUG) {
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  } finally {
    await sequelize.close();
  }
};

main();

