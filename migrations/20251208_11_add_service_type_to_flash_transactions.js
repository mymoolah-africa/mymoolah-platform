'use strict';

module.exports = {
  up: async (queryInterface) => {
    // Check if serviceType column exists
    const [cols] = await queryInterface.sequelize.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'flash_transactions' AND column_name = 'serviceType'
    `);

    if (!cols || cols.length === 0) {
      // Column doesn't exist, add it as VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE flash_transactions
        ADD COLUMN "serviceType" VARCHAR(50);
      `);
      // Backfill to digital_voucher
      await queryInterface.sequelize.query(`
        UPDATE flash_transactions
        SET "serviceType" = 'digital_voucher'
        WHERE "serviceType" IS NULL;
      `);
    } else if (cols[0].data_type === 'USER-DEFINED') {
      // Column exists as ENUM - add digital_voucher to the enum if not present
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'digital_voucher'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_flash_transactions_serviceType')
          ) THEN
            ALTER TYPE "enum_flash_transactions_serviceType" ADD VALUE 'digital_voucher';
          END IF;
        END $$;
      `);
      // Backfill NULL rows
      await queryInterface.sequelize.query(`
        UPDATE flash_transactions
        SET "serviceType" = 'digital_voucher'
        WHERE "serviceType" IS NULL;
      `);
    }
    // If column exists as VARCHAR already, do nothing (already correct type)
  },

  down: async (queryInterface) => {
    // We don't drop the column since it was originally part of the table schema
    // Only remove if we added it (column was missing before this migration)
  }
};
