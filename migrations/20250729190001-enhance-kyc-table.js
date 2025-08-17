'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Only add fields that don't already exist
    await queryInterface.addColumn('kyc', 'ocrAttempts', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false
    });

    await queryInterface.addColumn('kyc', 'ocrResults', {
      type: Sequelize.JSON,
      allowNull: true
    });

    await queryInterface.addColumn('kyc', 'validationStatus', {
      type: Sequelize.ENUM('pending', 'validated', 'failed', 'manual_review'),
      defaultValue: 'pending',
      allowNull: false
    });

    await queryInterface.addColumn('kyc', 'validationDetails', {
      type: Sequelize.JSON,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('kyc', 'ocrAttempts');
    await queryInterface.removeColumn('kyc', 'ocrResults');
    await queryInterface.removeColumn('kyc', 'validationStatus');
    await queryInterface.removeColumn('kyc', 'validationDetails');
  }
}; 