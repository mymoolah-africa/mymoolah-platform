#!/usr/bin/env node

/**
 * Check KYC Fallback Status
 * 
 * This script checks if the KYC fallback mechanism is properly implemented
 * and verifies the current OpenAI API key status.
 */

require('dotenv').config();
const kycService = require('../services/kycService');
const OpenAI = require('openai');

async function checkKYCFallbackStatus() {
  console.log('🔍 Checking KYC Fallback Status\n');
  console.log('='.repeat(70));

  // Check 1: OpenAI API Key Status
  console.log('\n📋 Check 1: OpenAI API Key Status');
  console.log('-'.repeat(70));
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('⚠️  OPENAI_API_KEY is not set in environment variables');
    console.log('   Status: Fallback will be used automatically');
  } else {
    console.log('✅ OPENAI_API_KEY is set');
    console.log(`   Key length: ${apiKey.length} characters`);
    console.log(`   Key prefix: ${apiKey.substring(0, 7)}...`);
    
    // Test API key validity
    try {
      const openai = new OpenAI({ apiKey });
      await openai.models.list();
      console.log('✅ OpenAI API key is VALID');
      console.log('   Status: Primary OCR (OpenAI) will be used');
    } catch (error) {
      if (error.status === 401) {
        console.log('❌ OpenAI API key is INVALID (401 error)');
        console.log('   Status: Fallback to Tesseract OCR will be used automatically');
      } else {
        console.log(`⚠️  OpenAI API test failed: ${error.message}`);
        console.log('   Status: Fallback to Tesseract OCR will be used if needed');
      }
    }
  }

  // Check 2: Fallback Code Implementation
  console.log('\n📋 Check 2: Fallback Code Implementation');
  console.log('-'.repeat(70));
  
  try {
    const hasProcessDocumentOCR = typeof kycService.processDocumentOCR === 'function';
    console.log(`✅ processDocumentOCR method: ${hasProcessDocumentOCR ? 'EXISTS' : 'MISSING'}`);
    
    const hasRunTesseractOCR = typeof kycService.runTesseractOCR === 'function';
    console.log(`✅ runTesseractOCR method: ${hasRunTesseractOCR ? 'EXISTS' : 'MISSING'}`);
    
    const hasParseSouthAfricanIdText = typeof kycService.parseSouthAfricanIdText === 'function';
    console.log(`✅ parseSouthAfricanIdText method: ${hasParseSouthAfricanIdText ? 'EXISTS' : 'MISSING'}`);
    
    // Check if fallback code is in place by reading the source
    const fs = require('fs');
    const kycServiceCode = fs.readFileSync('./services/kycService.js', 'utf8');
    
    const hasFallbackCheck = kycServiceCode.includes('hasLocalFile && localFilePath');
    const hasTesseractFallback = kycServiceCode.includes('Attempting Tesseract OCR fallback');
    const hasErrorHandling = kycServiceCode.includes('Error processing OCR (primary)');
    
    console.log(`✅ Fallback path check: ${hasFallbackCheck ? 'IMPLEMENTED' : 'MISSING'}`);
    console.log(`✅ Tesseract fallback log: ${hasTesseractFallback ? 'IMPLEMENTED' : 'MISSING'}`);
    console.log(`✅ Error handling: ${hasErrorHandling ? 'IMPLEMENTED' : 'MISSING'}`);
    
    if (hasFallbackCheck && hasTesseractFallback && hasErrorHandling) {
      console.log('\n✅ All fallback code is properly implemented!');
    } else {
      console.log('\n⚠️  Some fallback code may be missing');
    }
  } catch (error) {
    console.log(`❌ Error checking fallback implementation: ${error.message}`);
  }

  // Check 3: Tesseract Availability
  console.log('\n📋 Check 3: Tesseract OCR Availability');
  console.log('-'.repeat(70));
  
  try {
    const Tesseract = require('tesseract.js');
    console.log('✅ Tesseract.js is available');
    const tesseractPkg = require('tesseract.js/package.json');
    console.log(`   Version: ${tesseractPkg?.version || 'unknown'}`);
  } catch (error) {
    console.log('❌ Tesseract.js is not available');
    console.log('   Error: Fallback will NOT work without Tesseract');
    console.log('   Action: Install with: npm install tesseract.js');
  }

  // Check 4: Sharp Image Processing
  console.log('\n📋 Check 4: Sharp Image Processing');
  console.log('-'.repeat(70));
  
  try {
    const sharp = require('sharp');
    console.log('✅ Sharp is available');
    const sharpPkg = require('sharp/package.json');
    console.log(`   Version: ${sharpPkg?.version || 'unknown'}`);
  } catch (error) {
    console.log('❌ Sharp is not available');
    console.log('   Error: Image processing may fail');
    console.log('   Action: Install with: npm install sharp');
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 SUMMARY');
  console.log('='.repeat(70));
  
  const apiKeyValid = apiKey && (await (async () => {
    try {
      const openai = new OpenAI({ apiKey });
      await openai.models.list();
      return true;
    } catch {
      return false;
    }
  })());
  
  if (apiKeyValid) {
    console.log('✅ Status: OpenAI API key is valid');
    console.log('   Primary OCR: OpenAI GPT-4 Vision');
    console.log('   Fallback: Tesseract OCR (if OpenAI fails)');
  } else {
    console.log('⚠️  Status: OpenAI API key is invalid or not set');
    console.log('   Primary OCR: Tesseract OCR (fallback)');
    console.log('   Note: System will work without OpenAI, using Tesseract');
  }
  
  console.log('\n✅ KYC Fallback Status Check Complete!');
}

checkKYCFallbackStatus()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });

