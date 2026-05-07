#!/usr/bin/env node
'use strict';

/**
 * Read-only OTT catalog readiness audit.
 *
 * Uses the project DB helper and SELECT-only queries. It does not sync providers,
 * import products, publish governance mappings, enable payouts, or call OTT live APIs.
 */

require('dotenv').config();

const {
  getStagingClient,
  getProductionClient,
  closeAll,
} = require('./db-connection-helper');

const TARGET_PROVIDER_CODES = Object.freeze([
  '2',   // Standard Bank Instant Money - contractually held pending approval
  '10',  // Nedbank Cardless Cash Send - must have terms before wallet enablement
  '112', // ABSA CashSend
  '127', // PayShap Account - deliberately excluded from this frontend phase
  '3',
  '60',
  '68',  // Pick n Pay
  '69',  // Shoprite / Checkers
  '141', // Amazon - held until OTT support issue is resolved
  '146',
  '156', // Nando's
  '157', // Dis-Chem
]);

const TARGET_NAME_PATTERN = [
  'nando',
  'kfc',
  'hungry\\s*lion',
  'fishaways',
  'steers',
  'wimpy',
  'debonairs',
  'spur',
  'mcdonald',
  'burger',
  'rocomamas',
  'starbucks',
  'panarottis',
  'mugg',
  'john\\s*dory',
  'boxer',
  'ackermans',
  'ticketmaster',
  'netcare',
  'hungry',
  'pick\\s*n\\s*pay',
  'picknpay',
  'pnp',
  'checkers',
  'shoprite',
  'absa',
  'nedbank',
  'payshap',
  'gift',
  'voucher',
].join('|');

function parseArgs(argv) {
  const requested = new Set(argv);
  if (!requested.has('--staging') && !requested.has('--production')) {
    return ['staging', 'production'];
  }
  return [
    requested.has('--staging') ? 'staging' : null,
    requested.has('--production') ? 'production' : null,
  ].filter(Boolean);
}

async function safeQuery(client, sql, params = []) {
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (error) {
    return { error: error.message };
  }
}

function classifyLaunchRow(row) {
  if (row.provider_code === '127') return { decision: 'exclude', reason: 'OTT PayShap is not wired to the frontend in this phase.' };
  if (row.provider_code === '141') return { decision: 'hold', reason: 'Amazon had unresolved UAT provider failures; do not publish yet.' };
  if (row.provider_code === '146') return { decision: 'hold', reason: 'Takealot is not in the approved first OTT staging catalog allowlist.' };
  if (row.provider_code === '10' && row.fixed_fee_ex_vat && row.mmtp_fee_ex_vat) return { decision: 'candidate', reason: 'Nedbank is contractually allowed, portal-active, and has fixed-fee terms configured.' };
  if (row.provider_code === '10') return { decision: 'hold', reason: 'Nedbank is contractually allowed and portal-active, but fixed-fee terms are not configured yet.' };
  if (['68', '69', '156', '157'].includes(row.provider_code)) return { decision: 'candidate', reason: 'Confirmed target voucher/gift-card family for governance review.' };
  if (row.provider_code === '112') return { decision: 'candidate', reason: 'ABSA CashSend target cash-payout provider.' };
  if (row.provider_code === '2') return { decision: 'hold', reason: 'Standard Bank cash payout requires Standard Bank approval before MyMoolah can expose it.' };
  if (row.provider_type === 'gift_card' && row.is_customer_facing) return { decision: 'candidate', reason: 'Portal-active gift card; publish only after raw-name governance review.' };
  if (!row.is_customer_facing) return { decision: 'exclude', reason: 'Not customer-facing for this rollout.' };
  return { decision: 'review', reason: 'Review raw provider details before customer exposure.' };
}

