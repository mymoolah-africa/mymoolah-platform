'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

    if (!tableNames.includes('product_catalog_mappings')) {
      await queryInterface.createTable('product_catalog_mappings', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        source_variant_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'product_variants', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        source_product_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'products', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        supplier_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'suppliers', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        supplier_code: { type: Sequelize.STRING(50), allowNull: false },
        supplier_product_id: { type: Sequelize.STRING(255), allowNull: false },
        product_type: { type: Sequelize.STRING(50), allowNull: false },
        raw_name: { type: Sequelize.STRING(255), allowNull: false },
        raw_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        canonical_name: { type: Sequelize.STRING(255), allowNull: true },
        canonical_brand: { type: Sequelize.STRING(255), allowNull: true },
        category: { type: Sequelize.STRING(80), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        icon_key: { type: Sequelize.STRING(80), allowNull: true },
        logo_key: { type: Sequelize.STRING(120), allowNull: true },
        risk_tier: { type: Sequelize.STRING(30), allowNull: false, defaultValue: 'medium' },
        review_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'draft' },
        publish_status: { type: Sequelize.STRING(40), allowNull: false, defaultValue: 'unpublished' },
        maker_user_id: { type: Sequelize.STRING(80), allowNull: true },
        maker_user_email: { type: Sequelize.STRING(255), allowNull: true },
        checker_user_id: { type: Sequelize.STRING(80), allowNull: true },
        checker_user_email: { type: Sequelize.STRING(255), allowNull: true },
        submitted_at: { type: Sequelize.DATE, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        rejected_at: { type: Sequelize.DATE, allowNull: true },
        suspended_at: { type: Sequelize.DATE, allowNull: true },
        retired_at: { type: Sequelize.DATE, allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    if (!tableNames.includes('product_catalog_audit_events')) {
      await queryInterface.createTable('product_catalog_audit_events', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        mapping_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'product_catalog_mappings', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        action: { type: Sequelize.STRING(80), allowNull: false },
        actor_user_id: { type: Sequelize.STRING(80), allowNull: true },
        actor_email: { type: Sequelize.STRING(255), allowNull: true },
        actor_role: { type: Sequelize.STRING(80), allowNull: true },
        from_status: { type: Sequelize.STRING(40), allowNull: true },
        to_status: { type: Sequelize.STRING(40), allowNull: true },
        from_publish_status: { type: Sequelize.STRING(40), allowNull: true },
        to_publish_status: { type: Sequelize.STRING(40), allowNull: true },
        reason: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_product_catalog_mappings_supplier_sku
      ON product_catalog_mappings (supplier_code, supplier_product_id, product_type);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_mappings_review
      ON product_catalog_mappings (review_status, "updatedAt" DESC);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_mappings_publish
      ON product_catalog_mappings (publish_status, product_type, category);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_mappings_variant
      ON product_catalog_mappings (source_variant_id);
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_product_catalog_audit_mapping
      ON product_catalog_audit_events (mapping_id, "createdAt" DESC);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_product_catalog_audit_mapping;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_product_catalog_mappings_variant;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_product_catalog_mappings_publish;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_product_catalog_mappings_review;');
    await queryInterface.sequelize.query('DROP INDEX IF EXISTS idx_product_catalog_mappings_supplier_sku;');
    await queryInterface.dropTable('product_catalog_audit_events');
    await queryInterface.dropTable('product_catalog_mappings');
  },
};
