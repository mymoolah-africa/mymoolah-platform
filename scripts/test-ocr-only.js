#!/usr/bin/env node

/**
 * Standalone OCR Test Script
 * Tests OpenAI OCR extraction without database operations
 * 
 * Usage: node scripts/test-ocr-only.js <path-to-image-file>
 * Example: node scripts/test-ocr-only.js uploads/kyc/1_id_document_1234567890.jpg
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs').promises;

// Import the KYC service
const KYCService = require('../services/kycService');

async function testOCR(imagePath) {
  try {
    console.log('🧪 OCR Test Script - Standalone Mode\n');
    console.log('📄 Image file:', imagePath);
    
    // Check if file exists
    try {
      await fs.access(imagePath);
      console.log('✅ Image file found\n');
    } catch (error) {
      console.error('❌ Image file not found:', imagePath);
      process.exit(1);
    }
    
    // Check for OpenAI API key
    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ OPENAI_API_KEY not found in environment variables');
      process.exit(1);
    }
    console.log('✅ OpenAI API key found\n');
    
    // Initialize KYC service
    const kycService = new KYCService();
    
    // Process OCR (this only does OCR, no database operations)
    console.log('🔄 Processing OCR...\n');
    const ocrResults = await kycService.processDocumentOCR(imagePath, 'id_document');
    
    // Display results
    console.log('\n' + '='.repeat(60));
    console.log('✅ OCR EXTRACTION SUCCESSFUL');
    console.log('='.repeat(60) + '\n');
    
    console.log('📋 Extracted Data:');
    console.log(JSON.stringify(ocrResults, null, 2));
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 Field Validation:');
    console.log('='.repeat(60));
    
    // Validate critical fields
    const cleanedIdNumber = ocrResults.idNumber ? ocrResults.idNumber.replace(/\D/g, '') : '';
    const hasIdNumber = cleanedIdNumber.length === 13 && /^\d{13}$/.test(cleanedIdNumber);
    const hasName = (ocrResults.surname?.trim().length >= 2) || 
                   (ocrResults.forenames?.trim().length >= 2) ||
                   (ocrResults.fullName?.trim().length >= 2);
    
    console.log(`ID Number: ${ocrResults.idNumber || 'MISSING'}`);
    console.log(`  └─ Cleaned: ${cleanedIdNumber || 'N/A'}`);
    console.log(`  └─ Valid: ${hasIdNumber ? '✅ YES (13 digits)' : '❌ NO'}`);
    console.log('');
    console.log(`Surname: ${ocrResults.surname || 'MISSING'}`);
    console.log(`Forenames: ${ocrResults.forenames || 'MISSING'}`);
    console.log(`Full Name: ${ocrResults.fullName || 'MISSING'}`);
    console.log(`  └─ Valid: ${hasName ? '✅ YES' : '❌ NO'}`);
    console.log('');
    console.log(`Date of Birth: ${ocrResults.dateOfBirth || 'MISSING'}`);
    console.log(`Date Issued: ${ocrResults.dateIssued || 'MISSING'}`);
    console.log(`Country of Birth: ${ocrResults.countryOfBirth || 'MISSING'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 Overall Status:');
    console.log('='.repeat(60));
    
    if (hasIdNumber && hasName) {
      console.log('✅ All critical fields extracted successfully!');
      console.log('✅ OCR is working correctly');
    } else {
      console.log('⚠️  Some critical fields are missing:');
      if (!hasIdNumber) {
        console.log('   ❌ ID Number is missing or invalid');
      }
      if (!hasName) {
        console.log('   ❌ Name is missing or invalid');
      }
      console.log('\n💡 Tips:');
      console.log('   - Ensure the image is clear and well-lit');
      console.log('   - Make sure the ID document is fully visible');
      console.log('   - Try taking the photo from directly above the document');
      console.log('   - Avoid glare and shadows');
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n' + '='.repeat(60));
    console.error('❌ OCR TEST FAILED');
    console.error('='.repeat(60) + '\n');
    console.error('Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Get image path from command line
const imagePath = process.argv[2];

if (!imagePath) {
  console.error('❌ Usage: node scripts/test-ocr-only.js <path-to-image-file>');
  console.error('   Example: node scripts/test-ocr-only.js uploads/kyc/1_id_document_1234567890.jpg');
  process.exit(1);
}

// Resolve path (can be relative or absolute)
const resolvedPath = path.isAbsolute(imagePath) 
  ? imagePath 
  : path.join(__dirname, '..', imagePath);

testOCR(resolvedPath);

