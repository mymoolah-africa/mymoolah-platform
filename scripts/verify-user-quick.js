#!/usr/bin/env node

/**
 * Quick verification script - can be run directly in Codespaces
 * Usage: node -e "$(cat <<'EOF'
 * ...paste script content...
 * EOF
 * )" 6
 */

require('dotenv').config({ path: '.env' });
const { sequelize } = require('../models');

(async () => {
  try {
    await sequelize.authenticate();
    const User = sequelize.models.User;
    const Kyc = sequelize.models.Kyc;
    
    const identifier = process.argv[2] || '6';
    let user = await User.findOne({ where: { id: parseInt(identifier) } });
    if (!user) user = await User.findOne({ where: { phoneNumber: identifier } });
    
    if (!user) {
      console.log(`❌ User not found: ${identifier}`);
      process.exit(1);
    }
    
    console.log(`\n📋 USER: ${user.name || 'N/A'}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Phone: ${user.phoneNumber || 'N/A'}`);
    console.log(`   KYC Status: ${user.kycStatus || 'N/A'}`);
    console.log(`   Wallet KYC Verified: ${user.walletKycVerified ? 'Yes' : 'No'}`);
    
    const kycCount = await Kyc.count({ where: { userId: user.id } });
    console.log(`   KYC Records: ${kycCount}`);
    
    await sequelize.close();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

