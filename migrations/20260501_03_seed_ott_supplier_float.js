'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO supplier_floats (
        "supplierId", "supplierName", "floatAccountNumber", "floatAccountName",
        "ledgerAccountCode", "currentBalance", "initialBalance", "minimumBalance",
        "settlementPeriod", "settlementMethod", status, "isActive", metadata,
        "createdAt", "updatedAt"
      )
      VALUES (
        'OTT', 'OTT Mobile', 'OTT-UAT-PAYOUT-VAS-FLOAT', 'OTT Mobile Payout and VAS Float',
        '1200-10-08', 0.00, 0.00, 0.00,
        'real_time', 'prefunded', 'active', true,
        '{"source":"20260501_03_seed_ott_supplier_float","note":"Operational float balance is reconciled externally against OTT portal/settlement evidence."}'::jsonb,
        NOW(), NOW()
      )
      ON CONFLICT ("floatAccountNumber") DO UPDATE SET
        "supplierId" = EXCLUDED."supplierId",
        "supplierName" = EXCLUDED."supplierName",
        "floatAccountName" = EXCLUDED."floatAccountName",
        "ledgerAccountCode" = EXCLUDED."ledgerAccountCode",
        "settlementPeriod" = EXCLUDED."settlementPeriod",
        "settlementMethod" = EXCLUDED."settlementMethod",
        status = EXCLUDED.status,
        "isActive" = true,
        metadata = supplier_floats.metadata || EXCLUDED.metadata,
        "updatedAt" = NOW();
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM supplier_floats
      WHERE "floatAccountNumber" = 'OTT-UAT-PAYOUT-VAS-FLOAT'
        AND COALESCE("currentBalance", 0) = 0;
    `);
  },
};
