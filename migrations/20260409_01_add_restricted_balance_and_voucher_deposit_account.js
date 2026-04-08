'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add restricted_balance column to wallets (NULL-allowed = instant, no table rewrite)
    await queryInterface.addColumn('wallets', 'restricted_balance', {
      type: Sequelize.DECIMAL(15, 2),
      allowNull: true,
      defaultValue: 0.00,
    });

    // 2. Seed ledger account 2100-01-02 for restricted voucher deposit tracking
    await queryInterface.sequelize.query(`
      INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
      VALUES (
        '2100-01-02',
        'Client Float Liability — Restricted (Voucher Deposits)',
        'LIABILITY',
        'credit',
        NOW(),
        NOW()
      )
      ON CONFLICT (code) DO NOTHING;
    `);

    console.log('Migration UP: added wallets.restricted_balance + seeded 2100-01-02');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('wallets', 'restricted_balance');

    await queryInterface.sequelize.query(`
      DELETE FROM ledger_accounts WHERE code = '2100-01-02';
    `);

    console.log('Migration DOWN: removed wallets.restricted_balance + deleted 2100-01-02');
  }
};
