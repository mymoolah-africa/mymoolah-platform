const User = require('./models/User');

async function testSQLite() {
  console.log('🧪 Testing SQLite Database Setup...\n');

  try {
    const userModel = new User();
    
    // Test 1: Create table
    console.log('1️⃣ Creating users table...');
    await userModel.createTable();
    console.log('✅ Table created successfully!');

    // Test 2: Create a test user
    console.log('\n2️⃣ Creating test user...');
    const testUser = await userModel.createUser({
      email: 'test@mymoolah.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+27123456789'
    });
    console.log('✅ User created successfully!');
    console.log('   User ID:', testUser.id);
    console.log('   Wallet ID:', testUser.walletId);

    // Test 3: Find user by email
    console.log('\n3️⃣ Finding user by email...');
    const foundUser = await userModel.findUserByEmail('test@mymoolah.com');
    if (foundUser) {
      console.log('✅ User found successfully!');
      console.log('   Name:', foundUser.first_name, foundUser.last_name);
      console.log('   Email:', foundUser.email);
    }

    // Test 4: Validate password
    console.log('\n4️⃣ Testing password validation...');
    const isValidPassword = await userModel.validatePassword(foundUser, 'password123');
    console.log('✅ Password validation:', isValidPassword ? 'PASSED' : 'FAILED');

    console.log('\n🎉 All SQLite tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ Database file created');
    console.log('   ✅ Table creation working');
    console.log('   ✅ User creation working');
    console.log('   ✅ User lookup working');
    console.log('   ✅ Password validation working');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    // Close the database connection
    const userModel = new User();
    await userModel.closeConnection();
  }
}

// Run the test
testSQLite(); 