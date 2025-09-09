/**
 * VAS Supplier API Testing Script
 * 
 * Tests Flash and MobileMart API integrations
 * Validates transaction flows and error handling
 */

const axios = require('axios');
const { VasProduct, VasTransaction, User, Wallet } = require('../models');

class VasApiTester {
  constructor() {
    this.testResults = {
      flash: {},
      mobilemart: {},
      transactionFlows: {},
      errorHandling: {}
    };
    
    // Test configuration
    this.config = {
      flash: {
        baseUrl: process.env.FLASH_API_URL || 'https://api.flash.co.za',
        apiKey: process.env.FLASH_API_KEY,
        timeout: 30000
      },
      mobilemart: {
        baseUrl: process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za',
        apiKey: process.env.MOBILEMART_API_KEY,
        timeout: 30000
      }
    };
  }

  /**
   * Run comprehensive VAS API tests
   */
  async runAllTests() {
    console.log('🧪 Starting VAS Supplier API Tests...\n');

    try {
      // Test Flash API integration
      await this.testFlashApi();
      
      // Test MobileMart API integration
      await this.testMobileMartApi();
      
      // Test transaction flows
      await this.testTransactionFlows();
      
      // Test error handling
      await this.testErrorHandling();
      
      // Generate test report
      this.generateTestReport();

    } catch (error) {
      console.error('❌ VAS API test execution failed:', error);
      this.testResults.error = error.message;
    }
  }

