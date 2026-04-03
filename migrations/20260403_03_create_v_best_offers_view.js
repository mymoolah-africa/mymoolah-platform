'use strict';

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS v_best_offers AS

      -- Data products: bracket x product-type matrix (from product_selection_rules)
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM (
        SELECT
          pv.id AS variant_id,
          pv."vasType",
          pv.provider,
          pv."minAmount",
          pv."maxAmount",
          pv.commission,
          pv."fixedFee",
          pv."supplierProductId",
          pv."priceType",
          p.name AS product_name,
          p.id AS product_id,
          s.code AS supplier_code,
          s.id AS supplier_id,
          r.bracket_code,
          r.type_label,
          ROW_NUMBER() OVER (
            PARTITION BY pv.provider, r.bracket_code, r.type_label
            ORDER BY pv.commission DESC,
                     pv."minAmount" ASC,
                     CASE s.code WHEN 'FLASH' THEN 1 ELSE 2 END
          ) AS rn
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        JOIN suppliers s ON s.id = pv."supplierId"
        JOIN product_selection_rules r
          ON r.vas_type = 'data'
          AND r.is_active = true
          AND pv."minAmount" >= r.min_cents
          AND pv."minAmount" <= r.max_cents
          AND p.name ILIKE r.name_pattern
        WHERE pv.status = 'active'
          AND pv."vasType" = 'data'
      ) data_ranked WHERE rn = 1

      UNION ALL

      -- Airtime: one variable product per provider (highest commission, prefer Flash)
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM (
        SELECT
          pv.id AS variant_id,
          pv."vasType",
          pv.provider,
          pv."minAmount",
          pv."maxAmount",
          pv.commission,
          pv."fixedFee",
          pv."supplierProductId",
          pv."priceType",
          p.name AS product_name,
          p.id AS product_id,
          s.code AS supplier_code,
          s.id AS supplier_id,
          'VARIABLE'::text AS bracket_code,
          'airtime'::text AS type_label,
          ROW_NUMBER() OVER (
            PARTITION BY pv.provider
            ORDER BY pv.commission DESC,
                     CASE s.code WHEN 'FLASH' THEN 1 ELSE 2 END
          ) AS rn
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        JOIN suppliers s ON s.id = pv."supplierId"
        WHERE pv.status = 'active'
          AND pv."vasType" = 'airtime'
          AND pv."priceType" = 'variable'
      ) airtime_ranked WHERE rn = 1

      UNION ALL

      -- Electricity: best commission per provider (municipality)
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM (
        SELECT
          pv.id AS variant_id,
          pv."vasType",
          pv.provider,
          pv."minAmount",
          pv."maxAmount",
          pv.commission,
          pv."fixedFee",
          pv."supplierProductId",
          pv."priceType",
          p.name AS product_name,
          p.id AS product_id,
          s.code AS supplier_code,
          s.id AS supplier_id,
          'VARIABLE'::text AS bracket_code,
          'electricity'::text AS type_label,
          ROW_NUMBER() OVER (
            PARTITION BY pv.provider
            ORDER BY pv.commission DESC,
                     CASE s.code WHEN 'FLASH' THEN 1 ELSE 2 END
          ) AS rn
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        JOIN suppliers s ON s.id = pv."supplierId"
        WHERE pv.status = 'active' AND pv."vasType" = 'electricity'
      ) elec_ranked WHERE rn = 1

      UNION ALL

      -- Voucher: best commission per provider (brand)
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM (
        SELECT
          pv.id AS variant_id,
          pv."vasType",
          pv.provider,
          pv."minAmount",
          pv."maxAmount",
          pv.commission,
          pv."fixedFee",
          pv."supplierProductId",
          pv."priceType",
          p.name AS product_name,
          p.id AS product_id,
          s.code AS supplier_code,
          s.id AS supplier_id,
          'ALL'::text AS bracket_code,
          'voucher'::text AS type_label,
          ROW_NUMBER() OVER (
            PARTITION BY pv.provider
            ORDER BY pv.commission DESC,
                     pv."minAmount" ASC,
                     CASE s.code WHEN 'FLASH' THEN 1 ELSE 2 END
          ) AS rn
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        JOIN suppliers s ON s.id = pv."supplierId"
        WHERE pv.status = 'active' AND pv."vasType" = 'voucher'
      ) vouch_ranked WHERE rn = 1

      UNION ALL

      -- Bill payment: best commission per provider (biller)
      SELECT variant_id, "vasType", provider, "minAmount", "maxAmount",
             commission, "fixedFee", "supplierProductId", "priceType",
             product_name, product_id, supplier_code, supplier_id,
             bracket_code, type_label
      FROM (
        SELECT
          pv.id AS variant_id,
          pv."vasType",
          pv.provider,
          pv."minAmount",
          pv."maxAmount",
          pv.commission,
          pv."fixedFee",
          pv."supplierProductId",
          pv."priceType",
          p.name AS product_name,
          p.id AS product_id,
          s.code AS supplier_code,
          s.id AS supplier_id,
          'ALL'::text AS bracket_code,
          'bill_payment'::text AS type_label,
          ROW_NUMBER() OVER (
            PARTITION BY pv.provider
            ORDER BY pv.commission DESC,
                     CASE s.code WHEN 'FLASH' THEN 1 ELSE 2 END
          ) AS rn
        FROM product_variants pv
        JOIN products p ON p.id = pv."productId"
        JOIN suppliers s ON s.id = pv."supplierId"
        WHERE pv.status = 'active' AND pv."vasType" = 'bill_payment'
      ) bill_ranked WHERE rn = 1
    `, { transaction: null });

    // Unique index required for CONCURRENTLY refresh
    await queryInterface.sequelize.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_v_best_offers_pk
       ON v_best_offers (variant_id, bracket_code, type_label)`,
      { transaction: null }
    );

    await queryInterface.sequelize.query(
      `CREATE INDEX IF NOT EXISTS idx_v_best_offers_lookup
       ON v_best_offers ("vasType", provider)`,
      { transaction: null }
    );

    console.log('  Created materialized view v_best_offers with indexes');
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(
      `DROP MATERIALIZED VIEW IF EXISTS v_best_offers CASCADE`,
      { transaction: null }
    );
  }
};
