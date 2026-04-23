#!/usr/bin/env node
/**
 * SBSA H2H — PROD Penny #2 (App-Level, via GCS Gateway)
 * =====================================================
 *
 * Second R1.00 Pain.001 penny test, this time exercising the APP-LEVEL
 * upload path through sbsaSftpClientService.uploadPain001File() →
 *   GCS (gs://mymoolah-sftp-inbound/standardbank/outbox/) →
 *   SFTP Gateway VM (auto-sync) →
 *   SBSA PROD /Outbox.
 *
 * Preconditions (MUST be true before running this script):
 *   1. The manual PROD Penny #1 has passed (ACK → INTAUD → FINAUD ACSP and
 *      R1.00 debit confirmed on account 272406481 via bank statement).
 *   2. deploy-backend.sh has been re-deployed with SBSA_H2H_GO_LIVE=true
 *      (SBSA_SFTP_UPLOAD_ENABLED=true).
 *   3. setup-cloud-scheduler.sh --production has created the three jobs
 *      (sbsa-statement-poll, sbsa-pain002-poll, sftp-recon-sweep).
 *
 * What this script does:
 *   - Generates a fresh R1.00 Pain.001 (same debtor/creditor/ref as Penny #1).
 *   - Calls sbsaSftpClientService.uploadPain001File(xml, filename) directly.
 *   - Prints the GCS path the file was written to.
 *   - Does NOT wait for responses — the scheduled pain002 poller will ingest
 *     them automatically and update disbursement status rows.
 *
 * Safety:
 *   - Refuses without --confirm-prod.
 *   - Refuses unless STANDARDBANK_ENVIRONMENT=production AND
 *     SBSA_SFTP_UPLOAD_ENABLED=true (both required for a real upload).
 *   - If either is missing, the upload goes to /tmp (dry run) and the script
 *     loudly warns the operator.
 *
 * Usage:
 *   STANDARDBANK_ENVIRONMENT=production \
 *   SBSA_SFTP_UPLOAD_ENABLED=true \
 *     node scripts/test-sbsa-penny-prod-app.js --confirm-prod
 *
 * @date 2026-04-23
 */

'use strict';

const path = require('path');

// ── Parameters ────────────────────────────────────────────────────────────
const DEBTOR_NAME      = 'MyMoolah (Pty) Ltd';
const DEBTOR_ACCOUNT   = '272406481';
const DEBTOR_BRANCH    = '002154';
const CREDITOR_NAME    = 'Andre Botes';
const CREDITOR_ACCOUNT = '10111730633';
const CREDITOR_BRANCH  = '051001';
const PENNY_AMOUNT     = 1.00;
const PAYMENT_REF      = 'MMTP PROD PENNY APP R1';

function requireConfirmProd() {
  if (!process.argv.includes('--confirm-prod')) {
    process.stderr.write([
      '',
      '═══════════════════════════════════════════════════════════════════',
      ' ⚠  SBSA H2H PROD PENNY #2 (APP-LEVEL) — CONFIRMATION REQUIRED',
      '═══════════════════════════════════════════════════════════════════',
      '',
      'This uploads a fresh R1.00 Pain.001 via the APP path (GCS gateway).',
      'Debits MyMoolah PROD account ' + DEBTOR_ACCOUNT + ' / ' + DEBTOR_BRANCH,
      'and credits ' + CREDITOR_ACCOUNT + ' / ' + CREDITOR_BRANCH + '.',
      '',
      'Re-run with --confirm-prod to proceed:',
      '',
      '   STANDARDBANK_ENVIRONMENT=production \\',
      '   SBSA_SFTP_UPLOAD_ENABLED=true \\',
      '     node scripts/test-sbsa-penny-prod-app.js --confirm-prod',
      '',
      '═══════════════════════════════════════════════════════════════════',
      '',
    ].join('\n'));
    process.exit(2);
  }
}

function warnOnDryRun() {
  const envOk =
    (process.env.STANDARDBANK_ENVIRONMENT || '').toLowerCase() === 'production';
  const uploadOk =
    (process.env.SBSA_SFTP_UPLOAD_ENABLED || '').toLowerCase() === 'true';

  if (!envOk || !uploadOk) {
    console.warn('');
    console.warn('⚠  WARNING — Dry-run conditions detected.');
    console.warn('    STANDARDBANK_ENVIRONMENT =', process.env.STANDARDBANK_ENVIRONMENT || '<unset>');
    console.warn('    SBSA_SFTP_UPLOAD_ENABLED =', process.env.SBSA_SFTP_UPLOAD_ENABLED || '<unset>');
    console.warn('');
    console.warn('    sbsaSftpClientService will write the file to /tmp rather than');
    console.warn('    uploading to SBSA PROD. No real money will move. To perform a');
    console.warn('    real upload, set both to production / true and re-run.');
    console.warn('');
  }
  return envOk && uploadOk;
}

