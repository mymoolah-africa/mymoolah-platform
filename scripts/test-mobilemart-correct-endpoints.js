#!/usr/bin/env node
/**
 * Test MobileMart with CORRECT Endpoint Paths
 * 
 * Based on Swagger documentation: /v1/{vasType}/products
 * 
 * Usage: node scripts/test-mobilemart-correct-endpoints.js
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');

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

async function testCorrectEndpoints() {
    logSection('MOBILEMART CORRECT ENDPOINT PATHS TEST');
    logInfo('Using CORRECT paths from Swagger: /v1/{vasType}/products');
    logInfo('Note: apiUrl already includes /v1, so endpoints are /{vasType}/products');
    
    // Enable debug logging
    process.env.DEBUG_MOBILEMART = 'true';
    
    const authService = new MobileMartAuthService();
    
    // Show URL construction
    logInfo(`Base URL: ${authService.baseUrl}`);
    logInfo(`API URL: ${authService.apiUrl}`);
    console.log('');
    
    // Verify auth
    try {
        const token = await authService.getAccessToken();
        logSuccess(`Authentication successful! Token: ${token.substring(0, 20)}...`);
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        return;
    }
    
    // Test correct endpoints based on Swagger
    // Note: apiUrl already includes /v1, so endpoints should be /{vasType}/products
    const endpoints = [
        { path: '/airtime/products', vasType: 'airtime', desc: 'Airtime Products' },
        { path: '/data/products', vasType: 'data', desc: 'Data Products' },
        { path: '/voucher/products', vasType: 'voucher', desc: 'Voucher Products' },
        { path: '/billpayment/products', vasType: 'billpayment', desc: 'Bill Payment Products' },
        { path: '/prepaidutility/products', vasType: 'prepaidutility', desc: 'Prepaid Utility Products' },
    ];
    
    logSection('Testing Correct Endpoint Paths');
    
    const results = [];
    for (const endpoint of endpoints) {
        try {
            logInfo(`Testing: ${endpoint.path}`);
            const response = await authService.makeAuthenticatedRequest('GET', endpoint.path);
            
            const isHtml = typeof response === 'string' && response.trim().startsWith('<!DOCTYPE');
            
            if (isHtml) {
                logError(`${endpoint.desc}: Still returns HTML`);
                results.push({ ...endpoint, success: false, reason: 'html' });
            } else if (Array.isArray(response)) {
                logSuccess(`${endpoint.desc}: ✅ ${response.length} products found!`);
                if (response.length > 0) {
                    logInfo(`  Sample product keys: ${Object.keys(response[0]).join(', ')}`);
                    logInfo(`  First product: ${JSON.stringify(response[0], null, 2).substring(0, 200)}...`);
                }
                results.push({ ...endpoint, success: true, count: response.length, data: response });
            } else if (response && typeof response === 'object') {
                const products = response.products || response.data || [];
                if (Array.isArray(products) && products.length > 0) {
                    logSuccess(`${endpoint.desc}: ✅ ${products.length} products found (in object)!`);
                    logInfo(`  Sample product keys: ${Object.keys(products[0]).join(', ')}`);
                    results.push({ ...endpoint, success: true, count: products.length, data: products });
                } else {
                    logInfo(`${endpoint.desc}: Object response (keys: ${Object.keys(response).join(', ')})`);
                    results.push({ ...endpoint, success: true, count: 0, data: response });
                }
            } else {
                logError(`${endpoint.desc}: Unexpected response type: ${typeof response}`);
                results.push({ ...endpoint, success: false, reason: 'unexpected_type' });
            }
        } catch (error) {
            if (error.response) {
                if (error.response.status === 404) {
                    logError(`${endpoint.desc}: 404 Not Found`);
                    results.push({ ...endpoint, success: false, reason: 'not_found', status: 404 });
                } else if (error.response.status === 401 || error.response.status === 403) {
                    logError(`${endpoint.desc}: ${error.response.status} Auth Failed`);
                    results.push({ ...endpoint, success: false, reason: 'auth_failed', status: error.response.status });
                } else {
                    logError(`${endpoint.desc}: ${error.response.status} - ${error.message}`);
                    results.push({ ...endpoint, success: false, reason: 'error', status: error.response.status });
                }
            } else {
                logError(`${endpoint.desc}: ${error.message}`);
                results.push({ ...endpoint, success: false, reason: 'error', error: error.message });
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    logSection('RESULTS SUMMARY');
    
    const successful = results.filter(r => r.success && r.count > 0);
    const htmlResponses = results.filter(r => r.reason === 'html');
    const errors = results.filter(r => !r.success && r.reason !== 'html');
    
    if (successful.length > 0) {
        logSuccess(`✅ ${successful.length} endpoint(s) working with products:`);
        successful.forEach(r => {
            log(`  ${r.path}: ${r.count} products`, 'green');
        });
    } else {
        logError('❌ No endpoints returning products');
    }
    
    if (htmlResponses.length > 0) {
        log(`\n⚠️  ${htmlResponses.length} endpoint(s) still returning HTML:`);
        htmlResponses.forEach(r => {
            log(`  ${r.path}`, 'yellow');
        });
    }
    
    if (errors.length > 0) {
        log(`\n❌ ${errors.length} endpoint(s) had errors:`);
        errors.forEach(r => {
            log(`  ${r.path}: ${r.reason} (${r.status || 'N/A'})`, 'red');
        });
    }
    
    console.log('\n' + '-'.repeat(80));
    if (successful.length === endpoints.length) {
        log('🎉 ALL ENDPOINTS WORKING! Ready for UAT testing.', 'green');
    } else if (successful.length > 0) {
        log(`⚠️  Partial success: ${successful.length}/${endpoints.length} endpoints working`, 'yellow');
    } else {
        log('❌ No endpoints working - may need to check base URL or API structure', 'red');
    }
    console.log('-'.repeat(80) + '\n');
}

testCorrectEndpoints()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Test error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

