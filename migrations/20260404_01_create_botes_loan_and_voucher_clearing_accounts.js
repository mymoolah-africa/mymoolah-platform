'use strict';

/**
 * Migration: Create A Botes Loan Account (2400-01-01) and Voucher Clearing (2500-01-01)
 *
 * 2400-01-01 — A Botes Loan Account
 *   Type: liability | Normal side: credit
 *   Tracks director loan capital injected into MMTP.
 *   DR Bank (1100-01-01) / CR A Botes Loan (2400-01-01) on capital injection.
 *   DR A Botes Loan / CR Client Float (2100-01-01) on wallet allocation from loan.
 *
 * 2500-01-01 — Voucher Clearing
 *   Type: liability | Normal side: credit
 *   Tracks unredeemed internal MM voucher balances.
 *   Issue:  DR Client Float (2100-01-01) / CR Voucher Clearing (2500-01-01)
 *   Redeem: DR Voucher Clearing (2500-01-01) / CR Client Float (2100-01-01)
 *   Balance should be zero when all issued vouchers are fully redeemed.
 *
 * @date 2026-04-04
 */

const ACCOUNTS = [
  { code: '2400-01-01', name: 'A Botes Loan Account', type: 'liability', normalSide: 'credit' },
  { code: '2500-01-01', name: 'Voucher Clearing', type: 'liability', normalSide: 'credit' },
];

module.exports = {
  async up(queryInterface) {
    for (const acct of ACCOUNTS) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM ledger_accounts WHERE code = '${acct.code}'`
      );
      if (existing.length === 0) {
        await queryInterface.sequelize.query(`
          INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive", "createdAt", "updatedAt")
          VALUES (
            '${acct.code}',
            '${acct.name}',
            '${acct.type}',
            '${acct.normalSide}',
            true,
            NOW(),
            NOW()
          )
        `);
        console.log(`Created ledger account: ${acct.code} — ${acct.name}`);
      } else {
        console.log(`Ledger account already exists: ${acct.code} — ${acct.name}`);
      }
    }
  },

  async down(queryInterface) {
    for (const acct of ACCOUNTS) {
      await queryInterface.sequelize.query(
        `DELETE FROM ledger_accounts WHERE code = '${acct.code}'`
      );
      console.log(`Removed ledger account: ${acct.code}`);
    }
  },
};
