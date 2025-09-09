'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Remove the existing NOT NULL constraint and validation
    await queryInterface.changeColumn('beneficiaries', 'msisdn', {
      type: Sequelize.STRING(15),
      allowNull: true,
      comment: 'Mobile number (MSISDN) - required for mobile-based beneficiaries, optional for utilities/billers'
    });

    // Step 2: Remove the existing check constraint for mobile number format
    try {
      await queryInterface.removeConstraint('beneficiaries', 'beneficiaries_msisdn_format_check');
    } catch (error) {
      console.log('Format check constraint already removed or does not exist');
    }

    // Step 3: Remove the existing conditional constraint for msisdn
    try {
      await queryInterface.removeConstraint('beneficiaries', 'beneficiaries_msisdn_conditional_check');
    } catch (error) {
      console.log('Conditional check constraint already removed or does not exist');
    }

    // Step 4: Add new conditional constraint for msisdn
    // Use a literal to avoid case sensitivity issues on column names
    await queryInterface.addConstraint('beneficiaries', {
      fields: ['accountType', 'msisdn'],
      type: 'check',
      name: 'beneficiaries_msisdn_conditional_check',
      where: Sequelize.literal("((\"accountType\" IN ('mymoolah','airtime','data') AND msisdn IS NOT NULL) OR (\"accountType\" IN ('electricity','biller','bank')))"),
    });

    // Step 5: Add validation constraint for mobile number format when msisdn is provided
    await queryInterface.addConstraint('beneficiaries', {
      fields: ['msisdn'],
      type: 'check',
      name: 'beneficiaries_msisdn_format_check',
      where: Sequelize.literal("(msisdn IS NULL OR msisdn ~ '^0[6-8][0-9]{8}$')"),
    });

    // Step 6: Update existing electricity and biller beneficiaries to have null msisdn
    await queryInterface.sequelize.query(`
      UPDATE beneficiaries 
      SET msisdn = NULL 
      WHERE "accountType" IN ('electricity', 'biller') 
      AND msisdn IS NOT NULL
    `);

    console.log('✅ MSISDN constraints updated for banking-grade beneficiary management');
  },

  async down(queryInterface, Sequelize) {
    // Remove new constraints
    await queryInterface.removeConstraint('beneficiaries', 'beneficiaries_msisdn_format_check');
    await queryInterface.removeConstraint('beneficiaries', 'beneficiaries_msisdn_conditional_check');

    // Restore original NOT NULL constraint
    await queryInterface.changeColumn('beneficiaries', 'msisdn', {
      type: Sequelize.STRING(15),
      allowNull: false,
      comment: 'Mobile number (MSISDN) - unique per user for beneficiary identification'
    });

    // Restore original check constraint
    await queryInterface.addConstraint('beneficiaries', {
      fields: ['msisdn'],
      type: 'check',
      name: 'beneficiaries_msisdn_format_check',
      where: Sequelize.literal("msisdn ~ '^0[6-8][0-9]{8}$'"),
    });

    console.log('✅ MSISDN constraints reverted to original state');
  }
};
