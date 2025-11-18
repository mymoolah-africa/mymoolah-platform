#!/usr/bin/env node

/**
 * Quick check: Verify exact GPT-5 model name format
 * 
 * This script checks if "gpt-5" or "gpt-5.0" exists in your OpenAI account
 * to determine the correct model name to use.
 */

require('dotenv').config();
const OpenAI = require('openai');

if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function checkModelName() {
  try {
    const models = await openai.models.list();
    const modelIds = models.data.map(m => m.id);
    
    // Check for both formats
    const gpt5 = modelIds.find(m => m === 'gpt-5' || m === 'gpt-5-turbo' || m === 'gpt-5o');
    const gpt50 = modelIds.find(m => m === 'gpt-5.0' || m === 'gpt-5.0-turbo');
    
    // Find any GPT-5 related models
    const allGpt5 = modelIds.filter(m => m.includes('gpt-5') || m.includes('gpt5'));
    
    console.log('🔍 Checking GPT-5 model name format...\n');
    
    if (gpt5) {
      console.log(`✅ Found: "${gpt5}" (use this exact name)`);
      console.log(`   Format: gpt-5 (without .0)`);
    } else if (gpt50) {
      console.log(`✅ Found: "${gpt50}" (use this exact name)`);
      console.log(`   Format: gpt-5.0 (with .0)`);
    } else if (allGpt5.length > 0) {
      console.log(`✅ Found GPT-5 models:`);
      allGpt5.forEach(m => console.log(`   - ${m}`));
      console.log(`\n💡 Use the exact model name shown above`);
    } else {
      console.log(`❌ No GPT-5 models found`);
      console.log(`\nAvailable GPT models:`);
      const gptModels = modelIds.filter(m => m.includes('gpt')).sort();
      gptModels.forEach(m => console.log(`   - ${m}`));
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkModelName();

