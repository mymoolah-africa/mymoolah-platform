#!/usr/bin/env node
/**
 * Test MobileMart Conformance Swagger Endpoints
 * 
 * Tests endpoints based on Swagger documentation structure
 * 
 * Usage: node scripts/test-mobilemart-conformance-swagger.js
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

async function testSwaggerEndpoints() {
    logSection('MOBILEMART SWAGGER-BASED ENDPOINT TEST');
    
    const authService = new MobileMartAuthService();
    
    // Verify auth
    try {
        await authService.getAccessToken();
        logSuccess('Authentication verified');
    } catch (error) {
        logError(`Auth failed: ${error.message}`);
        return;
    }
    
    // Based on Swagger documentation structure, test endpoints
    // Swagger typically uses: /api/v1/{vasType}/products
    const endpoints = [
        // Standard Swagger patterns
        { path: '/api/v1/airtime/products', desc: 'Swagger: /api/v1/airtime/products' },
        { path: '/api/v1/data/products', desc: 'Swagger: /api/v1/data/products' },
        { path: '/api/v1/voucher/products', desc: 'Swagger: /api/v1/voucher/products' },
        { path: '/api/v1/billpayment/products', desc: 'Swagger: /api/v1/billpayment/products' },
        { path: '/api/v1/prepaidutility/products', desc: 'Swagger: /api/v1/prepaidutility/products' },
        
        // Alternative Swagger patterns
        { path: '/api/airtime/products', desc: 'Swagger alt: /api/airtime/products' },
        { path: '/api/data/products', desc: 'Swagger alt: /api/data/products' },
    ];
    
    logSection('Testing Swagger-Based Endpoints');
    
    for (const endpoint of endpoints) {
        try {
            logInfo(`Testing: ${endpoint.path}`);
            const response = await authService.makeAuthenticatedRequest('GET', endpoint.path);
            
            const isHtml = typeof response === 'string' && response.trim().startsWith('<!DOCTYPE');
            
            if (isHtml) {
                logError(`${endpoint.path}: Returns HTML`);
            } else if (Array.isArray(response)) {
                logSuccess(`${endpoint.path}: ✅ ${response.length} products`);
                if (response.length > 0) {
                    logInfo(`  Sample keys: ${Object.keys(response[0]).join(', ')}`);
                }
            } else if (response && typeof response === 'object') {
                const products = response.products || response.data || [];
                if (Array.isArray(products) && products.length > 0) {
                    logSuccess(`${endpoint.path}: ✅ ${products.length} products (in object)`);
                } else {
                    logInfo(`${endpoint.path}: Object response (keys: ${Object.keys(response).join(', ')})`);
                }
            }
        } catch (error) {
            if (error.response && error.response.status === 404) {
                logError(`${endpoint.path}: 404 Not Found`);
            } else {
                logError(`${endpoint.path}: ${error.message}`);
            }
        }
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

testSwaggerEndpoints()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Test error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

