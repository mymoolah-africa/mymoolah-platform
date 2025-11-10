#!/usr/bin/env node
/**
 * MobileMart High-Volume Load Testing Script
 * 
 * Simulates high-volume transactions for MobileMart purchase endpoints
 * Tests all 6 working purchase types at specified TPS (transactions per second) rates
 * 
 * Usage:
 *   node scripts/test-mobilemart-load.js --tps 100 --duration 60 --type all
 *   node scripts/test-mobilemart-load.js --tps 500 --duration 30 --type airtime-pinless
 *   node scripts/test-mobilemart-load.js --tps 1000 --duration 10 --type mixed
 * 
 * Options:
 *   --tps <number>        Transactions per second (default: 100)
 *   --duration <seconds>  Test duration in seconds (default: 60)
 *   --type <type>         Purchase type: all, mixed, airtime-pinless, airtime-pinned, 
 *                         data-pinless, data-pinned, voucher, utility (default: mixed)
 *   --max-transactions    Maximum number of transactions (safety limit, default: 10000)
 *   --warmup <seconds>    Warmup period before starting load test (default: 5)
 */

require('dotenv').config();
const MobileMartAuthService = require('../services/mobilemartAuthService');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
    tps: 100,
    duration: 60,
    type: 'mixed',
    maxTransactions: 10000,
    warmup: 5
};

for (let i = 0; i < args.length; i += 2) {
    const key = args[i]?.replace('--', '');
    const value = args[i + 1];
    if (key && value) {
        if (key === 'tps' || key === 'duration' || key === 'maxTransactions' || key === 'warmup') {
            options[key] = parseInt(value, 10);
        } else if (key === 'type') {
            options.type = value;
        }
    }
}

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

// Test data for different purchase types
const TEST_DATA = {
    mobileNumbers: {
        vodacom: '0829802807',
        mtn: '0830012300',
        cellc: '0840012300',
        telkom: '0850012345'
    },
    utilityMeter: '12345678901',
    utilityAmount: 50
};

// Metrics tracking
class MetricsTracker {
    constructor() {
        this.reset();
    }

    reset() {
        this.transactions = [];
        this.startTime = null;
        this.endTime = null;
        this.errors = [];
    }

    start() {
        this.reset();
        this.startTime = Date.now();
    }

    stop() {
        this.endTime = Date.now();
    }

    recordTransaction(type, success, latency, error = null) {
        const transaction = {
            type,
            success,
            latency,
            timestamp: Date.now(),
            error: error?.message || error
        };
        this.transactions.push(transaction);
        if (!success && error) {
            this.errors.push({
                type,
                error: error.message || error,
                timestamp: transaction.timestamp
            });
        }
    }

    getStats() {
        const total = this.transactions.length;
        const successful = this.transactions.filter(t => t.success).length;
        const failed = total - successful;
        const latencies = this.transactions.map(t => t.latency).filter(l => l !== null);
        
        const stats = {
            total,
            successful,
            failed,
            successRate: total > 0 ? (successful / total * 100).toFixed(2) : 0,
            errorRate: total > 0 ? (failed / total * 100).toFixed(2) : 0,
            duration: this.endTime && this.startTime ? (this.endTime - this.startTime) / 1000 : 0,
            actualTPS: this.endTime && this.startTime ? (total / ((this.endTime - this.startTime) / 1000)).toFixed(2) : 0
        };

        if (latencies.length > 0) {
            latencies.sort((a, b) => a - b);
            stats.latency = {
                min: latencies[0],
                max: latencies[latencies.length - 1],
                avg: (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2),
                p50: latencies[Math.floor(latencies.length * 0.5)],
                p95: latencies[Math.floor(latencies.length * 0.95)],
                p99: latencies[Math.floor(latencies.length * 0.99)]
            };
        } else {
            stats.latency = {
                min: 0,
                max: 0,
                avg: 0,
                p50: 0,
                p95: 0,
                p99: 0
            };
        }

        // Group by type
        stats.byType = {};
        const types = [...new Set(this.transactions.map(t => t.type))];
        types.forEach(type => {
            const typeTransactions = this.transactions.filter(t => t.type === type);
            const typeSuccessful = typeTransactions.filter(t => t.success).length;
            const typeLatencies = typeTransactions.map(t => t.latency).filter(l => l !== null);
            
            stats.byType[type] = {
                total: typeTransactions.length,
                successful: typeSuccessful,
                failed: typeTransactions.length - typeSuccessful,
                successRate: typeTransactions.length > 0 ? (typeSuccessful / typeTransactions.length * 100).toFixed(2) : 0
            };

            if (typeLatencies.length > 0) {
                typeLatencies.sort((a, b) => a - b);
                stats.byType[type].latency = {
                    avg: (typeLatencies.reduce((a, b) => a + b, 0) / typeLatencies.length).toFixed(2),
                    p95: typeLatencies[Math.floor(typeLatencies.length * 0.95)],
                    p99: typeLatencies[Math.floor(typeLatencies.length * 0.99)]
                };
            }
        });

        return stats;
    }

