'use strict';

/**
 * Create vas_best_offers and catalog_refresh_audit tables
 * Banking-grade pre-computed best-offer layer for multi-supplier VAS
 *
 * Purpose: Store ONE product per (vasType, provider, denomination) - the variant
 * with highest commission. Simplifies backend and UX.
 *
 * @author MyMoolah Development Team
 * @date 2026-02-18
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // 1. Create catalog_refresh_audit for banking-grade audit trail
      await queryInterface.createTable(
        'catalog_refresh_audit',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          refreshedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'refreshed_at'
          },
          refreshedBy: {
            type: Sequelize.STRING(64),
            allowNull: true,
            comment: 'Service account or job name',
            field: 'refreshed_by'
          },
          vasType: {
            type: Sequelize.STRING(32),
            allowNull: true,
            comment: 'Null = all types',
            field: 'vas_type'
          },
          rowsAffected: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: 'rows_affected'
          },
          catalogVersion: {
            type: Sequelize.BIGINT,
            allowNull: true,
            field: 'catalog_version'
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
          }
        },
        { transaction }
      );

      // 2. Create vas_best_offers - pre-computed best variant per logical product
      await queryInterface.createTable(
        'vas_best_offers',
        {
          id: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
          },
          vasType: {
            type: Sequelize.STRING(32),
            allowNull: false,
            field: 'vas_type'
          },
          provider: {
            type: Sequelize.STRING(100),
            allowNull: false,
            comment: 'Network: Vodacom, MTN, CellC, Telkom, Global, etc.'
          },
          denominationCents: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'Amount in cents (airtime/voucher) or minAmount (data)',
            field: 'denomination_cents'
          },
          productVariantId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'product_variants', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            field: 'product_variant_id'
          },
          productId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'products', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            field: 'product_id'
          },
          supplierId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: 'suppliers', key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
            field: 'supplier_id'
          },
          supplierCode: {
            type: Sequelize.STRING(50),
            allowNull: true,
            field: 'supplier_code'
          },
          productName: {
            type: Sequelize.STRING(255),
            allowNull: true,
            field: 'product_name'
          },
          supplierProductId: {
            type: Sequelize.STRING(255),
            allowNull: true,
            field: 'supplier_product_id'
          },
          commission: {
            type: Sequelize.DECIMAL(5, 2),
            allowNull: true
          },
          fixedFee: {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: 0,
            field: 'fixed_fee'
          },
          denominations: {
            type: Sequelize.JSONB,
            allowNull: true,
            comment: 'All denominations for this variant (for display)'
          },
          minAmount: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: 'min_amount'
          },
          maxAmount: {
            type: Sequelize.INTEGER,
            allowNull: true,
            field: 'max_amount'
          },
          catalogVersion: {
            type: Sequelize.BIGINT,
            allowNull: true,
            field: 'catalog_version'
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'created_at'
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            field: 'updated_at'
          }
        },
        { transaction }
      );

      // Unique constraint: one best offer per (vasType, provider, denomination)
      await queryInterface.addIndex(
        'vas_best_offers',
        ['vas_type', 'provider', 'denomination_cents'],
        {
          unique: true,
          name: 'idx_vas_best_offers_unique'
        },
        { transaction }
      );

      // Index for fast lookups by vasType + provider
      await queryInterface.addIndex(
        'vas_best_offers',
        ['vas_type', 'provider'],
        { name: 'idx_vas_best_offers_lookup' },
        { transaction }
      );

      // Index for catalog version (cache invalidation)
      await queryInterface.addIndex(
        'vas_best_offers',
        ['catalog_version'],
        { name: 'idx_vas_best_offers_version' },
        { transaction }
      );

      await transaction.commit();
      console.log('✅ vas_best_offers and catalog_refresh_audit tables created');
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      await queryInterface.dropTable('vas_best_offers', { transaction });
      await queryInterface.dropTable('catalog_refresh_audit', { transaction });
      await transaction.commit();
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
};
