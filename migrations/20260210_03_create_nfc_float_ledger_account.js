'use strict';

/**
 * Migration: Create NFC Float ledger account
 * Account 1200-10-10 for NFC tap-to-deposit acquiring float.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const nfcFloatCode = process.env.LEDGER_ACCOUNT_NFC_FLOAT || '1200-10-10';

    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM ledger_accounts WHERE code = '${nfcFloatCode}'`
    );

    if (existing.length === 0) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive")
        VALUES ('${nfcFloatCode}', 'NFC Acquiring Float', 'asset', 'debit', true)
      `);
      console.log(`✅ NFC float ledger account created: ${nfcFloatCode}`);
    } else {
      console.log(`ℹ️ NFC float ledger account already exists: ${nfcFloatCode}`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    const nfcFloatCode = process.env.LEDGER_ACCOUNT_NFC_FLOAT || '1200-10-10';
    await queryInterface.sequelize.query(
      `DELETE FROM ledger_accounts WHERE code = '${nfcFloatCode}'`
    );
    console.log(`✅ NFC float ledger account removed: ${nfcFloatCode}`);
  },
};