    printReport() {
        const stats = this.getStats();
        
        logSection('LOAD TEST RESULTS');
        
        logInfo(`Test Configuration:`);
        log(`  Target TPS: ${options.tps}`);
        log(`  Duration: ${options.duration}s`);
        log(`  Type: ${options.type}`);
        log(`  Max Transactions: ${options.maxTransactions}`);
        
        console.log('\n' + '-'.repeat(80));
        logInfo('Overall Statistics:');
        log(`  Total Transactions: ${stats.total}`);
        log(`  Successful: ${stats.successful} (${stats.successRate}%)`);
        log(`  Failed: ${stats.failed} (${stats.errorRate}%)`);
        log(`  Actual TPS: ${stats.actualTPS}`);
        log(`  Duration: ${stats.duration.toFixed(2)}s`);
        
        if (stats.latency.avg > 0) {
            console.log('\n' + '-'.repeat(80));
            logInfo('Latency Statistics (ms):');
            log(`  Min: ${stats.latency.min.toFixed(2)}ms`);
            log(`  Max: ${stats.latency.max.toFixed(2)}ms`);
            log(`  Avg: ${stats.latency.avg}ms`);
            log(`  P50: ${stats.latency.p50.toFixed(2)}ms`);
            log(`  P95: ${stats.latency.p95.toFixed(2)}ms`);
            log(`  P99: ${stats.latency.p99.toFixed(2)}ms`);
        }
        
        if (Object.keys(stats.byType).length > 0) {
            console.log('\n' + '-'.repeat(80));
            logInfo('Statistics by Purchase Type:');
            Object.keys(stats.byType).forEach(type => {
                const typeStats = stats.byType[type];
                log(`\n  ${type}:`);
                log(`    Total: ${typeStats.total}`);
                log(`    Successful: ${typeStats.successful} (${typeStats.successRate}%)`);
                log(`    Failed: ${typeStats.failed}`);
                if (typeStats.latency) {
                    log(`    Avg Latency: ${typeStats.latency.avg}ms`);
                    log(`    P95 Latency: ${typeStats.latency.p95.toFixed(2)}ms`);
                    log(`    P99 Latency: ${typeStats.latency.p99.toFixed(2)}ms`);
                }
            });
        }
        
        if (stats.failed > 0 && this.errors.length > 0) {
            console.log('\n' + '-'.repeat(80));
            logWarning('Error Summary:');
            const errorGroups = {};
            this.errors.forEach(e => {
                const key = e.error || 'Unknown error';
                if (!errorGroups[key]) {
                    errorGroups[key] = { count: 0, types: new Set() };
                }
                errorGroups[key].count++;
                errorGroups[key].types.add(e.type);
            });
            
            Object.keys(errorGroups).forEach(error => {
                const group = errorGroups[error];
                log(`  ${error}: ${group.count} occurrences`);
                log(`    Types: ${Array.from(group.types).join(', ')}`);
            });
        }
        
        console.log('\n' + '='.repeat(80) + '\n');
    }
}

// Purchase type handlers
class PurchaseHandlers {
    constructor(authService, testProducts) {
        this.authService = authService;
        this.testProducts = testProducts;
        this.requestCounter = 0;
    }