async function main() {
  requireConfirmProd();

  // Force PRD segment in the filename regardless of shell env.
  process.env.SBSA_FILE_ENV     = 'PRD';
  process.env.SBSA_BOL_USER_ID  = process.env.SBSA_BOL_USER_ID  || 'OWN11';
  process.env.SBSA_COMPANY_CODE = process.env.SBSA_COMPANY_CODE || 'MYMOOLAH';

  const isRealUpload = warnOnDryRun();

  const { buildPain001Bulk, generatePain001Filename } =
    require('../services/standardbank/pain001BulkBuilder');
  const sbsaSftp = require('../services/standardbank/sbsaSftpClientService');

  const runTs  = Date.now();
  const runRef = `PROD-PENNY-APP-${runTs}`;
  const paymentDate = new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 10);

  const payments = [
    {
      endToEndId:      `PROD-PENNY-APP-${runTs}-01`,
      beneficiaryName: CREDITOR_NAME,
      accountNumber:   CREDITOR_ACCOUNT,
      branchCode:      CREDITOR_BRANCH,
      amount:          PENNY_AMOUNT,
      reference:       PAYMENT_REF,
    },
  ];

  const { xml, msgId } = buildPain001Bulk({
    runReference:     runRef,
    paymentDate,
    debtorName:       DEBTOR_NAME,
    debtorAccount:    DEBTOR_ACCOUNT,
    debtorBranchCode: DEBTOR_BRANCH,
    payments,
  });

  const filename = generatePain001Filename();

  const divider = '═'.repeat(68);
  console.log(divider);
  console.log(' SBSA H2H PROD Penny #2 — app-level upload');
  console.log(divider);
  console.log('Filename     :', filename);
  console.log('MsgId        :', msgId);
  console.log('Run ref      :', runRef);
  console.log('ReqdExctnDt  :', paymentDate);
  console.log('Debtor       :', `${DEBTOR_NAME} / ${DEBTOR_ACCOUNT} / ${DEBTOR_BRANCH}`);
  console.log('Creditor     :', `${CREDITOR_NAME} / ${CREDITOR_ACCOUNT} / ${CREDITOR_BRANCH}`);
  console.log('Amount       :', `R${PENNY_AMOUNT.toFixed(2)} (single tx)`);
  console.log('EndToEndId   :', payments[0].endToEndId);
  console.log('Real upload  :', isRealUpload ? 'YES — GCS → SBSA PROD' : 'NO — /tmp dry-run');
  console.log(divider);

  const result = await sbsaSftp.uploadPain001File(xml, filename);
  console.log('Upload result:');
  console.log('  success        :', result.success);
  console.log('  uploaded       :', result.uploaded);
  console.log('  gcsPath        :', result.gcsPath || '(n/a — dry-run)');
  console.log('  tempPath       :', result.tempPath || '(n/a)');
  console.log('  bucket         :', result.bucket || '(n/a)');
  console.log('  size           :', result.size);
  console.log(divider);

  if (isRealUpload) {
    console.log('Next steps:');
    console.log('  1. Gateway VM syncs GCS → SBSA PROD /Outbox (typically <60s).');
    console.log('  2. Cloud Scheduler job sbsa-pain002-poll-production runs every');
    console.log('     5 minutes and will ingest ACK → INTAUD → FINAUD automatically,');
    console.log('     writing them to gs://mymoolah-sftp-inbound/standardbank/inbox/payments/');
    console.log('     and updating DisbursementRun / DisbursementPayment rows.');
    console.log('  3. Watch Cloud Run logs: gcloud run services logs read mymoolah-backend-production \\');
    console.log('     --region=africa-south1 --limit=200');
    console.log('  4. Confirm second R1.00 debit on account 272406481 on next business-day statement.');
    console.log(divider);
  }
}

main().catch((err) => {
  console.error('❌ App-level penny failed:', err && err.stack || err);
  process.exit(1);
});
