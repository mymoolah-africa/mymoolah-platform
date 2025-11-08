'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if beneficiaryId column exists
    const tableDescription = await queryInterface.describeTable('vas_transactions');
    
    if (!tableDescription.beneficiaryId) {
      await queryInterface.addColumn('vas_transactions', 'beneficiaryId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Beneficiary ID if applicable',
        references: {
          model: 'beneficiaries',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      });

      // Add index for performance
      await queryInterface.addIndex('vas_transactions', ['beneficiaryId'], {
        name: 'idx_vas_transactions_beneficiary'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index first
    await queryInterface.removeIndex('vas_transactions', 'idx_vas_transactions_beneficiary');
    
    // Remove column
    await queryInterface.removeColumn('vas_transactions', 'beneficiaryId');
  }
};

