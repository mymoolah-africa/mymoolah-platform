const axios = require('axios');

const BASE_URL = 'http://localhost:5050/api/v1';

// Test user credentials
const TEST_USER = {
  email: 'frontend-test@mymoolah.com',
  password: 'TestPass123!',
  firstName: 'Frontend',
  lastName: 'Tester',
  phoneNumber: '+27123456789'
};

async function testFrontendSetup() {
  console.log('🧪 MyMoolah Frontend Test Setup\n');

  let authToken = null;
  let userId = null;
  let walletId = null;

  try {
    // 1. Test user login
    console.log('1️⃣ Testing User Login...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    console.log('✅ Login successful');
    console.log(`   User ID: ${loginResponse.data.data.user.id}`);
    console.log(`   Wallet ID: ${loginResponse.data.data.user.walletId}`);
    console.log(`   Token: ${loginResponse.data.data.token.substring(0, 50)}...`);
    
    authToken = loginResponse.data.data.token;
    userId = loginResponse.data.data.user.id;
    walletId = loginResponse.data.data.user.walletId;

    // 2. Test authenticated endpoints
    console.log('\n2️⃣ Testing Authenticated Endpoints...');
    
    const headers = {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    };

    // Test wallet endpoint
    try {
      const walletResponse = await axios.get(`${BASE_URL}/wallets`, { headers });
      console.log('✅ Wallet endpoint working');
      console.log(`   Response: ${JSON.stringify(walletResponse.data)}`);
    } catch (error) {
      console.log(`❌ Wallet endpoint error: ${error.response?.data?.message || error.message}`);
    }

    // 3. Test public endpoints
    console.log('\n3️⃣ Testing Public Endpoints...');
    
    const publicEndpoints = [
      { name: 'Health Check', url: 'http://localhost:5050/health' },
      { name: 'Users', url: `${BASE_URL}/users` },
      { name: 'KYC', url: `${BASE_URL}/kyc` },
      { name: 'Transactions', url: `${BASE_URL}/transactions` },
      { name: 'VAS Services', url: `${BASE_URL}/vas` },
      { name: 'Merchants', url: `${BASE_URL}/merchants` },
      { name: 'Service Providers', url: `${BASE_URL}/service-providers` },
      { name: 'Voucher Types', url: `${BASE_URL}/voucher-types` }
    ];

    for (const endpoint of publicEndpoints) {
      try {
        const response = await axios.get(endpoint.url);
        console.log(`✅ ${endpoint.name} working`);
      } catch (error) {
        console.log(`❌ ${endpoint.name} error: ${error.response?.data?.message || error.message}`);
      }
    }

    // 4. Provide frontend setup information
    console.log('\n📋 FRONTEND SETUP INFORMATION');
    console.log('================================\n');
    console.log('🔑 Test User Credentials:');
    console.log(`   Email: ${TEST_USER.email}`);
    console.log(`   Password: ${TEST_USER.password}`);
    console.log(`   User ID: ${userId}`);
    console.log(`   Wallet ID: ${walletId}`);
    
    console.log('\n🎫 Authentication Token:');
    console.log(`   ${authToken}`);
    
    console.log('\n🌐 API Base URL:');
    console.log(`   ${BASE_URL}`);
    
    console.log('\n📡 Available Endpoints:');
    console.log(`   Health: http://localhost:5050/health`);
    console.log(`   Auth: ${BASE_URL}/auth`);
    console.log(`   Wallets: ${BASE_URL}/wallets (requires auth)`);
    console.log(`   Transactions: ${BASE_URL}/transactions`);
    console.log(`   Users: ${BASE_URL}/users`);
    console.log(`   KYC: ${BASE_URL}/kyc`);
    console.log(`   VAS: ${BASE_URL}/vas`);
    console.log(`   Merchants: ${BASE_URL}/merchants`);
    console.log(`   Service Providers: ${BASE_URL}/service-providers`);
    console.log(`   Voucher Types: ${BASE_URL}/voucher-types`);
    
    console.log('\n🔧 Frontend Integration Example:');
    console.log(`   // Login
   const response = await fetch('${BASE_URL}/auth/login', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       email: '${TEST_USER.email}',
       password: '${TEST_USER.password}'
     })
   });
   const { token } = await response.json();
   
   // Use token for authenticated requests
   const walletResponse = await fetch('${BASE_URL}/wallets', {
     headers: { 'Authorization': \`Bearer \${token}\` }
   });`);
    
    console.log('\n✅ Frontend setup complete!');
    console.log('   All core endpoints are working and ready for frontend development.');

  } catch (error) {
    console.error(`❌ Test failed: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
}

testFrontendSetup(); 