#!/usr/bin/env node

/**
 * Quick script to verify user information and KYC status
 * Usage: node scripts/verify-user-kyc.js [phoneNumber|userId]
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function verifyUser(identifier) {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established');

    const User = sequelize.models.User;
    const Kyc = sequelize.models.Kyc;

    // Try to find by phone number or user ID
    let user;
    if (/^\d+$/.test(identifier)) {
      // Numeric - could be user ID or phone number
      user = await User.findOne({
        where: { id: parseInt(identifier) }
      });
      if (!user) {
        // Try as phone number
        user = await User.findOne({
          where: { phoneNumber: identifier }
        });
      }
    } else {
      // Try as phone number
      user = await User.findOne({
        where: { phoneNumber: identifier }
      });
    }

    if (!user) {
      console.log(`❌ User not found: ${identifier}`);
      process.exit(1);
    }

    console.log('\n📋 USER INFORMATION:');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Name: ${user.name || 'N/A'}`);
    console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
    console.log(`   Email: ${user.email || 'N/A'}`);
    console.log(`   KYC Status: ${user.kycStatus || 'N/A'}`);
    console.log(`   Wallet KYC Verified: ${user.walletKycVerified ? 'Yes' : 'No'}`);

    // Get KYC records
    const kycRecords = await Kyc.findAll({
      where: { userId: user.id },
      order: [['createdAt', 'DESC']]
    });

    console.log(`\n📄 KYC RECORDS: ${kycRecords.length}`);
    if (kycRecords.length > 0) {
      kycRecords.forEach((record, index) => {
        console.log(`\n   Record ${index + 1}:`);
        console.log(`     Document Type: ${record.documentType || 'N/A'}`);
        console.log(`     Status: ${record.status || 'N/A'}`);
        console.log(`     Submitted: ${record.submittedAt ? new Date(record.submittedAt).toLocaleString() : 'N/A'}`);
        console.log(`     Reviewed: ${record.reviewedAt ? new Date(record.reviewedAt).toLocaleString() : 'N/A'}`);
        console.log(`     Automated: ${record.isAutomated ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No KYC records found');
    }

    console.log('\n✅ Verification complete');
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

const identifier = process.argv[2];
if (!identifier) {
  console.log('Usage: node scripts/verify-user-kyc.js [phoneNumber|userId]');
  console.log('Example: node scripts/verify-user-kyc.js 0686772469');
  console.log('Example: node scripts/verify-user-kyc.js 6');
  process.exit(1);
}

verifyUser(identifier);

