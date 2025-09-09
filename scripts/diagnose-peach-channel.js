#!/usr/bin/env node

/**
 * 🔍 PEACH PAYMENTS CHANNEL DIAGNOSTIC SCRIPT
 * 
 * This script helps diagnose the "Channel not found" error by:
 * 1. Testing OAuth authentication
 * 2. Testing different entity IDs
 * 3. Testing different endpoints
 * 4. Providing detailed error information
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

console.log('🔍 PEACH PAYMENTS CHANNEL DIAGNOSTIC');
console.log('=' .repeat(60));

// Display current configuration
console.log('\n📋 CURRENT CONFIGURATION:');
console.log(`Auth Base: ${PEACH_CONFIG.authBase}`);
console.log(`Checkout Base: ${PEACH_CONFIG.checkoutBase}`);
console.log(`Client ID: ${PEACH_CONFIG.clientId ? 'Configured' : 'Missing'}`);
console.log(`Client Secret: ${PEACH_CONFIG.clientSecret ? 'Configured' : 'Missing'}`);
console.log(`Merchant ID: ${PEACH_CONFIG.merchantId ? 'Configured' : 'Missing'}`);
console.log(`Entity ID (PayShap): ${PEACH_CONFIG.entityIdPayShap}`);
console.log(`Test Mode: ${PEACH_CONFIG.enableTestMode}`);

async function getAccessToken() {
  try {
    console.log('\n🔐 Testing OAuth Authentication...');
    const response = await axios.post(`${PEACH_CONFIG.authBase}/api/oauth/token`, {
      clientId: PEACH_CONFIG.clientId,
      clientSecret: PEACH_CONFIG.clientSecret,
      merchantId: PEACH_CONFIG.merchantId,
    }, { timeout: 15000 });
    
    const token = response.data.token || response.data.access_token;
    if (token) {
      console.log('✅ OAuth Authentication: SUCCESS');
      console.log(`Token: ${token.substring(0, 20)}...`);
      return token;
    } else {
      console.log('❌ OAuth Authentication: FAILED - No token in response');
      console.log('Response:', JSON.stringify(response.data, null, 2));
      return null;
    }
  } catch (error) {
    console.log('❌ OAuth Authentication: FAILED');
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function testEntityId(token, entityId, description) {
  try {
    console.log(`\n🧪 Testing Entity ID: ${entityId} (${description})`);
    
    const url = `${PEACH_CONFIG.checkoutBase}/v2/checkout`;
    const body = {
      entityId: entityId,
      amount: '100.00',
      currency: 'ZAR',
      description: 'Channel Test',
      defaultPaymentMethod: 'PAYSHAP',
      forceDefaultMethod: true,
      shopperResultUrl: 'http://localhost:3001/health'
    };
    
    const headers = { Authorization: `Bearer ${token}` };
    const response = await axios.post(url, body, { headers, timeout: 20000 });
    
    console.log('✅ Entity ID Test: SUCCESS');
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.log('❌ Entity ID Test: FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
    return false;
  }
}

async function testAlternativeEndpoints(token) {
  console.log('\n🔍 Testing Alternative Endpoints...');
  
  const endpoints = [
    {
      url: `${PEACH_CONFIG.checkoutBase}/v1/checkout`,
      description: 'Checkout V1'
    },
    {
      url: `${PEACH_CONFIG.checkoutBase}/v2/checkout`,
      description: 'Checkout V2'
    },
    {
      url: `${PEACH_CONFIG.checkoutBase}/v1/payments?entityId=${PEACH_CONFIG.entityIdPayShap}`,
      description: 'Payments API V1'
    }
  ];
  
  for (const endpoint of endpoints) {
    try {
      console.log(`\n🧪 Testing ${endpoint.description}...`);
      
      const body = {
        entityId: PEACH_CONFIG.entityIdPayShap,
        amount: '100.00',
        currency: 'ZAR',
        description: 'Endpoint Test',
        defaultPaymentMethod: 'PAYSHAP',
        forceDefaultMethod: true
      };
      
      const headers = { Authorization: `Bearer ${token}` };
      const response = await axios.post(endpoint.url, body, { headers, timeout: 20000 });
      
      console.log(`✅ ${endpoint.description}: SUCCESS`);
      console.log('Response:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.log(`❌ ${endpoint.description}: FAILED`);
      console.log('Status:', error.response?.status);
      console.log('Error:', error.response?.data || error.message);
    }
  }
}

async function testPaymentMethods(token) {
  console.log('\n💳 Testing Available Payment Methods...');
  
  try {
    const url = `${PEACH_CONFIG.checkoutBase}/v2/paymentMethods?entityId=${PEACH_CONFIG.entityIdPayShap}`;
    const headers = { Authorization: `Bearer ${token}` };
    const response = await axios.get(url, { headers, timeout: 20000 });
    
    console.log('✅ Payment Methods: SUCCESS');
    console.log('Available methods:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.log('❌ Payment Methods: FAILED');
    console.log('Status:', error.response?.status);
    console.log('Error:', error.response?.data || error.message);
  }
}

async function main() {
  try {
    // Test OAuth
    const token = await getAccessToken();
    if (!token) {
      console.log('\n❌ Cannot proceed without valid OAuth token');
      return;
    }
    
    // Test current entity ID
    await testEntityId(token, PEACH_CONFIG.entityIdPayShap, 'Current PayShap Entity');
    
    // Test alternative entity IDs (common test entity IDs)
    const alternativeEntityIds = [
      '8ac7a4ca98972c34019899445be504d8', // Current
      '8ac7a4c8987c3fba019884bda5da12e8', // From PEACH_RECURRING_ID
      '8ac7a4ca98972c34019899445be504d9', // Similar to current
      '8ac7a4ca98972c34019899445be504d7'  // Similar to current
    ];
    
    for (const entityId of alternativeEntityIds) {
      if (entityId !== PEACH_CONFIG.entityIdPayShap) {
        await testEntityId(token, entityId, 'Alternative Entity');
      }
    }
    
    // Test alternative endpoints
    await testAlternativeEndpoints(token);
    
    // Test payment methods
    await testPaymentMethods(token);
    
    console.log('\n🎯 DIAGNOSTIC COMPLETE');
    console.log('=' .repeat(60));
    console.log('📋 RECOMMENDATIONS:');
    console.log('1. Check Peach Payments dashboard for correct entity ID');
    console.log('2. Verify entity has PayShap capabilities enabled');
    console.log('3. Contact Peach Payments support if issue persists');
    console.log('4. Consider using Payments API instead of Checkout API');
    
  } catch (error) {
    console.log('\n💥 Diagnostic failed:', error.message);
  }
}

main();
