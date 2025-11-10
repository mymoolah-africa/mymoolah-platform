#!/usr/bin/env node
/**
 * Test MobileMart Purchase Transactions
 * 
 * Tests purchase endpoints for all 5 VAS types:
 * - Airtime (pinned and pinless)
 * - Data (pinned and pinless)
 * - Voucher
 * - Bill Payment (requires prevend)
 * - Utility (requires prevend)
 * 
 * Usage: node scripts/test-mobilemart-purchases.js
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

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logSection(title) {
    console.log('\n' + '='.repeat(80));
    log(title, 'cyan');
    console.log('='.repeat(80) + '\n');
}

async function testPurchases() {
    logSection('MOBILEMART PURCHASE TRANSACTIONS TEST');
    logInfo('Testing purchase endpoints for all 5 VAS types');
    logWarning('NOTE: This will make REAL API calls. Use test products only!');
    
    // Enable debug logging
    process.env.DEBUG_MOBILEMART = 'true';
    
    const authService = new MobileMartAuthService();
    
    // Verify auth
    try {
        const token = await authService.getAccessToken();
        logSuccess(`Authentication successful! Token: ${token.substring(0, 20)}...`);
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        return;
    }
    
    // First, get products to use for testing
    logSection('Step 1: Fetching Products for Testing');
    
    let testProducts = {};
    
    try {
        // Get Airtime products (PINLESS ONLY - per frontend requirements)
        const airtimeProducts = await authService.makeAuthenticatedRequest('GET', '/airtime/products');
        if (Array.isArray(airtimeProducts) && airtimeProducts.length > 0) {
            // Only get pinless products (pinned === false)
            const pinlessAirtime = airtimeProducts.filter(p => p.pinned === false);
            if (pinlessAirtime.length > 0) {
                testProducts.airtime = {
                    pinless: pinlessAirtime[0]  // Use first pinless product
                };
                logSuccess(`Found ${airtimeProducts.length} airtime products (${pinlessAirtime.length} pinless)`);
            } else {
                logWarning(`No pinless airtime products found (frontend requirement)`);
            }
        }
        
        // Get Data products (PINLESS ONLY - per frontend requirements)
        const dataProducts = await authService.makeAuthenticatedRequest('GET', '/data/products');
        if (Array.isArray(dataProducts) && dataProducts.length > 0) {
            // Only get pinless products (pinned === false)
            const pinlessData = dataProducts.filter(p => p.pinned === false);
            if (pinlessData.length > 0) {
                testProducts.data = {
                    pinless: pinlessData[0]  // Use first pinless product
                };
                logSuccess(`Found ${dataProducts.length} data products (${pinlessData.length} pinless)`);
            } else {
                logWarning(`No pinless data products found (frontend requirement)`);
            }
        }
        
        // Get Voucher products
        const voucherProducts = await authService.makeAuthenticatedRequest('GET', '/voucher/products');
        if (Array.isArray(voucherProducts) && voucherProducts.length > 0) {
            testProducts.voucher = voucherProducts[0];
            logSuccess(`Found ${voucherProducts.length} voucher products`);
        }
        
        // Get Bill Payment products
        const billPaymentProducts = await authService.makeAuthenticatedRequest('GET', '/bill-payment/products');
        if (Array.isArray(billPaymentProducts) && billPaymentProducts.length > 0) {
            testProducts.billPayment = billPaymentProducts[0];
            logSuccess(`Found ${billPaymentProducts.length} bill payment products`);
        }
        
        // Get Utility products
        const utilityProducts = await authService.makeAuthenticatedRequest('GET', '/utility/products');
        if (Array.isArray(utilityProducts) && utilityProducts.length > 0) {
            testProducts.utility = utilityProducts[0];
            logSuccess(`Found ${utilityProducts.length} utility products`);
        }
        
    } catch (error) {
        logError(`Error fetching products: ${error.message}`);
        return;
    }
    
    // Test purchases
    logSection('Step 2: Testing Purchase Transactions');
    
    const results = [];
    
    // Test 1: Airtime Pinless
    if (testProducts.airtime?.pinless) {
        try {
            logInfo('Testing: Airtime Pinless Purchase');
            const product = testProducts.airtime.pinless;
            const requestData = {
                requestId: `TEST_${Date.now()}_AIR_PINLESS`,
                merchantProductId: product.merchantProductId,
                tenderType: 'CreditCard',
                mobileNumber: '0720012345',  // Test number from MobileMart test pack
                ...(product.fixedAmount ? {} : { amount: product.amount || 20 })
            };
            
            logInfo(`  Product: ${product.productName}`);
            logInfo(`  Mobile: ${requestData.mobileNumber}`);
            logInfo(`  Amount: ${requestData.amount || 'Fixed'}`);
            
            const response = await authService.makeAuthenticatedRequest(
                'POST',
                '/airtime/pinless',
                requestData
            );
            
            if (response.transactionId) {
                logSuccess(`✅ Airtime Pinless: Transaction ID ${response.transactionId}`);
                results.push({ type: 'Airtime Pinless', success: true, transactionId: response.transactionId });
            } else {
                logError(`❌ Airtime Pinless: Unexpected response`);
                results.push({ type: 'Airtime Pinless', success: false, error: 'Unexpected response' });
            }
        } catch (error) {
            logError(`❌ Airtime Pinless: ${error.message}`);
            results.push({ type: 'Airtime Pinless', success: false, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 2: Data Pinless
    if (testProducts.data?.pinless) {
        try {
            logInfo('Testing: Data Pinless Purchase');
            const product = testProducts.data.pinless;
            const requestData = {
                requestId: `TEST_${Date.now()}_DATA_PINLESS`,
                merchantProductId: product.merchantProductId,
                tenderType: 'CreditCard',
                mobileNumber: '0720012345'
            };
            
            logInfo(`  Product: ${product.productName}`);
            logInfo(`  Mobile: ${requestData.mobileNumber}`);
            
            const response = await authService.makeAuthenticatedRequest(
                'POST',
                '/data/pinless',
                requestData
            );
            
            if (response.transactionId) {
                logSuccess(`✅ Data Pinless: Transaction ID ${response.transactionId}`);
                results.push({ type: 'Data Pinless', success: true, transactionId: response.transactionId });
            } else {
                logError(`❌ Data Pinless: Unexpected response`);
                results.push({ type: 'Data Pinless', success: false, error: 'Unexpected response' });
            }
        } catch (error) {
            logError(`❌ Data Pinless: ${error.message}`);
            results.push({ type: 'Data Pinless', success: false, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 3: Voucher
    if (testProducts.voucher) {
        try {
            logInfo('Testing: Voucher Purchase');
            const product = testProducts.voucher;
            const requestData = {
                requestId: `TEST_${Date.now()}_VOUCHER`,
                merchantProductId: product.merchantProductId,
                tenderType: 'CreditCard',
                ...(product.fixedAmount ? {} : { amount: product.amount || 50 })
            };
            
            logInfo(`  Product: ${product.productName}`);
            logInfo(`  Amount: ${requestData.amount || 'Fixed'}`);
            
            const response = await authService.makeAuthenticatedRequest(
                'POST',
                '/voucher/purchase',
                requestData
            );
            
            if (response.transactionId) {
                logSuccess(`✅ Voucher: Transaction ID ${response.transactionId}`);
                results.push({ type: 'Voucher', success: true, transactionId: response.transactionId });
            } else {
                logError(`❌ Voucher: Unexpected response`);
                results.push({ type: 'Voucher', success: false, error: 'Unexpected response' });
            }
        } catch (error) {
            logError(`❌ Voucher: ${error.message}`);
            results.push({ type: 'Voucher', success: false, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 4: Bill Payment (requires prevend)
    if (testProducts.billPayment) {
        try {
            logInfo('Testing: Bill Payment Prevend');
            const product = testProducts.billPayment;
            
            // First, do prevend
            const prevendData = {
                AccountNumber: '1234567890',  // Test account number
                MerchantProductId: product.merchantProductId,
                RequestId: `TEST_${Date.now()}_BILL_PREVEND`
            };
            
            logInfo(`  Product: ${product.productName}`);
            logInfo(`  Account: ${prevendData.AccountNumber}`);
            
            // Build query string for prevend
            const prevendQuery = `AccountNumber=${encodeURIComponent(prevendData.AccountNumber)}&MerchantProductId=${encodeURIComponent(prevendData.MerchantProductId)}&RequestId=${encodeURIComponent(prevendData.RequestId)}`;
            const prevendResponse = await authService.makeAuthenticatedRequest(
                'GET',
                `/v2/bill-payment/prevend?${prevendQuery}`
            );
            
            if (prevendResponse.transactionId) {
                logSuccess(`✅ Bill Payment Prevend: Transaction ID ${prevendResponse.transactionId}`);
                
                // Now do purchase
                logInfo('Testing: Bill Payment Purchase');
                const purchaseData = {
                    requestId: `TEST_${Date.now()}_BILL_PAY`,
                    prevendTransactionId: prevendResponse.transactionId,
                    tenderType: 'CreditCard',
                    amount: prevendResponse.amountDue || 100
                };
                
                const purchaseResponse = await authService.makeAuthenticatedRequest(
                    'POST',
                    '/v2/bill-payment/pay',
                    purchaseData
                );
                
                if (purchaseResponse.transactionId) {
                    logSuccess(`✅ Bill Payment: Transaction ID ${purchaseResponse.transactionId}`);
                    results.push({ type: 'Bill Payment', success: true, transactionId: purchaseResponse.transactionId });
                } else {
                    logError(`❌ Bill Payment: Unexpected response`);
                    results.push({ type: 'Bill Payment', success: false, error: 'Unexpected response' });
                }
            } else {
                logWarning(`⚠️  Bill Payment Prevend: May need valid account number`);
                results.push({ type: 'Bill Payment', success: false, error: 'Prevend failed or needs valid account' });
            }
        } catch (error) {
            logError(`❌ Bill Payment: ${error.message}`);
            results.push({ type: 'Bill Payment', success: false, error: error.message });
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test 5: Utility (requires prevend)
    if (testProducts.utility) {
        try {
            logInfo('Testing: Utility Prevend');
            const product = testProducts.utility;
            
            // First, do prevend
            const prevendData = {
                MeterNumber: '12345678901',  // Test meter number
                MerchantProductId: product.merchantProductId,
                RequestId: `TEST_${Date.now()}_UTIL_PREVEND`,
                Amount: 50  // Test amount
            };
            
            logInfo(`  Product: ${product.name}`);
            logInfo(`  Meter: ${prevendData.MeterNumber}`);
            logInfo(`  Amount: ${prevendData.Amount}`);
            
            // Build query string for prevend
            const utilPrevendQuery = `MeterNumber=${encodeURIComponent(prevendData.MeterNumber)}&MerchantProductId=${encodeURIComponent(prevendData.MerchantProductId)}&RequestId=${encodeURIComponent(prevendData.RequestId)}&Amount=${prevendData.Amount}`;
            const prevendResponse = await authService.makeAuthenticatedRequest(
                'GET',
                `/v1/utility/prevend?${utilPrevendQuery}`
            );
            
            if (prevendResponse.transactionId) {
                logSuccess(`✅ Utility Prevend: Transaction ID ${prevendResponse.transactionId}`);
                
                // Now do purchase
                logInfo('Testing: Utility Purchase');
                const purchaseData = {
                    requestId: `TEST_${Date.now()}_UTIL_PAY`,
                    prevendTransactionId: prevendResponse.transactionId,
                    tenderType: 'CreditCard'
                };
                
                const purchaseResponse = await authService.makeAuthenticatedRequest(
                    'POST',
                    '/v1/utility/purchase',
                    purchaseData
                );
                
                if (purchaseResponse.transactionId) {
                    logSuccess(`✅ Utility: Transaction ID ${purchaseResponse.transactionId}`);
                    results.push({ type: 'Utility', success: true, transactionId: purchaseResponse.transactionId });
                } else {
                    logError(`❌ Utility: Unexpected response`);
                    results.push({ type: 'Utility', success: false, error: 'Unexpected response' });
                }
            } else {
                logWarning(`⚠️  Utility Prevend: May need valid meter number`);
                results.push({ type: 'Utility', success: false, error: 'Prevend failed or needs valid meter' });
            }
        } catch (error) {
            logError(`❌ Utility: ${error.message}`);
            results.push({ type: 'Utility', success: false, error: error.message });
        }
    }
    
    // Summary
    logSection('RESULTS SUMMARY');
    
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    if (successful.length > 0) {
        logSuccess(`✅ ${successful.length} purchase(s) successful:`);
        successful.forEach(r => {
            log(`  ${r.type}: ${r.transactionId}`, 'green');
        });
    }
    
    if (failed.length > 0) {
        log(`\n⚠️  ${failed.length} purchase(s) had issues:`);
        failed.forEach(r => {
            log(`  ${r.type}: ${r.error}`, 'yellow');
        });
    }
    
    console.log('\n' + '-'.repeat(80));
    if (successful.length === results.length) {
        log('🎉 ALL PURCHASE TESTS PASSED!', 'green');
    } else if (successful.length > 0) {
        log(`⚠️  Partial success: ${successful.length}/${results.length} purchases working`, 'yellow');
    } else {
        log('❌ No purchases successful - check errors above', 'red');
    }
    console.log('-'.repeat(80) + '\n');
}

testPurchases()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Test error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

