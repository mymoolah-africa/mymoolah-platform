require('dotenv').config();

// Use the existing models setup (same as backend server)
const { sequelize } = require('../models');
const User = require('../models/User')(sequelize, require('sequelize').DataTypes);
const Wallet = require('../models/Wallet')(sequelize, require('sequelize').DataTypes);
const Kyc = require('../models/Kyc')(sequelize, require('sequelize').DataTypes);

async function resetKYC(userId) {
  try {
    console.log(`🔄 Resetting KYC status for user ID ${userId}...`);
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Verify user exists
    const user = await User.findOne({ where: { id: userId } });
    if (!user) {
      console.error('❌ User not found');
      process.exit(1);
    }
    
    console.log(`✅ Found user: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
    
    // Delete all KYC records
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
    const kycCount = await Kyc.count({ where: { userId } });
    
    console.log('\n✅ KYC Reset Complete!');
    console.log(`   User: ${updatedUser.firstName} ${updatedUser.lastName} (${updatedUser.phoneNumber})`);
    console.log(`   User KYC Status: ${updatedUser.kycStatus}`);
    console.log(`   Wallet KYC Verified: ${updatedWallet?.kycVerified || false}`);
    console.log(`   KYC Records Remaining: ${kycCount}`);
    
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting KYC:', error.message);
    console.error('❌ Full error:', error);
    await sequelize.close();
    process.exit(1);
  }
}

// Reset KYC for user ID 1
resetKYC(1);

