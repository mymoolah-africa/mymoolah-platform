'use strict';

/**
 * Migration: Create PayShap SBSA Cost ledger account (5000-10-01)
 *
 * This is a Cost of Sales account for the SBSA PayShap transaction fee
 * that MyMoolah pays to Standard Bank per RPP and RTP transaction.
 *
 * Account structure:
 *   5000-10-01 = Cost of Sales: PayShap SBSA Fee
 *   Type: expense (cost of sale)
 *   Normal side: debit
 *
 * Used by:
 *   standardbankRppService.js  — LEDGER_ACCOUNT_PAYSHAP_SBSA_COST
 *   standardbankRtpService.js  — LEDGER_ACCOUNT_PAYSHAP_SBSA_COST
 *
 * RPP ledger entry:
 *   DR  Client Float     (total user charge)
 *   CR  Bank             (principal outflow)
 *   CR  SBSA Cost        (SBSA fee ex-VAT)   ← this account
 *   CR  Fee Revenue      (MM markup ex-VAT)
 *   CR  VAT Control      (net VAT payable)
 *
 * RTP ledger entry (on Paid callback):
 *   DR  Bank             (principal inflow)
 *   CR  Client Float     (net credit to wallet)
 *   CR  SBSA Cost        (SBSA fee ex-VAT)   ← this account
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-24
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const accountCode = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_COST || '5000-10-01';

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE code = '${accountCode}'`
    );

    if (existing.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive", "createdAt", "updatedAt")
        VALUES (
          '${accountCode}',
          'Cost of Sales: PayShap SBSA Fee',
          'expense',
          'debit',
          true,
          NOW(),
          NOW()
        )
      `);
      console.log(`✅ PayShap SBSA cost ledger account created: ${accountCode}`);
    } else {
      console.log(`ℹ️  PayShap SBSA cost ledger account already exists: ${accountCode}`);
    }
  },

  async down(queryInterface, Sequelize) {
    const accountCode = process.env.LEDGER_ACCOUNT_PAYSHAP_SBSA_COST || '5000-10-01';
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code = '${accountCode}'`
    );
    console.log(`✅ PayShap SBSA cost ledger account removed: ${accountCode}`);
  },
};
