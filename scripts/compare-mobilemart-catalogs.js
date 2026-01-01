#!/usr/bin/env node

/**
 * Compare MobileMart UAT vs Production Product Catalogs
 * 
 * Fetches products from both UAT and Production APIs to compare counts and availability
 */

require('dotenv').config();

const axios = require('axios');
const https = require('https');

// UAT Configuration (from env)
const UAT_BASE_URL = 'https://uat.fulcrumswitch.com';
const UAT_CLIENT_ID = process.env.MOBILEMART_CLIENT_ID || 'mymoolah';
const UAT_CLIENT_SECRET = process.env.MOBILEMART_CLIENT_SECRET;

// Production Configuration (from env - if available)
const PROD_BASE_URL = 'https://fulcrumswitch.com';
const PROD_CLIENT_ID = process.env.MOBILEMART_PROD_CLIENT_ID || process.env.MOBILEMART_CLIENT_ID;
const PROD_CLIENT_SECRET = process.env.MOBILEMART_PROD_CLIENT_SECRET;

// Agent for self-signed certificates (UAT/Development)
const httpsAgent = new https.Agent({
  rejectUnauthorized: false
});

const VAS_TYPES = ['airtime', 'data', 'utility', 'voucher', 'bill-payment'];

/**
 * Get OAuth token from MobileMart API
 */
