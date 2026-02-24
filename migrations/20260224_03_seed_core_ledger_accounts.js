'use strict';

/**
 * Migration: Seed Core Chart of Accounts
 *
 * Creates the foundational ledger accounts required for double-entry
 * bookkeeping across all MyMoolah payment flows (PayShap, Flash, NFC, etc.)
 *
 * Accounts are inserted with INSERT ... ON CONFLICT DO NOTHING so this
 * migration is safe to re-run and will never overwrite existing accounts.
 */

const CORE_ACCOUNTS = [
  // ── Assets ──────────────────────────────────────────────────────────────
  { code: '1100-01-01', name: 'Standard Bank Current Account',         type: 'asset',     normalSide: 'debit' },
  { code: '1200-01-01', name: 'Client Float - General',                type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-01', name: 'Zapper Float Account',                  type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-02', name: 'EasyPay Top-up Float Account',          type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-03', name: 'EasyPay Cash-out Float Account',        type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-04', name: 'Flash Float Account',                   type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-05', name: 'MobileMart Float Account',              type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-06', name: 'DT Mercury / VALR Float Account',       type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-07', name: 'PayShap Outbound Float',                type: 'asset',     normalSide: 'debit' },
  { code: '1200-10-10', name: 'NFC Deposit Float Account',             type: 'asset',     normalSide: 'debit' },
  { code: '1200-05-01', name: 'Interchange Receivable',                type: 'asset',     normalSide: 'debit' },

  // ── Liabilities ──────────────────────────────────────────────────────────
  { code: '2100-01-01', name: 'Client Float Liability',                type: 'liability', normalSide: 'credit' },
  { code: '2100-02-01', name: 'Client Clearing Account',               type: 'liability', normalSide: 'credit' },
  { code: '2100-05-01', name: 'Merchant Ad Float',                     type: 'liability', normalSide: 'credit' },
  { code: '2200-01-01', name: 'MM Commission Clearing',                type: 'liability', normalSide: 'credit' },
  { code: '2200-02-01', name: 'Supplier Clearing Account',             type: 'liability', normalSide: 'credit' },
  { code: '2300-10-01', name: 'VAT Control Account',                   type: 'liability', normalSide: 'credit' },

  // ── Revenue ──────────────────────────────────────────────────────────────
  { code: '4000-10-01', name: 'Commission Revenue',                    type: 'revenue',   normalSide: 'credit' },
  { code: '4000-20-01', name: 'Transaction Fee Revenue',               type: 'revenue',   normalSide: 'credit' },
  { code: '4100-01-06', name: 'USDC Fee Revenue',                      type: 'revenue',   normalSide: 'credit' },
  { code: '4100-05-01', name: 'Ad Revenue',                            type: 'revenue',   normalSide: 'credit' },

  // ── Cost of Sales ─────────────────────────────────────────────────────────
  { code: '5000-10-01', name: 'Cost of Sales: PayShap SBSA Fee',       type: 'expense',   normalSide: 'debit' },

  // ── Expenses ──────────────────────────────────────────────────────────────
  { code: '5100-03-01', name: 'Ad Reward Expense',                     type: 'expense',   normalSide: 'debit' },

  // ── Clearing / Suspense ───────────────────────────────────────────────────
  { code: '9999-00-01', name: 'USDC Fee Clearing / Suspense',          type: 'liability', normalSide: 'credit' },
];

module.exports = {
  async up(queryInterface) {
    console.log('🔄 Seeding core chart of accounts...');

    let created = 0;
    let skipped = 0;

    for (const acct of CORE_ACCOUNTS) {
      try {
        const [, wasCreated] = await queryInterface.sequelize.query(
          `INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive", "createdAt", "updatedAt")
           VALUES (:code, :name, :type, :normalSide, true, NOW(), NOW())
           ON CONFLICT (code) DO NOTHING`,
          { replacements: acct }
        );
        // rowCount > 0 means a row was inserted
        const inserted = wasCreated && wasCreated.rowCount > 0;
        if (inserted) {
          console.log(`  ✅ Created ${acct.code} — ${acct.name}`);
          created++;
        } else {
          console.log(`  ℹ️  Exists  ${acct.code} — ${acct.name}`);
          skipped++;
        }
      } catch (err) {
        console.error(`  ❌ Failed ${acct.code}: ${err.message}`);
      }
    }

    console.log(`\n📊 Core accounts: ${created} created, ${skipped} already existed`);
  },

  async down(queryInterface) {
    const codes = CORE_ACCOUNTS.map((a) => `'${a.code}'`).join(', ');
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code IN (${codes})`
    );
    console.log('✅ Core chart of accounts removed');
  },
};
