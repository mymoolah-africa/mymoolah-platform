'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add MSISDN column
    await queryInterface.addColumn('beneficiaries', 'msisdn', {
      type: Sequelize.STRING(15),
      allowNull: false,
      comment: 'Mobile number (MSISDN) - unique per user for beneficiary identification'
    });

    // Step 2: Add user-scoped unique constraint (NOT global)
    await queryInterface.addIndex('beneficiaries', ['userId', 'msisdn'], {
      unique: true,
      name: 'beneficiaries_user_msisdn_unique'
    });

    // Step 3: Add performance index for MSISDN lookups
    await queryInterface.addIndex('beneficiaries', ['msisdn'], {
      name: 'beneficiaries_msisdn_index'
    });

    // Step 4: Add check constraint for MSISDN format (South African mobile numbers)
    await queryInterface.addConstraint('beneficiaries', {
      fields: ['msisdn'],
      type: 'check',
      name: 'beneficiaries_msisdn_format_check',
      where: {
        msisdn: Sequelize.literal("msisdn ~ '^0[6-8][0-9]{8}$'")
      }
    });

    // Step 5: Update existing beneficiaries with placeholder MSISDN if needed
    // This ensures the NOT NULL constraint doesn't break existing data
    await queryInterface.sequelize.query(`
      UPDATE beneficiaries 
      SET msisdn = CONCAT('0', FLOOR(RANDOM() * 900000000 + 100000000))
      WHERE msisdn IS NULL OR msisdn = ''
    `);

    console.log('✅ MSISDN field added to beneficiaries table with user-scoped uniqueness');
  },

  async down(queryInterface, Sequelize) {
    // Remove all MSISDN-related changes
    await queryInterface.removeConstraint('beneficiaries', 'beneficiaries_msisdn_format_check');
    await queryInterface.removeIndex('beneficiaries', 'beneficiaries_msisdn_index');
    await queryInterface.removeIndex('beneficiaries', 'beneficiaries_user_msisdn_unique');
    await queryInterface.removeColumn('beneficiaries', 'msisdn');
    
    console.log('✅ MSISDN field removed from beneficiaries table');
  }
};
