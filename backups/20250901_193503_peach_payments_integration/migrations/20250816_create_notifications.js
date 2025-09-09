"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("notifications", {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      type: {
        type: Sequelize.ENUM(
          "txn_wallet_credit",
          "txn_bank_credit",
          "maintenance",
          "promo"
        ),
        allowNull: false,
      },
      title: { type: Sequelize.STRING(200), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: true },
      severity: { type: Sequelize.ENUM("info", "warning", "critical"), allowNull: false, defaultValue: "info" },
      category: { type: Sequelize.ENUM("transaction", "maintenance", "marketing"), allowNull: false, defaultValue: "transaction" },
      payload: { type: Sequelize.JSON, allowNull: true },
      freezeUntilViewed: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      source: { type: Sequelize.ENUM("system", "admin", "job"), allowNull: false, defaultValue: "system" },
      readAt: { type: Sequelize.DATE, allowNull: true },
      acknowledgedAt: { type: Sequelize.DATE, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("notifications", ["userId", "readAt"]);
    await queryInterface.addIndex("notifications", ["userId", "createdAt"]);
    await queryInterface.addIndex("notifications", ["type"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("notifications");
  },
};






