#!/usr/bin/env node

/**
 * Test VALR integration with current API credentials
 * Uses VALR_API_KEY and VALR_API_SECRET from .env or environment.
 *
 * Usage (from project root):
 *   node scripts/test-valr-integration.js
 *   # or with explicit env:
 *   VALR_API_KEY=xxx VALR_API_SECRET=yyy node scripts/test-valr-integration.js
 */

const path = require('path');

// Load .env from project root (parent of scripts/)
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const valrService = require('../services/valrService');

const PAIR = 'USDCZAR';
const TEST_ZAR_AMOUNT = 100; // R100 - small amount for quote test only

async function main() {
  console.log('🔐 VALR integration test');
  console.log('   API URL:', process.env.VALR_API_URL || 'https://api.valr.com');
  console.log('   API Key set:', !!process.env.VALR_API_KEY);
  console.log('   API Secret set:', !!process.env.VALR_API_SECRET);
  console.log('');

  if (!process.env.VALR_API_KEY || !process.env.VALR_API_SECRET) {
    console.error('❌ VALR_API_KEY and VALR_API_SECRET must be set in .env or environment.');
    process.exit(1);
  }

  try {
    console.log(`📋 Requesting quote: ${PAIR}, pay ${TEST_ZAR_AMOUNT} ZAR...`);
    const quote = await valrService.getInstantQuote(PAIR, TEST_ZAR_AMOUNT);
    console.log('');
    console.log('✅ Quote received:');
    console.log('   Order ID:', quote.orderId);
    console.log('   Pay (ZAR):', quote.zarAmount);
    console.log('   Receive (USDC):', quote.usdcAmount);
    console.log('   Rate:', quote.rate);
    console.log('   Expires:', quote.expiresAt);
    console.log('');
    console.log('✅ VALR integration test passed.');
    process.exit(0);
  } catch (err) {
    console.error('');
    console.error('❌ VALR test failed:', err.message);
    if (err.code) console.error('   Code:', err.code);
    if (err.response) {
      console.error('   HTTP status:', err.response.status);
      console.error('   Response:', JSON.stringify(err.response.data, null, 2));
    }
    process.exit(1);
  }
}

main();
