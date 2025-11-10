#!/usr/bin/env node
/**
 * MobileMart Product Endpoints Discovery
 * 
 * Tests various endpoint patterns to find the correct product listing endpoints
 * 
 * Usage: node scripts/test-mobilemart-product-endpoints.js
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

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
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
        
        const isHtml = typeof response === 'string' && response.trim().startsWith('<!DOCTYPE');
        
        if (isHtml) {
            return { success: false, reason: 'html', endpoint };
        }
        
        if (Array.isArray(response)) {
            return { success: true, type: 'array', count: response.length, endpoint, data: response };
        } else if (typeof response === 'object' && response !== null) {
            if (response.products && Array.isArray(response.products)) {
                return { success: true, type: 'object.products', count: response.products.length, endpoint, data: response };
            } else if (response.data && Array.isArray(response.data)) {
                return { success: true, type: 'object.data', count: response.data.length, endpoint, data: response };
            } else {
                return { success: true, type: 'object', count: 0, keys: Object.keys(response), endpoint, data: response };
            }
        }
        
        return { success: false, reason: 'unexpected_type', endpoint };
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return { success: false, reason: 'not_found', endpoint, status: 404 };
        } else if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            return { success: false, reason: 'auth_failed', endpoint, status: error.response.status };
        }
        return { success: false, reason: 'error', endpoint, error: error.message };
    }
}

async function discoverProductEndpoints() {
    logSection('MOBILEMART PRODUCT ENDPOINTS DISCOVERY');
    
    const authService = new MobileMartAuthService();
    
    // Verify authentication first
    try {
        await authService.getAccessToken();
        logSuccess('Authentication verified');
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        return;
    }
    
    // Test various endpoint patterns
    const endpointPatterns = [
        // Current patterns (from docs)
        { path: '/airtime/products', desc: 'Current: /airtime/products' },
        { path: '/data/products', desc: 'Current: /data/products' },
        
        // Alternative patterns
        { path: '/products/airtime', desc: 'Alternative: /products/airtime' },
        { path: '/products/data', desc: 'Alternative: /products/data' },
        { path: '/products', desc: 'All products: /products' },
        { path: '/products?type=airtime', desc: 'Query param: /products?type=airtime' },
        { path: '/products?type=data', desc: 'Query param: /products?type=data' },
        
        // With different versioning
        { path: '/v1/products/airtime', desc: 'With version: /v1/products/airtime' },
        { path: '/v1/products/data', desc: 'With version: /v1/products/data' },
        { path: '/api/products/airtime', desc: 'API prefix: /api/products/airtime' },
        { path: '/api/products/data', desc: 'API prefix: /api/products/data' },
        
        // Catalog endpoints
        { path: '/catalog', desc: 'Catalog: /catalog' },
        { path: '/catalog/airtime', desc: 'Catalog: /catalog/airtime' },
        { path: '/catalog/data', desc: 'Catalog: /catalog/data' },
        
        // Merchant endpoints
        { path: '/merchant/products', desc: 'Merchant: /merchant/products' },
        { path: '/merchant/products/airtime', desc: 'Merchant: /merchant/products/airtime' },
    ];
    
    const results = [];
    
    for (const pattern of endpointPatterns) {
        const result = await testEndpoint(authService, pattern.path, pattern.desc);
        results.push({ ...pattern, ...result });
        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }
    
    // Summary
    logSection('DISCOVERY RESULTS');
    
    const successful = results.filter(r => r.success && r.count > 0);
    const htmlResponses = results.filter(r => r.reason === 'html');
    const notFound = results.filter(r => r.reason === 'not_found');
    const otherErrors = results.filter(r => !r.success && r.reason !== 'html' && r.reason !== 'not_found');
    
    if (successful.length > 0) {
        logSuccess('✅ WORKING ENDPOINTS FOUND:');
        successful.forEach(r => {
            log(`  ${r.path}: ${r.count} products (${r.type})`, 'green');
            if (r.count > 0 && r.data) {
                // Show sample product structure
                const sample = Array.isArray(r.data) ? r.data[0] : (r.data.products?.[0] || r.data.data?.[0]);
                if (sample) {
                    log(`    Sample product keys: ${Object.keys(sample).join(', ')}`, 'blue');
                }
            }
        });
    } else {
        logError('❌ No working product endpoints found');
    }
    
    if (htmlResponses.length > 0) {
        log(`\n⚠️  ${htmlResponses.length} endpoints returned HTML:`);
        htmlResponses.forEach(r => {
            log(`  ${r.path}`, 'yellow');
        });
    }
    
    if (notFound.length > 0) {
        log(`\nℹ️  ${notFound.length} endpoints returned 404:`);
        notFound.forEach(r => {
            log(`  ${r.path}`, 'blue');
        });
    }
    
    if (otherErrors.length > 0) {
        log(`\n❌ ${otherErrors.length} endpoints had errors:`);
        otherErrors.forEach(r => {
            log(`  ${r.path}: ${r.error || r.reason}`, 'red');
        });
    }
    
    // Recommendations
    if (successful.length === 0) {
        logSection('RECOMMENDATIONS');
        logWarning('No working product endpoints found. Possible actions:');
        log('  1. Contact MobileMart to verify the exact endpoint paths');
        log('  2. Check Swagger UI: https://uat.fulcrumswitch.com/swagger');
        log('  3. Request API documentation with exact endpoint examples');
        log('  4. Verify account has product catalog access enabled');
    }
    
    return results;
}

discoverProductEndpoints()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Discovery error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

