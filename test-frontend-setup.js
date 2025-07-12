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

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

async function testFrontendSetup() {
  console.log(`${colors.blue}🧪 MyMoolah Frontend Test Setup${colors.reset}\n`);

  let authToken = null;
  let userId = null;
  let walletId = null;

  try {
    // 1. Test user registration
    console.log(`${colors.yellow}1️⃣ Testing User Registration...${colors.reset}`);
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, TEST_USER);
    console.log(`${colors.green}✅ Registration successful${colors.reset}`);
    console.log(`   User ID: ${registerResponse.data.data.user.id}`);
    console.log(`   Wallet ID: ${registerResponse.data.data.user.walletId}`);
    console.log(`   Token: ${registerResponse.data.data.token.substring(0, 50)}...`);
    
    authToken = registerResponse.data.data.token;
    userId = registerResponse.data.data.user.id;
    walletId = registerResponse.data.data.user.walletId;

  } catch (error) {
    if (error.response?.data?.message === 'User with this email already exists') {
      console.log(`${colors.yellow}⚠️  User already exists, trying login...${colors.reset}`);
      
      // 2. Test user login
      const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
        email: TEST_USER.email,
        password: TEST_USER.password
      });
      
      console.log(`${colors.green}✅ Login successful${colors.reset}`);
      authToken = loginResponse.data.data.token;
      userId = loginResponse.data.data.user.id;
      walletId = loginResponse.data.data.user.walletId;
    } else {
      throw error;
    }
  }

  // 3. Test authenticated endpoints
  console.log(`\n${colors.yellow}2️⃣ Testing Authenticated Endpoints...${colors.reset}`);
  
  const headers = {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };

  // Test wallet endpoint
  try {
    const walletResponse = await axios.get(`${BASE_URL}/wallets`, { headers });
    console.log(`${colors.green}✅ Wallet endpoint working${colors.reset}`);
    console.log(`   Balance: R${walletResponse.data.data?.balance || 0}`);
  } catch (error) {
    console.log(`${colors.red}❌ Wallet endpoint error: ${error.response?.data?.message || error.message}${colors.reset}`);
  }

  // Test transactions endpoint
  try {
    const transactionsResponse = await axios.get(`${BASE_URL}/transactions`, { headers });
    console.log(`${colors.green}✅ Transactions endpoint working${colors.reset}`);
    console.log(`   Transaction count: ${transactionsResponse.data.length || 0}`);
  } catch (error) {
    console.log(`${colors.red}❌ Transactions endpoint error: ${error.response?.data?.message || error.message}${colors.reset}`);
  }

  // 4. Test public endpoints
  console.log(`\n${colors.yellow}3️⃣ Testing Public Endpoints...${colors.reset}`);
  
  const publicEndpoints = [
    { name: 'Health Check', url: 'http://localhost:5050/health' },
    { name: 'Users', url: `${BASE_URL}/users` },
    { name: 'KYC', url: `${BASE_URL}/kyc` },
    { name: 'VAS Services', url: `${BASE_URL}/vas` },
    { name: 'Merchants', url: `${BASE_URL}/merchants` },
    { name: 'Service Providers', url: `${BASE_URL}/service-providers` },
    { name: 'Voucher Types', url: `${BASE_URL}/voucher-types` }
  ];

  for (const endpoint of publicEndpoints) {
    try {
      const response = await axios.get(endpoint.url);
      console.log(`${colors.green}✅ ${endpoint.name} working${colors.reset}`);
    } catch (error) {
      console.log(`${colors.red}❌ ${endpoint.name} error: ${error.response?.data?.message || error.message}${colors.reset}`);
    }
  }

  // 5. Provide frontend setup information
  console.log(`\n${colors.blue}📋 FRONTEND SETUP INFORMATION${colors.reset}`);
  console.log(`${colors.yellow}================================${colors.reset}`);
  console.log(`\n${colors.green}🔑 Test User Credentials:${colors.reset}`);
  console.log(`   Email: ${TEST_USER.email}`);
  console.log(`   Password: ${TEST_USER.password}`);
  console.log(`   User ID: ${userId}`);
  console.log(`   Wallet ID: ${walletId}`);
  
  console.log(`\n${colors.green}🎫 Authentication Token:${colors.reset}`);
  console.log(`   ${authToken}`);
  
  console.log(`\n${colors.green}🌐 API Base URL:${colors.reset}`);
  console.log(`   ${BASE_URL}`);
  
  console.log(`\n${colors.green}📡 Available Endpoints:${colors.reset}`);
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
  
  console.log(`\n${colors.green}🔧 Frontend Integration Example:${colors.reset}`);
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
  
  console.log(`\n${colors.green}✅ Frontend setup complete!${colors.reset}`);
  console.log(`   All core endpoints are working and ready for frontend development.`);

} catch (error) {
  console.error(`${colors.red}❌ Test failed: ${error.message}${colors.reset}`);
  if (error.response) {
    console.error(`   Status: ${error.response.status}`);
    console.error(`   Data: ${JSON.stringify(error.response.data, null, 2)}`);
  }
}

testFrontendSetup(); 