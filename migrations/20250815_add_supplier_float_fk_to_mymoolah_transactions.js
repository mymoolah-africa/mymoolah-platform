'use strict';

/**
 * Add supplierFloatAccount FK to mymoolah_transactions
 * 
 * Runs after create_settlement_system (which creates supplier_floats).
 * create_complete_float_system skips this FK when supplier_floats doesn't exist yet.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const [constraints] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.table_constraints 
      WHERE constraint_name = 'mymoolah_transactions_supplierFloatAccount_fkey'
    `);
    if (constraints && constraints.length > 0) {
      return; // FK already exists
    }
    const [tables] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'supplier_floats'
    `);
    if (!tables || tables.length === 0) {
      return; // supplier_floats not created yet
    }
    await queryInterface.addConstraint('mymoolah_transactions', {
      fields: ['supplierFloatAccount'],
      type: 'foreign key',
      name: 'mymoolah_transactions_supplierFloatAccount_fkey',
      references: {
        table: 'supplier_floats',
        field: 'floatAccountNumber'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_supplierFloatAccount_fkey');
    } catch (e) {
      // ignore if not present
    }
  }
};
