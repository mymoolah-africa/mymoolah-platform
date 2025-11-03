#!/usr/bin/env node

/**
 * Check User KYC Status via API
 * Queries the backend API running on localhost:3001
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api/v1';

// Normalize South African phone number
function normalizeSAMobileNumber(phoneNumber) {
  if (!phoneNumber) return null;
  
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  if (cleaned.startsWith('27')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('+27')) {
    cleaned = '0' + cleaned.substring(3);
  } else if (!cleaned.startsWith('0')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}

async function checkUserViaAPI(phoneNumber) {
  try {
    const normalizedPhone = normalizeSAMobileNumber(phoneNumber);
    console.log(`\n🔍 Checking user with phone number: ${normalizedPhone}`);
    console.log('='.repeat(60));
    
    // First, try to get all users and find by phone number
    // Or we need to login first, then check KYC status
    
    console.log('\n📋 Note: This script queries via API.');
    console.log('For full KYC details, you may need to:');
    console.log('1. Login as the user, or');
    console.log('2. Use admin endpoints if available, or');
    console.log('3. Query database directly with correct credentials\n');
    
    // Try to get user info via admin endpoint if available
    try {
      const response = await axios.get(`${API_BASE_URL}/users`, {
        timeout: 5000
      });
      
      if (response.data && response.data.data && response.data.data.users) {
        const user = response.data.data.users.find(u => 
          normalizeSAMobileNumber(u.phoneNumber) === normalizedPhone
        );
        
        if (user) {
          console.log('\n✅ USER FOUND VIA API');
          console.log('─'.repeat(60));
          console.log(`Name: ${user.firstName} ${user.lastName}`);
          console.log(`Email: ${user.email}`);
          console.log(`Phone: ${user.phoneNumber}`);
          console.log(`User ID: ${user.id}`);
          console.log(`Status: ${user.status}`);
          console.log(`KYC Status: ${user.kycStatus || 'not_set'}`);
          
          if (user.wallet) {
            console.log(`Wallet ID: ${user.wallet.walletId}`);
            console.log(`Wallet Balance: R${(user.wallet.balance / 100).toFixed(2)}`);
            console.log(`Wallet Status: ${user.wallet.status}`);
          }
          
          return;
        }
      }
    } catch (error) {
      console.log('⚠️  Could not fetch users list (may require authentication)');
    }
    
    console.log('\n❌ USER NOT FOUND OR API ENDPOINT REQUIRES AUTHENTICATION');
    console.log('Please check:');
    console.log('1. User exists in database');
    console.log('2. Backend API is running correctly');
    console.log('3. Admin authentication if required');
    
  } catch (error) {
    console.error('\n❌ Error checking user:', error.message);
    if (error.response) {
      console.error('API Response:', error.response.status, error.response.data);
    }
  }
}

// Get phone numbers from command line
const phoneNumbers = process.argv.slice(2).filter(arg => !arg.startsWith('postgres://'));

if (phoneNumbers.length === 0) {
  console.error('Usage: node scripts/check-user-kyc-api.js <phone_number1> [phone_number2] ...');
  console.error('Example: node scripts/check-user-kyc-api.js 0720213994 0825571055 0784560585');
  process.exit(1);
}

// Check all provided phone numbers
(async () => {
  for (const phoneNumber of phoneNumbers) {
    await checkUserViaAPI(phoneNumber);
    console.log('\n');
  }
})();

