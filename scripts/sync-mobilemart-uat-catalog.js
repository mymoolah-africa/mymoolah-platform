#!/usr/bin/env node
/**
 * Sync MobileMart UAT Products to Catalog
 * 
 * Syncs products from MobileMart UAT API to vas_products table
 * Includes BOTH pinned and pinless products for UAT testing
 * 
 * Usage: node scripts/sync-mobilemart-uat-catalog.js
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');
const { VasProduct, sequelize } = require('../models');
const { Op } = require('sequelize');

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

/**
 * Map MobileMart contentCreator to provider name
 */
function mapContentCreatorToProvider(contentCreator) {
    const mapping = {
        'vodacom': 'Vodacom',
        'mtn': 'MTN',
        'cellc': 'CellC',
        'telkom': 'Telkom',
        'virgin': 'Virgin Mobile',
        'education': 'Education',
        'trafficfine': 'Traffic Fine',
        'hollywoodbets': 'Hollywood Bets'
    };
    return mapping[contentCreator?.toLowerCase()] || contentCreator || 'Unknown';
}

/**
 * Map MobileMart VAS type to our vasType enum
 */
function mapVasType(vasType) {
    const mapping = {
        'airtime': 'airtime',
        'data': 'data',
        'voucher': 'airtime',  // Vouchers are typically airtime vouchers
        'bill-payment': 'bill_payment',
        'billpayment': 'bill_payment',
        'utility': 'electricity',
        'prepaidutility': 'electricity'
    };
    return mapping[vasType.toLowerCase()] || 'airtime';
}

/**
 * Map MobileMart product to transactionType
 */
function mapTransactionType(pinned, vasType) {
    if (pinned === true) {
        return 'voucher';  // Pinned products are vouchers
    } else if (vasType === 'airtime' || vasType === 'data') {
        return 'topup';  // Pinless airtime/data are topups
    } else {
        return 'direct';  // Bill payment, utility are direct
    }
}

/**
 * Convert amount to cents
 */
function toCents(amount) {
    if (!amount) return 0;
    return Math.round(amount * 100);
}

/**
 * Sync products from MobileMart API
 */
async function syncMobileMartProducts() {
    logSection('MOBILEMART UAT PRODUCT CATALOG SYNC');
    logInfo('Syncing products from MobileMart UAT API');
    logWarning('NOTE: This includes BOTH pinned and pinless products for UAT testing');
    
    const authService = new MobileMartAuthService();
    const supplierId = 'mobilemart';
    
    // Verify auth
    try {
        const token = await authService.getAccessToken();
        logSuccess(`Authentication successful!`);
    } catch (error) {
        logError(`Authentication failed: ${error.message}`);
        return;
    }
    
    const stats = {
        total: 0,
        created: 0,
        updated: 0,
        errors: 0,
        skipped: 0
    };
    
    // Sync all VAS types
    const vasTypes = [
        { type: 'airtime', endpoint: '/airtime/products' },
        { type: 'data', endpoint: '/data/products' },
        { type: 'voucher', endpoint: '/voucher/products' },
        { type: 'bill-payment', endpoint: '/bill-payment/products' },
        { type: 'utility', endpoint: '/utility/products' }
    ];
    
    for (const { type, endpoint } of vasTypes) {
        try {
            logSection(`Syncing ${type.toUpperCase()} Products`);
            
            const products = await authService.makeAuthenticatedRequest('GET', endpoint);
            
            if (!Array.isArray(products) || products.length === 0) {
                logWarning(`No ${type} products found`);
                continue;
            }
            
            logInfo(`Found ${products.length} ${type} products`);
            
            for (const product of products) {
                try {
                    stats.total++;
                    
                    // Map product data
                    const isPinned = product.pinned === true;
                    const isFixed = product.fixedAmount === true;
                    const provider = mapContentCreatorToProvider(product.contentCreator);
                    const vasType = mapVasType(type);
                    const transactionType = mapTransactionType(isPinned, type);
                    
                    // Build product data
                    const productData = {
                        supplierId: supplierId,
                        supplierProductId: product.merchantProductId,
                        productName: product.productName || product.name || `${provider} ${type}`,
                        vasType: vasType,
                        transactionType: transactionType,
                        provider: provider,
                        networkType: 'local',
                        minAmount: toCents(product.minimumAmount || product.minAmount || 0),
                        maxAmount: toCents(product.maximumAmount || product.maxAmount || 0),
                        commission: 0,  // Will be updated from supplier pricing service
                        fixedFee: 0,
                        isPromotional: false,
                        isActive: true,
                        priority: isPinned ? 2 : 1,  // Pinless has higher priority
                        metadata: {
                            mobilemart: {
                                merchantProductId: product.merchantProductId,
                                contentCreator: product.contentCreator,
                                pinned: isPinned,
                                fixedAmount: isFixed,
                                amount: product.amount,
                                originalVasType: type
                            }
                        },
                        lastUpdated: new Date()
                    };
                    
                    // Add predefined amounts for fixed products
                    if (isFixed && product.amount) {
                        productData.predefinedAmounts = [toCents(product.amount)];
                    }
                    
                    // Check if product exists
                    const existing = await VasProduct.findOne({
                        where: {
                            supplierId: supplierId,
                            supplierProductId: product.merchantProductId
                        }
                    });
                    
                    if (existing) {
                        // Update existing product
                        await existing.update(productData);
                        stats.updated++;
                        logInfo(`  Updated: ${productData.productName} (${isPinned ? 'Pinned' : 'Pinless'})`);
                    } else {
                        // Create new product
                        await VasProduct.create(productData);
                        stats.created++;
                        logSuccess(`  Created: ${productData.productName} (${isPinned ? 'Pinned' : 'Pinless'})`);
                    }
                    
                } catch (error) {
                    stats.errors++;
                    logError(`  Error syncing product ${product.merchantProductId}: ${error.message}`);
                }
            }
            
        } catch (error) {
            logError(`Error syncing ${type} products: ${error.message}`);
            stats.errors++;
        }
    }
    
    // Summary
    logSection('SYNC SUMMARY');
    logInfo(`Total products processed: ${stats.total}`);
    logSuccess(`Created: ${stats.created}`);
    logInfo(`Updated: ${stats.updated}`);
    logWarning(`Skipped: ${stats.skipped}`);
    if (stats.errors > 0) {
        logError(`Errors: ${stats.errors}`);
    }
    
    console.log('\n' + '-'.repeat(80));
    if (stats.errors === 0) {
        log('🎉 SYNC COMPLETE! All products synced successfully.', 'green');
    } else {
        log(`⚠️  Sync completed with ${stats.errors} error(s)`, 'yellow');
    }
    console.log('-'.repeat(80) + '\n');
}

// Run sync
syncMobileMartProducts()
    .then(() => {
        process.exit(0);
    })
    .catch(error => {
        logError(`Sync error: ${error.message}`);
        console.error(error);
        process.exit(1);
    });

