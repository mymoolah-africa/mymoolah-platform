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

    // The product_variants vasType enum was created WITHOUT quotes in the
    // consolidation migration, so PostgreSQL stored it in lowercase:
    //   enum_product_variants_vastype  (all lowercase)
    // Look up the real name from pg_type to be safe, then ALTER it.
    const rows = await queryInterface.sequelize.query(
      `SELECT typname FROM pg_type
        WHERE typname ILIKE 'enum_product_variants_vastype'
        LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    if (rows.length === 0) {
      console.log("⚠️  enum_product_variants_vasType not found in pg_type — skipping");
    } else {
      const typeName = rows[0].typname; // actual stored name
      await queryInterface.sequelize.query(
        `ALTER TYPE "${typeName}" ADD VALUE IF NOT EXISTS 'international_pin'`
      );
      console.log(`✅ Added 'international_pin' to ${typeName}`);
    }
  },

  async down(queryInterface) {
    // PostgreSQL does not support removing values from an ENUM without
    // recreating the type. Log a warning and skip — rollback of the
    // data migration (20260304_02) is sufficient to make this safe.
    console.log("⚠️  Cannot remove enum values in PostgreSQL — skipping down migration.");
    console.log("   Roll back 20260304_02 first to remove rows using 'international_pin'.");
  }
};
