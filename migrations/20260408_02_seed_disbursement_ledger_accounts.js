'use strict';

module.exports = {
  async up(queryInterface) {
    const accounts = [
      { code: '4000-30-01', name: 'Disbursement EFT Fee Revenue', type: 'revenue', subType: 'fee_revenue' },
      { code: '4000-30-02', name: 'Disbursement PayShap Fee Revenue', type: 'revenue', subType: 'fee_revenue' },
      { code: '2300-30-01', name: 'Disbursement Fee VAT Control', type: 'liability', subType: 'vat_control' },
      { code: '5200-30-01', name: 'SBSA EFT Processing Cost', type: 'expense', subType: 'processing_cost' },
      { code: '5200-30-02', name: 'SBSA PayShap Processing Cost', type: 'expense', subType: 'processing_cost' },
    ];

    for (const account of accounts) {
      const [existing] = await queryInterface.sequelize.query(
        `SELECT id FROM ledger_accounts WHERE code = :code`,
        { replacements: { code: account.code }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (!existing) {
        await queryInterface.sequelize.query(
          `INSERT INTO ledger_accounts (code, name, type, sub_type, balance, is_active, created_at, updated_at)
           VALUES (:code, :name, :type, :subType, 0, true, NOW(), NOW())`,
          { replacements: account }
        );
        console.log(`  ✅ Created ledger account: ${account.code} — ${account.name}`);
      } else {
        console.log(`  ⏭️  Ledger account ${account.code} already exists — skipping`);
      }
    }
  },

  async down(queryInterface) {
    const codes = [
      '4000-30-01',
      '4000-30-02',
      '2300-30-01',
      '5200-30-01',
      '5200-30-02',
    ];

    for (const code of codes) {
      await queryInterface.sequelize.query(
        `DELETE FROM ledger_accounts WHERE code = :code AND balance = 0`,
        { replacements: { code } }
      );
      console.log(`  🗑️  Deleted ledger account: ${code} (if balance was 0)`);
    }
  },
};
