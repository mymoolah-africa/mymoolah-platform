"use strict";

module.exports = {
  async up(queryInterface) {
    const tableDesc = await queryInterface.describeTable("wallets");
    const cols = Object.keys(tableDesc);

    if (cols.includes("created_at") && !cols.includes("createdAt")) {
      await queryInterface.renameColumn("wallets", "created_at", "createdAt");
      console.log("✅ Renamed wallets.created_at → createdAt");
    } else {
      console.log("⏭️  wallets.createdAt already exists — skipping");
    }

    if (cols.includes("updated_at") && !cols.includes("updatedAt")) {
      await queryInterface.renameColumn("wallets", "updated_at", "updatedAt");
      console.log("✅ Renamed wallets.updated_at → updatedAt");
    } else {
      console.log("⏭️  wallets.updatedAt already exists — skipping");
    }
  },

  async down(queryInterface) {
    const tableDesc = await queryInterface.describeTable("wallets");
    const cols = Object.keys(tableDesc);

    if (cols.includes("createdAt") && !cols.includes("created_at")) {
      await queryInterface.renameColumn("wallets", "createdAt", "created_at");
    }
    if (cols.includes("updatedAt") && !cols.includes("updated_at")) {
      await queryInterface.renameColumn("wallets", "updatedAt", "updated_at");
    }
  },
};
