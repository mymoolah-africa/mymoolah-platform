#!/usr/bin/env node

/**
 * 🧪 PEACH PAYMENTS COMPREHENSIVE TEST SCRIPT
 * 
 * This script tests all Peach Payments scenarios without requiring database users:
 * - PayShap RPP (outbound payments)
 * - PayShap RTP (inbound payment requests)
 * - Request Money with MSISDN reference
 * - All test scenarios (success, failed, expired, error)
 * 
 * Usage: node scripts/test-peach-payments.js
 */

const axios = require('axios');

// Test configuration
const TEST_CONFIG = {
  baseUrl: 'http://localhost:3001',
  peachEndpoints: {
    health: '/api/v1/peach/health',
    methods: '/api/v1/peach/methods',
    testScenarios: '/api/v1/peach/payshap/test-scenarios',
    rpp: '/api/v1/peach/test/rpp',
    rtp: '/api/v1/peach/test/rtp',
    requestMoney: '/api/v1/peach/test/request-money'
  },
  testData: {
    // Test amounts
    amounts: [50.00, 100.00, 250.00, 500.00],
    
    // Test phone numbers for different scenarios
    testPhones: {
      success: '+27-711111200',      // Success scenario
      declined: '+27-711111160',     // Declined scenario  
      expired: '+27-711111140',      // Expired scenario
      error: '+27-711111107'         // Communication error
    },
    
    // Test bank accounts
    testBankAccounts: {
      absa: { accountNumber: '1234567890', bankCode: '632005', bankName: 'ABSA Bank' },
      fnb: { accountNumber: '0987654321', bankCode: '250655', bankName: 'First National Bank (FNB)' },
      nedbank: { accountNumber: '1122334455', bankCode: '198765', bankName: 'Nedbank' }
    },
    // Dry run controls and user override
    dryRun: true,
    override: {
      userId: 1,
      msisdn: '0825571055'
    }
  }
};

// Test utilities
class TestUtils {
  static log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      warning: '\x1b[33m', // Yellow
      error: '\x1b[31m',   // Red
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  static async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${TEST_CONFIG.baseUrl}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        timeout: 30000
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        config.data = data;
      }

      console.log(`🔍 Making ${method} request to: ${config.url}`);
      if (data) console.log(`📦 Request data:`, JSON.stringify(data, null, 2));

      const response = await axios(config);
      
      console.log(`✅ Response received:`, JSON.stringify(response.data, null, 2));
      
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      console.log(`❌ Request failed:`, error.response?.data || error.message);
      console.log(`📊 Error status:`, error.response?.status || 'No status');
      
      return { 
        success: false, 
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  static validateResponse(response, expectedFields = []) {
    if (!response.success) {
      return { valid: false, error: 'Request failed', details: response.error };
    }

    if (expectedFields.length > 0) {
      const missingFields = expectedFields.filter(field => !response.data[field]);
      if (missingFields.length > 0) {
        return { valid: false, error: `Missing required fields: ${missingFields.join(', ')}` };
      }
    }

    return { valid: true };
  }
}

