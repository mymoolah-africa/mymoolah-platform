/**
 * Zapper Credentials Test Script
 * 
 * Tests the Zapper API credentials from Postman collection
 * Verifies authentication and basic API connectivity
 */

require('dotenv').config();
const ZapperService = require('../services/zapperService');

async function testZapperCredentials() {
  console.log('\n================================================================================');
  console.log('ZAPPER CREDENTIALS TEST');
  console.log('================================================================================\n');

  // Check environment variables
  console.log('📋 Checking environment variables...');
  const requiredVars = [
    'ZAPPER_API_URL',
    'ZAPPER_ORG_ID',
    'ZAPPER_API_TOKEN',
    'ZAPPER_X_API_KEY'
  ];

  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    console.error('\n💡 Please add these to your .env file (see env.template)');
    process.exit(1);
  }

  console.log('✅ All required environment variables found\n');

  // Display configuration (mask sensitive values)
  console.log('🔧 Configuration:');
  console.log(`   API URL: ${process.env.ZAPPER_API_URL}`);
  console.log(`   Org ID: ${process.env.ZAPPER_ORG_ID}`);
  console.log(`   API Token: ${process.env.ZAPPER_API_TOKEN.substring(0, 8)}...${process.env.ZAPPER_API_TOKEN.substring(process.env.ZAPPER_API_TOKEN.length - 4)}`);
  console.log(`   X-API-Key: ${process.env.ZAPPER_X_API_KEY.substring(0, 8)}...${process.env.ZAPPER_X_API_KEY.substring(process.env.ZAPPER_X_API_KEY.length - 4)}\n`);

  // Initialize Zapper Service
  const zapperService = new ZapperService();

  // Test 1: Health Check
  console.log('🏥 Test 1: Health Check');
  try {
    const health = await zapperService.healthCheck();
    console.log('✅ Health Check:', JSON.stringify(health, null, 2));
  } catch (error) {
    console.error('❌ Health Check failed:', error.message);
    process.exit(1);
  }

  // Test 2: Authentication
  console.log('\n🔐 Test 2: Authentication (Service Account Login)');
  try {
    const token = await zapperService.authenticate();
    console.log('✅ Authentication successful!');
    console.log(`   Identity Token: ${token.substring(0, 20)}...${token.substring(token.length - 10)}`);
    console.log(`   Token Expiry: ${new Date(zapperService.tokenExpiry).toISOString()}`);
  } catch (error) {
    console.error('❌ Authentication failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }

  // Test 3: Service Status
  console.log('\n📊 Test 3: Service Status');
  try {
    const status = await zapperService.getServiceStatus();
    console.log('✅ Service Status:', JSON.stringify(status, null, 2));
  } catch (error) {
    console.error('❌ Service Status check failed:', error.message);
    process.exit(1);
  }

  // Test 4: Decode Test QR Code (from Postman collection)
  console.log('\n📱 Test 4: Decode Test QR Code');
  const testQRCode = 'aHR0cDovLzIuemFwLnBlP3Q9NiZpPTQwODk1OjQ5OTU1OjdbMzR8MjkuOTl8MTEsMzNufFJFRjEyMzQ1fDEwOjEwWzM5fFpBUiwzOHxEaWxsb25EZXY=';
  try {
    // Note: The service uses POST /codes/decode, but Postman shows GET /codes/{code}
    // We'll test the POST endpoint as implemented in the service
    const decoded = await zapperService.decodeQRCode(testQRCode);
    console.log('✅ QR Code decoded successfully!');
    console.log('   Decoded Data:', JSON.stringify(decoded, null, 2));
  } catch (error) {
    console.error('❌ QR Code decode failed:', error.message);
    if (error.response) {
      console.error('   Response:', JSON.stringify(error.response.data, null, 2));
    }
    console.log('   Note: This may fail if the QR code format has changed or endpoint differs');
  }

  console.log('\n================================================================================');
  console.log('✅ ALL TESTS COMPLETED');
  console.log('================================================================================\n');
  console.log('📝 Next Steps:');
  console.log('   1. If all tests passed, credentials are working correctly');
  console.log('   2. Test with your 2 test QR codes from Zapper');
  console.log('   3. Complete UAT testing with these test credentials');
  console.log('   4. Request production credentials from Zapper for go-live\n');
}

// Run tests
testZapperCredentials().catch(error => {
  console.error('\n❌ Test script failed:', error);
  process.exit(1);
});

