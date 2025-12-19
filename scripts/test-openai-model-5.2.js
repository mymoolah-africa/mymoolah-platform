#!/usr/bin/env node

/**
 * Test Script: Check if OpenAI GPT-5.2 model is available
 * 
 * This script tests if the GPT-5.2 model is available in your OpenAI account
 * and can be used for API calls.
 * 
 * Usage:
 *   node scripts/test-openai-model-5.2.js
 * 
 * Requirements:
 *   - OPENAI_API_KEY must be set in environment
 */

require('dotenv').config();
const OpenAI = require('openai');

const MODEL_TO_TEST = 'gpt-5.2';
const ALTERNATIVE_MODELS = ['gpt-5', 'gpt-5o', 'gpt-5-turbo', 'gpt-5.1-turbo'];

async function testModelAvailability() {
  console.log('🔍 Testing OpenAI Model Availability\n');
  console.log(`Target Model: ${MODEL_TO_TEST}\n`);

  // Check if API key is set
  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ ERROR: OPENAI_API_KEY not found in environment');
    console.log('\nPlease set OPENAI_API_KEY in your .env file or environment');
    process.exit(1);
  }

  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  });

  try {
    // Step 1: List all available models
    console.log('📋 Step 1: Fetching available models from OpenAI...');
    const modelsResponse = await openai.models.list();
    const availableModels = modelsResponse.data.map(model => model.id);
    
    console.log(`✅ Found ${availableModels.length} available models\n`);
    
    // Step 2: Check if GPT-5.1 is available
    console.log('🔍 Step 2: Checking for GPT-5.1 model...');
    const exactMatch = availableModels.find(model => 
      model.toLowerCase() === MODEL_TO_TEST.toLowerCase() ||
      model.toLowerCase().includes('gpt-5.1')
    );
    
    if (exactMatch) {
      console.log(`✅ Found exact match: ${exactMatch}`);
    } else {
      console.log(`❌ ${MODEL_TO_TEST} not found in available models`);
    }
    
    // Step 3: Check for alternative GPT-5 models
    console.log('\n🔍 Step 3: Checking for alternative GPT-5 models...');
    const gpt5Models = availableModels.filter(model => 
      model.toLowerCase().includes('gpt-5') || 
      model.toLowerCase().includes('gpt5')
    );
    
    if (gpt5Models.length > 0) {
      console.log(`✅ Found ${gpt5Models.length} GPT-5 related models:`);
      gpt5Models.forEach(model => console.log(`   - ${model}`));
    } else {
      console.log('❌ No GPT-5 models found');
    }
    
    // Step 4: List all GPT models for reference
    console.log('\n📋 Step 4: All available GPT models:');
    const gptModels = availableModels
      .filter(model => model.toLowerCase().includes('gpt'))
      .sort();
    
    if (gptModels.length > 0) {
      gptModels.forEach(model => {
        const isTarget = model.toLowerCase().includes('5.1') || model.toLowerCase() === MODEL_TO_TEST.toLowerCase();
        console.log(`   ${isTarget ? '🎯' : '  '} ${model}`);
      });
    } else {
      console.log('   No GPT models found');
    }
    
    // Step 5: Test API call with GPT-5.1 if available
    const modelToTest = exactMatch || gpt5Models[0] || null;
    
    if (modelToTest) {
      console.log(`\n🧪 Step 5: Testing API call with model: ${modelToTest}...`);
      try {
        const testResponse = await openai.chat.completions.create({
          model: modelToTest,
          messages: [
            {
              role: 'user',
              content: 'Say "Hello, GPT-5.1 test successful!" if you can read this.'
            }
          ],
          max_completion_tokens: 50
        });
        
        const responseText = testResponse.choices[0]?.message?.content || 'No response';
        console.log(`✅ API call successful!`);
        console.log(`   Response: ${responseText}`);
        console.log(`\n✅ Model ${modelToTest} is working and ready to use!`);
        
        return {
          success: true,
          model: modelToTest,
          available: true
        };
      } catch (apiError) {
        console.log(`❌ API call failed:`);
        console.log(`   Error: ${apiError.message}`);
        if (apiError.status) {
          console.log(`   Status: ${apiError.status}`);
        }
        
        return {
          success: false,
          model: modelToTest,
          available: false,
          error: apiError.message
        };
      }
    } else {
      console.log(`\n❌ Step 5: Cannot test - no GPT-5.1 or GPT-5 model found`);
      console.log(`\n💡 Recommendation:`);
      console.log(`   - GPT-5.1 may not be available yet`);
      console.log(`   - Current available models are listed above`);
      console.log(`   - You may need to wait for GPT-5.1 release or use an alternative model`);
      
      return {
        success: false,
        model: null,
        available: false,
        error: 'Model not found'
      };
    }
    
  } catch (error) {
    console.error('\n❌ Error testing model availability:');
    console.error(`   ${error.message}`);
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    process.exit(1);
  }
}

// Run the test
testModelAvailability()
  .then(result => {
    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('✅ TEST RESULT: GPT-5.1 (or equivalent) is AVAILABLE and WORKING');
      console.log(`   Model to use: ${result.model}`);
      console.log('\n✅ Safe to proceed with updating all files to use this model');
    } else {
      console.log('❌ TEST RESULT: GPT-5.1 is NOT AVAILABLE');
      console.log('\n⚠️  Do NOT update files yet - model is not available');
      console.log('   Please check OpenAI documentation for model availability');
    }
    console.log('='.repeat(60));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

