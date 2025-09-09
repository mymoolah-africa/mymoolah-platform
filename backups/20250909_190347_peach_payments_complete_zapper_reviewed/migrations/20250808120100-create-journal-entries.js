"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("journal_entries", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      reference: { type: Sequelize.STRING(64), allowNull: true, unique: true },
      description: { type: Sequelize.STRING(512), allowNull: true },
      postedAt: { type: Sequelize.DATE, allowNull: false },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
    await queryInterface.addIndex("journal_entries", ["postedAt"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("journal_entries");
  }
};
