'use strict';

const NEW_EFFECTIVE_FROM = '2026-05-07';
const OLD_EFFECTIVE_TO = '2026-05-06';

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        effective_to = :oldEffectiveTo,
        metadata = COALESCE(metadata, '{}'::jsonb) || jsonb_build_object(
          'supersededBy', '20260507_01_seed_ott_absa_nedbank_payout_terms',
          'supersededAt', NOW()
        ),
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code = '112'
        AND service_family = 'cash_send'
        AND commercial_type = 'fixed_fee'
        AND effective_from < :newEffectiveFrom
        AND effective_to IS NULL;
    `, {
      replacements: {
        oldEffectiveTo: OLD_EFFECTIVE_TO,
        newEffectiveFrom: NEW_EFFECTIVE_FROM,
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE supplier_commercial_terms
      SET
        effective_to = NULL,
        metadata = COALESCE(metadata, '{}'::jsonb) - 'supersededBy' - 'supersededAt',
        "updatedAt" = NOW()
      WHERE supplier_code = 'OTT'
        AND provider_code = '112'
        AND service_family = 'cash_send'
        AND commercial_type = 'fixed_fee'
        AND effective_to = :oldEffectiveTo;
    `, {
      replacements: { oldEffectiveTo: OLD_EFFECTIVE_TO },
    });
  },
};
