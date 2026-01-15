'use strict';

/**
 * Migration: Update Existing Supplier Floats with Ledger Account Codes
 * 
 * This migration updates existing supplier float accounts with their
 * corresponding ledger account codes based on supplierId mapping.
 * 
 * Mapping:
 * - zapper -> 1200-10-01
 * - easypay_topup -> 1200-10-02
 * - easypay_cashout -> 1200-10-03
 * - flash -> 1200-10-04
 * - mobilemart -> 1200-10-05
 * - dtmercury -> 1200-10-06
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🔄 Updating existing supplier floats with ledger account codes...');

    const { SupplierFloat } = require('../models');

    // Mapping of supplierId to ledger account code
    const supplierLedgerMapping = {
      'zapper': '1200-10-01',
      'easypay_topup': '1200-10-02',
      'easypay_cashout': '1200-10-03',
      'flash': '1200-10-04',
      'mobilemart': '1200-10-05',
      'dtmercury': '1200-10-06'
    };

    // Get all supplier floats
    const floats = await SupplierFloat.findAll();

    if (floats.length === 0) {
      console.log('ℹ️  No supplier floats found to update');
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const float of floats) {
      const ledgerCode = supplierLedgerMapping[float.supplierId];

      if (!ledgerCode) {
        console.log(`⚠️  No ledger code mapping found for supplierId: ${float.supplierId} (${float.supplierName})`);
        skippedCount++;
        continue;
      }

      if (float.ledgerAccountCode === ledgerCode) {
        console.log(`ℹ️  Float ${float.floatAccountNumber} already has correct ledger code: ${ledgerCode}`);
        skippedCount++;
        continue;
      }

      try {
        await float.update({ ledgerAccountCode: ledgerCode });
        console.log(`✅ Updated ${float.floatAccountNumber} (${float.supplierName}) with ledger code: ${ledgerCode}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Error updating float ${float.floatAccountNumber}:`, error.message);
      }
    }

    console.log(`\n📊 Summary: ${updatedCount} updated, ${skippedCount} skipped`);
    console.log('✅ Supplier floats updated with ledger account codes');
  },

  async down(queryInterface, Sequelize) {
    console.log('🔄 Clearing ledger account codes from supplier floats...');

    const { SupplierFloat } = require('../models');

    try {
      const result = await SupplierFloat.update(
        { ledgerAccountCode: null },
        { where: { ledgerAccountCode: { [Sequelize.Op.ne]: null } } }
      );

      console.log(`✅ Cleared ledger account codes from ${result[0]} supplier float(s)`);
    } catch (error) {
      console.error('❌ Error clearing ledger account codes:', error.message);
      throw error;
    }
  }
};
