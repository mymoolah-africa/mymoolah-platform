'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const timestamp = new Date();
    await queryInterface.sequelize.query(`
      INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
      VALUES ('5000-10-02', 'Cost of Sales: EasyPay Cash Handling Fee', 'expense', 'debit', :time, :time)
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        "normalSide" = EXCLUDED."normalSide",
        "updatedAt" = EXCLUDED."updatedAt";
    `, {
      replacements: { time: timestamp }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DELETE FROM ledger_accounts WHERE code = '5000-10-02';
    `);
  }
};
