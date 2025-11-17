'use strict';

/**
 * Add PayShap Reference field to beneficiary_payment_methods
 * 
 * For PayShap bank transfers, the reference field MUST be the recipient's mobile number (MSISDN).
 * This is required for deposits into wallets via PayShap.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('beneficiary_payment_methods', 'payShapReference', {
      type: Sequelize.STRING(20),
      allowNull: true,
      comment: 'PayShap reference (recipient MSISDN) - REQUIRED for PayShap bank transfers to wallets'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('beneficiary_payment_methods', 'payShapReference');
  }
};
