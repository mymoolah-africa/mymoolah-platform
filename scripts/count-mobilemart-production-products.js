#!/usr/bin/env node

/**
 * Count MobileMart Products from Production API
 * Connects to MobileMart Production API and fetches product counts
 * 
 * Usage: node scripts/count-mobilemart-production-products.js
 */

const { execSync } = require('child_process');
const MobileMartAuthService = require('../services/mobilemartAuthService');

async function countProductionProducts() {
  console.log('\n📡 Fetching products from MobileMart PRODUCTION API...\n');
  
  try {
    // Get credentials from Secret Manager (in Codespaces)
    console.log('🔐 Loading production credentials from Secret Manager...');
    
    const clientId = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-client-id" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    const clientSecret = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-client-secret" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    const apiUrl = execSync(
      'gcloud secrets versions access latest --secret="mobilemart-prod-api-url" --project=mymoolah-db',
      { encoding: 'utf8' }
    ).trim();
    
    console.log(`✅ Credentials loaded (Client ID: ${clientId})\n`);
    
    // Set production environment
    process.env.MOBILEMART_CLIENT_ID = clientId;
    process.env.MOBILEMART_CLIENT_SECRET = clientSecret;
    process.env.MOBILEMART_API_URL = apiUrl;
    process.env.MOBILEMART_TOKEN_URL = `${apiUrl}/connect/token`;
    process.env.MOBILEMART_SCOPE = 'api';
    
    const authService = new MobileMartAuthService();
    const VAS_TYPES = ['airtime', 'data', 'utility', 'voucher', 'bill-payment'];
    
    console.log('📊 Fetching product counts by VAS type:\n');
    
    let grandTotal = 0;
    const results = {};
    
    for (const vasType of VAS_TYPES) {
      try {
        // Normalize VAS type for API
        const normalizedType = vasType === 'utility' ? 'prepaidutility' : vasType;
        
        const response = await authService.makeAuthenticatedRequest(
          'GET',
          `/${normalizedType}/products`
        );
        
        const products = response.products || response || [];
        const count = products.length;
        
        console.log(`  ${vasType}: ${count} products`);
        results[vasType] = { count, products: products.length };
        grandTotal += count;
      } catch (error) {
        console.error(`  ${vasType}: ERROR - ${error.message}`);
        results[vasType] = { count: 0, error: error.message };
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(`Total MobileMart Production Products: ${grandTotal}`);
    console.log('='.repeat(60) + '\n');
    
    // Breakdown
    console.log('📋 Detailed Breakdown:\n');
    for (const [vasType, data] of Object.entries(results)) {
      if (data.error) {
        console.log(`  ${vasType}: ❌ Error - ${data.error}`);
      } else {
        console.log(`  ${vasType}: ✅ ${data.count} products`);
      }
    }
    console.log();
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    console.error('\n💡 TROUBLESHOOTING:');
    console.error('   1. Ensure you are in Codespaces (Secret Manager access required)');
    console.error('   2. Check gcloud authentication: gcloud auth list');
    console.error('   3. Verify Secret Manager secrets exist:');
    console.error('      - mobilemart-prod-client-id');
    console.error('      - mobilemart-prod-client-secret');
    console.error('      - mobilemart-prod-api-url\n');
    process.exit(1);
  }
}

// Run
countProductionProducts().catch(console.error);
