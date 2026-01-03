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
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL from db-connection-helper before loading models
// This ensures proper proxy detection and password handling
process.env.DATABASE_URL = getUATDatabaseURL();

const referralPayoutService = require('../services/referralPayoutService');

async function main() {
  try {
    console.log('💰 Starting daily referral payout processing...');
    console.log(`⏰ Time: ${new Date().toISOString()}`);
    
    // Add timeout to prevent hanging forever
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Payout processing timed out after 30 seconds')), 30000);
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