async function getToken(baseUrl, clientId, clientSecret, envName) {
  try {
    const tokenUrl = `${baseUrl}/connect/token`;
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'api');

    console.log(`\n🔐 Getting ${envName} token from ${tokenUrl}...`);
    
    const response = await axios.post(tokenUrl, formData.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json'
      },
      httpsAgent: baseUrl.includes('uat') ? httpsAgent : undefined,
      timeout: 10000
    });

    if (response.data && response.data.access_token) {
      console.log(`✅ ${envName} token obtained`);
      return response.data.access_token;
    }
    
    throw new Error('No access token in response');
  } catch (error) {
    console.error(`❌ Failed to get ${envName} token:`, error.message);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Response:`, error.response.data);
    }
    throw error;
  }
}

/**
 * Fetch products for a VAS type
 */
async function fetchProducts(baseUrl, token, vasType, envName) {
  try {
    // Normalize vasType for API
    let apiVasType = vasType;
    if (vasType === 'utility') apiVasType = 'prepaidutility';
    if (vasType === 'bill-payment') apiVasType = 'billpayment';

    const url = `${baseUrl}/v1/${apiVasType}/products`;
    
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      },
      httpsAgent: baseUrl.includes('uat') ? httpsAgent : undefined,
      timeout: 30000
    });

    return response.data || [];
  } catch (error) {
    console.error(`   ❌ Failed to fetch ${vasType} products from ${envName}:`, error.message);
    if (error.response) {
      console.error(`      Status: ${error.response.status}`);
    }
    return [];
  }
}

/**
 * Main comparison function
 */
async function compareCatalogs() {
  console.log('🔍 Comparing MobileMart UAT vs Production Product Catalogs\n');
  console.log('='.repeat(80));

  // UAT Products
  console.log('\n📋 UAT Products:');
  console.log(`   Base URL: ${UAT_BASE_URL}`);
  console.log(`   Client ID: ${UAT_CLIENT_ID}`);
  console.log(`   Client Secret: ${UAT_CLIENT_SECRET ? UAT_CLIENT_SECRET.substring(0, 8) + '...' : 'NOT SET'}`);

  if (!UAT_CLIENT_SECRET) {
    console.log('\n❌ UAT credentials not configured. Cannot fetch UAT products.');
    return;
  }

  let uatToken;
  try {
    uatToken = await getToken(UAT_BASE_URL, UAT_CLIENT_ID, UAT_CLIENT_SECRET, 'UAT');
  } catch (error) {
    console.log('\n❌ Cannot proceed without UAT token');
    return;
  }

  const uatProducts = {};
  let uatTotal = 0;

  for (const vasType of VAS_TYPES) {
    console.log(`\n   Fetching ${vasType} products from UAT...`);
    const products = await fetchProducts(UAT_BASE_URL, uatToken, vasType, 'UAT');
    uatProducts[vasType] = products;
    uatTotal += products.length || 0;
    console.log(`   ✅ Found ${products.length || 0} ${vasType} products in UAT`);
  }

  console.log(`\n📊 UAT Total: ${uatTotal} products`);

  // Production Products
  console.log('\n\n📋 Production Products:');
  console.log(`   Base URL: ${PROD_BASE_URL}`);
  console.log(`   Client ID: ${PROD_CLIENT_ID || 'NOT SET'}`);
  console.log(`   Client Secret: ${PROD_CLIENT_SECRET ? PROD_CLIENT_SECRET.substring(0, 8) + '...' : 'NOT SET'}`);

  if (!PROD_CLIENT_SECRET) {
    console.log('\n⚠️  Production credentials not configured. Cannot compare with Production.');
    console.log('   Set MOBILEMART_PROD_CLIENT_SECRET in .env to compare with Production.');
    console.log('\n📊 Comparison Summary (UAT Only):');
    console.log('='.repeat(80));
    console.log('\nUAT Product Counts:');
    Object.keys(uatProducts).forEach(vasType => {
      console.log(`   ${vasType}: ${uatProducts[vasType].length || 0}`);
    });
    console.log(`\n   Total: ${uatTotal} products`);
    return;
  }

  let prodToken;
  try {
    prodToken = await getToken(PROD_BASE_URL, PROD_CLIENT_ID, PROD_CLIENT_SECRET, 'Production');
  } catch (error) {
    console.log('\n❌ Cannot fetch production products - credentials may be invalid');
    console.log('\n📊 Comparison Summary (UAT Only):');
    console.log('='.repeat(80));
    console.log('\nUAT Product Counts:');
    Object.keys(uatProducts).forEach(vasType => {
      console.log(`   ${vasType}: ${uatProducts[vasType].length || 0}`);
    });
    console.log(`\n   Total: ${uatTotal} products`);
    return;
  }

  const prodProducts = {};
  let prodTotal = 0;

  for (const vasType of VAS_TYPES) {
    console.log(`\n   Fetching ${vasType} products from Production...`);
    const products = await fetchProducts(PROD_BASE_URL, prodToken, vasType, 'Production');
    prodProducts[vasType] = products;
    prodTotal += products.length || 0;
    console.log(`   ✅ Found ${products.length || 0} ${vasType} products in Production`);
  }

  console.log(`\n📊 Production Total: ${prodTotal} products`);

  // Comparison
  console.log('\n\n📊 Comparison Summary:');
  console.log('='.repeat(80));
  console.log('\nProduct Counts by VAS Type:');
  console.log('\n   VAS Type        | UAT       | Production | Difference');
  console.log('   ' + '-'.repeat(60));
  
  VAS_TYPES.forEach(vasType => {
    const uatCount = uatProducts[vasType]?.length || 0;
    const prodCount = prodProducts[vasType]?.length || 0;
    const diff = prodCount - uatCount;
    const diffStr = diff > 0 ? `+${diff}` : diff.toString();
    console.log(`   ${vasType.padEnd(15)} | ${String(uatCount).padStart(8)} | ${String(prodCount).padStart(10)} | ${diffStr.padStart(10)}`);
  });
  
  console.log('   ' + '-'.repeat(60));
  const totalDiff = prodTotal - uatTotal;
  const totalDiffStr = totalDiff > 0 ? `+${totalDiff}` : totalDiff.toString();
  console.log(`   TOTAL           | ${String(uatTotal).padStart(8)} | ${String(prodTotal).padStart(10)} | ${totalDiffStr.padStart(10)}`);
  
  console.log('\n📈 Analysis:');
  if (prodTotal > uatTotal) {
    console.log(`   ✅ Production has ${prodTotal - uatTotal} more products than UAT`);
  } else if (uatTotal > prodTotal) {
    console.log(`   ⚠️  UAT has ${uatTotal - prodTotal} more products than Production`);
  } else {
    console.log(`   ✅ UAT and Production have the same number of products`);
  }

  // Detailed breakdown
  console.log('\n📋 Detailed Breakdown:');
  VAS_TYPES.forEach(vasType => {
    const uatCount = uatProducts[vasType]?.length || 0;
    const prodCount = prodProducts[vasType]?.length || 0;
    if (uatCount !== prodCount) {
      console.log(`\n   ${vasType.toUpperCase()}:`);
      console.log(`      UAT: ${uatCount} products`);
      console.log(`      Production: ${prodCount} products`);
      console.log(`      Difference: ${prodCount > uatCount ? '+' : ''}${prodCount - uatCount}`);
    }
  });
}

// Run comparison
compareCatalogs()
  .then(() => {
    console.log('\n✅ Comparison completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Comparison failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  });
