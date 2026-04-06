'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO ledger_accounts (code, name, type, "normalSide", "isActive", "createdAt", "updatedAt")
      VALUES ('4000-20-03', 'SMS Fee Revenue', 'REVENUE', 'credit', true, NOW(), NOW())
      ON CONFLICT (code) DO NOTHING;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM ledger_accounts WHERE code = '4000-20-03';
    `);
  },
};
