#!/usr/bin/env node

/**
 * Refresh vas_best_offers - Banking-grade pre-computed best-offer table
 *
 * Populates vas_best_offers from product_variants. For each (vasType, provider, denomination),
 * selects the variant with HIGHEST commission. One product per logical offering.
 *
 * Run after catalog sync: node scripts/refresh-vas-best-offers.js
 *
 * @author MyMoolah Development Team
 * @date 2026-02-18
 */

require('dotenv').config();
const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

const NORMALIZE_PROVIDER = {
  'cell c': 'CellC',
  'cellc': 'CellC',
  'vodacom': 'Vodacom',
  'mtn': 'MTN',
  'telkom': 'Telkom',
  'eeziairtime': 'eeziAirtime',
  'eezi airtime': 'eeziAirtime',
  'global': 'Global',
  'global-airtime': 'Global',
  'global-data': 'Global'
};

// Electricity municipality/provider name normalization.
// Flash and MobileMart may use slightly different names for the same municipality.
// This map ensures products for the same municipality compete on commission.
const NORMALIZE_ELECTRICITY_PROVIDER = {
  // ESKOM variants
  'eskom online': 'ESKOM', 'eskom central': 'ESKOM', 'eskom eastern': 'ESKOM',
  'eskom north eastern': 'ESKOM', 'eskom north west': 'ESKOM',
  'eskom northern': 'ESKOM', 'eskom southern': 'ESKOM',
  'eskom soweto': 'ESKOM', 'eskom western': 'ESKOM',
  // Municipality name variants (Flash vs MobileMart)
  'blouberg municipality': 'Blouberg', 'blouberg': 'Blouberg',
  'blue crane route': 'Blue Crane Route',
  'breede valley municipality': 'Breede Valley', 'breede valley': 'Breede Valley',
  'cape agulhas': 'Cape Agulhas', 'cape agulhas municipality': 'Cape Agulhas',
  'cederberg municipality': 'Cederberg', 'cederberg': 'Cederberg',
  'centlec municipality': 'Centlec', 'centlec': 'Centlec',
  'city power': 'City Power', 'city of johannesburg': 'City Power',
  'dipalaseng municipality': 'Dipaleseng', 'dipaleseng': 'Dipaleseng',
  'drakenstein municipality': 'Drakenstein', 'drakenstein': 'Drakenstein',
  'emfuleni municipality': 'Emfuleni', 'emfuleni': 'Emfuleni',
  'ethekwini': 'eThekwini', 'ethekwini municipality': 'eThekwini',
  'ekurhuleni': 'Ekurhuleni', 'ekurhuleni metro': 'Ekurhuleni',
  'george municipality': 'George', 'george': 'George',
  'johannesburg water': 'Johannesburg Water',
  'knysna municipality': 'Knysna', 'knysna': 'Knysna',
  'kouga municipality': 'Kouga', 'kouga': 'Kouga',
  'midvaal utility': 'Midvaal', 'midvaal': 'Midvaal',
  'mogale city municipality': 'Mogale City', 'mogale city': 'Mogale City', 'mogalecity': 'Mogale City',
  'newcastle municipality': 'Newcastle', 'newcastle': 'Newcastle',
  'oudtshoorn': 'Oudtshoorn', 'oudtshoorn municipality': 'Oudtshoorn',
  'overstrand': 'Overstrand', 'overstrand municipality': 'Overstrand',
  'polokwane': 'Polokwane', 'polokwane municipality': 'Polokwane',
  'saldanha municipality': 'Saldanha Bay', 'saldanha bay': 'Saldanha Bay',
  'solplaatje municipality': 'Sol Plaatje', 'solplaatjie': 'Sol Plaatje', 'sol plaatje': 'Sol Plaatje',
  'stellenbosch municipality': 'Stellenbosch', 'stellenbosch': 'Stellenbosch',
  'theewaterskloof municipality': 'Theewaterskloof', 'theewaterskloof': 'Theewaterskloof',
  'tshwane': 'Tshwane', 'city of tshwane': 'Tshwane',
  'umhlathuze municipality': 'uMhlathuze', 'umhlathuze': 'uMhlathuze',
  'umlalazi local municipality': 'Umlalazi', 'umlalazi municipality': 'Umlalazi', 'umlalazi': 'Umlalazi',
  'cape town': 'Cape Town', 'city of cape town': 'Cape Town',
  'buffalo city': 'Buffalo City', 'buffalo city municipality': 'Buffalo City',
  'nelson mandela bay': 'Nelson Mandela Bay', 'nelson mandela bay municipality': 'Nelson Mandela Bay',
  'mangaung': 'Mangaung', 'mangaung municipality': 'Mangaung',
  'msunduzi': 'Msunduzi', 'msunduzi municipality': 'Msunduzi',
  'rustenburg': 'Rustenburg', 'rustenburg municipality': 'Rustenburg',
  'mbombela': 'Mbombela', 'mbombela municipality': 'Mbombela',
  'makana municipality': 'Makana', 'makana': 'Makana',
  'maluti a phofung municipality': 'Maluti a Phofung', 'maluti a phofung': 'Maluti a Phofung',
  'matjhabeng municipality': 'Matjhabeng', 'matjhabeng': 'Matjhabeng',
  'nama khoi municipality': 'Nama Khoi', 'namakhoi': 'Nama Khoi',
  'letsimeng municipality': 'Letsimeng', 'letsimeng': 'Letsimeng',
  'swellendam municipality': 'Swellendam', 'swellendam': 'Swellendam',
  'langeberg municipality': 'Langeberg', 'langeberg': 'Langeberg',
  'kokstad': 'Kokstad', 'greater kokstad': 'Kokstad',
  'maquassi hills': 'Maquassi Hills',
  'dikgatlong': 'Dikgatlong',
  'ditsobotla': 'Ditsobotla', 'ditsobotla municipality': 'Ditsobotla',
};