    getProviderFromProduct(product) {
        if (!product || !product.name) return 'vodacom';
        const name = product.name.toLowerCase();
        if (name.includes('mtn')) return 'mtn';
        if (name.includes('cellc') || name.includes('cell c')) return 'cellc';
        if (name.includes('telkom')) return 'telkom';
        return 'vodacom';
    }

    async executeAirtimePinless() {
        const product = this.testProducts.airtime?.pinless;
        if (!product) throw new Error('No pinless airtime product available');
        
        const provider = this.getProviderFromProduct(product);
        const mobileNumber = TEST_DATA.mobileNumbers[provider] || TEST_DATA.mobileNumbers.vodacom;
        
        const requestData = {
            requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_AIR_PINLESS`,
            merchantProductId: product.merchantProductId,
            tenderType: 'CreditCard',
            mobileNumber: mobileNumber,
            amount: product.fixedAmount ? product.amount : (product.amount || 20)
        };
        
        const startTime = Date.now();
        try {
            const response = await this.authService.makeAuthenticatedRequest('POST', '/airtime/pinless', requestData);
            const latency = Date.now() - startTime;
            return { success: true, latency, response };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { success: false, latency, error };
        }
    }

    async executeAirtimePinned() {
        const product = this.testProducts.airtime?.pinned;
        if (!product) throw new Error('No pinned airtime product available');
        
        const requestData = {
            requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_AIR_PINNED`,
            merchantProductId: product.merchantProductId,
            tenderType: 'CreditCard'
        };
        
        const startTime = Date.now();
        try {
            const response = await this.authService.makeAuthenticatedRequest('POST', '/airtime/pinned', requestData);
            const latency = Date.now() - startTime;
            return { success: true, latency, response };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { success: false, latency, error };
        }
    }

    async executeDataPinless() {
        const product = this.testProducts.data?.pinless;
        if (!product) throw new Error('No pinless data product available');
        
        const provider = this.getProviderFromProduct(product);
        const mobileNumber = TEST_DATA.mobileNumbers[provider] || TEST_DATA.mobileNumbers.vodacom;
        
        const requestData = {
            requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_DATA_PINLESS`,
            merchantProductId: product.merchantProductId,
            tenderType: 'CreditCard',
            mobileNumber: mobileNumber
        };
        
        const startTime = Date.now();
        try {
            const response = await this.authService.makeAuthenticatedRequest('POST', '/data/pinless', requestData);
            const latency = Date.now() - startTime;
            return { success: true, latency, response };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { success: false, latency, error };
        }
    }

    async executeDataPinned() {
        const product = this.testProducts.data?.pinned;
        if (!product) throw new Error('No pinned data product available');
        
        const requestData = {
            requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_DATA_PINNED`,
            merchantProductId: product.merchantProductId,
            tenderType: 'CreditCard'
        };
        
        const startTime = Date.now();
        try {
            const response = await this.authService.makeAuthenticatedRequest('POST', '/data/pinned', requestData);
            const latency = Date.now() - startTime;
            return { success: true, latency, response };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { success: false, latency, error };
        }
    }

