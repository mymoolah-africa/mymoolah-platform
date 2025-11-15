const { Sequelize } = require('sequelize');

// Use Codespaces database URL directly (override any .env settings)
const DATABASE_URL = 'postgres://mymoolah_app:B0t3s%40Mymoolah@34.35.84.201:5432/mymoolah?sslmode=require';

const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function resetKYC(userId) {
  try {
    console.log(`🔄 Resetting KYC status for user ID ${userId}...`);
    
    // Test connection
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    // Delete all KYC records
    const [deletedKyc] = await sequelize.query(`
      DELETE FROM "kyc" WHERE "userId" = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.DELETE
    });
    console.log(`✅ Deleted KYC records for user ${userId}`);
    
    // Reset wallet KYC status
    await sequelize.query(`
      UPDATE "wallets" 
      SET "kycVerified" = false, 
          "kycVerifiedAt" = NULL, 
          "kycVerifiedBy" = NULL
      WHERE "userId" = :userId
    `, {
      replacements: { userId }
    });
    console.log('✅ Reset wallet KYC verification');
    
    // Reset user KYC status
    await sequelize.query(`
      UPDATE "users" 
      SET "kycStatus" = 'not_started'
      WHERE "id" = :userId
    `, {
      replacements: { userId }
    });
    console.log('✅ Reset user KYC status to "not_started"');
    
    // Verify reset
    const [userResult] = await sequelize.query(`
      SELECT "id", "firstName", "lastName", "phoneNumber", "kycStatus" 
      FROM "users" 
      WHERE "id" = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    const [walletResult] = await sequelize.query(`
      SELECT "walletId", "kycVerified", "kycVerifiedAt" 
      FROM "wallets" 
      WHERE "userId" = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    const [kycCount] = await sequelize.query(`
      SELECT COUNT(*) as count 
      FROM "kyc" 
      WHERE "userId" = :userId
    `, {
      replacements: { userId },
      type: sequelize.QueryTypes.SELECT
    });
    
    console.log('\n✅ KYC Reset Complete!');
    console.log(`   User: ${userResult?.firstName} ${userResult?.lastName} (${userResult?.phoneNumber})`);
    console.log(`   User KYC Status: ${userResult?.kycStatus}`);
    console.log(`   Wallet KYC Verified: ${walletResult?.kycVerified || false}`);
    console.log(`   KYC Records Remaining: ${kycCount?.count || 0}`);
    
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

