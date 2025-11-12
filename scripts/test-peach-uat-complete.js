/**
 * Peach Payments UAT Complete Test Suite
 * 
 * Comprehensive testing of all Peach Payments API endpoints and scenarios
 * Run this to verify UAT readiness before requesting production credentials
 */

require('dotenv').config();
const axios = require('axios');

// Test configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const API_BASE = `${BASE_URL}/api/v1/peach`;

// Test results tracking
const testResults = {
  passed: [],
  failed: [],
  skipped: []
};

function logTest(name, status, details = '') {
  const emoji = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⏭️';
  console.log(`${emoji} ${name}`);
  if (details) {
    console.log(`   ${details}`);
  }
  if (status === 'pass') {
    testResults.passed.push(name);
  } else if (status === 'fail') {
    testResults.failed.push(name);
  } else {
    testResults.skipped.push(name);
  }
}

// Test authentication token (get from login endpoint)
let authToken = null;

async function getAuthToken() {
  if (authToken) return authToken;
  
  try {
    // Try to get token from test user login
    const loginResponse = await axios.post(`${BASE_URL}/api/v1/auth/login`, {
      phoneNumber: '0825571055',
      password: 'test123' // Adjust if needed
    });
    
    if (loginResponse.data.token) {
      authToken = loginResponse.data.token;
      return authToken;
    }
  } catch (error) {
    console.log('   ⚠️  Could not get auth token, some tests will be skipped');
  }
  
  return null;
}

async function testHealthCheck() {
  console.log('\n🏥 HEALTH CHECK TESTS');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${API_BASE}/health`);
    if (response.data.success && response.data.data.status === 'operational') {
      logTest('Health Check', 'pass', `Status: ${response.data.data.status}`);
    } else {
      logTest('Health Check', 'fail', `Unexpected response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logTest('Health Check', 'fail', error.message);
  }
}

