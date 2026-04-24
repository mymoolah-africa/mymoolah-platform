#!/usr/bin/env node
/**
 * SBSA H2H — PROD Penny Test Pain.001 Generator
 * =============================================
 *
 * Generates a single R1.00 Pain.001 v3 XML file destined for SBSA's PRODUCTION
 * H2H SFTP at 196.8.86.53:5022.
 *
 * This is THE penny test for PROD go-live. It moves REAL money:
 *   Debtor  (debit)  : 272406481 / branch 002154  (MyMoolah PROD profile)
 *   Creditor(credit) : 10111730633 / branch 051001 (André Botes — SBSA)
 *   Amount           : R1.00 (single transaction)
 *
 * Output file: /tmp/sbsa-prod-penny/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_<timestamp>.xml
 *
 * SAFETY
 * ------
 *   - The script refuses to run without the --confirm-prod flag.
 *   - SBSA_FILE_ENV is forced to 'PRD' internally so the generated filename
 *     carries the PROD segment even when the shell has SBSA_FILE_ENV=TST.
 *   - The script NEVER uploads. It writes a file and prints the full XML to
 *     stdout so André / Colette / Melanie can review before manual SFTP upload.
 *
 * Upload path (manual, via sftp-1-vm):
 *   1. gcloud compute scp <generated>.xml sftp-1-vm:/tmp/ \
 *        --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap
 *   2. gcloud compute ssh sftp-1-vm --project=mymoolah-db --zone=africa-south1-a \
 *        --tunnel-through-iap --ssh-flag="-p 2222"
 *   3. On the VM:
 *        sftp -i ~/.ssh/sbsa_sftp_key -P 5022 mymoolahuser@196.8.86.53
 *        > cd /Outbox
 *        > put /tmp/MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_*.xml
 *
 * Usage:
 *   node scripts/test-sbsa-penny-prod.js --confirm-prod
 *
 * Optional flags:
 *   --exec-date YYYY-MM-DD   Override ReqdExctnDt (default: today + 1 day).
 *                            Use this to avoid weekend dates, e.g. when
 *                            running Friday → target Monday settlement.
 *
 * @date 2026-04-23 (initial)
 * @update 2026-04-24 — added --exec-date override for Penny #2 (weekend-safe)
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ── Hard-coded PROD penny parameters ─────────────────────────────────────────
const OUT_DIR         = '/tmp/sbsa-prod-penny';
const DEBTOR_NAME     = 'MyMoolah (Pty) Ltd';
const DEBTOR_ACCOUNT  = '272406481';
const DEBTOR_BRANCH   = '002154';
const CREDITOR_NAME   = 'Andre Botes';
const CREDITOR_ACCOUNT = '10111730633';
const CREDITOR_BRANCH  = '051001';
const CREDITOR_BANK    = 'Standard Bank';
const PENNY_AMOUNT     = 1.00;
const PAYMENT_REF      = 'MMTP PROD PENNY R1';

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

function requireConfirmProd() {
  if (!process.argv.includes('--confirm-prod')) {
    process.stderr.write([
      '',
      '════════════════════════════════════════════════════════════════════',
      ' ⚠  SBSA H2H PROD PENNY TEST — CONFIRMATION REQUIRED',
      '════════════════════════════════════════════════════════════════════',
      '',
      'This script generates a Pain.001 file that, when uploaded to SBSA',
      'PRODUCTION (196.8.86.53:5022) /Outbox, will DEBIT R1.00 from',
      `MyMoolah PROD account ${DEBTOR_ACCOUNT} (branch ${DEBTOR_BRANCH})`,
      `and credit ${CREDITOR_ACCOUNT} (branch ${CREDITOR_BRANCH}).`,
      '',
      'This is REAL MONEY. Re-run with the explicit flag to generate the file',
      '(the file is only generated — this script does NOT upload it):',
      '',
      '    node scripts/test-sbsa-penny-prod.js --confirm-prod',
      '',
      '════════════════════════════════════════════════════════════════════',
      '',
    ].join('\n'));
    process.exit(2);
  }
}

function prepareBuilderEnv() {
  // Force PRD segment in the generated filename regardless of shell env.
  process.env.SBSA_FILE_ENV        = 'PRD';
  process.env.SBSA_BOL_USER_ID     = process.env.SBSA_BOL_USER_ID   || 'OWN11';
  process.env.SBSA_COMPANY_CODE    = process.env.SBSA_COMPANY_CODE  || 'MYMOOLAH';
  process.env.SBSA_DEBTOR_NAME     = DEBTOR_NAME;
  process.env.SBSA_DEBTOR_ACCOUNT  = DEBTOR_ACCOUNT;
  process.env.SBSA_DEBTOR_BRANCH   = DEBTOR_BRANCH;
}

function main() {
  requireConfirmProd();
  prepareBuilderEnv();

  const { buildPain001Bulk, generatePain001Filename } =
    require('../services/standardbank/pain001BulkBuilder');

  if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
  }

  const runTs  = Date.now();
  const runRef = `PROD-PENNY-${runTs}`;

  const execDateArgIdx = process.argv.indexOf('--exec-date');
  let paymentDate;
  if (execDateArgIdx >= 0 && process.argv[execDateArgIdx + 1]) {
    const override = process.argv[execDateArgIdx + 1];
    if (!/^\d{4}-\d{2}-\d{2}$/.test(override)) {
      process.stderr.write(`\n❌ --exec-date must be YYYY-MM-DD (got: ${override})\n\n`);
      process.exit(2);
    }
    paymentDate = override;
  } else {
    paymentDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);
  }

  const payments = [
    {
      endToEndId:      `PROD-PENNY-${runTs}-01`,
      beneficiaryName: CREDITOR_NAME,
      accountNumber:   CREDITOR_ACCOUNT,
      branchCode:      CREDITOR_BRANCH,
      amount:          PENNY_AMOUNT,
      reference:       PAYMENT_REF,
    },
  ];

  const { xml, msgId, totalAmount, paymentCount } = buildPain001Bulk({
    runReference:     runRef,
    paymentDate,
    debtorName:       DEBTOR_NAME,
    debtorAccount:    DEBTOR_ACCOUNT,
    debtorBranchCode: DEBTOR_BRANCH,
    payments,
  });

  const filename = generatePain001Filename();
  const fullPath = path.join(OUT_DIR, filename);
  fs.writeFileSync(fullPath, xml);

  const divider = '═'.repeat(68);
  console.log(divider);
  console.log(' SBSA H2H PROD Penny — Pain.001 generated (NOT uploaded)');
  console.log(divider);
  console.log(`Filename        : ${filename}`);
  console.log(`Path            : ${fullPath}`);
  console.log(`Size            : ${fs.statSync(fullPath).size} bytes`);
  console.log(`MsgId           : ${msgId}`);
  console.log(`Run reference   : ${runRef}`);
  console.log(`ReqdExctnDt     : ${paymentDate}`);
  console.log(`Debtor          : ${DEBTOR_NAME} / ${DEBTOR_ACCOUNT} / ${DEBTOR_BRANCH}`);
  console.log(`Creditor        : ${CREDITOR_NAME} / ${CREDITOR_ACCOUNT} / ${CREDITOR_BRANCH} (${CREDITOR_BANK})`);
  console.log(`Amount          : R${PENNY_AMOUNT.toFixed(2)} (single tx, total R${totalAmount.toFixed(2)}, count ${paymentCount})`);
  console.log(`EndToEndId      : ${payments[0].endToEndId}`);
  console.log(`Reference       : ${PAYMENT_REF}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the XML below, or by opening the file in an editor.');
  console.log('  2. (Optional, recommended) Email the XML to Colette + Melanie');
  console.log('     at SBSA for a 5-minute sanity check.');
  console.log('  3. Manual upload via sftp-1-vm:');
  console.log('       gcloud compute scp "$PWD/'+path.relative(process.cwd(), fullPath)+'" sftp-1-vm:/tmp/ \\');
  console.log('         --project=mymoolah-db --zone=africa-south1-a --tunnel-through-iap');
  console.log('       gcloud compute ssh sftp-1-vm --project=mymoolah-db \\');
  console.log('         --zone=africa-south1-a --tunnel-through-iap --ssh-flag="-p 2222"');
  console.log('       # on VM:');
  console.log('       sftp -i ~/.ssh/sbsa_sftp_key -P 5022 mymoolahuser@196.8.86.53');
  console.log('       sftp> cd /Outbox');
  console.log(`       sftp> put /tmp/${filename}`);
  console.log('  4. Poll /Inbox every 60s for ACK / INTAUD / FINAUD responses.');
  console.log('  5. Capture responses to docs/test/sbsa-prod-penny-responses-' +
              new Date().toISOString().slice(0, 10) + '/');
  console.log('');
  console.log(divider);
  console.log(' Pain.001 XML for review:');
  console.log(divider);
  console.log(xml);
  console.log(divider);
}

main();
