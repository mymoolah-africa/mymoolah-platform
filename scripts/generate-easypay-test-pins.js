#!/usr/bin/env node
'use strict';

/**
 * Generate ~50 EasyPay test PINs (Bills) for EasyPay V5 testing.
 *
 * Creates Bills in the selected database across multiple test scenarios so
 * EasyPay can exercise every V5 response code against MMTP's receiver.
 *
 * Lesaka/EasyPay partner testing uses the deployed staging endpoint
 * https://staging.mymoolah.africa, so use --staging for those PINs.
 *
 * Usage:
 *   node scripts/generate-easypay-test-pins.js --staging
 *   node scripts/generate-easypay-test-pins.js --uat
 *
 * Output:
 *   docs/integrations/easypay_test_pins.csv
 *   docs/integrations/easypay_test_pins.xlsx
 */

const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const { getUATClient, getStagingClient } = require('./db-connection-helper');

const RECEIVER_ID = '5063';
const ENVIRONMENTS = {
  uat: {
    label: 'UAT',
    clientFactory: getUATClient,
    endpoint: 'local/Codespaces UAT receiver',
  },
  staging: {
    label: 'STAGING',
    clientFactory: getStagingClient,
    endpoint: 'https://staging.mymoolah.africa/billpayment/v1/',
  },
};

function parseTargetEnvironment(argv = process.argv.slice(2)) {
  const explicit = argv.find(arg => ['uat', 'staging', '--uat', '--staging'].includes(arg));
  const envArg = argv.find(arg => arg.startsWith('--env='));
  const envValue = envArg ? envArg.split('=')[1] : null;
  const rawTarget = (explicit || envValue || process.env.EASYPAY_TEST_PIN_ENV || '').replace(/^--/, '').toLowerCase();

  if (ENVIRONMENTS[rawTarget]) {
    return rawTarget;
  }

  throw new Error(
    'Target environment required. Use --staging for Lesaka/EasyPay testing against staging.mymoolah.africa, or --uat for local UAT.'
  );
}

