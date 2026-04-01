"use strict";

module.exports = {
  async up(queryInterface) {
    // The service_type column may be an ENUM or VARCHAR depending on environment.
    // If ENUM, add 'voucher' to the allowed values. If VARCHAR, no action needed.
    const [cols] = await queryInterface.sequelize.query(`
      SELECT data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'flash_transactions'
        AND column_name = 'service_type'
    `);

    if (cols.length > 0 && cols[0].data_type === 'USER-DEFINED') {
      // Check both possible enum type names (before and after column rename)
      const enumTypeName = cols[0].udt_name;

      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum
            WHERE enumlabel = 'voucher'
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumTypeName}')
          ) THEN
            ALTER TYPE "${enumTypeName}" ADD VALUE 'voucher';
          END IF;
        END $$;
      `);
    }
    // VARCHAR columns accept any string — no action needed
  },

  async down() {
    // PostgreSQL does not support removing values from an ENUM
  },
};
