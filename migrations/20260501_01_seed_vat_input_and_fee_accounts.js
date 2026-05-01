'use strict';

const ACCOUNTS = [
  {
    code: '1300-20-01',
    name: 'VAT Input Recoverable',
    type: 'asset',
    normalSide: 'debit',
  },
  {
    code: '5000-10-03',
    name: 'Cost of Sales: SBSA PayShap RPP/RTP Fees',
    type: 'expense',
    normalSide: 'debit',
  },
  {
    code: '5000-10-04',
    name: 'Cost of Sales: EFT Supplier Payment Fees',
    type: 'expense',
    normalSide: 'debit',
  },
  {
    code: '5100-01-01',
    name: 'Bank Charges Expense',
    type: 'expense',
    normalSide: 'debit',
  },
];

module.exports = {
  async up(queryInterface) {
    for (const account of ACCOUNTS) {
      await queryInterface.sequelize.query(`
        INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
        VALUES (:code, :name, :type, :normalSide, NOW(), NOW())
        ON CONFLICT (code) DO UPDATE SET
          name = EXCLUDED.name,
          type = EXCLUDED.type,
          "normalSide" = EXCLUDED."normalSide",
          "updatedAt" = NOW();
      `, { replacements: account });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM ledger_accounts la
      WHERE la.code IN (:codes)
        AND NOT EXISTS (
          SELECT 1
          FROM journal_lines jl
          WHERE jl."accountId" = la.id
        );
    `, { replacements: { codes: ACCOUNTS.map((account) => account.code) } });
  },
};
