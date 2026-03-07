'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('beneficiaries', 'msisdn', {
      type: Sequelize.STRING(20),
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('beneficiaries', 'msisdn', {
      type: Sequelize.STRING(15),
      allowNull: true,
    });
  },
};
