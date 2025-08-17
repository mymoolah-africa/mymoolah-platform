require('dotenv').config();
const { Sequelize } = require('sequelize');

// Database connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false
});

async function checkUserTable() {
  try {
    // Check table structure
    const [columns] = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
    );
    
    console.log('📋 Users table structure:');
    columns.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type}`);
    });
    
    // Check existing users
    const [users] = await sequelize.query(
      'SELECT id, "firstName", "lastName", "phoneNumber" FROM users ORDER BY id;'
    );
    
    console.log('\n👥 Existing users:');
    users.forEach(user => {
      console.log(`- ID ${user.id}: ${user.firstName} ${user.lastName} (${user.phoneNumber})`);
    });
    
    // Check user ID 1 specifically
    const [user1] = await sequelize.query(
      'SELECT * FROM users WHERE id = 1;'
    );
    
    console.log('\n🔍 User ID 1 details:');
    if (user1.length > 0) {
      console.log('User found:', user1[0]);
    } else {
      console.log('❌ No user found with ID 1');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkUserTable();
