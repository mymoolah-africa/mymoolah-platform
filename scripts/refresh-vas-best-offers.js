#!/usr/bin/env node
// DEPRECATED: Replaced by v_best_offers materialized view (Apr 2026).
// Kept as fallback until production migration is validated.

/**
 * Refresh vas_best_offers - Banking-grade pre-computed best-offer table
 *
 * Populates vas_best_offers from product_variants. For each (vasType, provider, denomination),
 * selects the variant with HIGHEST commission. One product per logical offering.
 *
 * Airtime: collapses to ONE variable/pinless entry per provider (removes fixed voice bundles).
 * Data: only includes products where featured = true (curated by mark-featured-data-products.js).
 *
 * Usage:
 *   node scripts/refresh-vas-best-offers.js --staging
 *   node scripts/refresh-vas-best-offers.js --production
 *   node scripts/refresh-vas-best-offers.js --uat          (default)
 *
 * @author MyMoolah Development Team
 * @date 2026-02-18
 */

require('dotenv').config();
const {
  getUATClient, getStagingClient, getProductionClient,
} = require('./db-connection-helper');

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

const NORMALIZE_ELECTRICITY_PROVIDER = {
  'eskom online': 'ESKOM', 'eskom central': 'ESKOM', 'eskom eastern': 'ESKOM',
  'eskom north eastern': 'ESKOM', 'eskom north west': 'ESKOM',
  'eskom northern': 'ESKOM', 'eskom southern': 'ESKOM',
  'eskom soweto': 'ESKOM', 'eskom western': 'ESKOM',
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

/**
 * Refresh the vas_best_offers table for a given environment.
 * @param {Function} getClient - db-connection-helper client getter (getUATClient, getStagingClient, etc.)
 * @param {string} envName - Environment label for logging
 */
async function refreshBestOffers(getClient, envName) {
  if (!getClient) {
    const args = process.argv.slice(2);
    if (args.includes('--production')) {
      getClient = getProductionClient;
      envName = 'Production';
    } else if (args.includes('--staging')) {
      getClient = getStagingClient;
      envName = 'Staging';
    } else {
      getClient = getUATClient;
      envName = 'UAT';
    }
  }

  const catalogVersion = Date.now();
  const refreshedBy = process.env.REFRESH_JOB_NAME || 'refresh-vas-best-offers';

  console.log(`🔄 Refreshing vas_best_offers (${envName})...`);
  const start = Date.now();

  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Fetch all active variants with product and supplier
    const { rows: variants } = await client.query(
      `SELECT pv.id as "productVariantId", pv."productId", pv."supplierId", pv."supplierProductId",
              pv."vasType", pv.provider, pv.commission, pv."fixedFee", pv.denominations,
              pv."minAmount", pv."maxAmount", pv."predefinedAmounts",
              pv.featured, pv."priceType",
              p.name as "productName", s.code as "supplierCode"
       FROM product_variants pv
       JOIN products p ON p.id = pv."productId"
       JOIN suppliers s ON s.id = pv."supplierId"
       WHERE pv.status = 'active' AND p.status = 'active' AND s."isActive" = true
       ORDER BY pv.commission DESC NULLS LAST`
    );

    console.log(`   Found ${variants.length} active variants`);

    // 2. Build best-offer map
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
        denoms = [v.minAmount];
      }

      if (!hasExplicitDenoms && !isFixedAmount && v.minAmount != null) {
        const key = `${vasType}|${provider}|product:${v.productName}`;
        const existing = bestByKey.get(key);
        if (!existing || commission > existing.commission) {
          bestByKey.set(key, {
            vasType, provider,
            denominationCents: v.minAmount,
            productVariantId: v.productVariantId,
            productId: v.productId,
            supplierId: v.supplierId,
            supplierCode: v.supplierCode,
            productName: v.productName,
            supplierProductId: v.supplierProductId,
            commission,
            fixedFee: v.fixedFee || 0,
            denominations: [],
            minAmount: v.minAmount,
            maxAmount: v.maxAmount,
            featured: v.featured || false
          });
        }
        continue;
      }

      if (denoms.length === 0) continue;

      for (const denom of denoms) {
        const key = `${vasType}|${provider}|${denom}`;
        if (!bestByKey.has(key)) {
          bestByKey.set(key, {
            vasType, provider,
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
            maxAmount: denom,
            featured: v.featured || false
          });
        }
      }
    }

    // ── Post-processing: Airtime collapse ──────────────────────────────
    // The frontend expects ONE variable/pinless airtime entry per provider.
    // Fixed-denomination voice bundles (e.g. R3.50 daily) must be removed
    // from the cache so custom-amount purchases resolve to the correct product.
    const airtimeProviders = new Map();
    const keysToRemove = [];

    for (const [key, entry] of bestByKey) {
      if (entry.vasType !== 'airtime') continue;
      const prov = entry.provider;
      if (!airtimeProviders.has(prov)) {
        airtimeProviders.set(prov, { variable: null, fixed: [] });
      }
      const bucket = airtimeProviders.get(prov);
      const isVariable = entry.minAmount !== entry.maxAmount;
      if (isVariable) {
        if (!bucket.variable || entry.commission > bucket.variable.commission) {
          if (bucket.variable) keysToRemove.push(bucket.variable._key);
          bucket.variable = { ...entry, _key: key };
        } else {
          keysToRemove.push(key);
        }
      } else {
        bucket.fixed.push(key);
      }
    }

    for (const [, bucket] of airtimeProviders) {
      if (bucket.variable) {
        for (const fixedKey of bucket.fixed) keysToRemove.push(fixedKey);
        const v = bestByKey.get(bucket.variable._key);
        if (v) {
          v.minAmount = 200;
          v.maxAmount = 99900;
          v.denominations = [];
        }
      }
    }

    for (const k of keysToRemove) bestByKey.delete(k);
    console.log(`   Airtime: collapsed to ${airtimeProviders.size} providers (${keysToRemove.length} fixed entries removed)`);

    // ── Post-processing: Data featured filter ────────────────────────────
    // Only include data products where featured = true (curated by mark-featured-data-products.js).
    // If no featured data products exist, keep all as fallback.
    const dataKeys = [];
    const featuredDataKeys = [];

    for (const [key, entry] of bestByKey) {
      if (entry.vasType !== 'data') continue;
      dataKeys.push(key);
      if (entry.featured === true) featuredDataKeys.push(key);
    }

    if (featuredDataKeys.length > 0) {
      const unfeaturedDataKeys = dataKeys.filter(k => !featuredDataKeys.includes(k));
      for (const k of unfeaturedDataKeys) bestByKey.delete(k);
      console.log(`   Data: ${featuredDataKeys.length} featured kept, ${unfeaturedDataKeys.length} non-featured removed`);
    } else {
      console.log(`   Data: no featured products found — keeping all ${dataKeys.length} as fallback`);
    }

    const rawRows = Array.from(bestByKey.values());
    rawRows.forEach(r => delete r._key);

    // Final deduplication: unique constraint is (vas_type, provider, denomination_cents).
    // Keep only the highest-commission entry per unique key.
    const deduped = new Map();
    for (const r of rawRows) {
      const dk = `${r.vasType}|${r.provider}|${r.denominationCents}`;
      const existing = deduped.get(dk);
      if (!existing || r.commission > existing.commission) {
        deduped.set(dk, r);
      }
    }
    const rows = Array.from(deduped.values());
    console.log(`   Computed ${rows.length} best offers (${rawRows.length - rows.length} duplicates merged)`);

    // 3. Atomic replace: truncate and insert in batches
    await client.query('TRUNCATE TABLE vas_best_offers RESTART IDENTITY');

    if (rows.length > 0) {
      const BATCH_SIZE = 200;
      for (let b = 0; b < rows.length; b += BATCH_SIZE) {
        const batch = rows.slice(b, b + BATCH_SIZE);
        const valuePlaceholders = [];
        const values = [];
        let idx = 1;

        for (const r of batch) {
          const denoms = r.denominations || [r.denominationCents];
          valuePlaceholders.push(
            `($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++}::jsonb, $${idx++}, $${idx++}, $${idx++})`
          );
          values.push(
            r.vasType,
            r.provider || '',
            r.denominationCents,
            r.productVariantId,
            r.productId,
            r.supplierId,
            r.supplierCode || '',
            r.productName || '',
            r.supplierProductId || '',
            r.commission,
            r.fixedFee || 0,
            JSON.stringify(denoms),
            r.minAmount,
            r.maxAmount,
            catalogVersion
          );
        }

        await client.query(
          `INSERT INTO vas_best_offers
           (vas_type, provider, denomination_cents, product_variant_id, product_id,
            supplier_id, supplier_code, product_name, supplier_product_id,
            commission, fixed_fee, denominations, min_amount, max_amount, catalog_version)
           VALUES ${valuePlaceholders.join(', ')}
           ON CONFLICT (vas_type, provider, denomination_cents)
           DO UPDATE SET
             commission = EXCLUDED.commission,
             product_variant_id = EXCLUDED.product_variant_id,
             product_id = EXCLUDED.product_id,
             supplier_id = EXCLUDED.supplier_id,
             supplier_code = EXCLUDED.supplier_code,
             product_name = EXCLUDED.product_name,
             supplier_product_id = EXCLUDED.supplier_product_id,
             fixed_fee = EXCLUDED.fixed_fee,
             denominations = EXCLUDED.denominations,
             min_amount = EXCLUDED.min_amount,
             max_amount = EXCLUDED.max_amount,
             catalog_version = EXCLUDED.catalog_version`,
          values
        );
      }
    }

    // 4. Audit log
    await client.query(
      `INSERT INTO catalog_refresh_audit (refreshed_by, vas_type, rows_affected, catalog_version)
       VALUES ($1, NULL, $2, $3)`,
      [refreshedBy, rows.length, catalogVersion]
    );

    await client.query('COMMIT');

    const elapsed = Date.now() - start;
    console.log(`✅ vas_best_offers refreshed in ${elapsed}ms (${rows.length} rows, version ${catalogVersion})`);
    return { rowsAffected: rows.length, catalogVersion };
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Refresh failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

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
