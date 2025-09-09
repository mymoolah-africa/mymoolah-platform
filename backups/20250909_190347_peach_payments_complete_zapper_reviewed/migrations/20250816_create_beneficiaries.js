"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("beneficiaries", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      identifier: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      accountType: {
        type: Sequelize.ENUM("mymoolah", "bank"),
        allowNull: false,
      },
      bankName: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      lastPaidAt: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      timesPaid: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW"),
      },
    });
    await queryInterface.addIndex("beneficiaries", ["userId"]);
    await queryInterface.addIndex("beneficiaries", ["userId", "identifier", "accountType"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("beneficiaries");
  },
};