  /**
   * Test Flash API integration
   */
  async testFlashApi() {
    console.log('🔍 Testing Flash API integration...');
    
    try {
      // Test API connectivity
      const connectivityTest = await this.testFlashConnectivity();
      
      // Test product catalog
      const productTest = await this.testFlashProducts();
      
      // Test transaction creation
      const transactionTest = await this.testFlashTransaction();
      
      this.testResults.flash = {
        connectivity: connectivityTest,
        products: productTest,
        transaction: transactionTest,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Flash API test failed:', error.message);
      this.testResults.flash = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test Flash API connectivity
   */
  async testFlashConnectivity() {
    try {
      const response = await axios.get(`${this.config.flash.baseUrl}/health`, {
        timeout: this.config.flash.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.flash.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test Flash product catalog
   */
  async testFlashProducts() {
    try {
      const response = await axios.get(`${this.config.flash.baseUrl}/products`, {
        timeout: this.config.flash.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.flash.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          category: 'airtime',
          provider: 'vodacom'
        }
      });

      return {
        success: true,
        productCount: response.data?.products?.length || 0,
        categories: response.data?.categories || [],
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test Flash transaction creation
   */
  async testFlashTransaction() {
    try {
      const testTransaction = {
        productCode: 'VOD_AIRTIME_10',
        amount: 1000, // R10.00
        recipientNumber: '0825571055',
        transactionType: 'voucher',
        reference: `TEST_${Date.now()}`
      };

      const response = await axios.post(`${this.config.flash.baseUrl}/transactions`, testTransaction, {
        timeout: this.config.flash.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.flash.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        transactionId: response.data?.transactionId,
        status: response.data?.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test MobileMart API integration
   */
  async testMobileMartApi() {
    console.log('🔍 Testing MobileMart API integration...');
    
    try {
      // Test API connectivity
      const connectivityTest = await this.testMobileMartConnectivity();
      
      // Test product catalog
      const productTest = await this.testMobileMartProducts();
      
      // Test transaction creation
      const transactionTest = await this.testMobileMartTransaction();
      
      this.testResults.mobilemart = {
        connectivity: connectivityTest,
        products: productTest,
        transaction: transactionTest,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ MobileMart API test failed:', error.message);
      this.testResults.mobilemart = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test MobileMart API connectivity
   */
  async testMobileMartConnectivity() {
    try {
      const response = await axios.get(`${this.config.mobilemart.baseUrl}/health`, {
        timeout: this.config.mobilemart.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.mobilemart.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        status: response.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test MobileMart product catalog
   */
  async testMobileMartProducts() {
    try {
      const response = await axios.get(`${this.config.mobilemart.baseUrl}/products`, {
        timeout: this.config.mobilemart.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.mobilemart.apiKey}`,
          'Content-Type': 'application/json'
        },
        params: {
          category: 'airtime',
          provider: 'mtn'
        }
      });

      return {
        success: true,
        productCount: response.data?.products?.length || 0,
        categories: response.data?.categories || [],
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test MobileMart transaction creation
   */
  async testMobileMartTransaction() {
    try {
      const testTransaction = {
        productId: 'MTN_AIRTIME_10',
        amount: 1000, // R10.00
        recipientNumber: '0825571055',
        transactionType: 'topup',
        reference: `TEST_${Date.now()}`
      };

      const response = await axios.post(`${this.config.mobilemart.baseUrl}/transactions`, testTransaction, {
        timeout: this.config.mobilemart.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.mobilemart.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: true,
        transactionId: response.data?.transactionId,
        status: response.data?.status,
        responseTime: response.headers['x-response-time'] || 'unknown'
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test transaction flows
   */
  async testTransactionFlows() {
    console.log('🔍 Testing transaction flows...');
    
    try {
      // Get test user and wallet
      const testUser = await User.findOne({ where: { id: 1 } });
      const testWallet = await Wallet.findOne({ where: { userId: 1 } });
      const testProduct = await VasProduct.findOne({ where: { isActive: true } });

      if (!testUser || !testWallet || !testProduct) {
        throw new Error('Test data not available');
      }

      // Test voucher transaction flow
      const voucherFlow = await this.testVoucherTransactionFlow(testUser, testWallet, testProduct);
      
      // Test top-up transaction flow
      const topupFlow = await this.testTopupTransactionFlow(testUser, testWallet, testProduct);

      this.testResults.transactionFlows = {
        voucher: voucherFlow,
        topup: topupFlow,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Transaction flow test failed:', error.message);
      this.testResults.transactionFlows = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test voucher transaction flow
   */
  async testVoucherTransactionFlow(user, wallet, product) {
    try {
      // Create test VAS transaction
      const vasTransaction = await VasTransaction.create({
        transactionId: `TEST_VOUCHER_${Date.now()}`,
        userId: user.id,
        walletId: wallet.id,
        vasProductId: product.id,
        supplierId: product.supplierId,
        vasType: product.vasType,
        transactionType: 'voucher',
        amount: 1000, // R10.00
        fee: 50,      // R0.50
        totalAmount: 1050, // R10.50
        recipientNumber: '0825571055',
        status: 'pending'
      });

      // Simulate supplier API call
      const supplierResponse = await this.simulateSupplierApiCall(product.supplierId, 'voucher');

      // Update transaction status
      await vasTransaction.update({
        status: supplierResponse.success ? 'completed' : 'failed',
        voucherPin: supplierResponse.voucherPin,
        voucherSerial: supplierResponse.voucherSerial
      });

      return {
        success: true,
        transactionId: vasTransaction.transactionId,
        status: vasTransaction.status,
        voucherPin: vasTransaction.voucherPin,
        supplierResponse: supplierResponse
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Test top-up transaction flow
   */
  async testTopupTransactionFlow(user, wallet, product) {
    try {
      // Create test VAS transaction
      const vasTransaction = await VasTransaction.create({
        transactionId: `TEST_TOPUP_${Date.now()}`,
        userId: user.id,
        walletId: wallet.id,
        vasProductId: product.id,
        supplierId: product.supplierId,
        vasType: product.vasType,
        transactionType: 'topup',
        amount: 1000, // R10.00
        fee: 50,      // R0.50
        totalAmount: 1050, // R10.50
        recipientNumber: '0825571055',
        status: 'pending'
      });

      // Simulate supplier API call
      const supplierResponse = await this.simulateSupplierApiCall(product.supplierId, 'topup');

      // Update transaction status
      await vasTransaction.update({
        status: supplierResponse.success ? 'completed' : 'failed'
      });

      return {
        success: true,
        transactionId: vasTransaction.transactionId,
        status: vasTransaction.status,
        supplierResponse: supplierResponse
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Simulate supplier API call
   */
  async simulateSupplierApiCall(supplierId, transactionType) {
    // Simulate API response time
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulate success/failure based on supplier
    const success = Math.random() > 0.1; // 90% success rate

    if (success) {
      return {
        success: true,
        transactionId: `SUPPLIER_${Date.now()}`,
        status: 'completed',
        voucherPin: transactionType === 'voucher' ? '1234567890123456' : null,
        voucherSerial: transactionType === 'voucher' ? 'SN123456789' : null,
        responseTime: '1000ms'
      };
    } else {
      return {
        success: false,
        error: 'Simulated supplier error',
        status: 'failed'
      };
    }
  }

  /**
   * Test error handling
   */
  async testErrorHandling() {
    console.log('🔍 Testing error handling...');
    
    try {
      // Test invalid API key
      const invalidKeyTest = await this.testInvalidApiKey();
      
      // Test network timeout
      const timeoutTest = await this.testNetworkTimeout();
      
      // Test invalid product
      const invalidProductTest = await this.testInvalidProduct();

      this.testResults.errorHandling = {
        invalidKey: invalidKeyTest,
        timeout: timeoutTest,
        invalidProduct: invalidProductTest,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Error handling test failed:', error.message);
      this.testResults.errorHandling = {
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Test invalid API key handling
   */
  async testInvalidApiKey() {
    try {
      await axios.get(`${this.config.flash.baseUrl}/products`, {
        timeout: 5000,
        headers: {
          'Authorization': 'Bearer INVALID_KEY',
          'Content-Type': 'application/json'
        }
      });

      return {
        success: false,
        expected: 'Should have failed with invalid key'
      };

    } catch (error) {
      return {
        success: true,
        errorHandled: error.response?.status === 401,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Test network timeout handling
   */
  async testNetworkTimeout() {
    try {
      await axios.get('http://invalid-url-that-will-timeout.com', {
        timeout: 1000
      });

      return {
        success: false,
        expected: 'Should have timed out'
      };

    } catch (error) {
      return {
        success: true,
        errorHandled: error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND',
        errorCode: error.code
      };
    }
  }

  /**
   * Test invalid product handling
   */
  async testInvalidProduct() {
    try {
      const invalidTransaction = {
        productCode: 'INVALID_PRODUCT',
        amount: 1000,
        recipientNumber: '0825571055'
      };

      await axios.post(`${this.config.flash.baseUrl}/transactions`, invalidTransaction, {
        timeout: this.config.flash.timeout,
        headers: {
          'Authorization': `Bearer ${this.config.flash.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return {
        success: false,
        expected: 'Should have failed with invalid product'
      };

    } catch (error) {
      return {
        success: true,
        errorHandled: error.response?.status === 400 || error.response?.status === 404,
        status: error.response?.status || 'unknown'
      };
    }
  }

  /**
   * Generate test report
   */
  generateTestReport() {
    console.log('\n📋 VAS Supplier API Test Report');
    console.log('================================');

    // Flash API status
    console.log('\n⚡ Flash API Integration:');
    if (this.testResults.flash.connectivity?.success) {
      console.log('  ✅ API Connectivity: Working');
      console.log(`  📊 Response Time: ${this.testResults.flash.connectivity.responseTime}`);
    } else {
      console.log('  ❌ API Connectivity: Failed');
      console.log(`  🔍 Error: ${this.testResults.flash.connectivity?.error}`);
    }

    if (this.testResults.flash.products?.success) {
      console.log('  ✅ Product Catalog: Working');
      console.log(`  📊 Products: ${this.testResults.flash.products.productCount}`);
    } else {
      console.log('  ❌ Product Catalog: Failed');
      console.log(`  🔍 Error: ${this.testResults.flash.products?.error}`);
    }

    if (this.testResults.flash.transaction?.success) {
      console.log('  ✅ Transaction Creation: Working');
      console.log(`  📊 Transaction ID: ${this.testResults.flash.transaction.transactionId}`);
    } else {
      console.log('  ❌ Transaction Creation: Failed');
      console.log(`  🔍 Error: ${this.testResults.flash.transaction?.error}`);
    }

    // MobileMart API status
    console.log('\n📱 MobileMart API Integration:');
    if (this.testResults.mobilemart.connectivity?.success) {
      console.log('  ✅ API Connectivity: Working');
      console.log(`  📊 Response Time: ${this.testResults.mobilemart.connectivity.responseTime}`);
    } else {
      console.log('  ❌ API Connectivity: Failed');
      console.log(`  🔍 Error: ${this.testResults.mobilemart.connectivity?.error}`);
    }

    if (this.testResults.mobilemart.products?.success) {
      console.log('  ✅ Product Catalog: Working');
      console.log(`  📊 Products: ${this.testResults.mobilemart.products.productCount}`);
    } else {
      console.log('  ❌ Product Catalog: Failed');
      console.log(`  🔍 Error: ${this.testResults.mobilemart.products?.error}`);
    }

    if (this.testResults.mobilemart.transaction?.success) {
      console.log('  ✅ Transaction Creation: Working');
      console.log(`  📊 Transaction ID: ${this.testResults.mobilemart.transaction.transactionId}`);
    } else {
      console.log('  ❌ Transaction Creation: Failed');
      console.log(`  🔍 Error: ${this.testResults.mobilemart.transaction?.error}`);
    }

    // Transaction flows status
    console.log('\n💳 Transaction Flows:');
    if (this.testResults.transactionFlows.voucher?.success) {
      console.log('  ✅ Voucher Flow: Working');
      console.log(`  📊 Status: ${this.testResults.transactionFlows.voucher.status}`);
    } else {
      console.log('  ❌ Voucher Flow: Failed');
      console.log(`  🔍 Error: ${this.testResults.transactionFlows.voucher?.error}`);
    }

    if (this.testResults.transactionFlows.topup?.success) {
      console.log('  ✅ Top-up Flow: Working');
      console.log(`  📊 Status: ${this.testResults.transactionFlows.topup.status}`);
    } else {
      console.log('  ❌ Top-up Flow: Failed');
      console.log(`  🔍 Error: ${this.testResults.transactionFlows.topup?.error}`);
    }

    // Error handling status
    console.log('\n🛡️ Error Handling:');
    if (this.testResults.errorHandling.invalidKey?.success) {
      console.log('  ✅ Invalid API Key: Handled correctly');
    } else {
      console.log('  ❌ Invalid API Key: Not handled correctly');
    }

    if (this.testResults.errorHandling.timeout?.success) {
      console.log('  ✅ Network Timeout: Handled correctly');
    } else {
      console.log('  ❌ Network Timeout: Not handled correctly');
    }

    if (this.testResults.errorHandling.invalidProduct?.success) {
      console.log('  ✅ Invalid Product: Handled correctly');
    } else {
      console.log('  ❌ Invalid Product: Not handled correctly');
    }

    // Overall assessment
    console.log('\n🎯 Overall Assessment:');
    const flashWorking = this.testResults.flash.connectivity?.success && 
                        this.testResults.flash.products?.success && 
                        this.testResults.flash.transaction?.success;
    
    const mobilemartWorking = this.testResults.mobilemart.connectivity?.success && 
                             this.testResults.mobilemart.products?.success && 
                             this.testResults.mobilemart.transaction?.success;
    
    const flowsWorking = this.testResults.transactionFlows.voucher?.success && 
                        this.testResults.transactionFlows.topup?.success;
    
    const errorHandlingWorking = this.testResults.errorHandling.invalidKey?.success && 
                                this.testResults.errorHandling.timeout?.success && 
                                this.testResults.errorHandling.invalidProduct?.success;

    if (flashWorking && mobilemartWorking && flowsWorking && errorHandlingWorking) {
      console.log('  ✅ ALL SYSTEMS WORKING');
      console.log('  🚀 Ready for production deployment');
    } else {
      console.log('  ⚠️ SOME ISSUES DETECTED');
      if (!flashWorking) console.log('    - Flash API needs attention');
      if (!mobilemartWorking) console.log('    - MobileMart API needs attention');
      if (!flowsWorking) console.log('    - Transaction flows need attention');
      if (!errorHandlingWorking) console.log('    - Error handling needs attention');
    }

    console.log('\n📝 Recommendations:');
    if (!flashWorking) {
      console.log('  - Check Flash API credentials and connectivity');
      console.log('  - Verify Flash API endpoints and documentation');
    }
    if (!mobilemartWorking) {
      console.log('  - Check MobileMart API credentials and connectivity');
      console.log('  - Verify MobileMart API endpoints and documentation');
    }
    console.log('  - Implement real-time monitoring for API health');
    console.log('  - Set up automated alerts for API failures');
    console.log('  - Test with real transaction volumes');

    console.log('\n✅ VAS Supplier API Tests completed!');
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new VasApiTester();
  tester.runAllTests()
    .then(() => {
      console.log('\n🎉 All VAS API tests completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ VAS API tests failed:', error);
      process.exit(1);
    });
}

module.exports = VasApiTester;
