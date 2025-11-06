#!/usr/bin/env node
/**
 * MobileMart Integration Test Script
 * 
 * Tests MobileMart API connectivity, authentication, and product endpoints
 * 
 * Usage: node scripts/test-mobilemart-integration.js
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');
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

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
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

async function testMobileMartIntegration() {
    logSection('MOBILEMART INTEGRATION TEST REPORT');
    
    const results = {
        credentials: { passed: false, details: {} },
        authentication: { passed: false, details: {} },
        endpoints: { passed: false, details: {} },
        products: { passed: false, details: {} },
        summary: { overall: 'FAILED', issues: [], recommendations: [] }
    };

    // ========================================
    // 1. CHECK CREDENTIALS
    // ========================================
    logSection('1. CREDENTIALS CHECK');
    
    const clientId = process.env.MOBILEMART_CLIENT_ID;
    const clientSecret = process.env.MOBILEMART_CLIENT_SECRET;
    const apiUrl = process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za';
    const liveIntegration = process.env.MOBILEMART_LIVE_INTEGRATION === 'true';
    
    logInfo(`API URL: ${apiUrl}`);
    logInfo(`Client ID: ${clientId ? clientId.substring(0, 10) + '...' : 'NOT SET'}`);
    logInfo(`Client Secret: ${clientSecret ? '***SET***' : 'NOT SET'}`);
    logInfo(`Live Integration: ${liveIntegration ? 'ENABLED' : 'DISABLED'}`);
    
    if (!clientId || !clientSecret) {
        logError('MobileMart credentials are missing!');
        results.credentials.passed = false;
        results.credentials.details = { error: 'Missing MOBILEMART_CLIENT_ID or MOBILEMART_CLIENT_SECRET' };
        results.summary.issues.push('Missing API credentials in .env file');
        results.summary.recommendations.push('Add MOBILEMART_CLIENT_ID and MOBILEMART_CLIENT_SECRET to .env file');
    } else {
        logSuccess('Credentials are configured');
        results.credentials.passed = true;
        results.credentials.details = { clientId: clientId.substring(0, 10) + '...', hasSecret: !!clientSecret };
    }

    // ========================================
    // 2. TEST AUTHENTICATION
    // ========================================
    logSection('2. AUTHENTICATION TEST');
    
    let authService;
    try {
        authService = new MobileMartAuthService();
        logInfo('MobileMartAuthService initialized');
        
        // Test token request
        logInfo('Requesting access token...');
        const tokenData = await authService.requestAccessToken();
        
        if (tokenData && tokenData.access_token) {
            logSuccess('Authentication successful!');
            logInfo(`Token received: ${tokenData.access_token.substring(0, 20)}...`);
            logInfo(`Token expires in: ${tokenData.expires_in} seconds`);
            
            results.authentication.passed = true;
            results.authentication.details = {
                tokenReceived: true,
                expiresIn: tokenData.expires_in,
                tokenType: tokenData.token_type || 'Bearer'
            };
        } else {
            logError('Invalid token response');
            results.authentication.passed = false;
            results.authentication.details = { error: 'Invalid token response structure' };
        }
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        results.authentication.passed = false;
        results.authentication.details = { error: error.message };
        results.summary.issues.push(`Authentication failed: ${error.message}`);
        
        if (error.response) {
            logError(`HTTP Status: ${error.response.status}`);
            logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
            results.authentication.details.httpStatus = error.response.status;
            results.authentication.details.response = error.response.data;
        }
    }

    // ========================================
    // 3. TEST API ENDPOINTS
    // ========================================
    logSection('3. API ENDPOINTS TEST');
    
    const vasTypes = ['airtime', 'data', 'electricity'];
    const endpointResults = {};
    
    if (results.authentication.passed && authService) {
        for (const vasType of vasTypes) {
            logInfo(`\nTesting ${vasType.toUpperCase()} products endpoint...`);
            try {
                const response = await authService.makeAuthenticatedRequest(
                    'GET',
                    `/products/${vasType}`
                );
                
                logSuccess(`${vasType} endpoint accessible`);
                
                // Parse response structure
                let products = [];
                if (Array.isArray(response)) {
                    products = response;
                } else if (response.products && Array.isArray(response.products)) {
                    products = response.products;
                } else if (response.data && Array.isArray(response.data)) {
                    products = response.data;
                } else {
                    products = [response];
                }
                
                endpointResults[vasType] = {
                    passed: true,
                    productCount: products.length,
                    products: products.slice(0, 5), // Store first 5 products as sample
                    fullResponse: response
                };
                
                logInfo(`Found ${products.length} products`);
                
                if (products.length > 0) {
                    logInfo('Sample products:');
                    products.slice(0, 3).forEach((product, index) => {
                        const productId = product.id || product.productId || product.merchantProductId || 'N/A';
                        const productName = product.name || product.productName || product.description || 'N/A';
                        const productPrice = product.price || product.amount || product.cost || 'N/A';
                        log(`   ${index + 1}. ID: ${productId}, Name: ${productName}, Price: ${productPrice}`);
                    });
                } else {
                    logWarning(`No products found for ${vasType}`);
                }
                
            } catch (error) {
                logError(`${vasType} endpoint failed: ${error.message}`);
                endpointResults[vasType] = {
                    passed: false,
                    error: error.message,
                    httpStatus: error.response?.status,
                    response: error.response?.data
                };
                
                if (error.response) {
                    logError(`HTTP Status: ${error.response.status}`);
                    if (error.response.data) {
                        logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
                    }
                }
            }
        }
        
        results.endpoints.passed = Object.values(endpointResults).some(r => r.passed);
        results.endpoints.details = endpointResults;
    } else {
        logWarning('Skipping endpoint tests - authentication failed');
        results.endpoints.passed = false;
        results.endpoints.details = { error: 'Authentication required' };
    }

    // ========================================
    // 4. TEST HEALTH CHECK
    // ========================================
    logSection('4. HEALTH CHECK TEST');
    
    if (authService) {
        try {
            const health = await authService.healthCheck();
            logInfo(`Health Status: ${health.status}`);
            logInfo(`Token Valid: ${health.tokenValid}`);
            logInfo(`API URL: ${health.apiUrl}`);
            
            if (health.status === 'healthy') {
                logSuccess('Health check passed');
            } else {
                logWarning(`Health check returned: ${health.status}`);
            }
        } catch (error) {
            logError(`Health check failed: ${error.message}`);
        }
    }

    // ========================================
    // 5. SUMMARY REPORT
    // ========================================
    logSection('5. SUMMARY REPORT');
    
    const allTests = [
        { name: 'Credentials', result: results.credentials.passed },
        { name: 'Authentication', result: results.authentication.passed },
        { name: 'Endpoints', result: results.endpoints.passed }
    ];
    
    const passedTests = allTests.filter(t => t.result).length;
    const totalTests = allTests.length;
    
    allTests.forEach(test => {
        if (test.result) {
            logSuccess(`${test.name}: PASSED`);
        } else {
            logError(`${test.name}: FAILED`);
        }
    });
    
    console.log('\n' + '-'.repeat(80));
    log(`Overall Status: ${passedTests}/${totalTests} tests passed`, passedTests === totalTests ? 'green' : 'red');
    console.log('-'.repeat(80) + '\n');
    
    // Detailed recommendations
    if (results.summary.issues.length > 0) {
        logSection('ISSUES FOUND');
        results.summary.issues.forEach((issue, index) => {
            logError(`${index + 1}. ${issue}`);
        });
    }
    
    if (results.summary.recommendations.length > 0) {
        logSection('RECOMMENDATIONS');
        results.summary.recommendations.forEach((rec, index) => {
            logWarning(`${index + 1}. ${rec}`);
        });
    }
    
    // Products summary
    if (results.endpoints.details && Object.keys(results.endpoints.details).length > 0) {
        logSection('AVAILABLE PRODUCTS SUMMARY');
        Object.entries(results.endpoints.details).forEach(([vasType, details]) => {
            if (details.passed) {
                logSuccess(`${vasType.toUpperCase()}: ${details.productCount} products available`);
                if (details.productCount === 0) {
                    logWarning(`  → No products found. This may indicate:`);
                    logWarning(`    - Account not activated for ${vasType} products`);
                    logWarning(`    - API endpoint structure may be different`);
                    logWarning(`    - Need to check MobileMart documentation`);
                }
            } else {
                logError(`${vasType.toUpperCase()}: Failed - ${details.error}`);
            }
        });
    }
    
    // Final verdict
    console.log('\n' + '='.repeat(80));
    if (passedTests === totalTests) {
        log('✅ INTEGRATION STATUS: FULLY OPERATIONAL', 'green');
    } else if (passedTests > 0) {
        log('⚠️  INTEGRATION STATUS: PARTIALLY OPERATIONAL', 'yellow');
    } else {
        log('❌ INTEGRATION STATUS: FAILED', 'red');
    }
    console.log('='.repeat(80) + '\n');
    
    // Save detailed results
    results.summary.overall = passedTests === totalTests ? 'PASSED' : passedTests > 0 ? 'PARTIAL' : 'FAILED';
    results.summary.testsPassed = passedTests;
    results.summary.testsTotal = totalTests;
    
    return results;
}

// Run tests
testMobileMartIntegration()
    .then(results => {
        process.exit(results.summary.overall === 'PASSED' ? 0 : 1);
    })
    .catch(error => {
        logError(`Test script error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });


