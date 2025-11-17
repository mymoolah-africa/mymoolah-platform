#!/usr/bin/env node

/**
 * Quick script to check user information
 * Usage: node scripts/check-user.js [userId|phoneNumber]
 */

require('dotenv').config({ path: '.env' });
const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    const User = sequelize.models.User;
    const Kyc = sequelize.models.Kyc;
    
    const identifier = process.argv[2] || '6';
    let user;
    
    // Try as user ID first
    if (/^\d+$/.test(identifier)) {
      user = await User.findOne({ where: { id: parseInt(identifier) } });
      if (!user) {
        // Try as phone number
        user = await User.findOne({ where: { phoneNumber: identifier } });
      }
    } else {
      user = await User.findOne({ where: { phoneNumber: identifier } });
    }
    
    if (!user) {
      console.log(`❌ User not found: ${identifier}`);
      process.exit(1);
    }
    
    console.log('\n📋 USER INFORMATION:');
    console.log('   User ID:', user.id);
    console.log('   Name:', user.name || 'N/A');
    console.log('   Phone:', user.phoneNumber || 'N/A');
    console.log('   Email:', user.email || 'N/A');
    console.log('   KYC Status:', user.kycStatus || 'N/A');
    console.log('   Wallet KYC Verified:', user.walletKycVerified ? 'Yes' : 'No');
    
    const kycCount = await Kyc.count({ where: { userId: user.id } });
    console.log('   KYC Records:', kycCount);
    
    if (kycCount > 0) {
      const kycRecords = await Kyc.findAll({ 
        where: { userId: user.id },
        order: [['createdAt', 'DESC']],
        limit: 5
      });
      console.log('\n📄 Recent KYC Records:');
      kycRecords.forEach((record, idx) => {
        console.log(`   ${idx + 1}. Type: ${record.documentType || 'N/A'}, Status: ${record.status || 'N/A'}, Submitted: ${record.submittedAt ? new Date(record.submittedAt).toLocaleString() : 'N/A'}`);
      });
    }
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();

