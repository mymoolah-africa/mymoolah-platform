// Cleanup script for test KYC records
const { sequelize } = require('./models');
const { Kyc } = require('./models');
const { Op } = require('sequelize');

async function cleanupTestKYC() {
  try {
    console.log('🧹 Starting KYC cleanup...');
    
    // Find and delete test KYC records (those with airtime-related documents)
    const deletedRecords = await Kyc.destroy({
      where: {
        documentImageUrl: {
          [Op.like]: '%MM Buy Airtime%'
        }
      }
    });
    
    console.log(`✅ Deleted ${deletedRecords} test KYC records`);
    
    // Also clean up any records from the last 24 hours that might be test data
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentTestRecords = await Kyc.destroy({
      where: {
        createdAt: {
          [Op.gte]: yesterday
        },
        documentNumber: 'N/A' // These are likely test records
      }
    });
    
    console.log(`✅ Deleted ${recentTestRecords} recent test KYC records`);
    
    console.log('✅ KYC cleanup completed');
    
  } catch (error) {
    console.error('❌ Error during KYC cleanup:', error);
  } finally {
    await sequelize.close();
  }
}

// Run cleanup if this script is executed directly
if (require.main === module) {
  cleanupTestKYC();
}

module.exports = cleanupTestKYC; 