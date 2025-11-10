#!/usr/bin/env node
/**
 * MobileMart PROD Endpoints Test
 * 
 * Tests product endpoints using PROD credentials (verified working by MobileMart)
 * 
 * Usage: node scripts/test-mobilemart-prod-endpoints.js
 */

require('dotenv').config();
const axios = require('axios');

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

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
}

async function getProdToken() {
    const tokenUrl = 'https://fulcrumswitch.com/connect/token';
    const clientId = 'mymoolah';
    const clientSecret = 'c799bf37-934d-4dcf-bfec-42fb421a6407';
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('client_id', clientId);
    formData.append('client_secret', clientSecret);
    formData.append('scope', 'api');
    
    try {
        logInfo('Requesting PROD token...');
        const response = await axios.post(tokenUrl, formData.toString(), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            timeout: 10000,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false })
        });
        
        if (response.data && response.data.access_token) {
            logSuccess(`Token retrieved: ${response.data.access_token.substring(0, 20)}...`);
            return response.data.access_token;
        }
        throw new Error('No access token in response');
    } catch (error) {
        logError(`Token request failed: ${error.message}`);
        if (error.response) {
            logError(`Status: ${error.response.status}`);
            logError(`Response: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async function testEndpoint(token, endpoint, description) {
    const baseUrl = 'https://fulcrumswitch.com/api/v1';
    const url = `${baseUrl}${endpoint}`;
    
    try {
        logInfo(`Testing: ${endpoint}`);
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            timeout: 10000,
            httpsAgent: new (require('https').Agent)({ rejectUnauthorized: false }),
            validateStatus: () => true // Accept all status codes
        });
        
        const isHtml = typeof response.data === 'string' && response.data.trim().startsWith('<!DOCTYPE');
        
        if (isHtml) {
            logError(`${endpoint}: Returns HTML`);
            return { success: false, reason: 'html' };
        }
        
        if (Array.isArray(response.data)) {
            logSuccess(`${endpoint}: ✅ Returns JSON array with ${response.data.length} items`);
            if (response.data.length > 0) {
                logInfo(`  Sample product keys: ${Object.keys(response.data[0]).join(', ')}`);
            }
            return { success: true, type: 'array', count: response.data.length, data: response.data };
        } else if (typeof response.data === 'object' && response.data !== null) {
            if (response.data.products && Array.isArray(response.data.products)) {
                logSuccess(`${endpoint}: ✅ Returns object with products array (${response.data.products.length} items)`);
                return { success: true, type: 'object.products', count: response.data.products.length, data: response.data };
            } else if (response.data.data && Array.isArray(response.data.data)) {
                logSuccess(`${endpoint}: ✅ Returns object with data array (${response.data.data.length} items)`);
                return { success: true, type: 'object.data', count: response.data.data.length, data: response.data };
            } else {
                logInfo(`${endpoint}: Returns object (keys: ${Object.keys(response.data).join(', ')})`);
                return { success: true, type: 'object', count: 0, keys: Object.keys(response.data), data: response.data };
            }
        }
        
        logError(`${endpoint}: Unexpected response type`);
        return { success: false, reason: 'unexpected_type' };
    } catch (error) {
        if (error.response) {
            if (error.response.status === 404) {
                logError(`${endpoint}: 404 Not Found`);
                return { success: false, reason: 'not_found', status: 404 };
            } else if (error.response.status === 401 || error.response.status === 403) {
                logError(`${endpoint}: ${error.response.status} Unauthorized/Forbidden`);
                return { success: false, reason: 'auth_failed', status: error.response.status };
            } else {
                logError(`${endpoint}: ${error.response.status} - ${error.message}`);
                return { success: false, reason: 'error', status: error.response.status, error: error.message };
            }
        }
        logError(`${endpoint}: ${error.message}`);
        return { success: false, reason: 'error', error: error.message };
    }
}

async function testProdEndpoints() {
    logSection('MOBILEMART PROD ENDPOINTS TEST');
    logInfo('Using PROD credentials verified by MobileMart');
    logInfo('MobileMart confirmed: Token + Product list working');
    
    let token;
    try {
        token = await getProdToken();
    } catch (error) {
        logError('Cannot proceed without token');
        return;
    }
    
    logSection('Testing Product Endpoints');
    
    const endpoints = [
        '/airtime/products',
        '/data/products',
        '/prepaidutility/products',
        '/billpayment/products',
        '/voucher/products',
        '/products/airtime',
        '/products/data',
        '/products',
    ];
    
    const results = [];
    for (const endpoint of endpoints) {
        const result = await testEndpoint(token, endpoint, endpoint);
        results.push({ endpoint, ...result });
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    logSection('RESULTS SUMMARY');
    
    const successful = results.filter(r => r.success && r.count > 0);
    const htmlResponses = results.filter(r => r.reason === 'html');
    const notFound = results.filter(r => r.reason === 'not_found');
    
    if (successful.length > 0) {
        logSuccess(`✅ Found ${successful.length} working endpoint(s):`);
        successful.forEach(r => {
            log(`  ${r.endpoint}: ${r.count} products (${r.type})`, 'green');
        });
    } else {
        logError('❌ No working endpoints found');
        logInfo('\nSince MobileMart confirmed they got products, please ask them:');
        logInfo('  1. What exact endpoint path did you use?');
        logInfo('  2. What was the full URL?');
        logInfo('  3. Any additional headers or parameters?');
    }
    
    if (htmlResponses.length > 0) {
        log(`\n⚠️  ${htmlResponses.length} endpoints returned HTML`);
    }
    
    if (notFound.length > 0) {
        log(`\nℹ️  ${notFound.length} endpoints returned 404`);
    }
}

testProdEndpoints()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Test error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

