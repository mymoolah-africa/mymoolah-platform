#!/usr/bin/env node
/**
 * MobileMart UAT Credentials Quick Test
 * 
 * Quick verification that UAT credentials work correctly
 * 
 * Usage: node scripts/test-mobilemart-uat-credentials.js
 */

require('dotenv').config();

const axios = require('axios');
const https = require('https');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

async function testUATCredentials() {
    console.log('\n' + '='.repeat(80));
    log('MOBILEMART UAT CREDENTIALS TEST', 'cyan');
    console.log('='.repeat(80) + '\n');

    // Check environment variables
    logInfo('Checking environment configuration...');
    
    const clientId = process.env.MOBILEMART_CLIENT_ID;
    const clientSecret = process.env.MOBILEMART_CLIENT_SECRET;
    const apiUrl = process.env.MOBILEMART_API_URL || 'https://uat.fulcrumswitch.com';
    const tokenUrl = process.env.MOBILEMART_TOKEN_URL || `${apiUrl}/connect/token`;
    const liveIntegration = process.env.MOBILEMART_LIVE_INTEGRATION === 'true';

    logInfo(`Client ID: ${clientId ? clientId.substring(0, 10) + '...' : 'NOT SET'}`);
    logInfo(`Client Secret: ${clientSecret ? '***SET***' : 'NOT SET'}`);
    logInfo(`API URL: ${apiUrl}`);
    logInfo(`Token URL: ${tokenUrl}`);
    logInfo(`Live Integration: ${liveIntegration ? 'ENABLED' : 'DISABLED'}`);

    if (!clientId || !clientSecret) {
        logError('Missing MOBILEMART_CLIENT_ID or MOBILEMART_CLIENT_SECRET');
        logWarning('Please add these to your .env file:');
        console.log(`
MOBILEMART_LIVE_INTEGRATION=true
MOBILEMART_CLIENT_ID=mymoolah
MOBILEMART_CLIENT_SECRET=f905627c-f6ff-464c-ba6d-3cdd6a3b61d8
MOBILEMART_API_URL=https://uat.fulcrumswitch.com
MOBILEMART_TOKEN_URL=https://uat.fulcrumswitch.com/connect/token
MOBILEMART_SCOPE=api
        `);
        process.exit(1);
    }

    // Test token retrieval
    console.log('\n' + '-'.repeat(80));
    log('Testing OAuth Token Retrieval...', 'cyan');
    console.log('-'.repeat(80) + '\n');

    try {
        const formData = new URLSearchParams();
        formData.append('grant_type', 'client_credentials');
        formData.append('client_id', clientId);
        formData.append('client_secret', clientSecret);
        formData.append('scope', 'api');

        logInfo(`POST ${tokenUrl}`);
        logInfo(`Grant Type: client_credentials`);
        logInfo(`Client ID: ${clientId}`);

        const response = await axios.post(tokenUrl, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000,
            httpsAgent: new https.Agent({ rejectUnauthorized: false }),
            validateStatus: function (status) {
                return status >= 200 && status < 600;
            }
        });

        logInfo(`HTTP Status: ${response.status} ${response.statusText}`);

        if (response.status === 200) {
            const tokenData = response.data;
            
            if (tokenData.access_token) {
                logSuccess('Authentication successful!');
                logInfo(`Access Token: ${tokenData.access_token.substring(0, 30)}...`);
                logInfo(`Token Type: ${tokenData.token_type || 'Bearer'}`);
                logInfo(`Expires In: ${tokenData.expires_in} seconds (${Math.round(tokenData.expires_in / 60)} minutes)`);
                
                // Test product endpoint
                console.log('\n' + '-'.repeat(80));
                log('Testing Product Endpoint...', 'cyan');
                console.log('-'.repeat(80) + '\n');

                try {
                    const productsUrl = `${apiUrl}/api/v1/airtime/products`;
                    logInfo(`GET ${productsUrl}`);
                    
                    const productsResponse = await axios.get(productsUrl, {
                        headers: {
                            'Authorization': `Bearer ${tokenData.access_token}`,
                            'Accept': 'application/json'
                        },
                        timeout: 10000,
                        httpsAgent: new https.Agent({ rejectUnauthorized: false })
                    });

                    if (productsResponse.status === 200) {
                        const products = Array.isArray(productsResponse.data) 
                            ? productsResponse.data 
                            : (productsResponse.data.products || []);
                        
                        logSuccess(`Product endpoint accessible!`);
                        logInfo(`Found ${products.length} airtime products`);
                        
                        if (products.length > 0) {
                            logInfo('Sample products:');
                            products.slice(0, 3).forEach((product, index) => {
                                const id = product.id || product.productId || product.merchantProductId || 'N/A';
                                const name = product.name || product.productName || 'N/A';
                                log(`   ${index + 1}. ID: ${id}, Name: ${name}`);
                            });
                        }
                    }
                } catch (productError) {
                    logWarning(`Product endpoint test failed: ${productError.message}`);
                    if (productError.response) {
                        logWarning(`HTTP Status: ${productError.response.status}`);
                        logWarning(`Response: ${JSON.stringify(productError.response.data)}`);
                    }
                }

                console.log('\n' + '='.repeat(80));
                log('✅ UAT CREDENTIALS TEST: PASSED', 'green');
                console.log('='.repeat(80) + '\n');
                
                return true;
            } else {
                logError('Invalid token response structure');
                logError(`Response: ${JSON.stringify(tokenData)}`);
                return false;
            }
        } else {
            logError(`Token request failed with status ${response.status}`);
            logError(`Response: ${JSON.stringify(response.data)}`);
            
            if (response.data && response.data.error === 'invalid_client') {
                logError('\nPossible issues:');
                logError('1. Client ID or Secret is incorrect');
                logError('2. Credentials are for wrong environment (UAT vs PROD)');
                logError('3. Account not activated for API access');
                logError('4. IP whitelisting may be required');
            }
            
            return false;
        }
    } catch (error) {
        logError(`Token request failed: ${error.message}`);
        
        if (error.response) {
            logError(`HTTP Status: ${error.response.status}`);
            logError(`Response: ${JSON.stringify(error.response.data)}`);
        }
        
        if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
            logError('\nNetwork error - check:');
            logError('1. Internet connection');
            logError('2. API URL is correct');
            logError('3. Firewall/VPN settings');
        }
        
        return false;
    }
}

// Run test
testUATCredentials()
    .then(success => {
        process.exit(success ? 0 : 1);
    })
    .catch(error => {
        logError(`Test script error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

