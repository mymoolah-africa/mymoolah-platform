#!/usr/bin/env node

/**
 * 🧪 PEACH PAYMENTS API TEST (Payments API with AWS SigV4)
 * 
 * This script tests the Payments API approach which should work
 * even when Checkout API returns "Channel not found"
 */

require('dotenv').config();
const axios = require('axios');

const PEACH_CONFIG = {
  authBase: process.env.PEACH_BASE_AUTH,
  checkoutBase: process.env.PEACH_BASE_CHECKOUT,
  clientId: process.env.PEACH_CLIENT_ID,
  clientSecret: process.env.PEACH_CLIENT_SECRET,
  merchantId: process.env.PEACH_MERCHANT_ID,
  entityIdPayShap: process.env.PEACH_ENTITY_ID_PSH,
  enableTestMode: process.env.PEACH_ENABLE_TEST_MODE === 'true'
};

async function getAccessToken() {
  const response = await axios.post(`${PEACH_CONFIG.authBase}/api/oauth/token`, {
    clientId: PEACH_CONFIG.clientId,
    clientSecret: PEACH_CONFIG.clientSecret,
    merchantId: PEACH_CONFIG.merchantId,
  }, { timeout: 15000 });
  
  return response.data.token || response.data.access_token;
}

async function testPaymentsAPI() {
  try {
    console.log('🧪 Testing Payments API (Alternative to Checkout API)...');
    
    const token = await getAccessToken();
    console.log('✅ OAuth Token obtained');
    
    const url = `${PEACH_CONFIG.checkoutBase}/v1/payments?entityId=${PEACH_CONFIG.entityIdPayShap}`;
    
    const body = {
      amount: '100.00',
      currency: 'ZAR',
      paymentBrand: 'PAYSHAP',
      paymentType: 'DB',
      merchantTransactionId: `TEST-${Date.now()}`,
      'customer[mobile]': '+27-711111200',
      'customer[ip]': '127.0.0.1',
      descriptor: 'PayShap Test Payment',
      // Enable test mode for sandbox
      'customParameters[enableTestMode]': 'true'
    };
    
    const headers = { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    };
    
    console.log('📤 Request URL:', url);
    console.log('📤 Request Body:', JSON.stringify(body, null, 2));
    
    const response = await axios.post(url, body, { headers, timeout: 20000 });
    
    console.log('✅ Payments API: SUCCESS');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Payments API: FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    
    if (error.response?.status === 403) {
      console.log('\n💡 This suggests we need AWS SigV4 signing for Payments API');
      console.log('   The Checkout API approach might be the correct one');
    }
  }
}

async function testAlternativeCheckoutApproach() {
  try {
    console.log('\n🧪 Testing Alternative Checkout Approach...');
    
    const token = await getAccessToken();
    
    // Try with different parameters
    const url = `${PEACH_CONFIG.checkoutBase}/v2/checkout`;
    
    const body = {
      entityId: PEACH_CONFIG.entityIdPayShap,
      amount: '100.00',
      currency: 'ZAR',
      description: 'PayShap Test',
      // Try without forcing PayShap
      defaultPaymentMethod: 'PAYSHAP',
      // Don't force the method
      // forceDefaultMethod: true,
      shopperResultUrl: 'http://localhost:3001/health',
      // Add test mode parameters
      testMode: true
    };
    
    const headers = { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    console.log('📤 Request URL:', url);
    console.log('📤 Request Body:', JSON.stringify(body, null, 2));
    
    const response = await axios.post(url, body, { headers, timeout: 20000 });
    
    console.log('✅ Alternative Checkout: SUCCESS');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Alternative Checkout: FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

async function main() {
  console.log('🚀 PEACH PAYMENTS API TESTING');
  console.log('=' .repeat(50));
  
  await testPaymentsAPI();
  await testAlternativeCheckoutApproach();
  
  console.log('\n🎯 SUMMARY:');
  console.log('The "Channel not found" error indicates that the entity ID');
  console.log('is not configured for PayShap in the sandbox environment.');
  console.log('This is a configuration issue that needs to be resolved');
  console.log('with Peach Payments support or by using a different entity ID.');
}

main().catch(console.error);
