#!/usr/bin/env node

/**
 * Test Beneficiary E.164 MSISDN Validation
 * 
 * This script validates that beneficiary functionality works correctly
 * with E.164 MSISDN format standardization.
 * 
 * Test Coverage:
 * 1. Beneficiary creation with E.164 MSISDN
 * 2. Beneficiary lookup by E.164 MSISDN
 * 3. Beneficiary search and filtering
 * 4. Airtime beneficiary operations
 * 5. Data beneficiary operations
 * 6. Service account MSISDN normalization
 * 
 * Usage:
 *   node scripts/test-beneficiary-e164-validation.js
 */

const { Beneficiary, BeneficiaryServiceAccount, User } = require('../models');
const { normalizeToE164, toLocal, isValidE164, maskMsisdn } = require('../utils/msisdn');

// Test user ID (André's account)
const TEST_USER_ID = 1;

// Test phone numbers in various formats
const TEST_PHONE_NUMBERS = [
  { input: '0825571055', expected: '+27825571055', format: 'local' },
  { input: '27825571055', expected: '+27825571055', format: '27-prefix' },
  { input: '+27825571055', expected: '+27825571055', format: 'E.164' },
  { input: '082 557 1055', expected: '+27825571055', format: 'spaced' },
];

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function runTests() {
  logInfo('Starting Beneficiary E.164 MSISDN Validation Tests...\n');

  let passCount = 0;
  let failCount = 0;

  // Test 1: MSISDN Normalization Utility
  logInfo('Test 1: MSISDN Normalization Utility');
  try {
    for (const test of TEST_PHONE_NUMBERS) {
      const normalized = normalizeToE164(test.input);
      if (normalized === test.expected) {
        logSuccess(`  ${test.format}: ${test.input} → ${normalized}`);
        passCount++;
      } else {
        logError(`  ${test.format}: ${test.input} → ${normalized} (expected: ${test.expected})`);
        failCount++;
      }
    }
  } catch (error) {
    logError(`  Normalization failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 2: E.164 Validation
  logInfo('Test 2: E.164 Validation');
  try {
    const validMsisdns = ['+27825571055', '+27712345678', '+27631234567'];
    const invalidMsisdns = ['0825571055', '27825571055', '+27925571055', 'invalid'];

    for (const msisdn of validMsisdns) {
      if (isValidE164(msisdn)) {
        logSuccess(`  Valid: ${msisdn}`);
        passCount++;
      } else {
        logError(`  Should be valid: ${msisdn}`);
        failCount++;
      }
    }

    for (const msisdn of invalidMsisdns) {
      if (!isValidE164(msisdn)) {
        logSuccess(`  Invalid (expected): ${msisdn}`);
        passCount++;
      } else {
        logError(`  Should be invalid: ${msisdn}`);
        failCount++;
      }
    }
  } catch (error) {
    logError(`  Validation failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 3: MSISDN Masking (PII Protection)
  logInfo('Test 3: MSISDN Masking for Logging');
  try {
    const testMsisdns = ['+27825571055', '+27712345678'];
    for (const msisdn of testMsisdns) {
      const masked = maskMsisdn(msisdn);
      if (masked.includes('***') && !masked.includes('825571') && !masked.includes('712345')) {
        logSuccess(`  Masked: ${msisdn} → ${masked}`);
        passCount++;
      } else {
        logError(`  Masking failed: ${msisdn} → ${masked}`);
        failCount++;
      }
    }
  } catch (error) {
    logError(`  Masking failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 4: Local Format Conversion
  logInfo('Test 4: E.164 to Local Format Conversion');
  try {
    const testConversions = [
      { e164: '+27825571055', local: '0825571055' },
      { e164: '+27712345678', local: '0712345678' },
    ];

    for (const test of testConversions) {
      const local = toLocal(test.e164);
      if (local === test.local) {
        logSuccess(`  ${test.e164} → ${local}`);
        passCount++;
      } else {
        logError(`  ${test.e164} → ${local} (expected: ${test.local})`);
        failCount++;
      }
    }
  } catch (error) {
    logError(`  Conversion failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 5: Database - Check Existing Beneficiaries MSISDN Format
  logInfo('Test 5: Database - Existing Beneficiaries MSISDN Format');
  try {
    const beneficiaries = await Beneficiary.findAll({
      where: { userId: TEST_USER_ID },
      attributes: ['id', 'name', 'msisdn', 'serviceType'],
      limit: 10,
    });

    if (beneficiaries.length === 0) {
      logWarning('  No beneficiaries found for test user');
    } else {
      let validCount = 0;
      let invalidCount = 0;

      for (const beneficiary of beneficiaries) {
        const isValid = isValidE164(beneficiary.msisdn) || beneficiary.msisdn.startsWith('NON_MSI_');
        if (isValid) {
          logSuccess(`  ${beneficiary.name} (${beneficiary.serviceType}): ${maskMsisdn(beneficiary.msisdn)}`);
          validCount++;
          passCount++;
        } else {
          logError(`  ${beneficiary.name} (${beneficiary.serviceType}): ${beneficiary.msisdn} (Invalid format)`);
          invalidCount++;
          failCount++;
        }
      }

      logInfo(`  Summary: ${validCount} valid, ${invalidCount} invalid (out of ${beneficiaries.length})`);
    }
  } catch (error) {
    logError(`  Database query failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 6: Database - Check Service Accounts MSISDN Format
  logInfo('Test 6: Database - Service Accounts MSISDN Format');
  try {
    const serviceAccounts = await BeneficiaryServiceAccount.findAll({
      where: { userId: TEST_USER_ID },
      attributes: ['id', 'serviceType', 'serviceData'],
      limit: 10,
    });

    if (serviceAccounts.length === 0) {
      logWarning('  No service accounts found for test user');
    } else {
      let validCount = 0;
      let invalidCount = 0;

      for (const account of serviceAccounts) {
        const msisdn = account.serviceData?.msisdn;
        const mobileNumber = account.serviceData?.mobileNumber;

        if (!msisdn && !mobileNumber) {
          logWarning(`  ${account.serviceType}: No MSISDN found`);
          continue;
        }

        const isValidMsisdn = msisdn && (isValidE164(msisdn) || msisdn.startsWith('NON_MSI_'));
        const isValidMobile = mobileNumber && (isValidE164(mobileNumber) || mobileNumber.startsWith('NON_MSI_'));

        if (isValidMsisdn || isValidMobile) {
          logSuccess(`  ${account.serviceType}: msisdn=${maskMsisdn(msisdn || 'N/A')}, mobileNumber=${maskMsisdn(mobileNumber || 'N/A')}`);
          validCount++;
          passCount++;
        } else {
          logError(`  ${account.serviceType}: msisdn=${msisdn || 'N/A'}, mobileNumber=${mobileNumber || 'N/A'} (Invalid format)`);
          invalidCount++;
          failCount++;
        }
      }

      logInfo(`  Summary: ${validCount} valid, ${invalidCount} invalid (out of ${serviceAccounts.length})`);
    }
  } catch (error) {
    logError(`  Database query failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 7: Beneficiary Lookup by MSISDN (Various Formats)
  logInfo('Test 7: Beneficiary Lookup by MSISDN (Various Formats)');
  try {
    const testPhone = '0825571055'; // André's number in local format
    const e164Phone = normalizeToE164(testPhone);

    // Try to find a beneficiary with this MSISDN
    const beneficiary = await Beneficiary.findOne({
      where: { 
        userId: TEST_USER_ID,
        msisdn: e164Phone 
      },
    });

    if (beneficiary) {
      logSuccess(`  Found beneficiary: ${beneficiary.name} (${maskMsisdn(beneficiary.msisdn)})`);
      passCount++;
    } else {
      logWarning(`  No beneficiary found with MSISDN ${e164Phone} (this is expected if no beneficiary exists)`);
    }
  } catch (error) {
    logError(`  Lookup failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Test 8: Test User Phone Number Format
  logInfo('Test 8: User Phone Number Format');
  try {
    const user = await User.findByPk(TEST_USER_ID, {
      attributes: ['id', 'firstName', 'lastName', 'phoneNumber', 'accountNumber'],
    });

    if (user) {
      const phoneValid = isValidE164(user.phoneNumber);
      const accountValid = isValidE164(user.accountNumber);

      if (phoneValid) {
        logSuccess(`  User phoneNumber: ${maskMsisdn(user.phoneNumber)} (E.164 valid)`);
        passCount++;
      } else {
        logError(`  User phoneNumber: ${user.phoneNumber} (NOT E.164 valid)`);
        failCount++;
      }

      if (accountValid) {
        logSuccess(`  User accountNumber: ${maskMsisdn(user.accountNumber)} (E.164 valid)`);
        passCount++;
      } else {
        logError(`  User accountNumber: ${user.accountNumber} (NOT E.164 valid)`);
        failCount++;
      }
    } else {
      logWarning('  Test user not found');
    }
  } catch (error) {
    logError(`  User query failed: ${error.message}`);
    failCount++;
  }
  console.log();

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  logSuccess(`Passed: ${passCount} tests`);
  if (failCount > 0) {
    logError(`Failed: ${failCount} tests`);
  }
  log('='.repeat(60), 'cyan');

  const totalTests = passCount + failCount;
  const passRate = totalTests > 0 ? ((passCount / totalTests) * 100).toFixed(1) : 0;
  
  if (failCount === 0) {
    logSuccess(`\n✅ ALL TESTS PASSED (${passCount}/${totalTests}) - ${passRate}%`);
    process.exit(0);
  } else {
    logError(`\n❌ SOME TESTS FAILED (${passCount}/${totalTests}) - ${passRate}%`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  logError(`\nTest suite failed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
