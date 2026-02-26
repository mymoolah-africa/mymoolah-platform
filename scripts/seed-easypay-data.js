#!/usr/bin/env node
/**
 * Seed EasyPay Test Data for UAT Testing
 *
 * Creates test Bills in the database using MyMoolah's assigned Receiver ID 5063.
 * These EasyPay numbers are provided to Theodore Smith (EasyPay) to run test
 * transactions from their simulated POS system.
 *
 * Test Scenarios (per Razeen's email):
 *   1. Valid, unpaid — single payment allowed → ResponseCode: 0 (Allow)
 *   2. Already paid  — repeat attempt rejected → ResponseCode: 5 (AlreadyPaid)
 *   3. Expired bill  — payment rejected        → ResponseCode: 3 (Expired)
 *   4. Open amount   — min R10, max R1000       → ResponseCode: 0, any amount in range
 *   5. Invalid amount — amount below minimum   → ResponseCode: 2 (InvalidAmount)
 *
 * Usage:
 *   UAT:     node scripts/seed-easypay-data.js
 *   Staging: node scripts/seed-easypay-data.js --staging
 *
 * IMPORTANT: Run migrations before this script.
 */

require('dotenv').config();

const { getUATDatabaseURL, getStagingDatabaseURL, closeAll } = require('./db-connection-helper');

const isStaging = process.argv.includes('--staging');
process.env.DATABASE_URL = isStaging ? getStagingDatabaseURL() : getUATDatabaseURL();

const { Bill, Payment } = require('../models');
const { generateTestEasyPayNumber } = require('../utils/easyPayUtils');

// MyMoolah's assigned EasyPay Receiver ID
const RECEIVER_ID = process.env.EASYPAY_RECEIVER_ID || '5063';

// Future date for valid bills
const futureDate = new Date();
futureDate.setDate(futureDate.getDate() + 30);
const FUTURE_DATE = futureDate.toISOString().split('T')[0];

// Past date for expired bills
const pastDate = new Date();
pastDate.setDate(pastDate.getDate() - 5);
const PAST_DATE = pastDate.toISOString().split('T')[0];

