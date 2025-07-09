const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1/auth';

async function testAuth() {
  console.log('🧪 Testing MyMoolah Authentication System...\n');

  try {
    // Test 1: Register a new user
    console.log('1️⃣ Testing User Registration...');
    const registerData = {
      email: 'test@mymoolah.com',
      password: 'password123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '+27123456789'
    };

    const registerResponse = await axios.post(`${API_BASE}/register`, registerData);
    console.log('✅ Registration successful!');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Wallet ID:', registerResponse.data.data.user.walletId);
    console.log('   Token received:', registerResponse.data.data.token ? 'Yes' : 'No');

    const token = registerResponse.data.data.token;

    // Test 2: Login with the same user
    console.log('\n2️⃣ Testing User Login...');
    const loginData = {
      email: 'test@mymoolah.com',
      password: 'password123'
    };

    const loginResponse = await axios.post(`${API_BASE}/login`, loginData);
    console.log('✅ Login successful!');
    console.log('   Balance:', loginResponse.data.data.user.balance);

    // Test 3: Get user profile (protected route)
    console.log('\n3️⃣ Testing Protected Route (Profile)...');
    const profileResponse = await axios.get(`${API_BASE}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    console.log('✅ Profile access successful!');
    console.log('   User:', profileResponse.data.data.user.firstName, profileResponse.data.data.user.lastName);
    console.log('   Email:', profileResponse.data.data.user.email);

    console.log('\n🎉 All authentication tests passed!');
    console.log('\n📊 Summary:');
    console.log('   ✅ User registration working');
    console.log('   ✅ User login working');
    console.log('   ✅ JWT token authentication working');
    console.log('   ✅ Protected routes working');
    console.log('   ✅ Database operations working');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
  }
}

// Run the test
testAuth(); 