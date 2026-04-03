'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('product_selection_rules', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      vas_type: { type: Sequelize.STRING(32), allowNull: false },
      type_label: { type: Sequelize.STRING(64), allowNull: false },
      name_pattern: { type: Sequelize.STRING(255), allowNull: false },
      bracket_code: { type: Sequelize.STRING(16), allowNull: false },
      min_cents: { type: Sequelize.INTEGER, allowNull: false },
      max_cents: { type: Sequelize.INTEGER, allowNull: false },
      picks: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
      priority: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      is_active: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('product_selection_rules',
      ['vas_type', 'bracket_code', 'type_label'],
      { unique: true, name: 'idx_selection_rules_unique' }
    );

    // Seed Andre's bracket x type matrix for data products
    const brackets = [
      { code: 'A', min: 100, max: 1000 },
      { code: 'B', min: 1100, max: 3000 },
      { code: 'C', min: 3100, max: 5000 },
      { code: 'D', min: 5100, max: 8000 },
      { code: 'E', min: 8100, max: 11000 },
      { code: 'F', min: 11100, max: 14000 },
      { code: 'G', min: 14100, max: 17000 },
      { code: 'H', min: 17100, max: 20000 },
    ];

    const dataTypes = [
      { label: 'Daily data',   pattern: '%Daily%' },
      { label: 'Weekly data',  pattern: '%Weekly%' },
      { label: 'Monthly data', pattern: '%Monthly%' },
      { label: 'Facebook',     pattern: '%Facebook%' },
      { label: 'WhatsApp',     pattern: '%WhatsApp%' },
      { label: 'TikTok',       pattern: '%TikTok%' },
      { label: 'YouTube',      pattern: '%YouTube%' },
    ];

    const rows = [];
    for (const b of brackets) {
      for (const t of dataTypes) {
        rows.push({
          vas_type: 'data',
          type_label: t.label,
          name_pattern: t.pattern,
          bracket_code: b.code,
          min_cents: b.min,
          max_cents: b.max,
          picks: 1,
          priority: 0,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        });
      }
    }

    // Airtime: one variable product per provider (full range)
    rows.push({
      vas_type: 'airtime', type_label: 'airtime', name_pattern: '%',
      bracket_code: 'VARIABLE', min_cents: 200, max_cents: 99900,
      picks: 1, priority: 0, is_active: true,
      created_at: new Date(), updated_at: new Date()
    });

    // Electricity: one per municipality (full range)
    rows.push({
      vas_type: 'electricity', type_label: 'electricity', name_pattern: '%',
      bracket_code: 'VARIABLE', min_cents: 500, max_cents: 200000,
      picks: 1, priority: 0, is_active: true,
      created_at: new Date(), updated_at: new Date()
    });

    // Voucher: one per brand (full range)
    rows.push({
      vas_type: 'voucher', type_label: 'voucher', name_pattern: '%',
      bracket_code: 'ALL', min_cents: 100, max_cents: 500000,
      picks: 1, priority: 0, is_active: true,
      created_at: new Date(), updated_at: new Date()
    });

    // Bill payment: one per biller
    rows.push({
      vas_type: 'bill_payment', type_label: 'bill_payment', name_pattern: '%',
      bracket_code: 'ALL', min_cents: 100, max_cents: 5000000,
      picks: 1, priority: 0, is_active: true,
      created_at: new Date(), updated_at: new Date()
    });

    await queryInterface.bulkInsert('product_selection_rules', rows);
    console.log(`  Seeded ${rows.length} product selection rules`);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('product_selection_rules');
  }
};