function normalizeProvider(p, vasType) {
  if (!p || typeof p !== 'string') return null;
  const key = p.trim().toLowerCase();

  if (vasType === 'electricity') {
    return NORMALIZE_ELECTRICITY_PROVIDER[key] || NORMALIZE_PROVIDER[key] || p.trim();
  }
  return NORMALIZE_PROVIDER[key] || p.trim();
}

async function refreshBestOffers() {
  const catalogVersion = Date.now();
  const refreshedBy = process.env.REFRESH_JOB_NAME || 'refresh-vas-best-offers';

  console.log('🔄 Refreshing vas_best_offers...');
  const start = Date.now();

  const transaction = await sequelize.transaction();

  try {
    // 1. Fetch all active variants with product and supplier
    const variants = await sequelize.query(
      `SELECT pv.id as "productVariantId", pv."productId", pv."supplierId", pv."supplierProductId",
              pv."vasType", pv.provider, pv.commission, pv."fixedFee", pv.denominations,
              pv."minAmount", pv."maxAmount", pv."predefinedAmounts",
              p.name as "productName", s.code as "supplierCode"
       FROM product_variants pv
       JOIN products p ON p.id = pv."productId"
       JOIN suppliers s ON s.id = pv."supplierId"
       WHERE pv.status = 'active' AND p.status = 'active' AND s."isActive" = true
       ORDER BY pv.commission DESC NULLS LAST`,
      { type: QueryTypes.SELECT, transaction }
    );

    console.log(`   Found ${variants.length} active variants`);

    // 2. Build best-offer map.
    //
    // Key strategy:
    //   • Fixed-denomination products (minAmount === maxAmount, or explicit
    //     denominations list): one row per denomination so production can
    //     select the best supplier for each exact amount.
    //   • Variable-range products (minAmount !== maxAmount, no explicit
    //     denominations): ONE row per product, keyed by productName, with
    //     all denominations aggregated. This prevents "Wallet Code R10",
    //     "Wallet Code R20", etc. appearing as separate cards in the UI.
    const bestByKey = new Map();

    for (const v of variants) {
      const vasType = (v.vasType || '').toString().toLowerCase();
      if (!['airtime', 'data', 'voucher', 'electricity', 'bill_payment'].includes(vasType)) continue;

      let provider = normalizeProvider(v.provider, vasType) || v.provider || 'Unknown';
      if (vasType === 'bill_payment') {
        provider = (v.productName || v.provider || 'Unknown').toString().trim();
      } else if (vasType === 'electricity') {
        provider = (normalizeProvider(v.provider, vasType) || v.provider || 'Unknown').toString().trim();
      }
      if (provider.length > 100) provider = provider.slice(0, 100);
      const commission = parseFloat(v.commission) || 0;

      // Collect explicit denominations
      let denoms = [];
      if (Array.isArray(v.denominations) && v.denominations.length > 0) {
        denoms = v.denominations.filter((n) => typeof n === 'number' && !Number.isNaN(n));
      }
      if (Array.isArray(v.predefinedAmounts) && v.predefinedAmounts.length > 0) {
        denoms = [...new Set([...denoms, ...v.predefinedAmounts])];
      }

      const hasExplicitDenoms = denoms.length > 0;
      const isFixedAmount = v.minAmount != null && v.maxAmount != null && v.minAmount === v.maxAmount;

      if (!hasExplicitDenoms && isFixedAmount) {
        // Single fixed amount — treat as one denomination
        denoms = [v.minAmount];
      }

      if (!hasExplicitDenoms && !isFixedAmount && v.minAmount != null) {
        // Variable-range product (e.g. "Wallet Code R2–R999"):
        // Store as ONE entry keyed by product name to avoid duplicate cards.
        const key = `${vasType}|${provider}|product:${v.productName}`;
        const existing = bestByKey.get(key);
        if (!existing || commission > existing.commission) {
          bestByKey.set(key, {
            vasType,
            provider,
            // Use minAmount as the canonical denomination for the DB row
            denominationCents: v.minAmount,
            productVariantId: v.productVariantId,
            productId: v.productId,
            supplierId: v.supplierId,
            supplierCode: v.supplierCode,
            productName: v.productName,
            supplierProductId: v.supplierProductId,
            commission,
            fixedFee: v.fixedFee || 0,
            // Store the full range so the UI can display "R2 – R999"
            denominations: [],
            minAmount: v.minAmount,
            maxAmount: v.maxAmount
          });
        }
        continue;
      }

      if (denoms.length === 0) continue;

      // Fixed / explicit-denomination products: one row per denomination
      for (const denom of denoms) {
        const key = `${vasType}|${provider}|${denom}`;
        if (!bestByKey.has(key)) {
          bestByKey.set(key, {
            vasType,
            provider,
            denominationCents: denom,
            productVariantId: v.productVariantId,
            productId: v.productId,
            supplierId: v.supplierId,
            supplierCode: v.supplierCode,
            productName: v.productName,
            supplierProductId: v.supplierProductId,
            commission,
            fixedFee: v.fixedFee || 0,
            denominations: [denom],
            minAmount: denom,
            maxAmount: denom
          });
        }
      }
    }

    const rows = Array.from(bestByKey.values());
    console.log(`   Computed ${rows.length} best offers`);

    // 3. Atomic replace: truncate and insert
    await sequelize.query('TRUNCATE TABLE vas_best_offers RESTART IDENTITY', { transaction });

    if (rows.length > 0) {
      const { Sequelize } = require('sequelize');
      const qi = sequelize.getQueryInterface();
      const rowsForInsert = rows.map((r) => {
        const denoms = r.denominations || [r.denominationCents];
        const jsonStr = JSON.stringify(denoms).replace(/'/g, "''");
        return {
          vas_type: r.vasType,
          provider: r.provider || '',
          denomination_cents: r.denominationCents,
          product_variant_id: r.productVariantId,
          product_id: r.productId,
          supplier_id: r.supplierId,
          supplier_code: r.supplierCode || '',
          product_name: r.productName || '',
          supplier_product_id: r.supplierProductId || '',
          commission: r.commission,
          fixed_fee: r.fixedFee || 0,
          denominations: Sequelize.literal(`'${jsonStr}'::jsonb`),
          min_amount: r.minAmount,
          max_amount: r.maxAmount,
          catalog_version: catalogVersion
        };
      });
      await qi.bulkInsert('vas_best_offers', rowsForInsert, { transaction });
    }

    // 4. Audit log
    await sequelize.query(
      `INSERT INTO catalog_refresh_audit (refreshed_by, vas_type, rows_affected, catalog_version)
       VALUES (:refreshedBy, NULL, :rowsAffected, :catalogVersion)`,
      {
        replacements: { refreshedBy, rowsAffected: rows.length, catalogVersion },
        transaction
      }
    );

    await transaction.commit();

    const elapsed = Date.now() - start;
    console.log(`✅ vas_best_offers refreshed in ${elapsed}ms (${rows.length} rows, version ${catalogVersion})`);
    return { rowsAffected: rows.length, catalogVersion };
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Refresh failed:', err.message);
    throw err;
  }
}

// Allow running as script or requiring as module
if (require.main === module) {
  refreshBestOffers()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  module.exports = { refreshBestOffers };
}
