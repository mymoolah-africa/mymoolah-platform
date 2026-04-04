#!/usr/bin/env node
/**
 * Backfill Journal Entries v2 — MyMoolah Treasury Platform
 *
 * Posts missing journal entries for transaction types that lacked ledger
 * coverage prior to the April 2026 audit remediation:
 *
 *   A. RTP test entries (PayShap inflows without wallet JE)
 *   B. Director's Loan capital injection (R4,000)
 *   C. Correcting entry for BACKFILL-DEP-TXN1 (R1,500 was DR Bank; should be DR Loan)
 *   D. MobileMart float top-up (R2,500)
 *   E. P2P wallet transfers (audit-trail DR/CR within 2100-01-01)
 *   F. Internal voucher issue/redeem (via Voucher Clearing 2500-01-01)
 *
 * IDEMPOTENT: Uses unique reference patterns; skips if reference already exists.
 * NON-DESTRUCTIVE: Only INSERTs into journal_entries + journal_lines.
 * PRODUCTION ONLY: All entries are production facts (real bank transactions).
 *
 * Usage:
 *   node scripts/backfill-journal-entries-v2.js --production --dry-run
 *   node scripts/backfill-journal-entries-v2.js --production
 */

require('dotenv').config();
const path = require('path');
const dbHelper = require(path.resolve(__dirname, 'db-connection-helper'));

const ENV_ARG = process.argv.find(a => ['--staging', '--uat', '--production'].includes(a));
const ENV = ENV_ARG ? ENV_ARG.replace('--', '') : 'production';
const DRY_RUN = process.argv.includes('--dry-run');

if (ENV !== 'production') {
  console.error('\x1b[31mERROR: This backfill script contains production-specific entries (director loan,\x1b[0m');
  console.error('\x1b[31m       float top-ups, DEP-TXN1 correction). It must only run against production.\x1b[0m');
  console.error('\x1b[31m       Usage: node scripts/backfill-journal-entries-v2.js --production [--dry-run]\x1b[0m');
  process.exit(1);
}

const CLIENT_FN = 'getProductionClient';

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const BOLD = '\x1b[1m', DIM = '\x1b[2m', RESET = '\x1b[0m';

function money(v) { return `R ${Number(v || 0).toFixed(2)}`; }

