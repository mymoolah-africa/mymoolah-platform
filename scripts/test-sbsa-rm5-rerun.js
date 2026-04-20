#!/usr/bin/env node
/**
 * SBSA H2H — RM5 (over-limit) re-run.
 *
 * Per Colette's 2026-04-20 reply: TEST profile Cr Transaction Limit is
 * R500,000.00 and Sub Batch Limit is R500,000.00. Our original RM11 used
 * R96.15 which was well below both. This script generates a fresh Pain.001
 * with:
 *   Tx1 = R500,001.00  (intentionally R1 over per-transaction limit)
 *   Tx2 = R1.00
 *   Tx3 = R1.00
 *
 * Expected SBSA response cycle:
 *   ACK              — GrpSts RCVD
 *   INTAUDTST        — GrpSts PART, Tx1 RJCT (over-limit), Tx2+Tx3 PDNG
 *   FINAUDTST        — GrpSts PART, Tx1 RJCT, Tx2+Tx3 ACSP
 *
 * Output: /tmp/sbsa-uat-rm5/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_{timestamp}RM5v2.xml
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { buildPain001Bulk } = require('../services/standardbank/pain001BulkBuilder');

const OUT_DIR = '/tmp/sbsa-uat-rm5';
const DEBTOR_ACCOUNT_VALID = '272406481';
const TOMORROW = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

const VALID_BENEFICIARIES = [
  { name: 'Andre Botes', account: '10111730633', branch: '051001', bank: 'Standard Bank' },
  { name: 'Andre Botes', account: '18828076450', branch: '679000', bank: 'Discovery Bank' },
  { name: 'Andre Botes', account: '1254107337',  branch: '470010', bank: 'Capitec' },
];

function tsStamp() {
  const now = new Date();
  return now.getFullYear().toString()
    + String(now.getMonth() + 1).padStart(2, '0')
    + String(now.getDate()).padStart(2, '0')
    + String(now.getHours()).padStart(2, '0')
    + String(now.getMinutes()).padStart(2, '0')
    + String(now.getSeconds()).padStart(2, '0')
    + String(now.getMilliseconds()).padStart(3, '0');
}

function main() {
  if (fs.existsSync(OUT_DIR)) fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const runTs = Date.now();
  const payments = [
    {
      endToEndId: `UAT-RM5v2-${runTs}-01`,
      beneficiaryName: VALID_BENEFICIARIES[0].name,
      accountNumber:  VALID_BENEFICIARIES[0].account,
      branchCode:     VALID_BENEFICIARIES[0].branch,
      amount:         500001.00,
      reference:      'MMTP UAT RM5v2 OVERLIMIT',
    },
    {
      endToEndId: `UAT-RM5v2-${runTs}-02`,
      beneficiaryName: VALID_BENEFICIARIES[1].name,
      accountNumber:  VALID_BENEFICIARIES[1].account,
      branchCode:     VALID_BENEFICIARIES[1].branch,
      amount:         1.00,
      reference:      'MMTP UAT RM5v2 SMALL 02',
    },
    {
      endToEndId: `UAT-RM5v2-${runTs}-03`,
      beneficiaryName: VALID_BENEFICIARIES[2].name,
      accountNumber:  VALID_BENEFICIARIES[2].account,
      branchCode:     VALID_BENEFICIARIES[2].branch,
      amount:         1.00,
      reference:      'MMTP UAT RM5v2 SMALL 03',
    },
  ];

  const { xml, msgId } = buildPain001Bulk({
    runReference: `UAT-RM5v2-${runTs}`,
    paymentDate:  TOMORROW,
    debtorAccount: DEBTOR_ACCOUNT_VALID,
    payments,
  });

  const filename = `MYMOOLAH_OWN11_Pain001v3_ZAR_TST_${tsStamp()}RM5v2.xml`;
  const fullPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(fullPath, xml);

  console.log('================================================================');
  console.log('SBSA H2H UAT — RM5 re-run (over-limit) — file generated');
  console.log('================================================================');
  console.log(`Filename:        ${filename}`);
  console.log(`Path:            ${fullPath}`);
  console.log(`Size:            ${fs.statSync(fullPath).size} bytes`);
  console.log(`MsgId:           ${msgId}`);
  console.log(`Debtor account:  ${DEBTOR_ACCOUNT_VALID}`);
  console.log(`ReqdExctnDt:     ${TOMORROW}`);
  console.log('');
  console.log('Transactions:');
  console.log(`  Tx1 R500,001.00  Andre Botes SBSA   10111730633 / 051001  (over per-tx limit)`);
  console.log(`  Tx2 R1.00        Andre Botes Disc   18828076450 / 679000`);
  console.log(`  Tx3 R1.00        Andre Botes Capi    1254107337 / 470010`);
  console.log(`  Batch total:     R500,003.00        (over sub-batch limit)`);
  console.log('');
  console.log('Expected: ACK + INTAUDTST(PART: Tx1 RJCT, Tx2+Tx3 PDNG) + FINAUDTST(PART: Tx1 RJCT, Tx2+Tx3 ACSP)');
}

main();
