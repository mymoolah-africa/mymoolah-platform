'use strict';

/**
 * Fix beneficiary 22 ("Airtime - EeziAirtime") whose service account
 * was incorrectly stored with network = 'CellC' instead of 'eeziAirtime'.
 *
 * This happened because the beneficiary was created before the eeziAirtime
 * network option was added to the BeneficiaryModal network selector.
 */
module.exports = {
  async up(queryInterface) {
    console.log('🔄 Fixing beneficiary 22 network: CellC → eeziAirtime...');

    // Fix beneficiary_service_accounts (unified beneficiary accounts table)
    const [saResult] = await queryInterface.sequelize.query(`
      UPDATE beneficiary_service_accounts
      SET
        "serviceData" = jsonb_set(
          COALESCE("serviceData", '{}'),
          '{network}',
          '"eeziAirtime"'
        ),
        "updatedAt" = NOW()
      WHERE "beneficiaryId" = 22
        AND ("serviceData"->>'network' = 'CellC' OR "serviceData"->>'network' IS NULL)
    `);
    console.log(`✅ Fixed ${saResult?.rowCount ?? 'unknown'} service_account row(s) for beneficiary 22`);

    // Also fix beneficiary metadata if it stores network there
    const [bResult] = await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{network}',
          '"eeziAirtime"'
        ),
        "updatedAt" = NOW()
      WHERE id = 22
        AND (metadata->>'network' = 'CellC' OR metadata->>'network' IS NULL)
    `);
    console.log(`✅ Fixed ${bResult?.rowCount ?? 'unknown'} beneficiary row(s) for id 22`);

    console.log('✅ Beneficiary 22 network fix complete');
  },

  async down(queryInterface) {
    console.log('↩️  Rolling back beneficiary 22 network fix...');

    await queryInterface.sequelize.query(`
      UPDATE beneficiary_service_accounts
      SET
        "serviceData" = jsonb_set(
          COALESCE("serviceData", '{}'),
          '{network}',
          '"CellC"'
        ),
        "updatedAt" = NOW()
      WHERE "beneficiaryId" = 22
        AND "serviceData"->>'network' = 'eeziAirtime'
    `);

    await queryInterface.sequelize.query(`
      UPDATE beneficiaries
      SET
        metadata = jsonb_set(
          COALESCE(metadata, '{}'),
          '{network}',
          '"CellC"'
        ),
        "updatedAt" = NOW()
      WHERE id = 22
        AND metadata->>'network' = 'eeziAirtime'
    `);

    console.log('↩️  Rollback complete');
  }
};
