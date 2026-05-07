'use strict';

const EFFECTIVE_FROM = '2026-05-07';

const PAYOUT_TERMS = [
  {
    providerCode: '112',
    providerName: 'ABSA CashSend',
    fixedFeeExVat: '9.96',
    mmtpFeeExVat: '1.34',
    reversalFeeExVat: '9.96',
    metadata: {
      rail: 'bank_cash_send',
      source: 'andré_ott_portal_contract_2026_05_07',
      customerFeeExVat: 11.30,
      customerFeeInclVat: 13.00,
      customerFacingFeeLabel: 'Transaction fee',
    },
  },
  {
    providerCode: '10',
    providerName: 'Nedbank Cardless Withdrawal',
    fixedFeeExVat: '9.96',
    mmtpFeeExVat: '1.34',
    reversalFeeExVat: '9.96',
    metadata: {
      rail: 'bank_cash_send',
      source: 'andré_ott_portal_contract_2026_05_07',
      customerFeeExVat: 11.30,
      customerFeeInclVat: 13.00,
      customerFacingFeeLabel: 'Transaction fee',
    },
  },
];

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
        ON CONFLICT (supplier_code, provider_code, service_family, commercial_type, effective_from)
        WHERE is_active = true
        DO UPDATE SET
          provider_name = EXCLUDED.provider_name,
          provider_type = EXCLUDED.provider_type,
          fixed_fee_ex_vat = EXCLUDED.fixed_fee_ex_vat,
          fixed_fee_vat_rate = EXCLUDED.fixed_fee_vat_rate,
          fixed_fee_is_vat_exclusive = EXCLUDED.fixed_fee_is_vat_exclusive,
          mmtp_fee_ex_vat = EXCLUDED.mmtp_fee_ex_vat,
          reversal_fee_ex_vat = EXCLUDED.reversal_fee_ex_vat,
          is_customer_facing = EXCLUDED.is_customer_facing,
          is_mock = EXCLUDED.is_mock,
          metadata = supplier_commercial_terms.metadata || EXCLUDED.metadata,
          "updatedAt" = NOW();
      `, {
        replacements: {
          ...term,
          effectiveFrom: EFFECTIVE_FROM,
          metadata: JSON.stringify(term.metadata),
        },
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        is_customer_facing = false,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'approvalRequired', true,
          'holdReason', 'Standard Bank approval required before MyMoolah customer exposure',
          'updatedByMigration', '20260507_01_seed_ott_absa_nedbank_payout_terms'
        ),
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code = '2'
        AND commercial_type = 'fixed_fee'
        AND is_active = true;
    `);

    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        is_customer_facing = false,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'frontendExcluded', true,
          'holdReason', 'Excluded from the first OTT staging rollout',
          'updatedByMigration', '20260507_01_seed_ott_absa_nedbank_payout_terms'
        ),
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code IN ('127', '140', '141', '146', '3', '60')
        AND is_active = true;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE FROM supplier_commercial_terms
      WHERE supplier_code = 'OTT'
        AND provider_code IN ('112', '10')
        AND service_family = 'cash_send'
        AND commercial_type = 'fixed_fee'
        AND effective_from = :effectiveFrom;
    `, { replacements: { effectiveFrom: EFFECTIVE_FROM } });

    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        is_customer_facing = true,
        metadata = COALESCE(metadata, '{}'::jsonb) - 'approvalRequired' - 'holdReason' - 'frontendExcluded' - 'updatedByMigration',
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code IN ('2', '127', '140', '141', '146', '3', '60')
        AND is_active = true;
    `);
  },
};
