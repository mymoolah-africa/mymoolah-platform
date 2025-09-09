'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('wallets', 'kycVerified', {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn('wallets', 'kycVerifiedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('wallets', 'kycVerifiedBy', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('wallets', 'kycVerified');
    await queryInterface.removeColumn('wallets', 'kycVerifiedAt');
    await queryInterface.removeColumn('wallets', 'kycVerifiedBy');
  }
}; 