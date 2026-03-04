'use strict';

/**
 * Add 'international_pin' to the products.type and product_variants.vasType
 * PostgreSQL ENUM types.
 *
 * Must run BEFORE 20260304_02_fix_global_pin_to_international_pin which
 * updates rows to use this new enum value.
 *
 * Run via: ./scripts/run-migrations-master.sh uat
 */

module.exports = {
  async up(queryInterface) {
    // Add to enum_products_type
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_products_type" ADD VALUE IF NOT EXISTS 'international_pin'`
    );
    console.log("✅ Added 'international_pin' to enum_products_type");

    // Add to enum_product_variants_vasType
    await queryInterface.sequelize.query(
      `ALTER TYPE "enum_product_variants_vasType" ADD VALUE IF NOT EXISTS 'international_pin'`
    );
    console.log("✅ Added 'international_pin' to enum_product_variants_vasType");
  },

  async down(queryInterface) {
    // PostgreSQL does not support removing values from an ENUM without
    // recreating the type. Log a warning and skip — rollback of the
    // data migration (20260304_02) is sufficient to make this safe.
    console.log("⚠️  Cannot remove enum values in PostgreSQL — skipping down migration.");
    console.log("   Roll back 20260304_02 first to remove rows using 'international_pin'.");
  }
};
