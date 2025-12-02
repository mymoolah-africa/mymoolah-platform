/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * De-PII walletId:
 * - Add walletId_new (text, unique)
 * - Backfill as WAL-{userId}
 * - Update transactions.walletId/senderWalletId/receiverWalletId and vas_transactions.walletId to new values
 * - Swap walletId_new -> walletId, keep walletId_old backup for rollback
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // 1) Add walletId_old (backup) and walletId_new
    await sequelize.query(`ALTER TABLE wallets ADD COLUMN IF NOT EXISTS "walletId_old" TEXT;`);
    await sequelize.query(`ALTER TABLE wallets ADD COLUMN IF NOT EXISTS "walletId_new" TEXT;`);

    // 2) Backfill walletId_new = WAL-{userId}
    await sequelize.query(`
      UPDATE wallets w
      SET "walletId_old" = w."walletId",
          "walletId_new" = 'WAL-' || w."userId"
      WHERE w."walletId_new" IS NULL;
    `);

    // 3) Update dependent tables using userId mapping where available, else join on previous walletId
    // Transactions table (primary walletId)
    await sequelize.query(`
      UPDATE transactions t
      SET "walletId" = w."walletId_new"
      FROM wallets w
      WHERE (t."userId" = w."userId" OR t."walletId" = w."walletId_old")
        AND w."walletId_new" IS NOT NULL;
    `);
    // senderWalletId
    await sequelize.query(`
      UPDATE transactions t
      SET "senderWalletId" = w."walletId_new"
      FROM wallets w
      WHERE t."senderWalletId" = w."walletId_old"
        AND w."walletId_new" IS NOT NULL;
    `);
    // receiverWalletId
    await sequelize.query(`
      UPDATE transactions t
      SET "receiverWalletId" = w."walletId_new"
      FROM wallets w
      WHERE t."receiverWalletId" = w."walletId_old"
        AND w."walletId_new" IS NOT NULL;
    `);

    // vas_transactions.walletId
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vas_transactions' AND column_name = 'walletid') THEN
          UPDATE vas_transactions v
          SET "walletId" = w."walletId_new"
          FROM wallets w
          WHERE (v."userId" = w."userId" OR v."walletId" = w."walletId_old")
            AND w."walletId_new" IS NOT NULL;
        END IF;
      END$$;
    `);

    // 4) Swap columns: drop constraint if any conflicts, then rename
    await sequelize.query(`ALTER TABLE wallets RENAME COLUMN "walletId" TO "walletId_prev";`);
    await sequelize.query(`ALTER TABLE wallets RENAME COLUMN "walletId_new" TO "walletId";`);

    // 5) Ensure uniqueness on new walletId
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'wallets_walletid_unique_new'
        ) THEN
          ALTER TABLE wallets ADD CONSTRAINT wallets_walletid_unique_new UNIQUE ("walletId");
        END IF;
      END$$;
    `);
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // Revert transactions to walletId_old if present
    await sequelize.query(`
      UPDATE transactions t
      SET "walletId" = w."walletId_old"
      FROM wallets w
      WHERE (t."userId" = w."userId" OR t."walletId" = w."walletId")
        AND w."walletId_old" IS NOT NULL;
    `);
    await sequelize.query(`
      UPDATE transactions t
      SET "senderWalletId" = w."walletId_old"
      FROM wallets w
      WHERE t."senderWalletId" = w."walletId"
        AND w."walletId_old" IS NOT NULL;
    `);
    await sequelize.query(`
      UPDATE transactions t
      SET "receiverWalletId" = w."walletId_old"
      FROM wallets w
      WHERE t."receiverWalletId" = w."walletId"
        AND w."walletId_old" IS NOT NULL;
    `);

    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vas_transactions' AND column_name = 'walletid') THEN
          UPDATE vas_transactions v
          SET "walletId" = w."walletId_old"
          FROM wallets w
          WHERE (v."userId" = w."userId" OR v."walletId" = w."walletId")
            AND w."walletId_old" IS NOT NULL;
        END IF;
      END$$;
    `);

    // Rename columns back
    await sequelize.query(`ALTER TABLE wallets RENAME COLUMN "walletId" TO "walletId_new";`);
    await sequelize.query(`ALTER TABLE wallets RENAME COLUMN "walletId_prev" TO "walletId";`);

    // Drop new unique constraint if exists
    await sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'wallets_walletid_unique_new'
        ) THEN
          ALTER TABLE wallets DROP CONSTRAINT wallets_walletid_unique_new;
        END IF;
      END$$;
    `);
  }
};

