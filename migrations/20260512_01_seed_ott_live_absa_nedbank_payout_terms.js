'use strict';

const MIGRATION_ID = '20260512_01_seed_ott_live_absa_nedbank_payout_terms';
const EFFECTIVE_FROM = '2026-05-08';

const PAYOUT_TERMS = [
  {
    providerCode: '4',
    providerName: 'Nedbank Cardless Withdrawal',
    fixedFeeExVat: '9.96',
    mmtpFeeExVat: '1.34',
    reversalFeeExVat: '9.96',
  },
  {
    providerCode: '67',
    providerName: 'ABSA CashSend',
    fixedFeeExVat: '9.96',
    mmtpFeeExVat: '1.34',
    reversalFeeExVat: '9.96',
  },
];

function termMetadata(term, extra = {}) {
  return JSON.stringify({
    rail: 'bank_cash_send',
    source: 'andré_ott_portal_contract_2026_05_07',
    customerFeeExVat: 11.30,
    customerFeeInclVat: 13.00,
    customerFacingFeeLabel: 'Transaction fee',
    providerCodeSource: 'ott_live_provider_code',
    updatedByMigration: MIGRATION_ID,
    ...extra,
  });
}

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      INSERT INTO suppliers (name, code, "isActive", "createdAt", "updatedAt")
      VALUES ('OTT Mobile', 'OTT', true, NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        "isActive" = true,
        "updatedAt" = NOW();
    `);

    for (const term of PAYOUT_TERMS) {
      await queryInterface.sequelize.query(`
        UPDATE supplier_commercial_terms
        SET
          provider_name = :providerName,
          provider_type = 'payout',
          service_family = 'cash_send',
          commercial_type = 'fixed_fee',
          fixed_fee_ex_vat = :fixedFeeExVat,
          fixed_fee_vat_rate = 0.15,
          fixed_fee_is_vat_exclusive = true,
          mmtp_fee_ex_vat = :mmtpFeeExVat,
          reversal_fee_ex_vat = :reversalFeeExVat,
          is_customer_facing = true,
          is_mock = false,
          metadata = (
            COALESCE(metadata, '{}'::jsonb) - 'economicTermsMissing'
          ) || CAST(:metadata AS JSONB) || jsonb_build_object(
            'previousValues', CASE
              WHEN COALESCE(metadata, '{}'::jsonb) ? 'previousValues'
                THEN metadata->'previousValues'
              ELSE jsonb_build_object(
                'fixedFeeExVat', fixed_fee_ex_vat,
                'fixedFeeVatRate', fixed_fee_vat_rate,
                'fixedFeeIsVatExclusive', fixed_fee_is_vat_exclusive,
                'mmtpFeeExVat', mmtp_fee_ex_vat,
                'reversalFeeExVat', reversal_fee_ex_vat,
                'isCustomerFacing', is_customer_facing,
                'isMock', is_mock,
                'economicTermsMissing', COALESCE(metadata, '{}'::jsonb)->'economicTermsMissing'
              )
            END
          ),
          "updatedAt" = NOW()
        WHERE supplier_code = 'OTT'
          AND provider_code = :providerCode
          AND service_family = 'cash_send'
          AND commercial_type = 'fixed_fee'
          AND is_active = true;
      `, {
        replacements: {
          ...term,
          metadata: termMetadata(term),
        },
      });

      await queryInterface.sequelize.query(`
        INSERT INTO supplier_commercial_terms (
          supplier_id, supplier_code, provider_code, provider_name, provider_type, service_family,
          commercial_type, fixed_fee_ex_vat, fixed_fee_vat_rate, fixed_fee_is_vat_exclusive,
          mmtp_fee_ex_vat, reversal_fee_ex_vat, is_customer_facing, is_mock,
          is_active, effective_from, metadata, "createdAt", "updatedAt"
        )
        SELECT
          s.id, 'OTT', :providerCode, :providerName, 'payout', 'cash_send',
          'fixed_fee', :fixedFeeExVat, 0.15, true,
          :mmtpFeeExVat, :reversalFeeExVat, true, false,
          true, :effectiveFrom, CAST(:metadata AS JSONB), NOW(), NOW()
        FROM suppliers s
        WHERE s.code = 'OTT'
          AND NOT EXISTS (
            SELECT 1
            FROM supplier_commercial_terms existing
            WHERE existing.supplier_code = 'OTT'
              AND existing.provider_code = :providerCode
              AND existing.service_family = 'cash_send'
              AND existing.commercial_type = 'fixed_fee'
              AND existing.is_active = true
          );
      `, {
        replacements: {
          ...term,
          effectiveFrom: EFFECTIVE_FROM,
          metadata: termMetadata(term, { createdByMigration: MIGRATION_ID }),
        },
      });
    }
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM supplier_commercial_terms
      WHERE supplier_code = 'OTT'
        AND provider_code IN ('4', '67')
        AND service_family = 'cash_send'
        AND commercial_type = 'fixed_fee'
        AND metadata->>'createdByMigration' = :migrationId;
    `, { replacements: { migrationId: MIGRATION_ID } });

    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        fixed_fee_ex_vat = CASE
          WHEN metadata->'previousValues'->>'fixedFeeExVat' IS NULL THEN NULL
          ELSE (metadata->'previousValues'->>'fixedFeeExVat')::numeric
        END,
        fixed_fee_vat_rate = CASE
          WHEN metadata->'previousValues'->>'fixedFeeVatRate' IS NULL THEN NULL
          ELSE (metadata->'previousValues'->>'fixedFeeVatRate')::numeric
        END,
        fixed_fee_is_vat_exclusive = CASE
          WHEN metadata->'previousValues'->>'fixedFeeIsVatExclusive' IS NULL THEN true
          ELSE (metadata->'previousValues'->>'fixedFeeIsVatExclusive')::boolean
        END,
        mmtp_fee_ex_vat = CASE
          WHEN metadata->'previousValues'->>'mmtpFeeExVat' IS NULL THEN NULL
          ELSE (metadata->'previousValues'->>'mmtpFeeExVat')::numeric
        END,
        reversal_fee_ex_vat = CASE
          WHEN metadata->'previousValues'->>'reversalFeeExVat' IS NULL THEN NULL
          ELSE (metadata->'previousValues'->>'reversalFeeExVat')::numeric
        END,
        is_customer_facing = COALESCE((metadata->'previousValues'->>'isCustomerFacing')::boolean, false),
        is_mock = COALESCE((metadata->'previousValues'->>'isMock')::boolean, false),
        metadata = (
          metadata
          - 'rail'
          - 'source'
          - 'customerFeeExVat'
          - 'customerFeeInclVat'
          - 'customerFacingFeeLabel'
          - 'providerCodeSource'
          - 'updatedByMigration'
          - 'previousValues'
        ) || CASE
          WHEN (metadata->'previousValues'->>'economicTermsMissing')::boolean IS true
            THEN jsonb_build_object('economicTermsMissing', true)
          ELSE '{}'::jsonb
        END,
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code IN ('4', '67')
        AND service_family = 'cash_send'
        AND commercial_type = 'fixed_fee'
        AND is_active = true
        AND metadata->>'updatedByMigration' = :migrationId
        AND metadata ? 'previousValues';
    `, { replacements: { migrationId: MIGRATION_ID } });
  },
};
