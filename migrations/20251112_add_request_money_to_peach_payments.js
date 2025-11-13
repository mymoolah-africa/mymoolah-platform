/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add 'request_money_payshap' to the enum_peach_payments_type enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_peach_payments_type" ADD VALUE IF NOT EXISTS 'request_money_payshap';
    `);
  },

  async down(queryInterface, Sequelize) {
    // Note: PostgreSQL doesn't support removing enum values directly
    // This would require recreating the enum and updating all records
    // For safety, we'll leave this as a no-op
    // If rollback is truly needed, it would require:
    // 1. Create new enum without 'request_money_payshap'
    // 2. Update all records to use old enum values
    // 3. Drop old enum and rename new one
    console.log('⚠️  Rollback of enum value removal not supported. Manual intervention required.');
  }
};