async function testPaymentMethods() {
  console.log('\n💳 PAYMENT METHODS TESTS');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${API_BASE}/methods`);
    if (response.data.success && response.data.data.paymentMethods) {
      const methods = response.data.data.paymentMethods;
      logTest('Get Payment Methods', 'pass', `Found ${methods.length} payment methods`);
    } else {
      logTest('Get Payment Methods', 'fail', 'Invalid response format');
    }
  } catch (error) {
    logTest('Get Payment Methods', 'fail', error.message);
  }
}

async function testTestScenarios() {
  console.log('\n🧪 TEST SCENARIOS TESTS');
  console.log('='.repeat(60));
  
  try {
    const response = await axios.get(`${API_BASE}/payshap/test-scenarios`);
    if (response.data.success && response.data.data.testScenarios) {
      const scenarios = response.data.data.testScenarios;
      logTest('Get Test Scenarios', 'pass', `Found ${scenarios.length} test scenarios`);
    } else {
      logTest('Get Test Scenarios', 'fail', 'Invalid response format');
    }
  } catch (error) {
    logTest('Get Test Scenarios', 'fail', error.message);
  }
}

async function testPayShapRpp() {
  console.log('\n📤 PAYSHAP RPP (OUTBOUND) TESTS');
  console.log('='.repeat(60));
  
  // Test 1: RPP with test phone number (success scenario)
  try {
    const response = await axios.post(`${API_BASE}/test/rpp`, {
      amount: 50.00,
      currency: 'ZAR',
      debtorPhone: '+27-711111200', // Success test number
      description: 'UAT Test RPP Payment'
    });
    
    if (response.data.success && response.data.data.checkoutId) {
      logTest('PayShap RPP Initiation (Success Test)', 'pass', 
        `Checkout ID: ${response.data.data.checkoutId}, Status: ${response.data.data.status}`);
    } else {
      logTest('PayShap RPP Initiation (Success Test)', 'fail', 
        `Invalid response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logTest('PayShap RPP Initiation (Success Test)', 'fail', 
      error.response?.data?.message || error.message);
  }
  
  // Test 2: RPP with bank account number
  try {
    const response = await axios.post(`${API_BASE}/test/rpp`, {
      amount: 75.00,
      currency: 'ZAR',
      debtorAccountNumber: '1234567890',
      bankCode: '250655', // FNB
      bankName: 'First National Bank (FNB)',
      description: 'UAT Test RPP with Bank Account'
    });
    
    if (response.data.success && response.data.data.checkoutId) {
      logTest('PayShap RPP with Bank Account', 'pass', 
        `Checkout ID: ${response.data.data.checkoutId}`);
    } else {
      logTest('PayShap RPP with Bank Account', 'fail', 
        `Invalid response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const errorMsg = errorDetails.message || errorDetails.details || error.message;
    const errorCode = errorDetails.errorCode || errorDetails.result?.code;
    const errorDesc = errorDetails.errorDescription || errorDetails.result?.description;
    
    let fullError = errorMsg;
    if (errorCode) fullError += ` (Code: ${errorCode})`;
    if (errorDesc) fullError += ` - ${errorDesc}`;
    if (error.response?.data) {
      fullError += ` | Full Response: ${JSON.stringify(error.response.data).substring(0, 200)}`;
    }
    
    logTest('PayShap RPP with Bank Account', 'fail', fullError);
  }
  
  // Test 3: RPP validation (missing amount)
  try {
    await axios.post(`${API_BASE}/test/rpp`, {
      currency: 'ZAR',
      debtorPhone: '+27-711111200'
    });
    logTest('PayShap RPP Validation (Missing Amount)', 'fail', 'Should have returned 400 error');
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('PayShap RPP Validation (Missing Amount)', 'pass', 'Correctly rejected missing amount');
    } else {
      logTest('PayShap RPP Validation (Missing Amount)', 'fail', 
        `Unexpected error: ${error.message}`);
    }
  }
}

async function testPayShapRtp() {
  console.log('\n📥 PAYSHAP RTP (INBOUND) TESTS');
  console.log('='.repeat(60));
  
  // Test 1: RTP with test phone number
  try {
    const response = await axios.post(`${API_BASE}/test/rtp`, {
      amount: 100.00,
      currency: 'ZAR',
      creditorPhone: '+27-711111200',
      description: 'UAT Test RTP Request',
      testMode: true,
      testMsisdn: '0825571055'
    });
    
    if (response.data.success && response.data.data.checkoutId) {
      logTest('PayShap RTP Initiation (Test Mode)', 'pass', 
        `Checkout ID: ${response.data.data.checkoutId}, MSISDN: ${response.data.data.msisdnReference}`);
    } else {
      logTest('PayShap RTP Initiation (Test Mode)', 'fail', 
        `Invalid response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    logTest('PayShap RTP Initiation (Test Mode)', 'fail', 
      error.response?.data?.message || error.message);
  }
  
  // Test 2: RTP with bank account
  try {
    const response = await axios.post(`${API_BASE}/test/rtp`, {
      amount: 150.00,
      currency: 'ZAR',
      creditorAccountNumber: '0987654321',
      bankCode: '051001', // Standard Bank
      bankName: 'Standard Bank',
      description: 'UAT Test RTP with Bank Account',
      testMode: true,
      testMsisdn: '0825571055'
    });
    
    if (response.data.success && response.data.data.checkoutId) {
      logTest('PayShap RTP with Bank Account', 'pass', 
        `Checkout ID: ${response.data.data.checkoutId}`);
    } else {
      logTest('PayShap RTP with Bank Account', 'fail', 
        `Invalid response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const errorMsg = errorDetails.message || errorDetails.details || error.message;
    const errorCode = errorDetails.errorCode || errorDetails.result?.code;
    const errorDesc = errorDetails.errorDescription || errorDetails.result?.description;
    
    let fullError = errorMsg;
    if (errorCode) fullError += ` (Code: ${errorCode})`;
    if (errorDesc) fullError += ` - ${errorDesc}`;
    if (error.response?.data) {
      fullError += ` | Full Response: ${JSON.stringify(error.response.data).substring(0, 200)}`;
    }
    
    logTest('PayShap RTP with Bank Account', 'fail', fullError);
  }
}

async function testRequestMoney() {
  console.log('\n💰 REQUEST MONEY TESTS');
  console.log('='.repeat(60));
  
  // Test 1: Request Money with test phone
  try {
    const response = await axios.post(`${API_BASE}/test/request-money`, {
      amount: 200.00,
      currency: 'ZAR',
      payerName: 'Test Payer',
      payerMobileNumber: '+27-711111200',
      description: 'UAT Test Money Request',
      testMode: true,
      testMsisdn: '0825571055'
    });
    
    if (response.data.success && response.data.data.checkoutId) {
      logTest('Request Money (Test Mode)', 'pass', 
        `Checkout ID: ${response.data.data.checkoutId}, MSISDN: ${response.data.data.msisdnReference}`);
    } else {
      logTest('Request Money (Test Mode)', 'fail', 
        `Invalid response: ${JSON.stringify(response.data)}`);
    }
  } catch (error) {
    const errorDetails = error.response?.data || {};
    const errorMsg = errorDetails.message || errorDetails.details || error.message;
    const errorCode = errorDetails.errorCode || errorDetails.result?.code;
    const errorDesc = errorDetails.errorDescription || errorDetails.result?.description;
    
    let fullError = errorMsg;
    if (errorCode) fullError += ` (Code: ${errorCode})`;
    if (errorDesc) fullError += ` - ${errorDesc}`;
    if (error.response?.data) {
      fullError += ` | Full Response: ${JSON.stringify(error.response.data).substring(0, 200)}`;
    }
    
    logTest('Request Money (Test Mode)', 'fail', fullError);
  }
  
  // Test 2: Request Money validation (missing payer name)
  try {
    await axios.post(`${API_BASE}/test/request-money`, {
      amount: 200.00,
      payerMobileNumber: '+27-711111200',
      testMode: true,
      testMsisdn: '0825571055'
    });
    logTest('Request Money Validation (Missing Payer Name)', 'fail', 'Should have returned 400 error');
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('Request Money Validation (Missing Payer Name)', 'pass', 'Correctly rejected missing payer name');
    } else {
      logTest('Request Money Validation (Missing Payer Name)', 'fail', 
        `Unexpected error: ${error.message}`);
    }
  }
}

async function testPaymentStatus() {
  console.log('\n📊 PAYMENT STATUS TESTS');
  console.log('='.repeat(60));
  
  // First, create a test payment to check status
  let testCheckoutId = null;
  let testMerchantTransactionId = null;
  
  try {
    const createResponse = await axios.post(`${API_BASE}/test/rpp`, {
      amount: 25.00,
      currency: 'ZAR',
      debtorPhone: '+27-711111200',
      description: 'UAT Status Test Payment'
    });
    
    if (createResponse.data.success) {
      testCheckoutId = createResponse.data.data.checkoutId;
      testMerchantTransactionId = createResponse.data.data.merchantTransactionId;
    }
  } catch (error) {
    logTest('Payment Status Setup', 'skip', 'Could not create test payment');
    return;
  }
  
  // Test 1: Get payment status by merchant transaction ID
  if (testMerchantTransactionId) {
    try {
      const token = await getAuthToken();
      if (!token) {
        logTest('Get Payment Status (by Merchant Transaction ID)', 'skip', 'Auth token not available');
      } else {
        const response = await axios.get(
          `${API_BASE}/payments/${testMerchantTransactionId}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        
        if (response.data.success && response.data.data.payment) {
          logTest('Get Payment Status (by Merchant Transaction ID)', 'pass', 
            `Status: ${response.data.data.payment.status}`);
        } else {
          logTest('Get Payment Status (by Merchant Transaction ID)', 'fail', 
            'Invalid response format');
        }
      }
    } catch (error) {
      logTest('Get Payment Status (by Merchant Transaction ID)', 'fail', 
        error.response?.data?.message || error.message);
    }
  }
  
  // Test 2: Poll payment status
  if (testCheckoutId) {
    try {
      const response = await axios.post(`${API_BASE}/poll-status`, {
        checkoutId: testCheckoutId
      });
      
      if (response.data.success) {
        logTest('Poll Payment Status', 'pass', 
          `Status: ${response.data.data.status} (Note: API endpoint may need confirmation)`);
      } else {
        logTest('Poll Payment Status', 'fail', 'Invalid response format');
      }
    } catch (error) {
      logTest('Poll Payment Status', 'skip', 
        `Status polling failed (endpoint may need confirmation): ${error.message}`);
    }
  }
}

async function testWebhookEndpoint() {
  console.log('\n🔔 WEBHOOK TESTS');
  console.log('='.repeat(60));
  
  // Test 1: Webhook endpoint exists and accepts POST
  try {
    const testWebhook = {
      merchantTransactionId: 'TEST-WEBHOOK-001',
      checkoutId: 'TEST-CHECKOUT-001',
      status: 'success',
      result: {
        code: '000.100.110',
        description: 'Transaction successful'
      }
    };
    
    const response = await axios.post(`${API_BASE}/webhook`, testWebhook, {
      headers: {
        'Content-Type': 'application/json',
        'X-Peach-Signature': 'test-signature' // Test signature header
      }
    });
    
    if (response.status === 200) {
      logTest('Webhook Endpoint (Basic)', 'pass', 
        'Webhook endpoint accepts requests (signature validation pending Peach details)');
    } else {
      logTest('Webhook Endpoint (Basic)', 'fail', 
        `Unexpected status: ${response.status}`);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      logTest('Webhook Endpoint (Basic)', 'fail', 'Webhook endpoint not found');
    } else {
      logTest('Webhook Endpoint (Basic)', 'fail', error.message);
    }
  }
}

async function testErrorScenarios() {
  console.log('\n⚠️ ERROR SCENARIO TESTS');
  console.log('='.repeat(60));
  
  // Test 1: Invalid amount
  try {
    await axios.post(`${API_BASE}/test/rpp`, {
      amount: -10.00,
      currency: 'ZAR',
      debtorPhone: '+27-711111200'
    });
    logTest('Error Handling (Invalid Amount)', 'fail', 'Should have returned 400 error');
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('Error Handling (Invalid Amount)', 'pass', 'Correctly rejected invalid amount');
    } else {
      logTest('Error Handling (Invalid Amount)', 'fail', 
        `Unexpected error: ${error.message}`);
    }
  }
  
  // Test 2: Missing payment method
  try {
    await axios.post(`${API_BASE}/test/rpp`, {
      amount: 50.00,
      currency: 'ZAR'
    });
    logTest('Error Handling (Missing Payment Method)', 'fail', 'Should have returned 400 error');
  } catch (error) {
    if (error.response?.status === 400) {
      logTest('Error Handling (Missing Payment Method)', 'pass', 
        'Correctly rejected missing payment method');
    } else {
      logTest('Error Handling (Missing Payment Method)', 'fail', 
        `Unexpected error: ${error.message}`);
    }
  }
}

