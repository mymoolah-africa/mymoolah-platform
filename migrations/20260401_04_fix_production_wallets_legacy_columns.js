"use strict";

module.exports = {
  async up(queryInterface) {
    const tableDesc = await queryInterface.describeTable("wallets");
    const cols = Object.keys(tableDesc);

    // walletId_prev is a leftover from a previous walletId migration
    // It's NOT NULL with no default, blocking new wallet creation
    if (cols.includes("walletId_prev")) {
      await queryInterface.removeColumn("wallets", "walletId_prev");
      console.log("✅ Dropped legacy wallets.walletId_prev column");
    }

    // walletId_old is also a migration artifact
    if (cols.includes("walletId_old")) {
      await queryInterface.removeColumn("wallets", "walletId_old");
      console.log("✅ Dropped legacy wallets.walletId_old column");
    }

    // Ensure walletId is NOT NULL (it's currently nullable in production)
    if (cols.includes("walletId")) {
      const col = tableDesc["walletId"];
      if (col && col.allowNull !== false) {
        await queryInterface.changeColumn("wallets", "walletId", {
          type: queryInterface.sequelize.constructor.DataTypes.TEXT,
          allowNull: false,
        });
        console.log("✅ Set wallets.walletId to NOT NULL");
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.addColumn("wallets", "walletId_prev", {
      type: Sequelize.STRING,
      allowNull: true,
    });
    await queryInterface.addColumn("wallets", "walletId_old", {
      type: Sequelize.TEXT,
      allowNull: true,
    });
  },
};
