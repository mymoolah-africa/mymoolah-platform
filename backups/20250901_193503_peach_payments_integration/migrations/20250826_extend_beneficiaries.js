'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add new account types to the ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'airtime';
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'data';
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'electricity';
      ALTER TYPE "enum_beneficiaries_accountType" ADD VALUE IF NOT EXISTS 'biller';
    `);

    // Add metadata column
    await queryInterface.addColumn('beneficiaries', 'metadata', {
      type: Sequelize.JSONB,
      allowNull: true,
      comment: 'Additional metadata for different beneficiary types'
    });

    // Add index for accountType
    await queryInterface.addIndex('beneficiaries', ['accountType'], {
      name: 'beneficiaries_accountType_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove metadata column
    await queryInterface.removeColumn('beneficiaries', 'metadata');
    
    // Remove index
    await queryInterface.removeIndex('beneficiaries', 'beneficiaries_accountType_idx');
    
    // Note: Cannot easily remove ENUM values in PostgreSQL, so we'll leave them
    // The application will handle the validation
  }
};