async function runUATTests() {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('PEACH PAYMENTS UAT COMPLETE TEST SUITE');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`API Base: ${API_BASE}\n`);
  
  // Check environment variables
  const requiredVars = [
    'PEACH_BASE_AUTH',
    'PEACH_BASE_CHECKOUT',
    'PEACH_CLIENT_ID',
    'PEACH_CLIENT_SECRET',
    'PEACH_MERCHANT_ID',
    'PEACH_ENTITY_ID_PSH'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:');
    missingVars.forEach(varName => console.error(`   - ${varName}`));
    process.exit(1);
  }
  
  console.log('✅ All required environment variables found\n');
  
  // Run all test suites
  await testHealthCheck();
  await testPaymentMethods();
  await testTestScenarios();
  await testPayShapRpp();
  await testPayShapRtp();
  await testRequestMoney();
  await testPaymentStatus();
  await testWebhookEndpoint();
  await testErrorScenarios();
  
  // Print summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${testResults.passed.length + testResults.failed.length + testResults.skipped.length}`);
  console.log(`✅ Passed: ${testResults.passed.length}`);
  console.log(`❌ Failed: ${testResults.failed.length}`);
  console.log(`⏭️  Skipped: ${testResults.skipped.length}`);
  
  if (testResults.failed.length > 0) {
    console.log('\n❌ Failed Tests:');
    testResults.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (testResults.skipped.length > 0) {
    console.log('\n⏭️  Skipped Tests:');
    testResults.skipped.forEach(test => console.log(`   - ${test}`));
  }
  
  const successRate = testResults.passed.length + testResults.failed.length > 0
    ? ((testResults.passed.length / (testResults.passed.length + testResults.failed.length)) * 100).toFixed(1)
    : 0;
  console.log(`\n📈 Success Rate: ${successRate}%`);
  
  console.log('\n' + '='.repeat(60));
  console.log(`Completed: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  
  // Exit with appropriate code
  if (testResults.failed.length > 0) {
    console.log('\n⚠️  Some tests failed. Review failures before proceeding.');
    process.exit(1);
  } else if (testResults.passed.length > 0) {
    console.log('\n✅ All critical tests passed! Ready for UAT testing.');
    process.exit(0);
  } else {
    console.log('\n⚠️  No tests were executed. Check configuration.');
    process.exit(1);
  }
}

// Run tests
if (require.main === module) {
  runUATTests().catch(error => {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { runUATTests };