    async executeVoucher() {
        const product = this.testProducts.voucher;
        if (!product) throw new Error('No voucher product available');
        
        const requestData = {
            requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_VOUCHER`,
            merchantProductId: product.merchantProductId,
            tenderType: 'CreditCard',
            amount: product.fixedAmount ? product.amount : (product.amount || 50)
        };
        
        const startTime = Date.now();
        try {
            const response = await this.authService.makeAuthenticatedRequest('POST', '/voucher/purchase', requestData);
            const latency = Date.now() - startTime;
            return { success: true, latency, response };
        } catch (error) {
            const latency = Date.now() - startTime;
            return { success: false, latency, error };
        }
    }

    async executeUtility() {
        const product = this.testProducts.utility;
        if (!product) throw new Error('No utility product available');
        
        // First, do prevend
        const prevendData = {
            MeterNumber: TEST_DATA.utilityMeter,
            MerchantProductId: product.merchantProductId,
            RequestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_UTIL_PREVEND`,
            Amount: TEST_DATA.utilityAmount
        };
        
        const prevendStartTime = Date.now();
        try {
            const utilPrevendQuery = `MeterNumber=${encodeURIComponent(prevendData.MeterNumber)}&MerchantProductId=${encodeURIComponent(prevendData.MerchantProductId)}&RequestId=${encodeURIComponent(prevendData.RequestId)}&Amount=${prevendData.Amount}`;
            const prevendResponse = await this.authService.makeAuthenticatedRequest('GET', `/utility/prevend?${utilPrevendQuery}`);
            
            if (!prevendResponse.transactionId && prevendResponse.data?.transactionId) {
                prevendResponse.transactionId = prevendResponse.data.transactionId;
            }
            if (!prevendResponse.amountDue && prevendResponse.data?.amountDue) {
                prevendResponse.amountDue = prevendResponse.data.amountDue;
            }
            
            const prevendLatency = Date.now() - prevendStartTime;
            
            // Now do purchase
            const purchaseData = {
                requestId: `LOAD_TEST_${Date.now()}_${++this.requestCounter}_UTIL_PURCHASE`,
                prevendTransactionId: prevendResponse.transactionId || prevendResponse.data?.transactionId,
                tenderType: 'CreditCard',
                tenderPan: '4111111111111111' // Test card
            };
            
            const purchaseStartTime = Date.now();
            const purchaseResponse = await this.authService.makeAuthenticatedRequest('POST', '/utility/purchase', purchaseData);
            const purchaseLatency = Date.now() - purchaseStartTime;
            const totalLatency = prevendLatency + purchaseLatency;
            
            return { success: true, latency: totalLatency, response: purchaseResponse };
        } catch (error) {
            const totalLatency = Date.now() - prevendStartTime;
            return { success: false, latency: totalLatency, error };
        }
    }

    async executeMixed() {
        const types = ['airtime-pinless', 'airtime-pinned', 'data-pinless', 'data-pinned', 'voucher', 'utility'];
        const randomType = types[Math.floor(Math.random() * types.length)];
        return this.execute(randomType);
    }

    async execute(type) {
        switch (type) {
            case 'airtime-pinless':
                return this.executeAirtimePinless();
            case 'airtime-pinned':
                return this.executeAirtimePinned();
            case 'data-pinless':
                return this.executeDataPinless();
            case 'data-pinned':
                return this.executeDataPinned();
            case 'voucher':
                return this.executeVoucher();
            case 'utility':
                return this.executeUtility();
            case 'mixed':
                return this.executeMixed();
            default:
                throw new Error(`Unknown purchase type: ${type}`);
        }
    }
}

// Load test runner
class LoadTestRunner {
    constructor(authService, testProducts, metrics) {
        this.authService = authService;
        this.handlers = new PurchaseHandlers(authService, testProducts);
        this.metrics = metrics;
        this.running = false;
        this.transactionCount = 0;
        this.pendingTransactions = 0;
    }

