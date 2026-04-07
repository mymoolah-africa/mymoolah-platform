'use strict';

/**
 * Migration: Seed 5 disbursement-specific ledger accounts.
 *
 * Accounts:
 *   4000-30-01 — Disbursement EFT Fee Revenue (revenue, credit)
 *   4000-30-02 — Disbursement PayShap Fee Revenue (revenue, credit)
 *   2300-30-01 — Disbursement Fee VAT Control (liability, credit)
 *   5200-30-01 — SBSA EFT Processing Cost (expense, debit)
 *   5200-30-02 — SBSA PayShap Processing Cost (expense, debit)
 *
 * All inserts are idempotent — ON CONFLICT (code) DO NOTHING.
 *
 * @see docs/CHART_OF_ACCOUNTS.md
 * @date 2026-04-08
 */

const ACCOUNTS = [
  { code: '4000-30-01', name: 'Disbursement EFT Fee Revenue',    type: 'revenue',   normalSide: 'credit' },
  { code: '4000-30-02', name: 'Disbursement PayShap Fee Revenue', type: 'revenue',   normalSide: 'credit' },
  { code: '2300-30-01', name: 'Disbursement Fee VAT Control',     type: 'liability', normalSide: 'credit' },
  { code: '5200-30-01', name: 'SBSA EFT Processing Cost',         type: 'expense',   normalSide: 'debit' },
  { code: '5200-30-02', name: 'SBSA PayShap Processing Cost',     type: 'expense',   normalSide: 'debit' },
];

module.exports = {
  async up(queryInterface) {
    console.log('Seeding 5 disbursement ledger accounts...');

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

    console.log(`Done: ${created} created, ${skipped} already existed.`);
  },

  async down(queryInterface) {
    const codes = ['4000-30-01', '4000-30-02', '2300-30-01', '5200-30-01', '5200-30-02'];

    for (const code of codes) {
      await queryInterface.sequelize.query(
        `DELETE FROM ledger_accounts WHERE code = :code`,
        { replacements: { code } }
      );
      console.log(`  Deleted ledger account: ${code}`);
    }
  },
};