async function seedEasyPayData() {
  try {
    console.log(`\n🌱 Seeding EasyPay UAT test data (Receiver ID: ${RECEIVER_ID})...`);
    console.log(`   Environment: ${isStaging ? 'Staging' : 'UAT'}\n`);

    // Remove only test bills (receiverId = our RECEIVER_ID) — preserve real data
    const deleted = await Bill.destroy({ where: { receiverId: RECEIVER_ID } });
    if (deleted > 0) {
      console.log(`🗑️  Removed ${deleted} existing test bills for Receiver ID ${RECEIVER_ID}`);
    }

    // ── Test Bills ────────────────────────────────────────────────────────────
    const testBills = [
      {
        // Scenario 1: Valid, unpaid — single payment allowed
        easyPayNumber: generateTestEasyPayNumber(RECEIVER_ID, '00000001'),
        accountNumber: '00000001',
        customerName: 'Test Customer 1 - Valid Unpaid',
        amount: 10000,        // R100.00 in cents
        minAmount: 10000,
        maxAmount: 10000,
        dueDate: FUTURE_DATE,
        status: 'pending',
        billType: 'topup',
        description: 'Scenario 1: Valid unpaid bill — single payment allowed. Repeat attempt must be rejected.',
        receiverId: RECEIVER_ID
      },
      {
        // Scenario 2: Already paid — repeat attempt must be rejected
        easyPayNumber: generateTestEasyPayNumber(RECEIVER_ID, '00000002'),
        accountNumber: '00000002',
        customerName: 'Test Customer 2 - Already Paid',
        amount: 20000,        // R200.00 in cents
        minAmount: 20000,
        maxAmount: 20000,
        dueDate: FUTURE_DATE,
        status: 'paid',
        billType: 'topup',
        description: 'Scenario 2: Already paid bill — any payment attempt must return ResponseCode 5 (AlreadyPaid).',
        receiverId: RECEIVER_ID,
        paidAmount: 20000,
        paidAt: new Date()
      },
      {
        // Scenario 3: Expired — payment must be rejected
        easyPayNumber: generateTestEasyPayNumber(RECEIVER_ID, '00000003'),
        accountNumber: '00000003',
        customerName: 'Test Customer 3 - Expired',
        amount: 5000,         // R50.00 in cents
        minAmount: 5000,
        maxAmount: 5000,
        dueDate: PAST_DATE,
        status: 'expired',
        billType: 'topup',
        description: 'Scenario 3: Expired bill — payment must return ResponseCode 3 (Expired).',
        receiverId: RECEIVER_ID
      },
      {
        // Scenario 4: Open amount — any amount between R10 and R1000
        easyPayNumber: generateTestEasyPayNumber(RECEIVER_ID, '00000004'),
        accountNumber: '00000004',
        customerName: 'Test Customer 4 - Open Amount',
        amount: 50000,        // R500.00 suggested amount
        minAmount: 1000,      // R10.00 minimum
        maxAmount: 100000,    // R1000.00 maximum
        dueDate: FUTURE_DATE,
        status: 'pending',
        billType: 'topup',
        description: 'Scenario 4: Open amount bill — any amount between R10.00 (1000c) and R1000.00 (100000c) must be accepted.',
        receiverId: RECEIVER_ID
      },
      {
        // Scenario 5: Amount validation — below minimum must be rejected
        easyPayNumber: generateTestEasyPayNumber(RECEIVER_ID, '00000005'),
        accountNumber: '00000005',
        customerName: 'Test Customer 5 - Amount Validation',
        amount: 30000,        // R300.00 exact amount required
        minAmount: 30000,
        maxAmount: 30000,
        dueDate: FUTURE_DATE,
        status: 'pending',
        billType: 'topup',
        description: 'Scenario 5: Fixed amount bill — only exactly R300.00 (30000c) accepted. Any other amount returns ResponseCode 2 (InvalidAmount).',
        receiverId: RECEIVER_ID
      }
    ];

    const createdBills = await Bill.bulkCreate(testBills);
    console.log(`✅ Created ${createdBills.length} test bills\n`);

    // ── Print test data sheet for Theodore Smith ──────────────────────────────
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log('  EasyPay UAT Test Data — Send to Theodore Smith');
    console.log('═══════════════════════════════════════════════════════════════════');
    console.log(`  Receiver ID : ${RECEIVER_ID}`);
    console.log(`  Environment : ${isStaging ? 'Staging' : 'UAT'}`);
    console.log(`  Base URL    : ${isStaging ? 'https://staging.mymoolah.africa' : 'http://localhost:3001'}/billpayment/v1`);
    console.log('───────────────────────────────────────────────────────────────────');

    const scenarios = [
      { label: 'Scenario 1 — Valid, unpaid (R100.00 fixed)',         expected: 'Allow payment (ResponseCode: 0). Second attempt → ResponseCode: 5' },
      { label: 'Scenario 2 — Already paid (R200.00)',                expected: 'Reject immediately (ResponseCode: 5 — AlreadyPaid)' },
      { label: 'Scenario 3 — Expired bill (R50.00)',                 expected: 'Reject (ResponseCode: 3 — Expired)' },
      { label: 'Scenario 4 — Open amount (R10–R1000)',               expected: 'Allow any amount in range. Outside range → ResponseCode: 2' },
      { label: 'Scenario 5 — Fixed R300.00 (amount validation)',     expected: 'Only R300.00 accepted. Any other amount → ResponseCode: 2' }
    ];

    createdBills.forEach((bill, i) => {
      const formatted = bill.easyPayNumber.replace(/(\d{1})(\d{4})(\d{4})(\d{4})(\d{1})/, '$1 $2 $3 $4 $5');
      console.log(`\n  ${scenarios[i].label}`);
      console.log(`    EasyPay Number : ${formatted}`);
      console.log(`    Raw Number     : ${bill.easyPayNumber}`);
      console.log(`    Expected       : ${scenarios[i].expected}`);
    });

    console.log('\n───────────────────────────────────────────────────────────────────');
    console.log('  IMPORTANT NOTES FOR THEO:');
    console.log('  • Amounts are in CENTS (R100.00 = 10000)');
    console.log('  • EchoData must be returned exactly as received in all responses');
    console.log('  • Scenario 1: after successful payment, a second attempt must return');
    console.log('    ResponseCode 5 (AlreadyPaid) — this tests our idempotency logic');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    await closeAll();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding EasyPay data:', error.message);
    console.error(error);
    await closeAll().catch(() => {});
    process.exit(1);
  }
}

seedEasyPayData();
