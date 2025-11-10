#!/usr/bin/env node
/**
 * MobileMart Endpoints Discovery Script
 * 
 * Tests various endpoint patterns to discover correct API structure
 * 
 * Usage: node scripts/test-mobilemart-endpoints-discovery.js
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

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
}

async function testEndpoint(authService, endpoint, description) {
    try {
        logInfo(`Testing: ${endpoint}`);
        const response = await authService.makeAuthenticatedRequest('GET', endpoint);
        
        // Check if response is HTML (indicates wrong endpoint)
        const isHtml = typeof response === 'string' && response.trim().startsWith('<!DOCTYPE');
        
        if (isHtml) {
            logWarning(`${description}: Returns HTML (likely wrong endpoint)`);
            return { success: false, reason: 'html_response' };
        }
        
        // Check if response is JSON array or object
        if (Array.isArray(response)) {
            logSuccess(`${description}: Returns JSON array with ${response.length} items`);
            return { success: true, type: 'array', count: response.length };
        } else if (typeof response === 'object' && response !== null) {
            // Check for common response structures
            if (response.products && Array.isArray(response.products)) {
                logSuccess(`${description}: Returns object with products array (${response.products.length} items)`);
                return { success: true, type: 'object.products', count: response.products.length };
            } else if (response.data && Array.isArray(response.data)) {
                logSuccess(`${description}: Returns object with data array (${response.data.length} items)`);
                return { success: true, type: 'object.data', count: response.data.length };
            } else {
                logWarning(`${description}: Returns object but structure unclear`);
                logInfo(`Keys: ${Object.keys(response).join(', ')}`);
                return { success: true, type: 'object', count: 0, keys: Object.keys(response) };
            }
        } else {
            logWarning(`${description}: Unexpected response type: ${typeof response}`);
            return { success: false, reason: 'unexpected_type' };
        }
    } catch (error) {
        logError(`${description}: ${error.message}`);
        if (error.response) {
            logError(`  HTTP Status: ${error.response.status}`);
            if (error.response.status === 404) {
                return { success: false, reason: 'not_found' };
            } else if (error.response.status === 401 || error.response.status === 403) {
                return { success: false, reason: 'auth_failed' };
            }
        }
        return { success: false, reason: 'error', error: error.message };
    }
}

async function discoverEndpoints() {
    logSection('MOBILEMART ENDPOINTS DISCOVERY');
    
    const authService = new MobileMartAuthService();
    
    // Test token first
    logSection('Step 1: Verify Authentication');
    try {
        const token = await authService.getAccessToken();
        logSuccess(`Authentication successful! Token: ${token.substring(0, 20)}...`);
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        process.exit(1);
    }
    
    // Test various endpoint patterns
    logSection('Step 2: Test Endpoint Patterns');
    
    const endpointPatterns = [
        // Current pattern (from docs)
        { path: '/airtime/products', desc: 'Current pattern: /airtime/products' },
        
        // Alternative patterns
        { path: '/products/airtime', desc: 'Alternative: /products/airtime' },
        { path: '/airtime', desc: 'Simplified: /airtime' },
        { path: '/products?type=airtime', desc: 'Query param: /products?type=airtime' },
        
        // With different versioning
        { path: '/v1/airtime/products', desc: 'With version: /v1/airtime/products' },
        { path: '/api/airtime/products', desc: 'Without version: /api/airtime/products' },
        
        // Check Swagger/OpenAPI endpoints
        { path: '/swagger', desc: 'Swagger UI: /swagger' },
        { path: '/swagger/v1/swagger.json', desc: 'Swagger JSON: /swagger/v1/swagger.json' },
        { path: '/api-docs', desc: 'API Docs: /api-docs' },
    ];
    
    const results = {};
    
    for (const pattern of endpointPatterns) {
        const result = await testEndpoint(authService, pattern.path, pattern.desc);
        results[pattern.path] = { ...pattern, ...result };
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    // Summary
    logSection('DISCOVERY SUMMARY');
    
    const successful = Object.values(results).filter(r => r.success && r.count > 0);
    const htmlResponses = Object.values(results).filter(r => r.reason === 'html_response');
    const notFound = Object.values(results).filter(r => r.reason === 'not_found');
    
    if (successful.length > 0) {
        logSuccess('Found working endpoints:');
        successful.forEach(r => {
            log(`  ${r.path}: ${r.count} items (${r.type})`, 'green');
        });
    } else {
        logWarning('No working endpoints found with product data');
    }
    
    if (htmlResponses.length > 0) {
        logWarning(`\n${htmlResponses.length} endpoints returned HTML (likely wrong paths):`);
        htmlResponses.forEach(r => {
            log(`  ${r.path}`, 'yellow');
        });
    }
    
    if (notFound.length > 0) {
        logInfo(`\n${notFound.length} endpoints returned 404:`);
        notFound.forEach(r => {
            log(`  ${r.path}`, 'blue');
        });
    }
    
    // Recommendations
    logSection('RECOMMENDATIONS');
    
    if (successful.length === 0) {
        logWarning('No working product endpoints found. Possible reasons:');
        log('  1. Account not activated for product access');
        log('  2. Products not exposed to merchant account');
        log('  3. Endpoints require different authentication');
        log('  4. Need to check Swagger UI for actual endpoint structure');
        log('\nNext steps:');
        log('  1. Access Swagger UI: https://uat.fulcrumswitch.com/swagger');
        log('  2. Contact MobileMart to verify account activation');
        log('  3. Request test product IDs if available');
    }
    
    return results;
}

// Run discovery
discoverEndpoints()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Discovery script error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

