#!/usr/bin/env node
/**
 * Backfill Missing Journal Entries — MyMoolah Treasury Platform
 *
 * Posts missing face-value JEs for VAS purchases, deposit JEs for PayShap
 * inflows, and referral payout JEs — all transactions that were already
 * completed but lacked ledger coverage.
 *
 * IDEMPOTENT: Uses unique reference patterns; skips if reference already exists.
 * NON-DESTRUCTIVE: Only INSERTs into journal_entries + journal_lines.
 *
 * Usage:
 *   node scripts/backfill-missing-journal-entries.js --production
 *   node scripts/backfill-missing-journal-entries.js --staging
 *   node scripts/backfill-missing-journal-entries.js --uat
 *   node scripts/backfill-missing-journal-entries.js --production --dry-run
 */

require('dotenv').config();
const path = require('path');
const dbHelper = require(path.resolve(__dirname, 'db-connection-helper'));

const ENV_ARG = process.argv.find(a => ['--staging', '--uat', '--production'].includes(a));
const ENV = ENV_ARG ? ENV_ARG.replace('--', '') : 'production';
const DRY_RUN = process.argv.includes('--dry-run');

const CLIENT_FN = {
  production: 'getProductionClient',
  staging: 'getStagingClient',
  uat: 'getUATClient'
}[ENV];

const GREEN = '\x1b[32m', RED = '\x1b[31m', YELLOW = '\x1b[33m', CYAN = '\x1b[36m';
const BOLD = '\x1b[1m', DIM = '\x1b[2m', RESET = '\x1b[0m';

function money(v) { return `R ${Number(v || 0).toFixed(2)}`; }

