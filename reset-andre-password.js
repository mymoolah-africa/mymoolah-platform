require('dotenv').config();
const bcrypt = require('bcryptjs');
const { Sequelize, DataTypes } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function resetAndrePassword() {
  try {
    // Generate new password hash
    const newPasswordHash = await bcrypt.hash('Andre123!', 10);
    
    // Update Andre's password (user ID 1) using correct column name
    const result = await sequelize.query(
      'UPDATE users SET password_hash = $1 WHERE id = 1',
      {
        bind: [newPasswordHash],
        type: Sequelize.QueryTypes.UPDATE
      }
    );
    
    console.log('✅ Andre\'s password successfully reset to "Andre123!"');
    console.log('User ID 1 (Andre Botes) can now log in with:');
    console.log('- Mobile: +27825571055');
    console.log('- Password: Andre123!');
    
    // Verify the update
    const [user] = await sequelize.query(
      'SELECT id, "firstName", "lastName", "phoneNumber" FROM users WHERE id = 1;'
    );
    
    if (user.length > 0) {
      console.log('\n✅ Verification - User found:', user[0]);
    }
    
  } catch (error) {
    console.error('❌ Error resetting password:', error.message);
  } finally {
    await sequelize.close();
  }
}

resetAndrePassword();
