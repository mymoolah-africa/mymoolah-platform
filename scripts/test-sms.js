#!/usr/bin/env node

/**
 * SMS Test Utility (diagnostic tool)
 *
 * Sends a test SMS via the production `services/smsService.js` code path
 * — same auth, same endpoint, same payload format as the live system.
 * Useful for verifying MyMobileAPI account health, sender ID whitelisting,
 * credential rotation, and delivery to specific phone numbers.
 *
 * Prints the full gateway response (cost, remainingBalance, eventId) so
 * failed deliveries can be correlated with MyMobileAPI support tickets.
 *
 * Usage:
 *   node scripts/test-sms.js <PHONE_E164> [message]
 *   node scripts/test-sms.js <PHONE_E164> --otp
 *   node scripts/test-sms.js <PHONE_E164> --referral [--lang=en]
 *
 * Examples:
 *   # Custom text (quickest smoke test)
 *   node scripts/test-sms.js +27825571055 'Hello from UAT diagnostic'
 *
 *   # Default diagnostic ping (timestamp + env included)
 *   node scripts/test-sms.js +27825571055
 *
 *   # Simulate a password-reset OTP (uses real template)
 *   node scripts/test-sms.js +27825571055 --otp
 *
 *   # Simulate a referral invite
 *   node scripts/test-sms.js +27825571055 --referral --lang=af
 *
 * Exit codes:
 *   0  SMS accepted by gateway (eventId returned)
 *   1  Invalid arguments
 *   2  Missing MyMobileAPI credentials in .env
 *   3  Gateway rejected the request (auth failure, bad number, etc.)
 *   4  Network / timeout error
 */

require('dotenv').config();

function usage() {
  console.error('Usage: node scripts/test-sms.js <PHONE_E164> [message | --otp | --referral]');
  console.error('       node scripts/test-sms.js +27825571055');
  console.error('       node scripts/test-sms.js +27825571055 "Custom test message"');
  console.error('       node scripts/test-sms.js +27825571055 --otp');
  console.error('       node scripts/test-sms.js +27825571055 --referral --lang=en');
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) usage();

  const phoneNumber = args[0];
  if (!/^\+\d{10,15}$/.test(phoneNumber)) {
    console.error(`❌ Phone number must be E.164 format (e.g. +27825571055). Got: ${phoneNumber}`);
    process.exit(1);
  }

  // Parse mode from remaining args
  const rest = args.slice(1);
  const isOtp = rest.includes('--otp');
  const isReferral = rest.includes('--referral');
  const langArg = rest.find(a => a.startsWith('--lang='));
  const lang = langArg ? langArg.split('=')[1] : 'en';
  const customMessage = rest.find(a => !a.startsWith('--'));

  console.log('');
  console.log('📱 SMS Test Utility');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Recipient:   ${phoneNumber}`);
  console.log(`   Endpoint:    ${process.env.MYMOBILEAPI_URL || 'https://rest.mymobileapi.com'}${process.env.MYMOBILEAPI_PATH || '/bulkmessages'}`);
  console.log(`   Username:    ${process.env.MYMOBILEAPI_USERNAME ? process.env.MYMOBILEAPI_USERNAME.substring(0, 4) + '***' : '(NOT SET)'}`);
  console.log(`   Sender ID:   ${process.env.MYMOBILEAPI_SENDER_ID || 'MyMoolah (default)'}`);
  console.log(`   Timestamp:   ${new Date().toISOString()}`);
  console.log(`   Env:         ${process.env.NODE_ENV || 'not set'}`);

  if (!process.env.MYMOBILEAPI_USERNAME || !process.env.MYMOBILEAPI_PASSWORD) {
    console.error('');
    console.error('❌ MYMOBILEAPI_USERNAME and/or MYMOBILEAPI_PASSWORD not set in .env');
    console.error('   Cannot proceed. Fix your environment config and retry.');
    process.exit(2);
  }

  // Defer require until after env check so smsService doesn't log its warn-banner twice
  const smsService = require('../services/smsService');

  let sendPromise;
  let label;

  try {
    if (isOtp) {
      const fakeOtp = Math.floor(100000 + Math.random() * 900000).toString();
      label = `password-reset OTP (code: ${fakeOtp}) — TEST ONLY, not stored in DB`;
      sendPromise = smsService.sendPasswordResetOtp(phoneNumber, fakeOtp, lang);
    } else if (isReferral) {
      label = `referral invite from "Andre Test" (lang: ${lang})`;
      sendPromise = smsService.sendReferralInvite('Andre Test', phoneNumber, 'TEST-DIAG', lang);
    } else {
      const message = customMessage ||
        `MyMoolah diagnostic test @ ${new Date().toISOString().substring(11, 19)} UTC. Ignore if received. Ref: DIAG-${Date.now()}`;
      label = `custom message (${message.length} chars)`;
      sendPromise = smsService.sendSms(phoneNumber, message);
    }

    console.log(`   Message:     ${label}`);
    console.log('');
    console.log('📤 Dispatching...');
    console.log('');

    const result = await sendPromise;

    console.log('');
    console.log('✅ Gateway accepted the message.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Success:     ${result.success}`);
    console.log(`   Message ID:  ${result.messageId || '(not returned)'}`);
    console.log(`   Status:      ${result.status}`);
    console.log(`   Phone:       ${result.phoneNumber}`);
    console.log(`   Sent at:     ${result.timestamp}`);
    console.log('');
    console.log('ℹ️  NOTE: Gateway acceptance ≠ delivery. Watch your phone for');
    console.log('   ~30 seconds. If the SMS does not arrive, the problem is');
    console.log('   downstream of MyMobileAPI (account mode, sender whitelist,');
    console.log('   carrier filter). Use the Message ID above when contacting');
    console.log('   MyMobileAPI support for delivery-status lookup.');
    console.log('');
    process.exit(0);

  } catch (err) {
    console.error('');
    console.error('❌ SMS dispatch FAILED.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error(`   Error: ${err.message}`);

    // Classify failure for exit code
    const msg = err.message || '';
    if (/ENOTFOUND|ETIMEDOUT|ECONNREFUSED|ECONNRESET|timeout/i.test(msg)) {
      console.error('   Type:  Network / timeout');
      console.error('   Check: Is the Codespaces container online? Is api.mymobileapi.com reachable?');
      process.exit(4);
    }
    if (/401|403|unauthori[sz]ed|credentials/i.test(msg)) {
      console.error('   Type:  Authentication failure');
      console.error('   Check: Are MYMOBILEAPI_USERNAME / MYMOBILEAPI_PASSWORD correct in .env?');
      process.exit(3);
    }
    console.error('   Type:  Gateway rejection');
    console.error('   Check: Phone number format, sender ID whitelist, account balance.');
    process.exit(3);
  }
}

main().catch((err) => {
  console.error('❌ Unexpected error:', err);
  process.exit(10);
});
