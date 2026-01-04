#!/usr/bin/env node

/**
 * Daily Referral Payout Processor
 * 
 * Cron job script to process daily referral earnings payouts
 * Runs at 2:00 AM SAST daily
 * 
 * Usage:
 *   node scripts/process-referral-payouts.js
 * 
 * Cron schedule (2:00 AM SAST):
 *   0 2 * * * /usr/bin/node /path/to/scripts/process-referral-payouts.js
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

require('dotenv').config();
// CRITICAL: Use db-connection-helper for UAT database connection
// NEVER create custom database connections - always use the helper
const { getUATDatabaseURL, closeAll, detectProxyPort, CONFIG } = require('./db-connection-helper');

// Check if proxy is running before proceeding
try {
  const proxyPort = detectProxyPort(CONFIG.UAT.PROXY_PORTS, 'UAT');
  console.log(`✅ UAT proxy detected on port ${proxyPort}`);
} catch (error) {
  console.error('❌ Proxy not running:', error.message);
  console.error('💡 Start proxy first: ./scripts/ensure-proxies-running.sh');
  console.error('   Or use: ./scripts/one-click-restart-and-start.sh');
  process.exit(1);
}

// Set DATABASE_URL from db-connection-helper before loading models
// This ensures proper proxy detection and password handling
try {
  process.env.DATABASE_URL = getUATDatabaseURL();
  console.log(`✅ Database URL configured via proxy`);
} catch (error) {
  console.error('❌ Failed to get database URL:', error.message);
  process.exit(1);
}

const referralPayoutService = require('../services/referralPayoutService');

async function main() {
  try {
    console.log('💰 Starting daily referral payout processing...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Add timeout to prevent hanging forever (5 minutes for database operations)
    const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Payout processing timed out after ${TIMEOUT_MS / 1000} seconds`)), TIMEOUT_MS);
    });
    
    const result = await Promise.race([
      referralPayoutService.processDailyPayouts(),
      timeoutPromise
    ]);
    
    console.log('✅ Payout processing complete:');
    console.log(`   Batch ID: ${result.batchId}`);
    console.log(`   Users paid: ${result.totalUsers}`);
    console.log(`   Total amount: R${result.totalAmountRand.toFixed(2)}`);
    console.log(`   Earnings processed: ${result.totalEarningsCount}`);
    
    if (result.failedUsers > 0) {
      console.warn(`⚠️  ${result.failedUsers} users failed to process`);
      if (result.failedDetails) {
        result.failedDetails.forEach(failure => {
          console.warn(`   - User ${failure.userId}: ${failure.reason}`);
        });
      }
    }
    
    // Cleanup database connections
    await closeAll();
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Payout processing failed:', error);
    console.error('Stack:', error.stack);
    
    // Cleanup database connections even on error
    try {
      await closeAll();
    } catch (cleanupError) {
      console.error('⚠️  Error during cleanup:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { main };

