"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("ledger_accounts", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      code: { type: Sequelize.STRING(64), allowNull: false, unique: true },
      name: { type: Sequelize.STRING(255), allowNull: false },
      type: { type: Sequelize.STRING(64), allowNull: false },
      normalSide: { type: Sequelize.STRING(6), allowNull: false },
      isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
    await queryInterface.addIndex("ledger_accounts", ["type"]);
    await queryInterface.addIndex("ledger_accounts", ["isActive"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("ledger_accounts");
  }
};
