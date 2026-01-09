#!/usr/bin/env node

/**
 * Cleanup Expired OTPs Script
 * 
 * Removes expired OTP records to maintain database hygiene
 * Should be run daily via cron job
 * 
 * Usage:
 *   node scripts/cleanup-expired-otps.js
 * 
 * Cron example (run daily at 3:00 AM SAST):
 *   0 3 * * * cd /path/to/mymoolah && node scripts/cleanup-expired-otps.js >> /var/log/otp-cleanup.log 2>&1
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-30
 */

require('dotenv').config();

const otpService = require('../services/otpService');

async function main() {
  console.log('🧹 Starting OTP cleanup...');
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);

  try {
    // Get stats before cleanup
    const statsBefore = await otpService.getStats();
    console.log(`📊 Before cleanup:`);
    console.log(`   - Pending OTPs: ${statsBefore.pendingOtps}`);
    console.log(`   - Verified OTPs: ${statsBefore.verifiedOtps}`);
    console.log(`   - Last hour created: ${statsBefore.lastHour.created}`);
    console.log(`   - Last hour verified: ${statsBefore.lastHour.verified}`);

    // Run cleanup
    const deletedCount = await otpService.cleanupExpiredOtps();

    // Get stats after cleanup
    const statsAfter = await otpService.getStats();
    
    console.log(`\n✅ Cleanup complete:`);
    console.log(`   - Records deleted: ${deletedCount}`);
    console.log(`   - Pending OTPs remaining: ${statsAfter.pendingOtps}`);
    console.log(`   - Verified OTPs remaining: ${statsAfter.verifiedOtps}`);

    // Close database connection
    const { sequelize } = require('../models');
    await sequelize.close();

    console.log('\n✅ OTP cleanup completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ OTP cleanup failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();




