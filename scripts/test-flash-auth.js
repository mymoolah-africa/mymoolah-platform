#!/usr/bin/env node

/**
 * Quick Flash Authentication Test
 * Tests if Flash credentials work correctly
 */

require('dotenv').config();
const axios = require('axios');

async function testFlashAuth() {
  console.log('\n🔍 Testing Flash Authentication\n');
  
  // Display environment variables
  console.log('Environment Variables:');
  console.log('  FLASH_LIVE_INTEGRATION:', process.env.FLASH_LIVE_INTEGRATION);
  console.log('  FLASH_CONSUMER_KEY:', process.env.FLASH_CONSUMER_KEY ? '✅ Set' : '❌ Missing');
  console.log('  FLASH_CONSUMER_SECRET:', process.env.FLASH_CONSUMER_SECRET ? '✅ Set' : '❌ Missing');
  console.log('  FLASH_ACCOUNT_NUMBER:', process.env.FLASH_ACCOUNT_NUMBER);
  console.log('  FLASH_API_URL:', process.env.FLASH_API_URL);
  console.log();

  // Check if credentials exist
  if (!process.env.FLASH_CONSUMER_KEY || !process.env.FLASH_CONSUMER_SECRET) {
    console.error('❌ Flash credentials not found in .env file');
    process.exit(1);
  }

  // Test authentication
  try {
    console.log('📞 Calling Flash Token API...\n');
    
    const consumerKey = process.env.FLASH_CONSUMER_KEY;
    const consumerSecret = process.env.FLASH_CONSUMER_SECRET;
    const credentials = `${consumerKey}:${consumerSecret}`;
    const base64Credentials = Buffer.from(credentials).toString('base64');
    
    const tokenUrl = process.env.FLASH_TOKEN_URL || `${process.env.FLASH_API_URL}/token` || 'https://api.flashswitch.flash-group.com/token';
    console.log('  Token URL:', tokenUrl);
    console.log('  Authorization: Basic [credentials]');
    console.log();

    const response = await axios.post(
      tokenUrl,
      'grant_type=client_credentials',
      {
        headers: {
          'Authorization': `Basic ${base64Credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );

    console.log('✅ Authentication Successful!\n');
    console.log('Response:');
    console.log('  Access Token:', response.data.access_token ? `${response.data.access_token.substring(0, 20)}...` : 'N/A');
    console.log('  Token Type:', response.data.token_type);
    console.log('  Expires In:', response.data.expires_in, 'seconds');
    console.log();

    // Test getting products
    console.log('📦 Testing Product List API...\n');
    
    const accountNumber = process.env.FLASH_ACCOUNT_NUMBER || '8444-1533-7896-6119';
    const apiBase = process.env.FLASH_API_URL || 'https://api-flashswitch-sandbox.flash-group.com';
    const productsUrl = `${apiBase}/v4/accounts/${accountNumber}/products`;
    
    const productsResponse = await axios.get(productsUrl, {
      headers: {
        'Authorization': `Bearer ${response.data.access_token}`
      },
      timeout: 10000
    });

    const products = productsResponse.data.products || productsResponse.data || [];
    console.log(`✅ Products Fetched: ${products.length} products found`);
    console.log();

    if (products.length > 0) {
      console.log('Sample Product:');
      console.log(JSON.stringify(products[0], null, 2));
    }

    console.log('\n🎉 Flash API is working correctly!\n');

  } catch (error) {
    console.error('❌ Authentication Failed\n');
    
    if (error.response) {
      console.error('HTTP Status:', error.response.status);
      console.error('Response Data:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error:', error.message);
    }
    
    console.log();
    process.exit(1);
  }
}

testFlashAuth();
