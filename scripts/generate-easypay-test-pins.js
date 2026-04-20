#!/usr/bin/env node
'use strict';

/**
 * Generate ~50 EasyPay test PINs (Bills) for UAT testing.
 *
 * Creates Bills in the UAT database across multiple test scenarios so EasyPay
 * can exercise every V5 response code against MMTP's receiver.
 *
 * Usage:
 *   node scripts/generate-easypay-test-pins.js
 *
 * Output:
 *   docs/integrations/easypay_test_pins.csv
 */

const path = require('path');
const fs = require('fs');
const { getUATClient } = require('./db-connection-helper');

const RECEIVER_ID = '5063';

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

const scenarios = [
  // Happy path — various amounts (10 PINs)
  ...([5000, 10000, 15000, 20000, 25000, 30000, 50000, 100000, 200000, 400000].map((amt, i) => ({
    scenario: 'Happy path',
    amount: amt,
    status: 'pending',
    userId: 1,
    minAmount: 5000,
    maxAmount: 400000,
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
    minAmount: 5000,
    maxAmount: 400000,
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
    maxAmount: 400000,
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
    minAmount: 5000,
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
    minAmount: 5000,
    maxAmount: 400000,
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
    minAmount: 5000,
    maxAmount: 400000,
    daysUntilExpiry: 30,
    expectedInfo: '0 (AllowPayment)',
    expectedAuth: '0 (Allow)',
    expectedPayment: 'EchoData returned, logs error (no wallet to credit)',
  })),
];

async function main() {
  const client = await getUATClient();
  const csvRows = ['PIN,Amount_Cents,Amount_Rands,Scenario,Expected_InfoResponse,Expected_AuthResponse,Expected_PaymentResponse,Bill_Status,User_ID'];

  console.log(`Generating ${scenarios.length} test PINs...`);

  try {
    for (const s of scenarios) {
      const { pin, accountNumber } = generateEasyPayNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + s.daysUntilExpiry);
      const dueDateStr = dueDate.toISOString().split('T')[0];

      const metadata = s.channel ? JSON.stringify({ channel: s.channel }) : null;
      const customerName = s.userId === 1 ? 'Andre Test' : s.userId === 2 ? 'User Two' : null;

      await client.query(`
        INSERT INTO bills ("easyPayNumber", "accountNumber", "customerName", amount, "minAmount", "maxAmount",
                           "dueDate", status, "billType", description, "receiverId", metadata, "userId",
                           "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
        ON CONFLICT ("easyPayNumber") DO NOTHING
      `, [
        pin, accountNumber, customerName, s.amount, s.minAmount, s.maxAmount,
        dueDateStr, s.status, 'wallet_topup', `Test: ${s.scenario}`,
        RECEIVER_ID, metadata, s.userId
      ]);

      csvRows.push([
        pin,
        s.amount,
        (s.amount / 100).toFixed(2),
        s.scenario,
        s.expectedInfo,
        s.expectedAuth,
        s.expectedPayment,
        s.status,
        s.userId || 'NULL'
      ].join(','));

      console.log(`  [${s.scenario}] ${pin} — R${(s.amount / 100).toFixed(2)} — ${s.status}`);
    }

    // Add 5 invalid PINs to the CSV (not in DB)
    const invalidPins = [
      '00000000000000',
      '91111111111111',
      '95063XXXXXXXX',
      'abc12345678901',
      '9506300000000'
    ];
    for (const badPin of invalidPins) {
      csvRows.push([
        badPin, 'N/A', 'N/A', 'Invalid PIN format',
        '1 (InvalidAccount)', 'N/A', 'N/A', 'N/A (not in DB)', 'N/A'
      ].join(','));
    }

    const csvPath = path.join(__dirname, '..', 'docs', 'integrations', 'easypay_test_pins.csv');
    fs.writeFileSync(csvPath, csvRows.join('\n') + '\n', 'utf-8');
    console.log(`\nCSV written to: ${csvPath}`);
    console.log(`Total: ${scenarios.length} DB rows + ${invalidPins.length} invalid PINs = ${scenarios.length + invalidPins.length} CSV rows`);
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