(async () => {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  BACKFILL JOURNAL ENTRIES v2 — ${ENV.toUpperCase().padEnd(29)}║${RESET}`);
  console.log(`${BOLD}${CYAN}║  ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE MODE'}${' '.repeat(DRY_RUN ? 31 : 39)}║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);

  const c = await dbHelper[CLIENT_FN]();
  let posted = 0, skipped = 0, failed = 0;

  try {
    // ── Load ledger account IDs by code ──
    const accts = await c.query(`SELECT id, code FROM ledger_accounts`);
    const acctMap = {};
    accts.rows.forEach(a => { acctMap[a.code] = a.id; });

    const BANK = '1100-01-01';
    const CLIENT_FLOAT = '2100-01-01';
    const PAYSHAP_FEE = '5000-10-01';
    const BOTES_LOAN = '2400-01-01';
    const VOUCHER_CLEARING = '2500-01-01';

    const bankId = acctMap[BANK];
    const clientFloatId = acctMap[CLIENT_FLOAT];
    const payshapFeeId = acctMap[PAYSHAP_FEE];
    const botesLoanId = acctMap[BOTES_LOAN];
    const voucherClearingId = acctMap[VOUCHER_CLEARING];

    if (!bankId) throw new Error(`Ledger account ${BANK} not found`);
    if (!clientFloatId) throw new Error(`Ledger account ${CLIENT_FLOAT} not found`);
    if (!payshapFeeId) throw new Error(`Ledger account ${PAYSHAP_FEE} not found`);
    if (!botesLoanId) throw new Error(`Ledger account ${BOTES_LOAN} not found — run migration first`);
    if (!voucherClearingId) throw new Error(`Ledger account ${VOUCHER_CLEARING} not found — run migration first`);

    // ── Load supplier float mappings ──
    const floats = await c.query(`SELECT "supplierId", "ledgerAccountCode" FROM supplier_floats WHERE "isActive" = true`);
    const supplierFloatMap = {};
    floats.rows.forEach(f => { supplierFloatMap[f.supplierId.toLowerCase()] = f.ledgerAccountCode; });
    const mmFloatCode = supplierFloatMap['mobilemart'] || '1200-10-05';
    const mmFloatId = acctMap[mmFloatCode];
    if (!mmFloatId) throw new Error(`MobileMart float account ${mmFloatCode} not found`);

    // ── Load existing journal references for idempotency ──
    const existingRefs = await c.query(`SELECT reference FROM journal_entries`);
    const refSet = new Set(existingRefs.rows.map(r => r.reference));

    // ── Helper: post a journal entry with raw SQL ──
    async function postJE(reference, description, lines) {
      if (refSet.has(reference)) {
        console.log(`  ${DIM}SKIP${RESET}  ${reference} (already exists)`);
        skipped++;
        return;
      }
      if (DRY_RUN) {
        const total = lines.filter(l => l.dc === 'debit').reduce((s, l) => s + l.amount, 0);
        console.log(`  ${YELLOW}DRY ${RESET}  ${reference}: ${money(total)} — ${description}`);
        posted++;
        return;
      }

      try {
        await c.query('BEGIN');
        const jeResult = await c.query(
          `INSERT INTO journal_entries (reference, description, "postedAt", "createdAt", "updatedAt")
           VALUES ($1, $2, NOW(), NOW(), NOW()) RETURNING id`,
          [reference, description]
        );
        const jeId = jeResult.rows[0].id;

        for (const line of lines) {
          await c.query(
            `INSERT INTO journal_lines ("entryId", "accountId", dc, amount, memo, "createdAt", "updatedAt")
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
            [jeId, line.accountId, line.dc, line.amount, line.memo]
          );
        }
        await c.query('COMMIT');
        refSet.add(reference);
        posted++;
        console.log(`  ${GREEN}POST${RESET}  ${reference}: ${money(lines.filter(l => l.dc === 'debit').reduce((s, l) => s + l.amount, 0))} — ${description}`);
      } catch (err) {
        await c.query('ROLLBACK');
        failed++;
        console.error(`  ${RED}FAIL${RESET}  ${reference}: ${err.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // A. RTP TEST ENTRIES — PayShap inflows without wallet journal entries
    // ════════════════════════════════════════════════════════════════
    console.log(`${BOLD}A. RTP Test Entries (PayShap inflows)...${RESET}`);

    const rtpRows = await c.query(`
      SELECT id, amount, status, "createdAt", "merchantTransactionId", metadata
      FROM standard_bank_rtp_requests
      WHERE status = 'paid'
      ORDER BY "createdAt"
    `);

    for (const rtp of rtpRows.rows) {
      const grossAmount = parseFloat(rtp.amount);
      const sbsaFee = 5.75;
      const netWalletCredit = grossAmount - sbsaFee;
      const ref = `BACKFILL-RTP-${rtp.id}`;

      if (netWalletCredit <= 0) {
        console.log(`  ${YELLOW}WARN${RESET}  RTP #${rtp.id} — net credit <= 0, skipping`);
        continue;
      }

      await postJE(ref,
        `Backfill: PayShap RTP ${money(grossAmount)} — SBSA fee ${money(sbsaFee)}, net wallet credit ${money(netWalletCredit)}`,
        [
          { accountId: bankId, dc: 'debit', amount: grossAmount, memo: 'Bank inflow — PayShap RTP' },
          { accountId: clientFloatId, dc: 'credit', amount: netWalletCredit, memo: 'Wallet credit — net of SBSA fee' },
          { accountId: payshapFeeId, dc: 'credit', amount: sbsaFee, memo: 'PayShap SBSA fee (pass-through cost)' },
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // B. DIRECTOR'S LOAN — R4,000 capital injection on 2 April 2026
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}B. Director's Loan (R4,000 capital injection)...${RESET}`);

    await postJE('BACKFILL-DIRECTOR-LOAN-20260402',
      'Director loan: A Botes R4,000 capital injection — 2 April 2026',
      [
        { accountId: bankId, dc: 'debit', amount: 4000, memo: 'Bank inflow — director loan deposit' },
        { accountId: botesLoanId, dc: 'credit', amount: 4000, memo: 'A Botes Loan Account — capital injection' },
      ]
    );

    // ════════════════════════════════════════════════════════════════
    // C. CORRECTING ENTRY — DEP-TXN1 (R1,500 wallet allocation)
    //    Original BACKFILL-DEP-TXN1 incorrectly debited Bank.
    //    The R1,500 came from the director loan, not a separate bank deposit.
    //    Correction: DR A Botes Loan / CR Bank (undo the bank debit, charge the loan)
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}C. Correcting Entry — DEP-TXN1 (R1,500 wallet allocation source)...${RESET}`);

    await postJE('BACKFILL-CORRECT-DEP-TXN1',
      'Correcting entry: R1,500 wallet allocation sourced from director loan, not bank deposit',
      [
        { accountId: botesLoanId, dc: 'debit', amount: 1500, memo: 'Charge A Botes Loan (correct source of wallet allocation)' },
        { accountId: bankId, dc: 'credit', amount: 1500, memo: 'Undo incorrect bank debit from BACKFILL-DEP-TXN1' },
      ]
    );

    // ════════════════════════════════════════════════════════════════
    // D. MOBILEMART FLOAT TOP-UP — R2,500 on 2 April 2026
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}D. MobileMart Float Top-up (R2,500)...${RESET}`);

    await postJE('BACKFILL-FLOAT-TOPUP-MM-20260402',
      'MobileMart float top-up R2,500 — supplier prepayment from treasury bank',
      [
        { accountId: mmFloatId, dc: 'debit', amount: 2500, memo: 'MobileMart float increase (prepayment)' },
        { accountId: bankId, dc: 'credit', amount: 2500, memo: 'Bank outflow — supplier float top-up' },
      ]
    );

    // ════════════════════════════════════════════════════════════════
    // E. P2P TRANSFERS — audit trail entries (DR/CR within Client Float)
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}E. P2P Transfers (audit trail DR/CR within Client Float)...${RESET}`);

    const p2pSends = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."userId", t."createdAt",
             u."firstName" AS "senderFirst", u."lastName" AS "senderLast", u."phoneNumber" AS "senderPhone"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'send' AND t.status = 'completed'
      ORDER BY t."createdAt"
    `);

    for (const send of p2pSends.rows) {
      const amt = parseFloat(send.amount);
      const ref = `BACKFILL-P2P-TXN${send.id}`;

      const receiverPhone = send.description
        ? send.description.split('|')[0].trim()
        : 'Unknown';

      await postJE(ref,
        `Backfill: P2P transfer ${money(amt)} from ${send.senderFirst} ${send.senderLast}`,
        [
          { accountId: clientFloatId, dc: 'debit', amount: amt, memo: `Sender wallet debit (${send.senderPhone})` },
          { accountId: clientFloatId, dc: 'credit', amount: amt, memo: `Receiver wallet credit (${receiverPhone})` },
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // F. VOUCHER ISSUE / REDEEM — via Voucher Clearing (2500-01-01)
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}F. Voucher Issue/Redeem (Voucher Clearing account)...${RESET}`);

    // F1: Issues
    const voucherIssues = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."userId", t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'payment' AND t.status = 'completed'
        AND (
          t.metadata->>'purchaseType' = 'voucher_issue'
          OR t.description LIKE 'Voucher purchase:%'
        )
      ORDER BY t."createdAt"
    `);

    for (const vi of voucherIssues.rows) {
      const amt = parseFloat(vi.amount);
      const ref = `BACKFILL-VOUCHR-ISSUE-TXN${vi.id}`;

      await postJE(ref,
        `Backfill: Voucher issued ${money(amt)} by ${vi.firstName} ${vi.lastName}`,
        [
          { accountId: clientFloatId, dc: 'debit', amount: amt, memo: 'Wallet debit for voucher issue' },
          { accountId: voucherClearingId, dc: 'credit', amount: amt, memo: 'Voucher clearing — unredeemed balance' },
        ]
      );
    }

    // F2: Redemptions
    const voucherRedeems = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."userId", t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'deposit' AND t.status = 'completed'
        AND (
          t.description LIKE 'Voucher redemption:%'
          OR t.metadata->>'voucherCode' IS NOT NULL
        )
      ORDER BY t."createdAt"
    `);

    for (const vr of voucherRedeems.rows) {
      const amt = parseFloat(vr.amount);
      const ref = `BACKFILL-VOUCHR-REDEEM-TXN${vr.id}`;

      await postJE(ref,
        `Backfill: Voucher redeemed ${money(amt)} by ${vr.firstName} ${vr.lastName}`,
        [
          { accountId: voucherClearingId, dc: 'debit', amount: amt, memo: 'Clear voucher clearing on redeem' },
          { accountId: clientFloatId, dc: 'credit', amount: amt, memo: 'Wallet credit — voucher redemption' },
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}${CYAN}${'═'.repeat(60)}${RESET}`);
    console.log(`${BOLD}  BACKFILL v2 SUMMARY — ${ENV.toUpperCase()}${DRY_RUN ? ' (DRY RUN)' : ''}${RESET}`);
    console.log(`${CYAN}${'═'.repeat(60)}${RESET}`);
    console.log(`  ${GREEN}Posted:  ${posted}${RESET}`);
    console.log(`  ${DIM}Skipped: ${skipped}${RESET}`);
    if (failed > 0) console.log(`  ${RED}Failed:  ${failed}${RESET}`);
    console.log();

    if (DRY_RUN) {
      console.log(`  ${YELLOW}This was a dry run. Re-run without --dry-run to post entries.${RESET}\n`);
    } else if (posted > 0) {
      console.log(`  ${GREEN}${BOLD}Re-run the audit to verify: node scripts/production-full-audit.js --${ENV}${RESET}\n`);
    }

  } finally {
    c.release();
  }
})().catch(e => {
  console.error(`\n${RED}FATAL: ${e.message}${RESET}`);
  console.error(e.stack);
  process.exit(1);
});
