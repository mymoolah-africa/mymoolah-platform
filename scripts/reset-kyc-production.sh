#!/bin/bash

###############################################################################
# KYC Reset Script - Production Database (Direct)
###############################################################################
#
# Purpose: Reset KYC status for a user directly in the Production database
#          Uses db-connection-helper.js (Cloud SQL Auth Proxy on port 6545)
#
# Usage:
#   ./scripts/reset-kyc-production.sh [USER_ID]
#
# Examples:
#   ./scripts/reset-kyc-production.sh        # Reset user ID 1 (default)
#   ./scripts/reset-kyc-production.sh 5      # Reset user ID 5
#
# Requirements:
#   - Cloud SQL Auth Proxy running on port 6545
#   - Run ./scripts/ensure-proxies-running.sh first if needed
#
# What it does:
#   1. Deletes all KYC records for the specified user
#   2. Resets wallet kycVerified to false
#   3. Resets user kycStatus to 'not_started', kyc_tier to NULL
#   4. Resets idVerified to false (preserves idNumber and idType from registration)
#
###############################################################################

USER_ID="${1:-1}"

echo ""
echo "⚠️  WARNING: You are about to reset KYC for user ID ${USER_ID} in PRODUCTION!"
echo ""
read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Resetting KYC for user ID ${USER_ID} in PRODUCTION database..."

node -e "
const { getProductionClient } = require('./scripts/db-connection-helper');
(async () => {
  const client = await getProductionClient();
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
      'UPDATE users SET \"kycStatus\" = \$1, kyc_tier = NULL, \"idVerified\" = false WHERE id = \$2',
      ['not_started', ${USER_ID}]
    );
    console.log('User updated:', user.rowCount);

    await client.query('COMMIT');

    const verify = await client.query(
      'SELECT id, \"firstName\", \"lastName\", \"phoneNumber\", \"kycStatus\", kyc_tier, \"idVerified\", \"idNumber\", \"idType\" FROM users WHERE id = \$1',
      [${USER_ID}]
    );
    if (verify.rows.length > 0) {
      const r = verify.rows[0];
      console.log('');
      console.log('=== PRODUCTION USER AFTER RESET ===');
      console.log('ID:', r.id, '|', r.firstName, r.lastName);
      console.log('Phone:', r.phoneNumber);
      console.log('ID Number:', r.idNumber || '(not set)');
      console.log('ID Type:', r.idType || '(not set)');
      console.log('KYC Status:', r.kycStatus);
      console.log('KYC Tier:', r.kyc_tier);
      console.log('ID Verified:', r.idVerified);
      console.log('');
      console.log('KYC reset completed successfully for PRODUCTION.');
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
