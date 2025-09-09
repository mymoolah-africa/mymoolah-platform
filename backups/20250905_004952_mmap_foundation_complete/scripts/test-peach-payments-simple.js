#!/usr/bin/env node

const axios = require('axios');

/**
 * 🧪 SIMPLIFIED PEACH PAYMENTS TEST SCRIPT
 * 
 * This script tests the core Peach Payments functionality:
 * - Health check
 * - Payment methods
 * - Test scenarios
 * - Basic endpoint availability
 */

const BASE_URL = 'http://localhost:3001';

async function testEndpoint(name, method, endpoint, data = null) {
  try {
    console.log(`🔍 Testing ${name}...`);
    
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: { 'Content-Type': 'application/json' },
      timeout: 10000
    };

    if (data && method === 'POST') {
      config.data = data;
    }

    const response = await axios(config);
    
    if (response.data.success) {
      console.log(`✅ ${name}: PASSED`);
      return { success: true, data: response.data };
    } else {
      console.log(`❌ ${name}: FAILED - ${response.data.message}`);
      return { success: false, error: response.data.message };
    }
    
  } catch (error) {
    const errorMsg = error.response?.data?.message || error.message;
    console.log(`❌ ${name}: FAILED - ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

async function runSimpleTests() {
  console.log('🚀 Starting Simplified Peach Payments Test Suite');
  console.log('=' .repeat(60));
  
  const results = [];
  
  // Test 1: Health Check
  results.push(await testEndpoint('Health Check', 'GET', '/api/v1/peach/health'));
  
  // Test 2: Payment Methods
  results.push(await testEndpoint('Payment Methods', 'GET', '/api/v1/peach/methods'));
  
  // Test 3: Test Scenarios
  results.push(await testEndpoint('Test Scenarios', 'GET', '/api/v1/peach/payshap/test-scenarios'));
  
  // Test 4: Test RPP Endpoint (without database)
  results.push(await testEndpoint('Test RPP Endpoint', 'POST', '/api/v1/peach/test/rpp', {
    amount: 100,
    currency: 'ZAR',
    description: 'Test RPP',
    debtorPhone: '+27-711111200',
    testMode: true
  }));
  
  // Test 5: Test RTP Endpoint (without database)
  results.push(await testEndpoint('Test RTP Endpoint', 'POST', '/api/v1/peach/test/rtp', {
    amount: 100,
    currency: 'ZAR',
    description: 'Test RTP',
    creditorPhone: '+27-711111200',
    testMode: true,
    testMsisdn: '0821234567'
  }));
  
  // Test 6: Test Request Money Endpoint (without database)
  results.push(await testEndpoint('Test Request Money', 'POST', '/api/v1/peach/test/request-money', {
    amount: 100,
    currency: 'ZAR',
    payerName: 'Test Payer',
    payerMobileNumber: '+27-711111200',
    description: 'Test Money Request',
    testMode: true,
    testMsisdn: '0821234567'
  }));
  
  // Summary
  console.log('\n' + '=' .repeat(60));
  console.log('📊 TEST RESULTS SUMMARY');
  console.log('=' .repeat(60));
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${total - passed}`);
  console.log(`📈 Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (passed === total) {
    console.log('\n🎉 All tests passed! Peach Payments integration is working perfectly.');
  } else if (passed >= total * 0.8) {
    console.log('\n🟡 Most tests passed. Minor issues detected that may need attention.');
  } else {
    console.log('\n🔴 Multiple test failures detected. Peach Payments integration needs investigation.');
  }
  
  // Show specific failures
  if (passed < total) {
    console.log('\n❌ FAILED TESTS:');
    results.forEach((result, index) => {
      if (!result.success) {
        const testNames = ['Health Check', 'Payment Methods', 'Test Scenarios', 'Test RPP Endpoint', 'Test RTP Endpoint', 'Test Request Money'];
        console.log(`  - ${testNames[index]}: ${result.error}`);
      }
    });
  }
  
  console.log('\n🏁 Test suite completed!');
}

runSimpleTests().catch(console.error);


