#!/usr/bin/env node
'use strict';

/**
 * Verify generated EasyPay V5 test PINs before sending them to EasyPay.
 *
 * Safe default:
 *   - Tests every row with infoRequest.
 *   - Tests only non-mutating authorisationRequest cases:
 *     already paid, expired/cancelled, unknown valid account, and amount mismatch.
 *
 * Mutating authorisation tests are intentionally opt-in because successful
 * authorisations create Payment rows and move pending bills to processing.
 *
 * Usage:
 *   EASYPAY_API_KEY='...' node scripts/verify-easypay-test-pins.js --staging
 *   EASYPAY_API_KEY='...' node scripts/verify-easypay-test-pins.js --staging --allow-mutating-auth
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const XLSX = require('xlsx');

const DEFAULT_FILES = {
  xlsx: path.join(__dirname, '..', 'docs', 'integrations', 'easypay_test_pins.xlsx'),
  csv: path.join(__dirname, '..', 'docs', 'integrations', 'easypay_test_pins.csv'),
};

const ENVIRONMENTS = {
  staging: 'https://staging.mymoolah.africa/billpayment/v1',
  uat: 'http://localhost:3001/billpayment/v1',
};

function parseArgs(argv = process.argv.slice(2)) {
  const options = {
    env: null,
    baseUrl: null,
    file: null,
    token: process.env.EASYPAY_API_KEY || '',
    allowMutatingAuth: false,
  };

  for (const arg of argv) {
    if (arg === '--staging') options.env = 'staging';
    else if (arg === '--uat') options.env = 'uat';
    else if (arg === '--allow-mutating-auth') options.allowMutatingAuth = true;
    else if (arg.startsWith('--env=')) options.env = arg.split('=')[1];
    else if (arg.startsWith('--base-url=')) options.baseUrl = arg.split('=')[1];
    else if (arg.startsWith('--file=')) options.file = arg.split('=')[1];
    else if (arg.startsWith('--token=')) options.token = arg.split('=')[1];
  }

  if (!options.env && !options.baseUrl) {
    throw new Error('Target required. Use --staging, --uat, or --base-url=https://host/billpayment/v1');
  }

  if (!options.baseUrl) {
    options.baseUrl = ENVIRONMENTS[options.env];
  }

  if (!options.baseUrl) {
    throw new Error(`Unknown environment "${options.env}". Use --staging, --uat, or --base-url.`);
  }

  options.baseUrl = options.baseUrl.replace(/\/+$/, '');

  if (!options.token) {
    throw new Error('EASYPAY_API_KEY is required. Export it or pass --token=...');
  }

  if (isPlaceholderToken(options.token)) {
    throw new Error(
      'EASYPAY_API_KEY is still a placeholder. Use the real staging SessionToken from Secret Manager; do not use STAGING_SESSION_TOKEN.'
    );
  }

  if (!options.file) {
    options.file = fs.existsSync(DEFAULT_FILES.xlsx) ? DEFAULT_FILES.xlsx : DEFAULT_FILES.csv;
  }

  if (!fs.existsSync(options.file)) {
    throw new Error(`PIN file not found: ${options.file}`);
  }

  return options;
}

function isPlaceholderToken(token) {
  return [
    'STAGING_SESSION_TOKEN',
    'PRODUCTION_SESSION_TOKEN',
    'EASYPAY_API_KEY',
    'YOUR_TOKEN',
    'YOUR_SESSION_TOKEN',
  ].includes(String(token || '').trim());
}

function readRows(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (!rows.length) {
    throw new Error(`PIN file has no data rows: ${filePath}`);
  }

  return rows.map((row, index) => ({
    index: index + 2,
    pin: String(row.PIN || '').trim(),
    accountNumber: String(row.AccountNumber || '').trim(),
    amountCents: row.Amount_Cents === 'N/A' ? null : Number(row.Amount_Cents),
    scenario: String(row.Scenario || '').trim(),
    expectedInfoCode: expectedCode(row.Expected_InfoResponse),
    expectedAuthCode: expectedCode(row.Expected_AuthResponse),
  }));
}

function expectedCode(value) {
  const match = String(value || '').match(/^\s*(\d+)/);
  return match ? match[1] : null;
}

function makeReference(row, suffix) {
  return `MMQA${Date.now()}${String(row.index).padStart(3, '0')}${suffix}`.slice(0, 32);
}

function infoPayload(row) {
  return {
    MerchantId: '999999999999999',
    TerminalId: '00000001',
    Reference: makeReference(row, 'I'),
    EasyPayNumber: row.pin,
    AccountNumber: row.accountNumber,
    EchoData: `${row.pin}-${row.index}-INFO`,
  };
}

function authPayload(row) {
  const amount = authAmount(row);
  return {
    MerchantId: '999999999999999',
    TerminalId: '00000001',
    Reference: makeReference(row, 'A'),
    EasyPayNumber: row.pin,
    AccountNumber: row.accountNumber,
    Amount: amount,
    EchoData: `${row.pin}-${row.index}-AUTH`,
  };
}

function authAmount(row) {
  if (row.scenario === 'Amount mismatch test') {
    return row.amountCents + 1;
  }
  return row.amountCents || 10000;
}

function shouldRunAuthorisation(row, allowMutatingAuth) {
  if (allowMutatingAuth) return true;
  return ['1', '2', '3', '5'].includes(row.expectedAuthCode);
}

async function post(client, endpoint, payload) {
  try {
    const response = await client.post(endpoint, payload);
    return { httpStatus: response.status, body: response.data };
  } catch (error) {
    if (error.response) {
      return { httpStatus: error.response.status, body: error.response.data };
    }
    throw error;
  }
}

function responseCode(result) {
  return result.body?.ResponseCode != null ? String(result.body.ResponseCode) : null;
}

function recordResult(results, testName, row, expected, actual, httpStatus, details = '') {
  const ok = httpStatus === 200 && actual === expected;
  results.push({
    ok,
    testName,
    row: row.index,
    pin: row.pin,
    scenario: row.scenario,
    expected,
    actual,
    httpStatus,
    details,
  });
}

function printSummary(results, skippedAuth) {
  const failures = results.filter(result => !result.ok);

  console.log('\nEasyPay V5 test PIN verification summary');
  console.log('----------------------------------------');
  console.log(`Executed: ${results.length}`);
  console.log(`Passed:   ${results.length - failures.length}`);
  console.log(`Failed:   ${failures.length}`);
  console.log(`Skipped mutating authorisation tests: ${skippedAuth.length}`);

  if (skippedAuth.length) {
    console.log('\nSkipped auth rows (expected ResponseCode 0, would mutate staging state):');
    for (const row of skippedAuth) {
      console.log(`  row ${row.index}: ${row.pin} — ${row.scenario}`);
    }
  }

  if (failures.length) {
    console.log('\nFailures:');
    for (const failure of failures) {
      console.log(
        `  ${failure.testName} row ${failure.row} ${failure.pin} (${failure.scenario}) ` +
        `expected ${failure.expected}, got ${failure.actual || 'none'} HTTP ${failure.httpStatus} ${failure.details}`
      );
    }
  }
}

async function main() {
  const options = parseArgs();
  const rows = readRows(options.file);
  const client = axios.create({
    baseURL: options.baseUrl,
    timeout: 15000,
    headers: {
      Authorization: `SessionToken ${options.token}`,
      'Content-Type': 'application/json',
    },
  });

  console.log(`Verifying ${rows.length} EasyPay test PIN rows from ${options.file}`);
  console.log(`Endpoint: ${options.baseUrl}`);
  console.log(options.allowMutatingAuth
    ? 'Authorisation mode: mutating authorisation tests enabled'
    : 'Authorisation mode: safe only; successful auth rows will be skipped');

  const results = [];
  const skippedAuth = [];

  for (const row of rows) {
    const info = await post(client, '/infoRequest', infoPayload(row));

    if (info.httpStatus === 401) {
      throw new Error(
        'Staging rejected the SessionToken with HTTP 401. Fetch the real EasyPay token from Secret Manager and rerun the verifier.'
      );
    }

    recordResult(results, 'infoRequest', row, row.expectedInfoCode, responseCode(info), info.httpStatus);

    if (row.expectedAuthCode && shouldRunAuthorisation(row, options.allowMutatingAuth)) {
      const auth = await post(client, '/authorisationRequest', authPayload(row));
      recordResult(results, 'authorisationRequest', row, row.expectedAuthCode, responseCode(auth), auth.httpStatus);
    } else if (row.expectedAuthCode === '0') {
      skippedAuth.push(row);
    }
  }

  printSummary(results, skippedAuth);

  if (results.some(result => !result.ok)) {
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error('Verification failed:', error.message);
  process.exit(1);
});