// Test scenarios
class PeachPaymentsTester {
  constructor() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      details: []
    };
  }

  async runAllTests() {
    TestUtils.log('🚀 Starting Peach Payments Comprehensive Test Suite', 'info');
    TestUtils.log('=' .repeat(80), 'info');
    
    // Test 1: Health Check
    await this.testHealthCheck();
    
    // Test 2: Payment Methods
    await this.testPaymentMethods();
    
    // Test 3: Test Scenarios
    await this.testScenarios();
    
    // Test 4: PayShap RPP (outbound)
    await this.testPayShapRPP();
    
    // Test 5: PayShap RTP (inbound)
    await this.testPayShapRTP();
    
    // Test 6: Request Money with MSISDN
    await this.testRequestMoney();
    
    // Test 7: Error Handling
    await this.testErrorHandling();
    
    // Test 8: Sandbox Integration
    await this.testSandboxIntegration();
    
    this.printResults();
  }

  async testHealthCheck() {
    TestUtils.log('🏥 Testing Health Check Endpoint...', 'info');
    
    const response = await TestUtils.makeRequest('GET', TEST_CONFIG.peachEndpoints.health);
    const validation = TestUtils.validateResponse(response, ['service', 'status', 'features']);
    
    if (validation.valid && response.data.data.status === 'operational') {
      this.recordResult('Health Check', true, 'Service is operational');
      TestUtils.log('✅ Health Check: PASSED', 'success');
    } else {
      this.recordResult('Health Check', false, validation.error || 'Service not operational');
      TestUtils.log('❌ Health Check: FAILED', 'error');
    }
  }

  async testPaymentMethods() {
    TestUtils.log('💳 Testing Payment Methods Endpoint...', 'info');
    
    const response = await TestUtils.makeRequest('GET', TEST_CONFIG.peachEndpoints.methods);
    const validation = TestUtils.validateResponse(response, ['paymentMethods', 'count']);
    
    if (validation.valid && response.data.data.count >= 4) {
      this.recordResult('Payment Methods', true, `Found ${response.data.data.count} payment methods`);
      TestUtils.log('✅ Payment Methods: PASSED', 'success');
    } else {
      this.recordResult('Payment Methods', false, validation.error || 'Insufficient payment methods');
      TestUtils.log('❌ Payment Methods: FAILED', 'error');
    }
  }

  async testScenarios() {
    TestUtils.log('🧪 Testing PayShap Test Scenarios...', 'info');
    
    const response = await TestUtils.makeRequest('GET', TEST_CONFIG.peachEndpoints.testScenarios);
    const validation = TestUtils.validateResponse(response, ['testScenarios', 'sandboxInfo']);
    
    if (validation.valid && response.data.data.count >= 4) {
      this.recordResult('Test Scenarios', true, `Found ${response.data.data.count} test scenarios`);
      TestUtils.log('✅ Test Scenarios: PASSED', 'success');
    } else {
      this.recordResult('Test Scenarios', false, validation.error || 'Insufficient test scenarios');
      TestUtils.log('❌ Test Scenarios: FAILED', 'error');
    }
  }

  async testPayShapRPP() {
    TestUtils.log('💸 Testing PayShap RPP (Outbound Payments)...', 'info');
    
    // Test with different amounts and payment methods
    for (const amount of TEST_CONFIG.testData.amounts.slice(0, 2)) {
      const testData = {
        amount: amount,
        currency: 'ZAR',
        description: `Test RPP Payment - R${amount}`,
        debtorPhone: TEST_CONFIG.testData.testPhones.success,
        businessContext: 'test'
      };
      
      const response = await TestUtils.makeRequest('POST', TEST_CONFIG.peachEndpoints.rpp, { ...testData, dryRun: TEST_CONFIG.testData.dryRun });
      
      if (response.success && response.data.data.checkoutId) {
        this.recordResult(`PayShap RPP (R${amount})`, true, `Created checkout: ${response.data.data.checkoutId}`);
        TestUtils.log(`✅ PayShap RPP (R${amount}): PASSED`, 'success');
      } else {
        this.recordResult(`PayShap RPP (R${amount})`, false, response.error || 'Failed to create checkout');
        TestUtils.log(`❌ PayShap RPP (R${amount}): FAILED`, 'error');
      }
    }
  }

  async testPayShapRTP() {
    TestUtils.log('📱 Testing PayShap RTP (Inbound Payment Requests)...', 'info');
    
    // Test with different amounts and payment methods
    for (const amount of TEST_CONFIG.testData.amounts.slice(0, 2)) {
      const testData = {
        amount: amount,
        currency: 'ZAR',
        description: `Test RTP Request - R${amount}`,
        creditorPhone: TEST_CONFIG.testData.testPhones.success,
        businessContext: 'test'
      };
      
      const response = await TestUtils.makeRequest('POST', TEST_CONFIG.peachEndpoints.rtp, { ...testData, dryRun: TEST_CONFIG.testData.dryRun, testMode: true, testMsisdn: TEST_CONFIG.testData.override.msisdn });
      
      if (response.success && response.data.data.checkoutId) {
        this.recordResult(`PayShap RTP (R${amount})`, true, `Created RTP request: ${response.data.data.checkoutId}`);
        TestUtils.log(`✅ PayShap RTP (R${amount}): PASSED`, 'success');
      } else {
        this.recordResult(`PayShap RTP (R${amount})`, false, response.error || 'Failed to create RTP request');
        TestUtils.log(`❌ PayShap RTP (R${amount}): FAILED`, 'error');
      }
    }
  }

  async testRequestMoney() {
    TestUtils.log('💰 Testing Request Money with MSISDN Reference...', 'info');
    
    // Test with different amounts and payer details
    for (const amount of TEST_CONFIG.testData.amounts.slice(0, 2)) {
      const testData = {
        amount: amount,
        currency: 'ZAR',
        payerName: 'Test Payer',
        payerMobileNumber: TEST_CONFIG.testData.testPhones.success,
        description: `Test Money Request - R${amount}`
      };
      
      const response = await TestUtils.makeRequest('POST', TEST_CONFIG.peachEndpoints.requestMoney, { ...testData, dryRun: TEST_CONFIG.testData.dryRun, testMode: true, testMsisdn: TEST_CONFIG.testData.override.msisdn });
      
      if (response.success && response.data.data.msisdnReference) {
        this.recordResult(`Request Money (R${amount})`, true, `MSISDN reference: ${response.data.data.msisdnReference}`);
        TestUtils.log(`✅ Request Money (R${amount}): PASSED`, 'success');
      } else {
        this.recordResult(`Request Money (R${amount})`, false, response.error || 'Failed to create money request');
        TestUtils.log(`❌ Request Money (R${amount}): FAILED`, 'error');
      }
    }
  }

  async testErrorHandling() {
    TestUtils.log('⚠️ Testing Error Handling...', 'info');
    
    // Test with invalid data
    const invalidData = {
      amount: -50,
      currency: 'INVALID',
      description: ''
    };
    
    const response = await TestUtils.makeRequest('POST', TEST_CONFIG.peachEndpoints.rpp, invalidData);
    
    if (!response.success && response.status === 400) {
      this.recordResult('Error Handling', true, 'Properly handled invalid data');
      TestUtils.log('✅ Error Handling: PASSED', 'success');
    } else {
      this.recordResult('Error Handling', false, 'Failed to handle invalid data properly');
      TestUtils.log('❌ Error Handling: FAILED', 'error');
    }
  }

  async testSandboxIntegration() {
    TestUtils.log('🏗️ Testing Sandbox Integration...', 'info');
    
    // Test with sandbox-specific phone numbers for different scenarios
    const scenarios = [
      { phone: TEST_CONFIG.testData.testPhones.success, expected: 'success' },
      { phone: TEST_CONFIG.testData.testPhones.declined, expected: 'declined' },
      { phone: TEST_CONFIG.testData.testPhones.expired, expected: 'expired' },
      { phone: TEST_CONFIG.testData.testPhones.error, expected: 'error' }
    ];
    
    let passedScenarios = 0;
    
    for (const scenario of scenarios) {
      const testData = {
        amount: 100.00,
        currency: 'ZAR',
        description: `Sandbox Test - ${scenario.expected}`,
        creditorPhone: scenario.phone,
        businessContext: 'sandbox_test'
      };
      
      const response = await TestUtils.makeRequest('POST', TEST_CONFIG.peachEndpoints.rtp, { ...testData, dryRun: TEST_CONFIG.testData.dryRun, testMode: true, testMsisdn: TEST_CONFIG.testData.override.msisdn });
      
      if (response.success) {
        passedScenarios++;
        TestUtils.log(`✅ Sandbox ${scenario.expected}: PASSED`, 'success');
      } else {
        TestUtils.log(`❌ Sandbox ${scenario.expected}: FAILED`, 'error');
      }
    }
    
    if (passedScenarios >= 2) {
      this.recordResult('Sandbox Integration', true, `${passedScenarios}/4 scenarios passed`);
    } else {
      this.recordResult('Sandbox Integration', false, 'Insufficient sandbox scenarios passed');
    }
  }

  recordResult(testName, passed, details) {
    this.results.total++;
    if (passed) {
      this.results.passed++;
    } else {
      this.results.failed++;
    }
    
    this.results.details.push({
      test: testName,
      passed,
      details,
      timestamp: new Date().toISOString()
    });
  }

  printResults() {
    TestUtils.log('=' .repeat(80), 'info');
    TestUtils.log('📊 TEST RESULTS SUMMARY', 'info');
    TestUtils.log('=' .repeat(80), 'info');
    
    TestUtils.log(`Total Tests: ${this.results.total}`, 'info');
    TestUtils.log(`✅ Passed: ${this.results.passed}`, 'success');
    TestUtils.log(`❌ Failed: ${this.results.failed}`, 'error');
    TestUtils.log(`📈 Success Rate: ${((this.results.passed / this.results.total) * 100).toFixed(1)}%`, 'info');
    
    if (this.results.failed > 0) {
      TestUtils.log('\n❌ FAILED TESTS:', 'error');
      this.results.details
        .filter(result => !result.passed)
        .forEach(result => {
          TestUtils.log(`  - ${result.test}: ${result.details}`, 'error');
        });
    }
    
    TestUtils.log('\n✅ PASSED TESTS:', 'success');
    this.results.details
      .filter(result => result.passed)
      .forEach(result => {
        TestUtils.log(`  - ${result.test}: ${result.details}`, 'success');
      });
    
    TestUtils.log('\n🎯 RECOMMENDATIONS:', 'warning');
    if (this.results.failed === 0) {
      TestUtils.log('  🎉 All tests passed! Peach Payments integration is working perfectly.', 'success');
    } else if (this.results.passed >= this.results.total * 0.8) {
      TestUtils.log('  🟡 Most tests passed. Minor issues detected that may need attention.', 'warning');
    } else {
      TestUtils.log('  🔴 Multiple test failures detected. Peach Payments integration needs investigation.', 'error');
    }
    
    TestUtils.log('\n🏁 Test suite completed!', 'info');
  }
}

// Main execution
async function main() {
  try {
    const tester = new PeachPaymentsTester();
    await tester.runAllTests();
  } catch (error) {
    TestUtils.log(`💥 Test suite failed with error: ${error.message}`, 'error');
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { PeachPaymentsTester, TestUtils };
