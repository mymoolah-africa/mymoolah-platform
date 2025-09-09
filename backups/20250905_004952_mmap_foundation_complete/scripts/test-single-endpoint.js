#!/usr/bin/env node

const axios = require('axios');

async function testSingleEndpoint() {
  try {
    console.log('🧪 Testing single Peach Payments endpoint...');
    
    const response = await axios.get('http://localhost:3001/api/v1/peach/health');
    console.log('✅ Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.log('❌ Error:', error.response?.data || error.message);
    console.log('📊 Status:', error.response?.status || 'No status');
  }
}

testSingleEndpoint();


