'use strict';

/**
 * Migration: Seed 4 ledger accounts that are referenced in application code
 * but were never created via migration.
 *
 * These accounts function in environments where the env var is set or the
 * row was manually created, but a fresh database deployment would lack them.
 *
 * Accounts:
 *   1100-02-01 — SBSA Statement Reconciliation Account (asset, debit)
 *     Used by: sbsaStatementService.js (env: SBSA_MAIN_ACCOUNT_CODE)
 *     Purpose: MT940/MT942 bank statement balance tracking and reconciliation.
 *
 *   2200-03-01 — Referral Commission Payable (liability, credit)
 *     Used by: referralPayoutService.js (env: LEDGER_ACCOUNT_REFERRAL_PAYABLE)
 *     Purpose: Accrued referral commissions awaiting payout to user wallets.
 *     Journal: DR this account / CR Client Float (2100-01-01) on payout.
 *
 *   2600-01-01 — Unallocated Deposits / Suspense (liability, credit)
 *     Used by: standardbankDepositNotificationService.js (env: LEDGER_ACCOUNT_UNALLOCATED)
 *     Purpose: Bank deposits that cannot be matched to a user wallet.
 *     Journal: DR Bank (1100-01-01) / CR this account on receipt;
 *              DR this account / CR Client Float (2100-01-01) on resolution.
 *
 *   5100-02-01 — Referral Expense (expense, debit)
 *     Used by: production-full-audit.js (reconciliation output)
 *     Purpose: Referral commission expense recognition.
 *
 * All inserts are idempotent — ON CONFLICT (code) DO NOTHING.
 *
 * @see docs/CHART_OF_ACCOUNTS.md — Section 2
 * @date 2026-04-05
 */

const ACCOUNTS = [
  { code: '1100-02-01', name: 'SBSA Statement Reconciliation Account', type: 'asset',     normalSide: 'debit' },
  { code: '2200-03-01', name: 'Referral Commission Payable',           type: 'liability', normalSide: 'credit' },
  { code: '2600-01-01', name: 'Unallocated Deposits / Suspense',       type: 'liability', normalSide: 'credit' },
  { code: '5100-02-01', name: 'Referral Expense',                      type: 'expense',   normalSide: 'debit' },
];

module.exports = {
  async up(queryInterface) {
    console.log('Seeding 4 missing ledger accounts...');

    let created = 0;
    let skipped = 0;

    for (const acct of ACCOUNTS) {
      try {
        const [, result] = await queryInterface.sequelize.query(
          `INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive", "createdAt", "updatedAt")
           VALUES (:code, :name, :type, :normalSide, true, NOW(), NOW())
           ON CONFLICT (code) DO NOTHING`,
          { replacements: acct }
        );
        const inserted = result && result.rowCount > 0;
        if (inserted) {
          console.log(`  Created ${acct.code} — ${acct.name}`);
          created++;
        } else {
          console.log(`  Exists  ${acct.code} — ${acct.name}`);
          skipped++;
        }
      } catch (err) {
        console.error(`  Failed ${acct.code}: ${err.message}`);
      }
    }

    console.log(`\nMissing accounts: ${created} created, ${skipped} already existed`);
  },

  async down(queryInterface) {
    const codes = ACCOUNTS.map(a => a.code);
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code IN (:codes)`,
      { replacements: { codes } }
    );
    console.log('Removed 4 missing ledger accounts');
  },
};
