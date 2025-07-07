#!/usr/bin/env node

/**
 * Test script to verify KYC validation is working
 */

require('dotenv').config();
const KYCService = require('./services/kycService');

async function testValidation() {
  try {
    console.log('🧪 Testing KYC validation...');
    
    // Test with mock OCR results for Leonie's ID
    const mockOCRResults = {
      fullName: 'Leonie Botes',
      idNumber: '6610200861234',
      dateOfBirth: '1966-10-20',
      nationality: 'South African',
      documentType: 'ID',
      countryOfIssue: 'South Africa'
    };
    
    console.log('🔍 Mock OCR Results:', mockOCRResults);
    
    // Test validation for user 7 (Andre Botes)
    const validation = await KYCService.validateDocumentAgainstUser(mockOCRResults, 7);
    
    console.log('🔍 Validation Result:', validation);
    
    if (validation.isValid) {
      console.log('❌ ERROR: Validation should have failed for Leonie\'s ID on Andre\'s account!');
    } else {
      console.log('✅ SUCCESS: Validation correctly rejected Leonie\'s ID for Andre\'s account!');
      console.log('📝 Issues:', validation.issues);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testValidation(); 