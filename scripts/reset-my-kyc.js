require('dotenv').config();
const { sequelize } = require('../models');
const User = require('../models/User')(sequelize, require('sequelize').DataTypes);
const Wallet = require('../models/Wallet')(sequelize, require('sequelize').DataTypes);
const Kyc = require('../models/Kyc')(sequelize, require('sequelize').DataTypes);

async function resetMyKYC() {
  const userId = 1; // Your user ID
  const phoneNumber = '0825571055'; // Your phone number for verification
  
  try {
    console.log('🔄 Resetting KYC status for user ID', userId, '...');
    
    // Verify user exists
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    // Verify phone number matches (safety check)
    const userPhone = (user.phoneNumber || user.identifier || '').replace(/^\+?27/, '0');
    if (userPhone !== phoneNumber) {
      console.error(`❌ Phone number mismatch! Expected ${phoneNumber}, found ${userPhone}`);
      console.error('⚠️  Aborting for safety. If this is correct, update the phoneNumber in the script.');
      process.exit(1);
    }
    
    console.log(`✅ Verified user: ${user.firstName} ${user.lastName} (${userPhone})`);
    
    // Delete KYC records
    const deletedKyc = await Kyc.destroy({ where: { userId } });
    console.log(`✅ Deleted ${deletedKyc} KYC record(s)`);
    
    // Reset wallet KYC status
    const wallet = await Wallet.findOne({ where: { userId } });
    if (wallet) {
      await wallet.update({ 
        kycVerified: false, 
        kycVerifiedAt: null, 
        kycVerifiedBy: null 
      });
      console.log('✅ Reset wallet KYC verification');
    } else {
      console.log('⚠️  No wallet found for user');
    }
    
    // Reset user KYC status
    await user.update({ kycStatus: 'not_started' });
    console.log('✅ Reset user KYC status to "not_started"');
    
    // Verify reset
    const updatedUser = await User.findOne({ where: { id: userId } });
    const updatedWallet = await Wallet.findOne({ where: { userId } });
    
    console.log('\n✅ KYC Reset Complete!');
    console.log(`   User KYC Status: ${updatedUser.kycStatus}`);
    console.log(`   Wallet KYC Verified: ${updatedWallet?.kycVerified || false}`);
    console.log(`   KYC Records: ${await Kyc.count({ where: { userId } })}`);
    
    console.log('\n📋 Next Steps:');
    console.log('   1. Log out and log back in to refresh your session');
    console.log('   2. Navigate to the KYC documents page');
    console.log('   3. Upload your ID document to test the simplified OCR');
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting KYC:', error);
    await sequelize.close();
    process.exit(1);
  }
}

resetMyKYC();

