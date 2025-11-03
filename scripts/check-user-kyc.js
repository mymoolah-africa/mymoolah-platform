#!/usr/bin/env node

/**
 * Check User KYC Status Script
 * Checks if a user exists and their KYC status
 * 
 * Usage:
 *   node scripts/check-user-kyc.js <phone_number> [database_url]
 * 
 * Examples:
 *   node scripts/check-user-kyc.js 0720213994
 *   node scripts/check-user-kyc.js 0825571055
 *   node scripts/check-user-kyc.js 0784560585 "postgres://user:pass@host:port/db"
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Allow custom database URL from command line
const customDbUrl = process.argv[3];
if (customDbUrl) {
  process.env.DATABASE_URL = customDbUrl;
  console.log('📋 Using custom database URL from command line argument');
}

const models = require('../models');

// Normalize South African phone number
function normalizeSAMobileNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // Handle different formats
  if (cleaned.startsWith('27')) {
    // Format: 27720213994 -> 0720213994
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('+27')) {
    // Format: +27720213994 -> 0720213994
    cleaned = '0' + cleaned.substring(3);
  } else if (!cleaned.startsWith('0')) {
    // Format: 720213994 -> 0720213994
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

async function checkUserKYC(phoneNumber) {
  try {
    const normalizedPhone = normalizeSAMobileNumber(phoneNumber);
    console.log(`\n🔍 Checking user with phone number: ${normalizedPhone}`);
    console.log('=' .repeat(60));
    
    const { User, Wallet, Kyc } = models;
    
    // Find user by phone number
    const user = await User.findOne({
      where: { phoneNumber: normalizedPhone },
      include: [
        {
          model: Wallet,
          as: 'wallet',
          attributes: ['walletId', 'balance', 'currency', 'status']
        },
        {
          model: Kyc,
          as: 'kyc',
          attributes: ['id', 'documentType', 'documentNumber', 'documentImageUrl', 'status', 'submittedAt', 'reviewedAt', 'reviewerNotes']
        }
      ]
    });
    
    if (!user) {
      console.log('❌ USER NOT FOUND');
      console.log(`Phone number ${normalizedPhone} does not exist in the database.`);
      return;
    }
    
    console.log('\n✅ USER FOUND');
    console.log('─'.repeat(60));
    console.log(`Name: ${user.firstName} ${user.lastName}`);
    console.log(`Email: ${user.email}`);
    console.log(`Phone Number: ${user.phoneNumber}`);
    console.log(`Account Number: ${user.accountNumber || 'N/A'}`);
    console.log(`User ID: ${user.id}`);
    console.log(`Status: ${user.status}`);
    console.log(`Created At: ${user.createdAt}`);
    
    // Wallet Information
    if (user.wallet) {
      console.log('\n💰 WALLET INFORMATION');
      console.log('─'.repeat(60));
      console.log(`Wallet ID: ${user.wallet.walletId}`);
      console.log(`Balance: R${(user.wallet.balance / 100).toFixed(2)}`);
      console.log(`Currency: ${user.wallet.currency}`);
      console.log(`Wallet Status: ${user.wallet.status}`);
    } else {
      console.log('\n⚠️  WALLET NOT FOUND');
      console.log('User does not have a wallet associated.');
    }
    
    // KYC Information
    console.log('\n🆔 KYC STATUS');
    console.log('─'.repeat(60));
    console.log(`KYC Status: ${user.kycStatus || 'not_set'}`);
    console.log(`ID Verified: ${user.idVerified ? 'Yes' : 'No'}`);
    console.log(`KYC Verified At: ${user.kycVerifiedAt || 'Not verified'}`);
    
    if (user.kyc) {
      console.log('\n📄 KYC DOCUMENT INFORMATION');
      console.log('─'.repeat(60));
      console.log(`Document Type: ${user.kyc.documentType}`);
      console.log(`Document Number: ${user.kyc.documentNumber || 'N/A'}`);
      console.log(`Document Status: ${user.kyc.status}`);
      console.log(`Document Image URL: ${user.kyc.documentImageUrl ? '✅ Uploaded' : '❌ Not uploaded'}`);
      console.log(`Submitted At: ${user.kyc.submittedAt || 'N/A'}`);
      console.log(`Reviewed At: ${user.kyc.reviewedAt || 'Not reviewed'}`);
      console.log(`Reviewed By: ${user.kyc.reviewedBy || 'N/A'}`);
      
      if (user.kyc.reviewerNotes) {
        console.log(`Reviewer Notes: ${user.kyc.reviewerNotes}`);
      }
      
      if (user.kyc.status === 'rejected' && user.kyc.rejectionReason) {
        console.log(`Rejection Reason: ${user.kyc.rejectionReason}`);
      }
    } else {
      console.log('\n⚠️  NO KYC DOCUMENTS FOUND');
      console.log('User has not uploaded any KYC documents yet.');
    }
    
    // Summary
    console.log('\n📊 SUMMARY');
    console.log('─'.repeat(60));
    const canTransact = 
      user.status === 'active' &&
      user.kycStatus === 'verified' &&
      user.idVerified === true &&
      user.wallet &&
      user.wallet.status === 'active';
    
    if (canTransact) {
      console.log('✅ USER CAN TRANSACT');
      console.log('   - User status: Active');
      console.log('   - KYC status: Verified');
      console.log('   - ID verified: Yes');
      console.log('   - Wallet: Active');
    } else {
      console.log('❌ USER CANNOT TRANSACT YET');
      if (user.status !== 'active') {
        console.log(`   - User status: ${user.status} (needs to be 'active')`);
      }
      if (user.kycStatus !== 'verified') {
        console.log(`   - KYC status: ${user.kycStatus || 'not_set'} (needs to be 'verified')`);
      }
      if (!user.idVerified) {
        console.log('   - ID verified: No (needs to be Yes)');
      }
      if (!user.wallet) {
        console.log('   - Wallet: Missing');
      } else if (user.wallet.status !== 'active') {
        console.log(`   - Wallet status: ${user.wallet.status} (needs to be 'active')`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
  } catch (error) {
    console.error('❌ Error checking user KYC:', error);
    process.exit(1);
  } finally {
    // Close database connection
    if (models.sequelize) {
      await models.sequelize.close();
    }
  }
}

// Get phone number from command line argument
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Usage: node scripts/check-user-kyc.js <phone_number>');
  console.error('Example: node scripts/check-user-kyc.js 0720213994');
  process.exit(1);
}

checkUserKYC(phoneNumber);