    async run() {
        logSection('MOBILEMART HIGH-VOLUME LOAD TEST');
        logWarning(`⚠️  WARNING: This will generate ${options.tps * options.duration} transactions!`);
        logWarning(`⚠️  Target TPS: ${options.tps}, Duration: ${options.duration}s, Type: ${options.type}`);
        logInfo(`Press Ctrl+C to stop early\n`);
        
        // Determine which types to test
        let typesToTest = [];
        if (options.type === 'all') {
            typesToTest = ['airtime-pinless', 'airtime-pinned', 'data-pinless', 'data-pinned', 'voucher', 'utility'];
        } else if (options.type === 'mixed') {
            typesToTest = ['mixed'];
        } else {
            typesToTest = [options.type];
        }
        
        // Warmup period
        if (options.warmup > 0) {
            logInfo(`Warmup period: ${options.warmup}s`);
            await this.warmup(typesToTest);
        }
        
        // Start load test
        this.running = true;
        this.metrics.start();
        
        const endTime = Date.now() + (options.duration * 1000);
        
        logInfo(`Starting load test at ${new Date().toISOString()}`);
        logInfo(`Target: ${options.tps} TPS for ${options.duration}s\n`);
        
        // Calculate scheduling parameters
        // For high TPS (1000+), we need to batch transactions
        const scheduleInterval = Math.max(10, Math.floor(1000 / Math.min(options.tps, 100))); // Max 100 TPS per scheduler
        const numSchedulers = Math.ceil(options.tps / 100); // Multiple schedulers for high TPS
        const tpsPerScheduler = options.tps / numSchedulers;
        const transactionsPerTick = Math.ceil(tpsPerScheduler * (scheduleInterval / 1000));
        
        logInfo(`Starting ${numSchedulers} scheduler(s): ${scheduleInterval}ms interval, ${transactionsPerTick} transaction(s) per tick`);
        
        // Progress reporting
        const progressInterval = setInterval(() => {
            if (!this.running) {
                clearInterval(progressInterval);
                return;
            }
            const elapsed = (Date.now() - this.metrics.startTime) / 1000;
            if (elapsed > 0) {
                const currentTPS = (this.transactionCount / elapsed).toFixed(2);
                const stats = this.metrics.getStats();
                const successRate = stats.successRate || 0;
                const avgLatency = stats.latency?.avg || 0;
                logInfo(`Progress: ${this.transactionCount} transactions | TPS: ${currentTPS} | Success: ${successRate}% | Avg Latency: ${avgLatency}ms`);
            }
        }, 5000); // Report every 5 seconds
        
        // Schedule transactions function
        const scheduleNext = () => {
            if (!this.running || Date.now() >= endTime || this.transactionCount >= options.maxTransactions) {
                return;
            }
            
            // Execute transactions for this tick
            for (let i = 0; i < transactionsPerTick; i++) {
                if (!this.running || Date.now() >= endTime || this.transactionCount >= options.maxTransactions) {
                    break;
                }
                
                const type = options.type === 'mixed' 
                    ? 'mixed' 
                    : typesToTest[this.transactionCount % typesToTest.length];
                
                // Execute transaction asynchronously (don't wait)
                this.executeTransaction(type, typesToTest).catch(err => {
                    // Errors are handled in executeTransaction
                });
            }
        };
        
        // Start multiple schedulers
        const scheduleIds = [];
        for (let i = 0; i < numSchedulers; i++) {
            // Stagger scheduler start times slightly
            setTimeout(() => {
                const id = setInterval(scheduleNext, scheduleInterval);
                scheduleIds.push(id);
            }, i * (scheduleInterval / numSchedulers));
        }
        
        // Wait for test duration
        await new Promise(resolve => setTimeout(resolve, options.duration * 1000));
        
        // Cleanup schedulers
        scheduleIds.forEach(id => clearInterval(id));
        clearInterval(progressInterval);
        
        // Wait for all pending transactions to complete (with timeout)
        logInfo('\nWaiting for pending transactions to complete...');
        const pendingTimeout = 60000; // 60 seconds max wait
        const waitStart = Date.now();
        while (this.pendingTransactions > 0 && (Date.now() - waitStart) < pendingTimeout) {
            await new Promise(resolve => setTimeout(resolve, 500));
            if (this.pendingTransactions > 0) {
                process.stdout.write(`\rPending transactions: ${this.pendingTransactions}  `);
            }
        }
        process.stdout.write('\n');
        
        this.running = false;
        this.metrics.stop();
        
        logInfo(`\nLoad test completed at ${new Date().toISOString()}`);
        logInfo(`Total transactions: ${this.transactionCount}`);
    }

    async executeTransaction(type, typesToTest) {
        this.pendingTransactions = (this.pendingTransactions || 0) + 1;
        const startTime = Date.now();
        
        try {
            const result = await this.handlers.execute(type);
            this.metrics.recordTransaction(type, result.success, result.latency, result.error);
            this.transactionCount++;
        } catch (error) {
            const latency = Date.now() - startTime;
            this.metrics.recordTransaction(type, false, latency, error);
            this.transactionCount++;
        } finally {
            this.pendingTransactions = Math.max(0, (this.pendingTransactions || 0) - 1);
        }
    }