function calculateLuhnCheckDigit(number) {
  let sum = 0;
  let shouldDouble = true;
  for (let i = number.length - 1; i >= 0; i--) {
    let digit = parseInt(number[i], 10);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  const mod10 = sum % 10;
  return mod10 === 0 ? '0' : String(10 - mod10);
}

function generateEasyPayNumber() {
  const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const checkDigit = calculateLuhnCheckDigit(RECEIVER_ID + accountNumber);
  return { pin: `9${RECEIVER_ID}${accountNumber}${checkDigit}`, accountNumber };
}

function generateUniqueEasyPayNumber(usedPins) {
  let generated;
  do {
    generated = generateEasyPayNumber();
  } while (usedPins.has(generated.pin));

  usedPins.add(generated.pin);
  return generated;
}

function csvCell(value) {
  const str = value == null ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function csvRow(values) {
  return values.map(csvCell).join(',');
}

async function resolveTestUsers(client) {
  const result = await client.query(`
    SELECT DISTINCT u.id
    FROM users u
    INNER JOIN wallets w ON w."userId" = u.id
    WHERE u.status = 'active'
      AND w.status = 'active'
    ORDER BY u.id
    LIMIT 2
  `);

  if (result.rows.length === 0) {
    throw new Error('No active users with active wallets found in target environment. Create or migrate a controlled test user before generating EasyPay PINs.');
  }

  const primary = Number(result.rows[0].id);
  const secondary = result.rows[1] ? Number(result.rows[1].id) : primary;

  if (primary === secondary) {
    console.warn('⚠️ Only one active wallet user found; "Different user" rows will use the same controlled test user.');
  }

  return { primary, secondary };
}

function scenarioUserId(scenario, testUsers) {
  if (scenario.userId == null) return null;
  return scenario.userId === 2 ? testUsers.secondary : testUsers.primary;
}

const scenarios = [
  // Happy path — various amounts (10 PINs)
  ...([5000, 10000, 15000, 20000, 25000, 30000, 50000, 100000, 200000, 400000].map((amt) => ({
    scenario: 'Happy path',
    amount: amt,
    status: 'pending',
    userId: 1,
    minAmount: amt,
    maxAmount: amt,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, wallet credited',
  }))),

  // Already paid (5 PINs)
  ...Array.from({ length: 5 }, () => ({
    scenario: 'Already paid',
    amount: 10000,
    status: 'paid',
    userId: 1,
    minAmount: 10000,
    maxAmount: 10000,
    daysUntilExpiry: 30,
    expectedInfo: '5 (AlreadyPaid)',
    expectedAuth: '5 (AlreadyPaid)',
    expectedPayment: 'N/A',
  })),

  // Expired (past dueDate) (5 PINs)
  ...Array.from({ length: 5 }, () => ({
    scenario: 'Expired',
    amount: 10000,
    status: 'pending',
    userId: 1,
    minAmount: 10000,
    maxAmount: 10000,
    daysUntilExpiry: -2,
    expectedInfo: '3 (ExpiredPayment)',
    expectedAuth: '3 (Expired)',
    expectedPayment: 'N/A',
  })),

  // Cancelled (3 PINs)
  ...Array.from({ length: 3 }, () => ({
    scenario: 'Cancelled',
    amount: 10000,
    status: 'cancelled',
    userId: 1,
    minAmount: 10000,
    maxAmount: 10000,
    daysUntilExpiry: 30,
    expectedInfo: '3 (ExpiredPayment)',
    expectedAuth: '3 (Expired)',
    expectedPayment: 'N/A',
  })),

  // Different user (5 PINs) — userId 2
  ...([5000, 10000, 20000, 30000, 50000].map(amt => ({
    scenario: 'Different user',
    amount: amt,
    status: 'pending',
    userId: 2,
    minAmount: amt,
    maxAmount: amt,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, wallet credited',
  }))),

  // Boundary: min R50 (3 PINs)
  ...Array.from({ length: 3 }, () => ({
    scenario: 'Boundary min R50',
    amount: 5000,
    status: 'pending',
    userId: 1,
    minAmount: 5000,
    maxAmount: 5000,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, wallet credited',
  })),

  // Boundary: max R4000 (3 PINs)
  ...Array.from({ length: 3 }, () => ({
    scenario: 'Boundary max R4000',
    amount: 400000,
    status: 'pending',
    userId: 1,
    minAmount: 400000,
    maxAmount: 400000,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, wallet credited',
  })),

  // Amount mismatch (5 PINs) — fixed amount, EasyPay must send exactly this
  ...Array.from({ length: 5 }, () => ({
    scenario: 'Amount mismatch test',
    amount: 10000,
    status: 'pending',
    userId: 1,
    minAmount: 10000,
    maxAmount: 10000,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '2 (InvalidAmount) if amount != 10000',
    expectedPayment: 'EchoData returned (receiver cannot decline)',
  })),

  // USSD-issued (3 PINs)
  ...([10000, 20000, 50000].map(amt => ({
    scenario: 'USSD-issued',
    amount: amt,
    status: 'pending',
    userId: 1,
    minAmount: amt,
    maxAmount: amt,
    daysUntilExpiry: 30,
    channel: 'ussd',
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, wallet credited',
  }))),

  // No userId — orphan (3 PINs)
  ...Array.from({ length: 3 }, () => ({
    scenario: 'No userId (orphan)',
    amount: 10000,
    status: 'pending',
    userId: null,
    minAmount: 10000,
    maxAmount: 10000,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, logs error (no wallet to credit)',
  })),
];

async function main() {
  const targetEnv = parseTargetEnvironment();
  const envConfig = ENVIRONMENTS[targetEnv];
  const client = await envConfig.clientFactory();
  const rows = [['Environment', 'Endpoint', 'PIN', 'AccountNumber', 'Amount_Cents', 'Amount_Rands', 'Scenario', 'Expected_InfoResponse', 'Expected_AuthResponse', 'Expected_PaymentResponse', 'Bill_Status', 'User_ID']];

  console.log(`Generating ${scenarios.length} test PINs in ${envConfig.label} for ${envConfig.endpoint}...`);

  try {
    const testUsers = await resolveTestUsers(client);
    const usedPins = new Set();
    console.log(`Using primary test user ID ${testUsers.primary} and secondary test user ID ${testUsers.secondary}.`);

    for (const s of scenarios) {
      const { pin, accountNumber } = generateUniqueEasyPayNumber(usedPins);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + s.daysUntilExpiry);
      const dueDateStr = dueDate.toISOString().split('T')[0];
      const userId = scenarioUserId(s, testUsers);

      const metadata = s.channel ? JSON.stringify({ channel: s.channel }) : null;
      const customerName = userId ? `MyMoolah Test User ${userId}` : null;

      await client.query(`
        INSERT INTO bills ("easyPayNumber", "accountNumber", "customerName", amount, "minAmount", "maxAmount",
                           "dueDate", status, "billType", description, "receiverId", metadata, "userId",
                           "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT ("easyPayNumber") DO NOTHING
      `, [
        pin, accountNumber, customerName, s.amount, s.minAmount, s.maxAmount,
        dueDateStr, s.status, 'wallet_topup', `Test: ${s.scenario}`,
        RECEIVER_ID, metadata, userId
      ]);

      rows.push([
        envConfig.label,
        envConfig.endpoint,
        pin,
        accountNumber,
        s.amount,
        (s.amount / 100).toFixed(2),
        s.scenario,
        s.expectedInfo,
        s.expectedAuth,
        s.expectedPayment,
        s.status,
        userId || 'NULL'
      ]);

      console.log(`  [${s.scenario}] ${pin} — R${(s.amount / 100).toFixed(2)} — ${s.status}`);
    }

    // Add 5 valid-format unknown PINs to the files (not inserted into DB).
    // These should return V5 ResponseCode 1 rather than HTTP 400 format errors.
    const unknownPins = Array.from({ length: 5 }, () => generateUniqueEasyPayNumber(usedPins));
    for (const unknown of unknownPins) {
      rows.push([
        envConfig.label, envConfig.endpoint, unknown.pin, unknown.accountNumber, 'N/A', 'N/A', 'Unknown valid PIN (not in DB)',
        '1 (InvalidAccount)', '1 (InvalidAccount)', 'N/A', 'N/A (not in DB)', 'N/A'
      ]);
    }

    const csvPath = path.join(__dirname, '..', 'docs', 'integrations', 'easypay_test_pins.csv');
    fs.writeFileSync(csvPath, rows.map(csvRow).join('\n') + '\n', 'utf-8');

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.aoa_to_sheet(rows);
    for (let rowIndex = 1; rowIndex <= rows.length; rowIndex++) {
      for (const column of ['C', 'D']) {
        const address = `${column}${rowIndex}`;
        if (worksheet[address]) {
          worksheet[address].t = 's';
          worksheet[address].v = String(worksheet[address].v);
          worksheet[address].z = '@';
        }
      }
    }
    worksheet['!cols'] = [
      { wch: 12 },
      { wch: 52 },
      { wch: 18 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 26 },
      { wch: 24 },
      { wch: 34 },
      { wch: 42 },
      { wch: 14 },
      { wch: 10 },
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'EasyPay Test PINs');
    const xlsxPath = path.join(__dirname, '..', 'docs', 'integrations', 'easypay_test_pins.xlsx');
    XLSX.writeFile(workbook, xlsxPath);

    console.log(`\nCSV written to: ${csvPath}`);
    console.log(`XLSX written to: ${xlsxPath}`);
    console.log(`Total: ${scenarios.length} DB rows + ${unknownPins.length} unknown valid PINs = ${scenarios.length + unknownPins.length} CSV rows`);
  } finally {
    client.release();
  }
}

main().then(() => {
  console.log('Done.');
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
