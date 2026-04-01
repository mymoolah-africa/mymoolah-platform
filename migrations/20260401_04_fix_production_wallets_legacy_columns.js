"use strict";

module.exports = {
  async up(queryInterface) {
    const tableDesc = await queryInterface.describeTable("wallets");
    const cols = Object.keys(tableDesc);

    if (cols.includes("walletId_prev")) {
      // Drop FK constraints that reference walletId_prev
      const [fks] = await queryInterface.sequelize.query(`
        SELECT conname, conrelid::regclass AS tbl
        FROM pg_constraint
        WHERE confrelid = 'wallets'::regclass
          AND pg_get_constraintdef(oid) LIKE '%walletId_prev%'
      `);
      for (const fk of fks) {
        await queryInterface.sequelize.query(
          `ALTER TABLE ${fk.tbl} DROP CONSTRAINT IF EXISTS "${fk.conname}"`
        );
        console.log(`✅ Dropped FK ${fk.tbl}.${fk.conname}`);
      }

      await queryInterface.removeColumn("wallets", "walletId_prev");
      console.log("✅ Dropped legacy wallets.walletId_prev");

      // Re-create the FKs pointing to walletId instead
      const [hasSender] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'senderWalletId'
      `);
      if (hasSender.length > 0) {
        await queryInterface.sequelize.query(`
          ALTER TABLE transactions
          ADD CONSTRAINT transactions_senderWalletId_fkey
          FOREIGN KEY ("senderWalletId") REFERENCES wallets("walletId")
          ON UPDATE CASCADE ON DELETE SET NULL
        `);
        console.log("✅ Re-created transactions.senderWalletId FK → wallets.walletId");
      }

      const [hasReceiver] = await queryInterface.sequelize.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'transactions' AND column_name = 'receiverWalletId'
      `);
      if (hasReceiver.length > 0) {
        await queryInterface.sequelize.query(`
          ALTER TABLE transactions
          ADD CONSTRAINT transactions_receiverWalletId_fkey
          FOREIGN KEY ("receiverWalletId") REFERENCES wallets("walletId")
          ON UPDATE CASCADE ON DELETE SET NULL
        `);
        console.log("✅ Re-created transactions.receiverWalletId FK → wallets.walletId");
      }
    } else {
      console.log("⏭️  walletId_prev does not exist — skipping");
    }

    if (cols.includes("walletId_old")) {
      await queryInterface.removeColumn("wallets", "walletId_old");
      console.log("✅ Dropped legacy wallets.walletId_old");
    }

    // Ensure walletId is NOT NULL
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