    async warmup(typesToTest) {
        logInfo('Warming up...');
        const warmupEndTime = Date.now() + (options.warmup * 1000);
        const warmupPromises = [];
        
        for (let i = 0; i < Math.min(typesToTest.length, 6); i++) {
            const type = typesToTest[i] || typesToTest[0];
            warmupPromises.push(
                this.handlers.execute(type).catch(() => {
                    // Ignore warmup errors
                })
            );
        }
        
        await Promise.all(warmupPromises);
        await new Promise(resolve => setTimeout(resolve, Math.max(0, warmupEndTime - Date.now())));
        logSuccess('Warmup complete\n');
    }

    stop() {
        this.running = false;
    }
}

// Main execution
async function main() {
    try {
        // Initialize auth service
        const authService = new MobileMartAuthService();
        
        // Verify authentication
        logSection('Authentication');
        try {
            const token = await authService.getAccessToken();
            logSuccess(`Authentication successful! Token: ${token.substring(0, 20)}...`);
        } catch (error) {
            logError(`Authentication failed: ${error.message}`);
            process.exit(1);
        }
        
        // Fetch test products
        logSection('Fetching Test Products');
        const testProducts = {};
        
        try {
            // Airtime products
            const airtimeProducts = await authService.makeAuthenticatedRequest('GET', '/airtime/products');
            if (Array.isArray(airtimeProducts) && airtimeProducts.length > 0) {
                const pinlessAirtime = airtimeProducts.filter(p => p.pinned === false);
                const pinnedAirtime = airtimeProducts.filter(p => p.pinned === true);
                testProducts.airtime = {
                    pinless: pinlessAirtime.length > 0 ? pinlessAirtime[0] : null,
                    pinned: pinnedAirtime.length > 0 ? pinnedAirtime[0] : null
                };
                logSuccess(`Found ${airtimeProducts.length} airtime products`);
            }
            
            // Data products
            const dataProducts = await authService.makeAuthenticatedRequest('GET', '/data/products');
            if (Array.isArray(dataProducts) && dataProducts.length > 0) {
                const pinlessData = dataProducts.filter(p => p.pinned === false);
                const pinnedData = dataProducts.filter(p => p.pinned === true);
                testProducts.data = {
                    pinless: pinlessData.length > 0 ? pinlessData[0] : null,
                    pinned: pinnedData.length > 0 ? pinnedData[0] : null
                };
                logSuccess(`Found ${dataProducts.length} data products`);
            }
            
            // Voucher products
            const voucherProducts = await authService.makeAuthenticatedRequest('GET', '/voucher/products');
            if (Array.isArray(voucherProducts) && voucherProducts.length > 0) {
                testProducts.voucher = voucherProducts[0];
                logSuccess(`Found ${voucherProducts.length} voucher products`);
            }
            
            // Utility products
            const utilityProducts = await authService.makeAuthenticatedRequest('GET', '/utility/products');
            if (Array.isArray(utilityProducts) && utilityProducts.length > 0) {
                testProducts.utility = utilityProducts[0];
                logSuccess(`Found ${utilityProducts.length} utility products`);
            }
        } catch (error) {
            logError(`Error fetching products: ${error.message}`);
            process.exit(1);
        }
        
        // Validate test products based on type
        if (options.type !== 'mixed' && options.type !== 'all') {
            const requiredProducts = {
                'airtime-pinless': testProducts.airtime?.pinless,
                'airtime-pinned': testProducts.airtime?.pinned,
                'data-pinless': testProducts.data?.pinless,
                'data-pinned': testProducts.data?.pinned,
                'voucher': testProducts.voucher,
                'utility': testProducts.utility
            };
            
            if (!requiredProducts[options.type]) {
                logError(`Required product for type '${options.type}' is not available`);
                process.exit(1);
            }
        }
        
        // Initialize metrics and runner
        const metrics = new MetricsTracker();
        const runner = new LoadTestRunner(authService, testProducts, metrics);
        
        // Handle graceful shutdown
        process.on('SIGINT', () => {
            logWarning('\n\nStopping load test...');
            runner.stop();
        });
        
        // Run load test
        await runner.run();
        
        // Print results
        metrics.printReport();
        
    } catch (error) {
        logError(`Fatal error: ${error.message}`);
        console.error(error);
        process.exit(1);
    }
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { LoadTestRunner, MetricsTracker, PurchaseHandlers };

