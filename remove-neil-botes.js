require('dotenv').config();
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function removeNeilBotes() {
  try {
    console.log('🗑️  Removing Neil Botes (user ID 3) and all associated data...');
    
    // Start transaction
    const transaction = await sequelize.transaction();
    
    try {
      // Check what data exists for Neil
      const [neilData] = await sequelize.query(
        'SELECT id, "firstName", "lastName", "phoneNumber" FROM users WHERE id = 3;',
        { transaction }
      );
      
      if (neilData.length === 0) {
        console.log('❌ Neil Botes (user ID 3) not found');
        return;
      }
      
      console.log('📋 Found Neil Botes:', neilData[0]);
      
      // Remove related data first (foreign key constraints)
      // Remove from wallets table
      const [walletResult] = await sequelize.query(
        'DELETE FROM wallets WHERE "userId" = 3;',
        { transaction }
      );
      console.log(`🗑️  Removed ${walletResult} wallet records`);
      
      // Remove from transactions table
      const [transactionResult] = await sequelize.query(
        'DELETE FROM transactions WHERE "walletId" IN (SELECT "walletId" FROM wallets WHERE "userId" = 3);',
        { transaction }
      );
      console.log(`🗑️  Removed ${transactionResult} transaction records`);
      
      // Remove from KYC table
      const [kycResult] = await sequelize.query(
        'DELETE FROM kyc WHERE "userId" = 3;',
        { transaction }
      );
      console.log(`🗑️  Removed ${kycResult} KYC records`);
      
      // Remove from vouchers table
      const [voucherResult] = await sequelize.query(
        'DELETE FROM vouchers WHERE "userId" = 3;',
        { transaction }
      );
      console.log(`🗑️  Removed ${voucherResult} voucher records`);
      
      // Finally remove the user
      const [userResult] = await sequelize.query(
        'DELETE FROM users WHERE id = 3;',
        { transaction }
      );
      console.log(`🗑️  Removed ${userResult} user record`);
      
      // Commit transaction
      await transaction.commit();
      
      console.log('✅ Neil Botes (user ID 3) successfully removed with all associated data');
      
      // Verify removal
      const [remainingUsers] = await sequelize.query(
        'SELECT id, "firstName", "lastName", "phoneNumber" FROM users ORDER BY id;'
      );
      
      console.log('\n👥 Remaining users:');
      remainingUsers.forEach(user => {
        console.log(`- ID ${user.id}: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
      });
      
    } catch (error) {
      // Rollback transaction on error
      await transaction.rollback();
      throw error;
    }
    
  } catch (error) {
    console.error('❌ Error removing Neil Botes:', error.message);
  } finally {
    await sequelize.close();
  }
}

removeNeilBotes();
