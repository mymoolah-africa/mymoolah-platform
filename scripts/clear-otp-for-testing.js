#!/usr/bin/env node

/**
 * Clear OTP records for a specific phone number (for testing only)
 * 
 * Usage: node scripts/clear-otp-for-testing.js +27825571055
 * 
 * WARNING: This is for testing/development only. Do not use in production.
 */

require('dotenv').config();

const { Op } = require('sequelize');
const { sequelize } = require('../models');
const { OtpVerification } = require('../models');

async function clearOtpsForPhone(phoneNumber) {
  try {
    console.log(`🧹 Clearing OTP records for: ${phoneNumber}`);
    
    // Normalize phone number to E.164 format
    let normalizedPhone = phoneNumber;
    if (!phoneNumber.startsWith('+')) {
      if (phoneNumber.startsWith('0')) {
        normalizedPhone = '+27' + phoneNumber.slice(1);
      } else if (phoneNumber.startsWith('27')) {
        normalizedPhone = '+' + phoneNumber;
      } else {
        normalizedPhone = '+27' + phoneNumber;
      }
    }
    
    console.log(`📱 Normalized phone: ${normalizedPhone}`);
    
    // Count existing records
    const countBefore = await OtpVerification.count({
      where: {
        phoneNumber: normalizedPhone,
        type: 'password_reset'
      }
    });
    
    console.log(`📊 Found ${countBefore} OTP record(s) for this phone number`);
    
    if (countBefore === 0) {
      console.log('✅ No OTP records to clear');
      return;
    }
    
    // Delete all OTP records for this phone number
    const deleted = await OtpVerification.destroy({
      where: {
        phoneNumber: normalizedPhone,
        type: 'password_reset'
      }
    });
    
    console.log(`✅ Deleted ${deleted} OTP record(s)`);
    console.log(`\n🎉 You can now request a new OTP for ${normalizedPhone}`);
    
  } catch (error) {
    console.error('❌ Error clearing OTP records:', error.message);
    throw error;
  }
}

async function main() {
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.error('❌ Please provide a phone number');
    console.log('Usage: node scripts/clear-otp-for-testing.js <phone_number>');
    console.log('Example: node scripts/clear-otp-for-testing.js 0825571055');
    process.exit(1);
  }
  
  try {
    await clearOtpsForPhone(phoneNumber);
    
    // Close database connection
    await sequelize.close();
    
    console.log('\n✅ Done!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error.message);
    process.exit(1);
  }
}

main();

