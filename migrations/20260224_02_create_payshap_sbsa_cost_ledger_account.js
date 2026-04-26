'use strict';

/**
 * Migration: Create PayShap SBSA Cost ledger account (5000-10-01)
 *
 * This is a Cost of Sales account for SBSA PayShap fees only when MMTP
 * absorbs the fee. Customer-collected SBSA RPP/RTP fees are pass-through
 * and must post to supplier clearing, not this expense account.
 *
 * Account structure:
 *   5000-10-01 = Cost of Sales: PayShap SBSA Fee
 *   Type: expense (cost of sale)
 *   Normal side: debit
 *
 * Used by:
 *   Future fee-absorbed PayShap flows only
 *
 * Current customer-collected RPP/RTP fee model:
 *   CR  Supplier Clearing (SBSA fee VAT-inclusive pass-through)
 *   CR  Fee Revenue / VAT Control only for MMTP-owned markup
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