(async () => {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║  BACKFILL MISSING JOURNAL ENTRIES — ${ENV.toUpperCase().padEnd(24)}║${RESET}`);
  console.log(`${BOLD}${CYAN}║  ${DRY_RUN ? 'DRY RUN (no writes)' : 'LIVE MODE'}${' '.repeat(DRY_RUN ? 31 : 39)}║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}\n`);

  const c = await dbHelper[CLIENT_FN]();
  let posted = 0, skipped = 0, failed = 0;

  try {
    // ── Load ledger account IDs by code ──
    const accts = await c.query(`SELECT id, code FROM ledger_accounts`);
    const acctMap = {};
    accts.rows.forEach(a => { acctMap[a.code] = a.id; });

    const CLIENT_FLOAT_CODE = '2100-01-01';
    const BANK_CODE = '1100-01-01';
    const REFERRAL_PAYABLE_CODE = '2200-03-01';

    const clientFloatId = acctMap[CLIENT_FLOAT_CODE];
    const bankId = acctMap[BANK_CODE];
    const referralPayableId = acctMap[REFERRAL_PAYABLE_CODE];

    if (!clientFloatId) throw new Error(`Ledger account ${CLIENT_FLOAT_CODE} not found`);
    if (!bankId) throw new Error(`Ledger account ${BANK_CODE} not found`);

    // ── Load supplier float account mappings ──
    const floats = await c.query(`
      SELECT "supplierId", "ledgerAccountCode"
      FROM supplier_floats WHERE "isActive" = true
    `);
    const supplierFloatMap = {};
    floats.rows.forEach(f => {
      supplierFloatMap[f.supplierId.toLowerCase()] = f.ledgerAccountCode;
    });

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
        console.log(`  ${YELLOW}DRY ${RESET}  ${reference}: ${money(total)}`);
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
        console.log(`  ${GREEN}POST${RESET}  ${reference}: ${money(lines[0].amount)} — ${description}`);
      } catch (err) {
        await c.query('ROLLBACK');
        failed++;
        console.error(`  ${RED}FAIL${RESET}  ${reference}: ${err.message}`);
      }
    }

    // ════════════════════════════════════════════════════════════════
    // 1. DEPOSITS — PayShap/EFT deposits without matching JE
    // ════════════════════════════════════════════════════════════════
    console.log(`${BOLD}1. Checking deposits for missing journal entries...${RESET}`);

    const deposits = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'deposit' AND t.status = 'completed'
        AND t.description NOT LIKE '%Voucher%'
      ORDER BY t."createdAt"
    `);

    for (const dep of deposits.rows) {
      const amt = parseFloat(dep.amount);
      const ref = `BACKFILL-DEP-TXN${dep.id}`;

      const hasExisting = existingRefs.rows.some(r =>
        r.reference.includes(dep.transactionId) ||
        r.reference.includes(`DEP-`) && r.reference.includes(String(dep.id))
      );
      if (hasExisting) {
        const matchRef = existingRefs.rows.find(r => r.reference.includes(dep.transactionId));
        console.log(`  ${DIM}SKIP${RESET}  Deposit TXN#${dep.id} ${money(amt)} — already has JE${matchRef ? ` (${matchRef.reference})` : ''}`);
        skipped++;
        continue;
      }

      await postJE(ref,
        `Backfill: PayShap deposit ${money(amt)} — ${dep.firstName} ${dep.lastName}`,
        [
          { accountId: bankId, dc: 'debit', amount: amt, memo: 'Bank inflow (deposit backfill)' },
          { accountId: clientFloatId, dc: 'credit', amount: amt, memo: 'Wallet credit (deposit backfill)' }
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // 2. VAS PURCHASES — face-value JEs (DR client float, CR supplier float)
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}2. Checking VAS purchases for missing face-value journal entries...${RESET}`);

    const vasTxns = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.type, t.description, t.metadata, t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type IN ('payment', 'purchase') AND t.status = 'completed'
        AND (
          t.description ILIKE '%electricity%'
          OR t.description ILIKE '%airtime%'
          OR t.description ILIKE '%data purchase%'
          OR t.description ILIKE '%bill payment%'
          OR t.description ILIKE '%eeziPower%'
          OR t.description ILIKE '%eeziAirtime%'
          OR (t.metadata->>'vasType' IS NOT NULL)
        )
        AND t.description NOT LIKE 'Voucher%'
      ORDER BY t."createdAt"
    `);

    for (const vas of vasTxns.rows) {
      const amt = Math.abs(parseFloat(vas.amount));
      const meta = vas.metadata || {};
      const txnId = vas.transactionId || `TXN${vas.id}`;
      const ref = `BACKFILL-VAS-FACE-TXN${vas.id}`;

      const hasExisting = [...refSet].some(r =>
        (r.includes('VAS-FACE-') && r.includes(txnId)) ||
        (r.includes('EEZI-') && r.includes(txnId)) ||
        r === ref
      );
      if (hasExisting) {
        console.log(`  ${DIM}SKIP${RESET}  VAS TXN#${vas.id} ${money(amt)} — already has face-value JE`);
        skipped++;
        continue;
      }

      const supplierCode = (meta.supplierCode || meta.supplier || '').toLowerCase();
      let floatCode = supplierFloatMap[supplierCode];

      if (!floatCode) {
        const vasType = (meta.vasType || '').toLowerCase();
        if (vas.description && (vas.description.includes('eeziPower') || vas.description.includes('eeziAirtime'))) {
          floatCode = supplierFloatMap['flash'];
        } else if (supplierCode.includes('flash')) {
          floatCode = supplierFloatMap['flash'];
        } else {
          floatCode = supplierFloatMap['mobilemart'];
        }
      }

      if (!floatCode) {
        console.log(`  ${YELLOW}WARN${RESET}  VAS TXN#${vas.id} ${money(amt)} — no supplier float code, defaulting to MobileMart`);
        floatCode = '1200-10-05';
      }

      const floatAcctId = acctMap[floatCode];
      if (!floatAcctId) {
        console.log(`  ${RED}SKIP${RESET}  VAS TXN#${vas.id} — ledger account ${floatCode} not found`);
        skipped++;
        continue;
      }

      const vasType = meta.vasType || 'VAS';
      await postJE(ref,
        `Backfill: VAS face value ${vasType} ${money(amt)} — ${vas.firstName} ${vas.lastName}`,
        [
          { accountId: clientFloatId, dc: 'debit', amount: amt, memo: `Client float debit (${vasType} backfill)` },
          { accountId: floatAcctId, dc: 'credit', amount: amt, memo: `Supplier float consumed (${vasType} backfill)` }
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // 3. REFERRAL PAYOUTS — JE to clear payable + credit client float
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}3. Checking referral payouts for missing journal entries...${RESET}`);

    const refPayouts = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."userId", t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'credit' AND t.status = 'completed'
        AND (
          t.description ILIKE '%referral%payout%'
          OR t.metadata->>'referralPayout' = 'true'
        )
      ORDER BY t."createdAt"
    `);

    for (const payout of refPayouts.rows) {
      const amt = parseFloat(payout.amount);
      const ref = `BACKFILL-REF-PAYOUT-TXN${payout.id}`;

      const hasExisting = [...refSet].some(r =>
        (r.includes('REFERRAL-PAYOUT-') && r.includes(payout.transactionId)) ||
        r === ref
      );
      if (hasExisting) {
        console.log(`  ${DIM}SKIP${RESET}  Referral payout TXN#${payout.id} ${money(amt)} — already has JE`);
        skipped++;
        continue;
      }

      if (!referralPayableId) {
        console.log(`  ${RED}SKIP${RESET}  Referral payout TXN#${payout.id} — ledger account ${REFERRAL_PAYABLE_CODE} not found`);
        skipped++;
        continue;
      }

      await postJE(ref,
        `Backfill: Referral payout ${money(amt)} to ${payout.firstName} ${payout.lastName}`,
        [
          { accountId: referralPayableId, dc: 'debit', amount: amt, memo: 'Clear referral commission payable (backfill)' },
          { accountId: clientFloatId, dc: 'credit', amount: amt, memo: 'Wallet credit — referral payout (backfill)' }
        ]
      );
    }

    // ════════════════════════════════════════════════════════════════
    // 4. FEE TRANSACTIONS — RTP/PayShap fees charged to users
    //    (RTP fees are already handled in SBSA-RTP JEs, so check first)
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}4. Checking fee transactions...${RESET}`);

    const feeTxns = await c.query(`
      SELECT t.id, t."transactionId", t.amount, t.description, t."createdAt",
             u."firstName", u."lastName"
      FROM transactions t
      JOIN users u ON u.id = t."userId"
      WHERE t.type = 'fee' AND t.status = 'completed'
      ORDER BY t."createdAt"
    `);

    for (const fee of feeTxns.rows) {
      const hasRtpJE = [...refSet].some(r => r.startsWith('SBSA-RTP-'));
      if (hasRtpJE) {
        console.log(`  ${DIM}SKIP${RESET}  Fee TXN#${fee.id} ${money(fee.amount)} — covered by RTP journal entries`);
        skipped++;
      }
    }

    // ════════════════════════════════════════════════════════════════
    // SUMMARY
    // ════════════════════════════════════════════════════════════════
    console.log(`\n${BOLD}${CYAN}${'═'.repeat(60)}${RESET}`);
    console.log(`${BOLD}  BACKFILL SUMMARY — ${ENV.toUpperCase()}${DRY_RUN ? ' (DRY RUN)' : ''}${RESET}`);
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
