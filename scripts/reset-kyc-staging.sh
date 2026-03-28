#!/bin/bash

###############################################################################
# KYC Reset Script - Staging Database (Direct)
###############################################################################
#
# Purpose: Reset KYC status for a user directly in the Staging database
#          Uses db-connection-helper.js (Cloud SQL Auth Proxy on port 6544)
#
# Usage:
#   ./scripts/reset-kyc-staging.sh [USER_ID]
#
# Examples:
#   ./scripts/reset-kyc-staging.sh        # Reset user ID 1 (default)
#   ./scripts/reset-kyc-staging.sh 5      # Reset user ID 5
#
# Requirements:
#   - Cloud SQL Auth Proxy running on port 6544
#   - Run ./scripts/ensure-proxies-running.sh first if needed
#
# What it does:
#   1. Deletes all KYC records for the specified user
#   2. Resets wallet kycVerified to false
#   3. Resets user kycStatus to 'not_started', kyc_tier to NULL
#   4. Clears idNumber, idType, idVerified
#
###############################################################################

USER_ID="${1:-1}"

echo "Resetting KYC for user ID ${USER_ID} in STAGING database..."

node -e "
const { getStagingClient } = require('./scripts/db-connection-helper');
(async () => {
  const client = await getStagingClient();
  try {
    await client.query('BEGIN');

    const kyc = await client.query('DELETE FROM kyc WHERE \"userId\" = \$1', [${USER_ID}]);
    console.log('KYC records deleted:', kyc.rowCount);

    const wallet = await client.query(
      'UPDATE wallets SET \"kycVerified\" = false, \"kycVerifiedAt\" = NULL, \"kycVerifiedBy\" = NULL WHERE \"userId\" = \$1',
      [${USER_ID}]
    );
    console.log('Wallets updated:', wallet.rowCount);

    const user = await client.query(
      'UPDATE users SET \"kycStatus\" = \$1, kyc_tier = NULL, \"idNumber\" = NULL, \"idType\" = NULL, \"idVerified\" = false WHERE id = \$2',
      ['not_started', ${USER_ID}]
    );
    console.log('User updated:', user.rowCount);

    await client.query('COMMIT');

    const verify = await client.query(
      'SELECT id, \"firstName\", \"lastName\", \"phoneNumber\", \"kycStatus\", kyc_tier, \"idVerified\" FROM users WHERE id = \$1',
      [${USER_ID}]
    );
    if (verify.rows.length > 0) {
      const r = verify.rows[0];
      console.log('');
      console.log('=== STAGING USER AFTER RESET ===');
      console.log('ID:', r.id, '|', r.firstName, r.lastName);
      console.log('Phone:', r.phoneNumber);
      console.log('KYC Status:', r.kycStatus);
      console.log('KYC Tier:', r.kyc_tier);
      console.log('ID Verified:', r.idVerified);
      console.log('');
      console.log('KYC reset completed successfully for STAGING.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('ROLLBACK - Error:', e.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
})();
"
