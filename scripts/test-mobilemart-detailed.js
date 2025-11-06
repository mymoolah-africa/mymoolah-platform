#!/usr/bin/env node
/**
 * MobileMart Integration Detailed Test Report
 * 
 * Generates comprehensive report on MobileMart API integration status
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');
const axios = require('axios');
const https = require('https');

const COLORS = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    magenta: '\x1b[35m'
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

function logDetail(message) {
    log(`   ${message}`, 'magenta');
}

async function generateDetailedReport() {
    logSection('MOBILEMART INTEGRATION DETAILED TEST REPORT');
    log(`Generated: ${new Date().toISOString()}\n`);
    
    const report = {
        credentials: {},
        authentication: {},
        endpoints: {},
        products: {},
        issues: [],
        recommendations: [],
        status: 'UNKNOWN'
    };

    // ========================================
    // 1. CREDENTIALS ANALYSIS
    // ========================================
    logSection('1. CREDENTIALS CONFIGURATION');
    
    const clientId = process.env.MOBILEMART_CLIENT_ID;
    const clientSecret = process.env.MOBILEMART_CLIENT_SECRET;
    const apiUrl = process.env.MOBILEMART_API_URL || 'https://api.mobilemart.co.za';
    const liveIntegration = process.env.MOBILEMART_LIVE_INTEGRATION === 'true';
    
    report.credentials = {
        clientId: clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET',
        hasSecret: !!clientSecret,
        secretLength: clientSecret ? clientSecret.length : 0,
        apiUrl,
        liveIntegration,
        configured: !!(clientId && clientSecret)
    };
    
    logInfo(`API Base URL: ${apiUrl}`);
    logInfo(`Client ID: ${report.credentials.clientId}`);
    logInfo(`Client Secret: ${report.credentials.hasSecret ? 'CONFIGURED (' + report.credentials.secretLength + ' chars)' : 'NOT SET'}`);
    logInfo(`Live Integration Mode: ${liveIntegration ? 'ENABLED' : 'DISABLED'}`);
    
    if (!clientId || !clientSecret) {
        logError('MobileMart credentials are missing!');
        report.issues.push('Missing MOBILEMART_CLIENT_ID or MOBILEMART_CLIENT_SECRET in .env file');
        report.recommendations.push('Add MobileMart API credentials to .env file');
    } else {
        logSuccess('Credentials are configured');
    }

    // ========================================
    // 2. API ENDPOINT VERIFICATION
    // ========================================
    logSection('2. API ENDPOINT VERIFICATION');
    
    const tokenUrl = `${apiUrl}/oauth/token`;
    const apiBaseUrl = `${apiUrl}/api/v1`;
    
    logInfo(`OAuth Token Endpoint: ${tokenUrl}`);
    logInfo(`API Base URL: ${apiBaseUrl}`);
    
    // Test endpoints
    const endpoints = {
        token: tokenUrl,
        productsAirtime: `${apiBaseUrl}/products/airtime`,
        productsData: `${apiBaseUrl}/products/data`,
        productsElectricity: `${apiBaseUrl}/products/electricity`
    };
    
    logDetail('Testing endpoint connectivity...');
    
    for (const [name, url] of Object.entries(endpoints)) {
        try {
            const response = await axios.get(url, {
                timeout: 5000,
                httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                validateStatus: () => true
            });
            
            report.endpoints[name] = {
                url,
                status: response.status,
                accessible: response.status < 500,
                contentType: response.headers['content-type'],
                contentLength: response.headers['content-length']
            };
            
            if (response.status === 200) {
                logSuccess(`${name}: Accessible (HTTP ${response.status})`);
            } else if (response.status === 401 || response.status === 403) {
                logWarning(`${name}: Authentication required (HTTP ${response.status})`);
            } else if (response.status === 404) {
                logWarning(`${name}: Endpoint not found (HTTP ${response.status})`);
            } else {
                logWarning(`${name}: Unexpected status (HTTP ${response.status})`);
            }
        } catch (error) {
            report.endpoints[name] = {
                url,
                error: error.message,
                accessible: false
            };
            logError(`${name}: Connection failed - ${error.message}`);
        }
    }

    // ========================================
    // 3. AUTHENTICATION TEST
    // ========================================
    logSection('3. AUTHENTICATION TEST');
    
    if (report.credentials.configured) {
        try {
            logInfo('Attempting OAuth 2.0 token request...');
            
            // Try both JSON and form-urlencoded formats
            const formats = [
                { name: 'JSON', contentType: 'application/json' },
                { name: 'Form-URLEncoded', contentType: 'application/x-www-form-urlencoded' }
            ];
            
            for (const format of formats) {
                logDetail(`Trying ${format.name} format...`);
                
                try {
                    let requestData;
                    if (format.name === 'JSON') {
                        requestData = {
                            grant_type: 'client_credentials',
                            client_id: clientId,
                            client_secret: clientSecret
                        };
                    } else {
                        const formData = new URLSearchParams();
                        formData.append('grant_type', 'client_credentials');
                        formData.append('client_id', clientId);
                        formData.append('client_secret', clientSecret);
                        requestData = formData.toString();
                    }
                    
                    const response = await axios.post(tokenUrl, requestData, {
                        headers: {
                            'Content-Type': format.contentType,
                            'Accept': 'application/json'
                        },
                        timeout: 10000,
                        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                        validateStatus: () => true
                    });
                    
                    report.authentication[format.name] = {
                        status: response.status,
                        statusText: response.statusText,
                        headers: response.headers,
                        data: response.data,
                        dataType: typeof response.data,
                        hasContent: !!(response.data && response.data.toString().trim()),
                        contentType: response.headers['content-type']
                    };
                    
                    logDetail(`HTTP Status: ${response.status}`);
                    logDetail(`Content-Type: ${response.headers['content-type']}`);
                    logDetail(`Content-Length: ${response.headers['content-length'] || 'N/A'}`);
                    
                    if (response.status === 200 && response.data && Object.keys(response.data).length > 0) {
                        logSuccess(`${format.name} format: SUCCESS`);
                        logDetail(`Response: ${JSON.stringify(response.data, null, 2)}`);
                        report.authentication.success = true;
                        report.authentication.format = format.name;
                        report.authentication.tokenData = response.data;
                        break;
                    } else if (response.status === 200 && (!response.data || response.data.toString().trim() === '')) {
                        logWarning(`${format.name} format: Empty response (HTTP 200)`);
                        report.issues.push(`OAuth token endpoint returns empty response with ${format.name} format`);
                    } else if (response.status === 401 || response.status === 403) {
                        logError(`${format.name} format: Authentication failed (HTTP ${response.status})`);
                        report.issues.push(`Invalid credentials or authentication method`);
                    } else if (response.status === 404) {
                        logError(`${format.name} format: Endpoint not found (HTTP ${response.status})`);
                        report.issues.push(`OAuth token endpoint may be incorrect`);
                    } else {
                        logWarning(`${format.name} format: Unexpected response (HTTP ${response.status})`);
                        logDetail(`Response: ${JSON.stringify(response.data)}`);
                    }
                } catch (error) {
                    logError(`${format.name} format: Error - ${error.message}`);
                    report.authentication[format.name] = {
                        error: error.message,
                        success: false
                    };
                }
            }
            
            if (!report.authentication.success) {
                logError('Authentication failed with all formats');
                report.issues.push('OAuth token request failed - credentials may be invalid or endpoint incorrect');
            }
            
        } catch (error) {
            logError(`Authentication test failed: ${error.message}`);
            report.authentication.error = error.message;
            report.issues.push(`Authentication error: ${error.message}`);
        }
    } else {
        logWarning('Skipping authentication test - credentials not configured');
    }

    // ========================================
    // 4. PRODUCT ENDPOINT TEST
    // ========================================
    logSection('4. PRODUCT ENDPOINT TEST');
    
    if (report.authentication.success && report.authentication.tokenData) {
        const accessToken = report.authentication.tokenData.access_token || 
                          report.authentication.tokenData.token ||
                          report.authentication.tokenData.accessToken;
        
        if (accessToken) {
            logInfo('Testing product endpoints with authenticated token...');
            
            const vasTypes = ['airtime', 'data', 'electricity'];
            
            for (const vasType of vasTypes) {
                try {
                    const productUrl = `${apiBaseUrl}/products/${vasType}`;
                    logDetail(`Testing ${vasType} products endpoint...`);
                    
                    const response = await axios.get(productUrl, {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Accept': 'application/json'
                        },
                        timeout: 10000,
                        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
                        validateStatus: () => true
                    });
                    
                    report.products[vasType] = {
                        status: response.status,
                        accessible: response.status === 200,
                        productCount: 0,
                        products: []
                    };
                    
                    if (response.status === 200) {
                        let products = [];
                        if (Array.isArray(response.data)) {
                            products = response.data;
                        } else if (response.data?.products && Array.isArray(response.data.products)) {
                            products = response.data.products;
                        } else if (response.data?.data && Array.isArray(response.data.data)) {
                            products = response.data.data;
                        }
                        
                        report.products[vasType].productCount = products.length;
                        report.products[vasType].products = products.slice(0, 10); // Store first 10
                        
                        logSuccess(`${vasType}: ${products.length} products found`);
                        
                        if (products.length > 0) {
                            logDetail('Sample products:');
                            products.slice(0, 3).forEach((p, i) => {
                                const id = p.id || p.productId || p.merchantProductId || 'N/A';
                                const name = p.name || p.productName || p.description || 'N/A';
                                const price = p.price || p.amount || p.cost || 'N/A';
                                logDetail(`  ${i+1}. ${id} - ${name} (R${price})`);
                            });
                        }
                    } else {
                        logWarning(`${vasType}: HTTP ${response.status}`);
                        report.products[vasType].error = `HTTP ${response.status}`;
                    }
                } catch (error) {
                    logError(`${vasType}: ${error.message}`);
                    report.products[vasType] = {
                        error: error.message,
                        accessible: false
                    };
                }
            }
        } else {
            logWarning('No access token available for product endpoint testing');
        }
    } else {
        logWarning('Skipping product endpoint tests - authentication required');
    }

    // ========================================
    // 5. INTEGRATION ANALYSIS
    // ========================================
    logSection('5. INTEGRATION ANALYSIS');
    
    // Check code implementation
    logInfo('Checking code implementation...');
    
    const fs = require('fs');
    const path = require('path');
    
    const files = {
        authService: fs.existsSync(path.join(__dirname, '../services/mobilemartAuthService.js')),
        controller: fs.existsSync(path.join(__dirname, '../controllers/mobilemartController.js')),
        routes: fs.existsSync(path.join(__dirname, '../routes/mobilemart.js')),
        models: [
            fs.existsSync(path.join(__dirname, '../models/MobileMartProduct.js')),
            fs.existsSync(path.join(__dirname, '../models/MobileMartTransaction.js'))
        ]
    };
    
    logDetail(`Auth Service: ${files.authService ? '✅' : '❌'}`);
    logDetail(`Controller: ${files.controller ? '✅' : '❌'}`);
    logDetail(`Routes: ${files.routes ? '✅' : '❌'}`);
    logDetail(`Models: ${files.models.filter(Boolean).length}/2`);
    
    report.implementation = {
        authService: files.authService,
        controller: files.controller,
        routes: files.routes,
        models: files.models.filter(Boolean).length
    };

    // ========================================
    // 6. SUMMARY & RECOMMENDATIONS
    // ========================================
    logSection('6. SUMMARY & RECOMMENDATIONS');
    
    // Determine overall status
    if (report.credentials.configured && report.authentication.success) {
        report.status = 'OPERATIONAL';
        logSuccess('Integration Status: OPERATIONAL');
    } else if (report.credentials.configured && !report.authentication.success) {
        report.status = 'AUTHENTICATION_FAILED';
        logError('Integration Status: AUTHENTICATION FAILED');
    } else if (!report.credentials.configured) {
        report.status = 'NOT_CONFIGURED';
        logError('Integration Status: NOT CONFIGURED');
    } else {
        report.status = 'UNKNOWN';
        logWarning('Integration Status: UNKNOWN');
    }
    
    // Generate recommendations
    if (!report.credentials.configured) {
        report.recommendations.push('Add MOBILEMART_CLIENT_ID and MOBILEMART_CLIENT_SECRET to .env file');
    }
    
    if (report.authentication.success === false) {
        report.recommendations.push('Verify MobileMart API credentials are correct');
        report.recommendations.push('Contact MobileMart support to confirm API endpoint URL');
        report.recommendations.push('Verify account is activated for API access');
        report.recommendations.push('Check if IP whitelisting is required');
        report.recommendations.push('Verify OAuth 2.0 endpoint format matches MobileMart documentation');
    }
    
    if (report.authentication.success && Object.keys(report.products).length === 0) {
        report.recommendations.push('Product endpoints may require different authentication or endpoint structure');
        report.recommendations.push('Check MobileMart API documentation for correct product endpoint format');
    }
    
    // Output issues
    if (report.issues.length > 0) {
        logSection('ISSUES FOUND');
        report.issues.forEach((issue, i) => {
            logError(`${i + 1}. ${issue}`);
        });
    }
    
    // Output recommendations
    if (report.recommendations.length > 0) {
        logSection('RECOMMENDATIONS');
        report.recommendations.forEach((rec, i) => {
            logWarning(`${i + 1}. ${rec}`);
        });
    }
    
    // Product summary
    if (Object.keys(report.products).length > 0) {
        logSection('PRODUCTS SUMMARY');
        Object.entries(report.products).forEach(([vasType, data]) => {
            if (data.accessible && data.productCount > 0) {
                logSuccess(`${vasType.toUpperCase()}: ${data.productCount} products available`);
            } else if (data.accessible && data.productCount === 0) {
                logWarning(`${vasType.toUpperCase()}: Endpoint accessible but no products found`);
            } else {
                logError(`${vasType.toUpperCase()}: Not accessible - ${data.error || 'Unknown error'}`);
            }
        });
    }
    
    console.log('\n' + '='.repeat(80));
    log(`FINAL STATUS: ${report.status}`, 
        report.status === 'OPERATIONAL' ? 'green' : 
        report.status === 'NOT_CONFIGURED' ? 'yellow' : 'red');
    console.log('='.repeat(80) + '\n');
    
    return report;
}

// Run report
generateDetailedReport()
    .then(report => {
        // Save report to file
        const fs = require('fs');
        const path = require('path');
        const reportPath = path.join(__dirname, '../reports/mobilemart-integration-report.json');
        
        // Ensure reports directory exists
        const reportsDir = path.dirname(reportPath);
        if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
        }
        
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
        logInfo(`Detailed report saved to: ${reportPath}`);
        
        process.exit(report.status === 'OPERATIONAL' ? 0 : 1);
    })
    .catch(error => {
        logError(`Report generation failed: ${error.message}`);
        console.error(error);
        process.exit(1);
    });