async function auditEnvironment(name, getClient) {
  const client = await getClient();
  try {
    const terms = await safeQuery(client, `
      SELECT provider_code, provider_name, provider_type, service_family, commercial_type,
             gross_commission_pct, service_fee_pct, net_commission_pct,
             fixed_fee_ex_vat, mmtp_fee_ex_vat, reversal_fee_ex_vat,
             ROUND(((COALESCE(fixed_fee_ex_vat, 0) + COALESCE(mmtp_fee_ex_vat, 0)) * (1 + fixed_fee_vat_rate))::numeric, 2) AS customer_fee_incl_vat,
             is_customer_facing, is_mock, is_active, effective_from, effective_to,
             metadata->>'approvalRequired' AS approval_required,
             metadata->>'holdReason' AS hold_reason,
             metadata->>'economicTermsMissing' AS economic_terms_missing,
             metadata->>'lastProviderSyncAt' AS last_provider_sync_at
      FROM supplier_commercial_terms
      WHERE supplier_code = $1
        AND (provider_code = ANY($2::text[]) OR provider_name ~* $3)
        AND is_active = true
        AND effective_from <= CURRENT_DATE
        AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
      ORDER BY provider_type, provider_code;
    `, ['OTT', TARGET_PROVIDER_CODES, TARGET_NAME_PATTERN]);

    const productSummary = await safeQuery(client, `
      SELECT p.type::text AS product_type, COUNT(DISTINCT p.id)::int AS products, COUNT(pv.id)::int AS variants
      FROM products p
      JOIN suppliers s ON s.id = p."supplierId"
      LEFT JOIN product_variants pv ON pv."productId" = p.id
      WHERE s.code = $1
      GROUP BY p.type::text
      ORDER BY p.type::text;
    `, ['OTT']);

    const products = await safeQuery(client, `
      SELECT p.id AS product_id, p.name AS product_name, p.type::text AS product_type,
             p."supplierProductId" AS product_supplier_id,
             pv.id AS variant_id, pv."supplierProductId" AS variant_supplier_id,
             pv."vasType"::text AS vas_type, pv."transactionType"::text AS transaction_type,
             pv.provider, pv."minAmount" AS min_amount_cents, pv."maxAmount" AS max_amount_cents,
             pv.commission, pv.status::text AS variant_status,
             pcm.id AS mapping_id, pcm.review_status, pcm.publish_status,
             pcm.canonical_name, pcm.canonical_brand, pcm.category, pcm.risk_tier
      FROM products p
      JOIN suppliers s ON s.id = p."supplierId"
      LEFT JOIN product_variants pv ON pv."productId" = p.id
      LEFT JOIN product_catalog_mappings pcm
        ON pcm.supplier_code = s.code
       AND pcm.supplier_product_id = p."supplierProductId"
       AND pcm.product_type = p.type::text
      WHERE s.code = $1
        AND (p.name ~* $2 OR p."supplierProductId" = ANY($3::text[]) OR pv.provider ~* $2)
      ORDER BY p.type::text, p.name, pv.id;
    `, ['OTT', TARGET_NAME_PATTERN, TARGET_PROVIDER_CODES.map((code) => `OTT-${code}`)]);

    const governanceSummary = await safeQuery(client, `
      SELECT supplier_code, product_type, review_status, publish_status, COUNT(*)::int AS count
      FROM product_catalog_mappings
      WHERE supplier_code = $1
      GROUP BY supplier_code, product_type, review_status, publish_status
      ORDER BY product_type, review_status, publish_status;
    `, ['OTT']);

    const floatRows = await safeQuery(client, `
      SELECT id, "supplierId" AS supplier_id, "supplierName" AS supplier_name,
             "ledgerAccountCode" AS ledger_account_code, "currentBalance" AS current_balance,
             "minimumBalance" AS minimum_balance, status, "isActive" AS is_active
      FROM supplier_floats
      WHERE "supplierId" = $1 OR "ledgerAccountCode" = $2
      ORDER BY id;
    `, ['OTT', '1200-10-08']);

    const launchCandidates = Array.isArray(terms)
      ? terms.map((row) => ({ ...row, launch: classifyLaunchRow(row) }))
      : terms;

    return {
      environment: name,
      launchCandidates,
      productSummary,
      products,
      governanceSummary,
      floatRows,
    };
  } finally {
    client.release();
  }
}

async function main() {
  const environments = parseArgs(process.argv.slice(2));
  const output = {
    generatedAt: new Date().toISOString(),
    mode: 'read-only',
    targetProviderCodes: TARGET_PROVIDER_CODES,
    environments: [],
  };

  for (const environment of environments) {
    const getClient = environment === 'production' ? getProductionClient : getStagingClient;
    try {
      output.environments.push(await auditEnvironment(environment, getClient));
    } catch (error) {
      output.environments.push({ environment, error: error.message });
    }
  }

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      success: false,
      error: 'OTT_CATALOG_AUDIT_FAILED',
      message: error.message,
    }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeAll();
  });
