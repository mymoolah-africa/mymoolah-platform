"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("user_notification_settings", {
      userId: { type: Sequelize.INTEGER, primaryKey: true },
      inAppEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      marketingEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      maintenanceEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      freezeOnBankCredit: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      freezeOnWalletCredit: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      soundEnabled: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      flashBell: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
      dndStart: { type: Sequelize.TIME, allowNull: true },
      dndEnd: { type: Sequelize.TIME, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.fn("NOW") },
    });
    await queryInterface.addIndex("user_notification_settings", ["userId"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("user_notification_settings");
  },
};






