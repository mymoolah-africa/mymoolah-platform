'use strict';

require('dotenv').config({ path: process.env.ENV_FILE || '.env.codespaces' });

const {
  getUATClient,
  getStagingClient,
  getProductionClient,
  closeAll,
} = require('./db-connection-helper');

function resolveEnvironment() {
  if (process.argv.includes('--production')) return 'production';
  if (process.argv.includes('--staging')) return 'staging';
  return 'uat';
}

async function getClientForEnvironment(environment) {
  if (environment === 'production') return getProductionClient();
  if (environment === 'staging') return getStagingClient();
  return getUATClient();
}

async function main() {
  const environment = resolveEnvironment();
  const client = await getClientForEnvironment(environment);

  try {
    const result = await client.query(`
      WITH ott_vat_journals AS (
        SELECT
          je.reference,
          je.description,
          je."createdAt",
          ROUND(SUM(jl.amount)::numeric, 2) AS vat_amount
        FROM journal_entries je
        JOIN journal_lines jl ON jl."entryId" = je.id
        JOIN ledger_accounts la ON la.id = jl."accountId"
        WHERE la.code = $1
          AND jl.dc = 'credit'
          AND (
            je.reference LIKE 'OTT-PAYOUT-%'
            OR (
              je.reference LIKE 'COMMISSION-VOUCHER_%'
              AND je.description ILIKE '% - OTT)%'
            )
          )
        GROUP BY je.reference, je.description, je."createdAt"
      ),
      expected_tax_evidence AS (
        SELECT
          ovj.reference,
          ovj.description,
          ovj."createdAt",
          ovj.vat_amount,
          CASE
            WHEN ovj.reference LIKE 'COMMISSION-%' THEN REPLACE(ovj.reference, 'COMMISSION-', '')
            ELSE fee_tx."transactionId"
          END AS expected_original_transaction_id,
          op.status AS payout_status
        FROM ott_vat_journals ovj
        LEFT JOIN ott_payouts op
          ON ovj.reference = CONCAT('OTT-PAYOUT-', op.payout_id)
        LEFT JOIN LATERAL (
          SELECT tx."transactionId"
          FROM transactions tx
          WHERE tx.reference = op.unique_reference_id
            AND tx.type = 'fee'
            AND tx.status IN ('completed', 'reversed')
          ORDER BY
            CASE WHEN tx.status = 'completed' THEN 0 ELSE 1 END,
            tx."createdAt" DESC
          LIMIT 1
        ) fee_tx ON true
      )
      SELECT
        ete.reference,
        ete.description,
        ete.vat_amount,
        ete.expected_original_transaction_id,
        ete.payout_status,
        tt.status AS tax_status,
        tt.supplier_code,
        tt.vat_direction,
        tt.is_claimable,
        CASE
          WHEN ete.expected_original_transaction_id IS NULL THEN 'missing_source_transaction'
          WHEN tt.id IS NULL THEN 'missing_tax_transaction'
          WHEN ete.payout_status IN ('reversed', 'cancelled') AND tt.status <> 'refunded' THEN 'payout_tax_not_refunded'
          WHEN COALESCE(tt.supplier_code, '') <> 'OTT' THEN 'supplier_code_missing'
          WHEN tt.vat_direction <> 'output' THEN 'vat_direction_not_output'
          WHEN tt.is_claimable IS DISTINCT FROM false THEN 'output_vat_marked_claimable'
          ELSE 'ok'
        END AS audit_status
      FROM expected_tax_evidence ete
      LEFT JOIN tax_transactions tt
        ON tt."originalTransactionId" = ete.expected_original_transaction_id
       AND tt."taxType" = 'vat'
      ORDER BY ete."createdAt" DESC, ete.reference;
    `, ['2300-10-01']);

    const rows = result.rows;
    const issues = rows.filter((row) => row.audit_status !== 'ok');
    console.log(JSON.stringify({
      environment,
      checkedRows: rows.length,
      issueCount: issues.length,
      issues,
    }, null, 2));

    if (issues.length > 0 && process.argv.includes('--fail-on-issues')) {
      process.exitCode = 1;
    }
  } finally {
    client.release();
    await closeAll();
  }
}

main().catch((error) => {
  console.error('OTT VAT evidence audit failed:', error.message);
  process.exit(1);
});
