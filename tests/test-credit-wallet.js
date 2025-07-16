const axios = require('axios');

const API_BASE = 'http://localhost:5050/api/v1';

async function testCreditWallet() {
  console.log('🧪 Testing Credit Wallet Endpoint...\n');

  try {
    // Step 1: Register a new user
    console.log('1️⃣ Registering new user...');
    const timestamp = Date.now();
    const registerData = {
      email: `credit${timestamp}@mymoolah.com`,
      password: 'password123',
      firstName: 'Credit',
      lastName: 'Test',
      phoneNumber: '+27123456789'
    };

    const registerResponse = await axios.post(`${API_BASE}/auth/register`, registerData);
    console.log('✅ User registered successfully!');
    console.log('   User ID:', registerResponse.data.data.user.id);
    console.log('   Wallet ID:', registerResponse.data.data.user.walletId);

    const token = registerResponse.data.data.token;

    // Step 2: Test credit wallet with timeout
    console.log('\n2️⃣ Testing Credit Wallet...');
    console.log('   Sending request to credit wallet...');
    
    const creditResponse = await axios.post(`${API_BASE}/wallet/credit`, {
      amount: 50.00
    }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 // 10 second timeout
    });
    
    console.log('✅ Credit wallet response received!');
    console.log('   Response:', creditResponse.data);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Response status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
  }
}

// Run the test
testCreditWallet(); 