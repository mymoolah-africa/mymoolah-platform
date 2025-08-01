const express = require('express');
const path = require('path');

// Test basic imports
console.log('🔍 Testing imports...');

try {
  const KYCController = require('./controllers/kycController');
  console.log('✅ KYCController imported successfully');
  
  const KYCService = require('./services/kycService');
  console.log('✅ KYCService imported successfully');
  
  const Wallet = require('./models/Wallet');
  console.log('✅ Wallet model imported successfully');
  
  console.log('✅ All imports successful');
  
  // Test basic Express app
  const app = express();
  console.log('✅ Express app created');
  
  console.log('✅ All tests passed - server should start normally');
  
} catch (error) {
  console.error('❌ Import error:', error.message);
  console.error('❌ Error stack:', error.stack);
} 