#!/usr/bin/env node

/**
 * Test OpenAI functions in the KYC process
 * 
 * This script tests:
 * 1. OpenAI API key configuration
 * 2. OpenAI client initialization
 * 3. OpenAI Vision API call (with a test image)
 * 4. OCR result parsing
 */

require('dotenv').config();
const OpenAI = require('openai');
const path = require('path');
const fs = require('fs').promises;

// Import KYC service functions
const KYCService = require('../services/kycService');

async function testOpenAIConfiguration() {
  console.log('🧪 Testing OpenAI Configuration for KYC Process\n');
  console.log('='.repeat(70));

  // Test 1: Check environment variable
  console.log('\n📋 Test 1: Environment Variable Check');
  console.log('-'.repeat(70));
  
  const apiKey = process.env.OPENAI_API_KEY;
  
  if (!apiKey) {
    console.log('❌ OPENAI_API_KEY is not set in environment variables');
    console.log('   Please set OPENAI_API_KEY in your .env file');
    return false;
  }

  console.log('✅ OPENAI_API_KEY is set');
  console.log(`   Key length: ${apiKey.length} characters`);
  console.log(`   Key prefix: ${apiKey.substring(0, 7)}...`);
  console.log(`   Key suffix: ...${apiKey.substring(apiKey.length - 4)}`);

  // Test 2: Initialize OpenAI client
  console.log('\n📋 Test 2: OpenAI Client Initialization');
  console.log('-'.repeat(70));

  let openai;
  try {
    openai = new OpenAI({
      apiKey: apiKey
    });
    console.log('✅ OpenAI client initialized successfully');
  } catch (error) {
    console.log(`❌ Failed to initialize OpenAI client: ${error.message}`);
    return false;
  }

  // Test 3: Test API connectivity with a simple request
  console.log('\n📋 Test 3: API Connectivity Test');
  console.log('-'.repeat(70));

  try {
    // Simple test request to verify API key
    const testResponse = await openai.models.list();
    console.log('✅ OpenAI API connection successful');
    console.log(`   Available models: ${testResponse.data.length} models found`);
    
    // Check if gpt-5.0 is available
    const gpt50Available = testResponse.data.some(model => 
      model.id.includes('gpt-5.0') || model.id.includes('gpt-5')
    );
    
    if (gpt50Available) {
      console.log('✅ GPT-5.0 model is available');
    } else {
      console.log('⚠️  GPT-5.0 model not found in available models');
      console.log('   Available models:', testResponse.data.map(m => m.id).join(', '));
    }
  } catch (error) {
    console.log(`❌ OpenAI API connection failed: ${error.message}`);
    if (error.status === 401) {
      console.log('   Error: Invalid API key');
      console.log('   Please check your OPENAI_API_KEY in .env file');
      console.log('   Get a new key at: https://platform.openai.com/account/api-keys');
    } else if (error.status === 429) {
      console.log('   Error: Rate limit exceeded');
    } else {
      console.log(`   Error code: ${error.status || 'unknown'}`);
      console.log(`   Error type: ${error.type || 'unknown'}`);
    }
    return false;
  }

  // Test 4: Test KYC Service OpenAI initialization
  console.log('\n📋 Test 4: KYC Service OpenAI Initialization');
  console.log('-'.repeat(70));

  try {
    const kycService = new KYCService();
    const initializedOpenAI = await kycService.initializeOpenAI();
    
    if (initializedOpenAI) {
      console.log('✅ KYC Service OpenAI initialized successfully');
    } else {
      console.log('❌ KYC Service OpenAI initialization returned null');
      return false;
    }
  } catch (error) {
    console.log(`❌ KYC Service OpenAI initialization failed: ${error.message}`);
    return false;
  }

  // Test 5: Test Vision API with a simple test (if we have a test image)
  console.log('\n📋 Test 5: OpenAI Vision API Test');
  console.log('-'.repeat(70));

  // Check if we have a test image
  const testImagePath = path.join(__dirname, '../uploads/kyc/test_id.jpg');
  let hasTestImage = false;

  try {
    await fs.access(testImagePath);
    hasTestImage = true;
    console.log('✅ Test image found');
  } catch {
    console.log('ℹ️  No test image found (skipping actual OCR test)');
    console.log('   To test OCR, place a test ID image at: uploads/kyc/test_id.jpg');
  }

  if (hasTestImage) {
    try {
      console.log('   Testing OCR with test image...');
      
      // Read and encode image
      const imageBuffer = await fs.readFile(testImagePath);
      const imageBase64 = imageBuffer.toString('base64');
      const mimeType = 'image/jpeg';

      // Make Vision API call
      const response = await openai.chat.completions.create({
        model: "gpt-5.0",
        messages: [{
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract the following information from this identity document: Full name, ID/Passport number, Date of birth. Return as JSON format with exact values as they appear on the document." 
            },
            { 
              type: "image_url", 
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`
              }
            }
          ]
        }],
        max_tokens: 500
      });

      const content = response.choices[0].message.content || '';
      console.log('✅ OpenAI Vision API call successful');
      console.log(`   Response length: ${content.length} characters`);
      console.log(`   Response preview: ${content.substring(0, 200)}...`);
      
      // Try to parse as JSON
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          console.log('✅ Response parsed as JSON successfully');
          console.log('   Extracted data:', JSON.stringify(parsed, null, 2));
        } else {
          console.log('⚠️  Response does not contain valid JSON');
        }
      } catch (parseError) {
        console.log('⚠️  Could not parse response as JSON');
        console.log(`   Error: ${parseError.message}`);
      }

    } catch (error) {
      console.log(`❌ OpenAI Vision API test failed: ${error.message}`);
      if (error.status === 401) {
        console.log('   Error: Invalid API key');
      } else if (error.status === 429) {
        console.log('   Error: Rate limit exceeded');
      } else {
        console.log(`   Error code: ${error.status || 'unknown'}`);
      }
      return false;
    }
  }

  // Test 6: Test KYC Service OCR processing (if test image exists)
  if (hasTestImage) {
    console.log('\n📋 Test 6: KYC Service OCR Processing');
    console.log('-'.repeat(70));

    try {
      const kycService = new KYCService();
      await kycService.initializeOpenAI();
      
      console.log('   Processing document with KYC Service...');
      const ocrResults = await kycService.processDocumentOCR(testImagePath, 'id_document');
      
      console.log('✅ KYC Service OCR processing successful');
      console.log('   Extracted data:', JSON.stringify(ocrResults, null, 2));
      
    } catch (error) {
      console.log(`❌ KYC Service OCR processing failed: ${error.message}`);
      console.log(`   Error stack: ${error.stack}`);
      return false;
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ All OpenAI Tests Completed!');
  return true;
}

// Run tests
testOpenAIConfiguration()
  .then(success => {
    if (success) {
      console.log('\n🎉 OpenAI integration is working correctly!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tests failed. Please check the errors above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Test script error:', error);
    process.exit(1);
  });

