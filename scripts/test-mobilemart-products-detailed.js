#!/usr/bin/env node
/**
 * MobileMart Products Detailed Test
 * 
 * Tests all product endpoints and shows full response structure
 * 
 * Usage: node scripts/test-mobilemart-products-detailed.js
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

async function testAllProducts() {
    logSection('MOBILEMART PRODUCTS DETAILED TEST');
    
    const authService = new MobileMartAuthService();
    const vasTypes = [
        { name: 'airtime', endpoint: '/airtime/products' },
        { name: 'data', endpoint: '/data/products' },
        { name: 'prepaidutility', endpoint: '/prepaidutility/products' },
        { name: 'voucher', endpoint: '/voucher/products' },
        { name: 'billpayment', endpoint: '/billpayment/products' }
    ];
    
    const results = {};
    
    for (const vasType of vasTypes) {
        logSection(`Testing ${vasType.name.toUpperCase()} Products`);
        
        try {
            logInfo(`GET ${vasType.endpoint}`);
            const response = await authService.makeAuthenticatedRequest(
                'GET',
                vasType.endpoint
            );
            
            logSuccess(`${vasType.name} endpoint accessible`);
            
            // Log full response structure
            logInfo('Response Type: ' + (Array.isArray(response) ? 'Array' : typeof response));
            logInfo('Response Keys: ' + (typeof response === 'object' && !Array.isArray(response) ? Object.keys(response).join(', ') : 'N/A'));
            
            // Parse products
            let products = [];
            if (Array.isArray(response)) {
                products = response;
                logInfo(`Products found (array): ${products.length}`);
            } else if (response && typeof response === 'object') {
                // Try different possible structures
                if (response.products && Array.isArray(response.products)) {
                    products = response.products;
                    logInfo(`Products found (response.products): ${products.length}`);
                } else if (response.data && Array.isArray(response.data)) {
                    products = response.data;
                    logInfo(`Products found (response.data): ${products.length}`);
                } else if (response.items && Array.isArray(response.items)) {
                    products = response.items;
                    logInfo(`Products found (response.items): ${products.length}`);
                } else {
                    // Show full response structure
                    logWarning('Unexpected response structure. Full response:');
                    console.log(JSON.stringify(response, null, 2));
                    products = [];
                }
            }
            
            results[vasType.name] = {
                success: true,
                productCount: products.length,
                products: products.slice(0, 5), // First 5 products
                fullResponse: response
            };
            
            if (products.length > 0) {
                logSuccess(`Found ${products.length} products`);
                logInfo('Sample products:');
                products.slice(0, 3).forEach((product, index) => {
                    console.log(`\n  Product ${index + 1}:`);
                    console.log(`    Keys: ${Object.keys(product).join(', ')}`);
                    Object.entries(product).slice(0, 5).forEach(([key, value]) => {
                        const displayValue = typeof value === 'string' && value.length > 50 
                            ? value.substring(0, 50) + '...' 
                            : value;
                        console.log(`    ${key}: ${displayValue}`);
                    });
                });
            } else {
                logWarning(`No products found for ${vasType.name}`);
                logInfo('This could mean:');
                logInfo('  1. Account not activated for this product type');
                logInfo('  2. Products not exposed to merchant account');
                logInfo('  3. Different response structure');
                logInfo('\nFull response:');
                console.log(JSON.stringify(response, null, 2));
            }
            
        } catch (error) {
            logError(`${vasType.name} endpoint failed: ${error.message}`);
            if (error.response) {
                logError(`HTTP Status: ${error.response.status}`);
                logError(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            results[vasType.name] = {
                success: false,
                error: error.message,
                httpStatus: error.response?.status,
                response: error.response?.data
            };
        }
    }
    
    // Summary
    logSection('SUMMARY');
    
    const successful = Object.values(results).filter(r => r.success).length;
    const total = Object.keys(results).length;
    const withProducts = Object.values(results).filter(r => r.success && r.productCount > 0).length;
    
    Object.entries(results).forEach(([name, result]) => {
        if (result.success) {
            if (result.productCount > 0) {
                logSuccess(`${name}: ${result.productCount} products`);
            } else {
                logWarning(`${name}: 0 products (endpoint accessible)`);
            }
        } else {
            logError(`${name}: Failed - ${result.error}`);
        }
    });
    
    console.log('\n' + '-'.repeat(80));
    log(`Overall: ${successful}/${total} endpoints accessible, ${withProducts} with products`, 
        successful === total ? 'green' : 'yellow');
    console.log('-'.repeat(80) + '\n');
    
    return results;
}

// Run test
testAllProducts()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Test script error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

