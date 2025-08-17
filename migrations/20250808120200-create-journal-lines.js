"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("journal_lines", {
      id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
      entryId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "journal_entries", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      accountId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "ledger_accounts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT"
      },
      dc: { type: Sequelize.STRING(6), allowNull: false },
      amount: { type: Sequelize.DECIMAL(18, 2), allowNull: false },
      memo: { type: Sequelize.STRING(512), allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") }
    });
    await queryInterface.addIndex("journal_lines", ["entryId"]);
    await queryInterface.addIndex("journal_lines", ["accountId"]);
    await queryInterface.addIndex("journal_lines", ["dc"]);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("journal_lines");
  }
};
