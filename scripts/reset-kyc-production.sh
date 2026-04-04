#!/bin/bash

###############################################################################
# KYC Reset Script - Production Database (Direct)
###############################################################################
#
# Purpose: Reset KYC verification status for a user in Production so they
#          can re-upload documents. PRESERVES all registration data.
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
# What it RESETS (verification state only):
#   - user.kycStatus       → 'not_started'
#   - user.kyc_tier        → NULL
#   - user.idVerified      → false
#   - user.kycVerifiedAt   → NULL
#   - wallet.kycVerified   → false
#   - wallet.kycVerifiedAt → NULL
#   - wallet.kycVerifiedBy → NULL
#   - wallet limits        → back to Tier 0 defaults
#   - kyc records          → status set to 'reset' (NOT deleted)
#
# What it PRESERVES (registration data — NEVER touched):
#   - user.idNumber
#   - user.idNumberHash
#   - user.idType
#   - user.firstName, lastName, phoneNumber, email
#   - user.accountNumber
#   - kyc records (kept with status 'reset' for audit trail)
#
###############################################################################

USER_ID="${1:-1}"

echo ""
echo "⚠️  WARNING: You are about to reset KYC for user ID ${USER_ID} in PRODUCTION!"
echo ""

# Show current state before reset
node -e "
const { getProductionClient } = require('./scripts/db-connection-helper');
(async () => {
  const client = await getProductionClient();
  const r = await client.query(
    'SELECT id, \"firstName\", \"lastName\", \"phoneNumber\", \"kycStatus\", kyc_tier, \"idVerified\", \"idNumber\", \"idType\" FROM users WHERE id = \$1',
    [${USER_ID}]
  );
  if (r.rows.length === 0) {
    console.log('❌ User ID ${USER_ID} not found in production.');
    client.release();
    process.exit(1);
  }
  const u = r.rows[0];
  console.log('Current state:');
  console.log('  Name:', u.firstName, u.lastName);
  console.log('  Phone:', u.phoneNumber);
  console.log('  ID Number:', u.idNumber ? '****' + String(u.idNumber).slice(-4) : '(not set)');
  console.log('  KYC Status:', u.kycStatus, '| Tier:', u.kyc_tier, '| ID Verified:', u.idVerified);
  client.release();
  process.exit(0);
})();
"

echo ""
read -p "Are you sure? (yes/no): " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "Resetting KYC verification for user ID ${USER_ID} in PRODUCTION database..."

node -e "
const { getProductionClient } = require('./scripts/db-connection-helper');
(async () => {
  const client = await getProductionClient();
  try {
    await client.query('BEGIN');

    // 1. Reset KYC records to 'reset' status (preserve for audit trail)
    const kyc = await client.query(
      'UPDATE kyc SET status = \$1, \"updatedAt\" = NOW() WHERE \"userId\" = \$2 AND status != \$1',
      ['reset', ${USER_ID}]
    );
    console.log('KYC records reset:', kyc.rowCount);

    // 2. Reset wallet verification state and limits back to Tier 0
    const wallet = await client.query(
      'UPDATE wallets SET \"kycVerified\" = false, \"kycVerifiedAt\" = NULL, \"kycVerifiedBy\" = NULL, \"dailyLimit\" = 5000, \"monthlyLimit\" = 25000 WHERE \"userId\" = \$1',
      [${USER_ID}]
    );
    console.log('Wallets updated:', wallet.rowCount);

    // 3. Reset user verification state ONLY — preserve idNumber, idType, names, phone
    const user = await client.query(
      'UPDATE users SET \"kycStatus\" = \$1, kyc_tier = NULL, \"idVerified\" = false, \"kycVerifiedAt\" = NULL, \"updatedAt\" = NOW() WHERE id = \$2',
      ['not_started', ${USER_ID}]
    );
    console.log('User updated:', user.rowCount);

    await client.query('COMMIT');

    // Verify final state
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
      console.log('ID Number:', r.idNumber ? '****' + String(r.idNumber).slice(-4) + ' (preserved)' : '(not set)');
      console.log('ID Type:', r.idType || '(not set)');
      console.log('KYC Status:', r.kycStatus);
      console.log('KYC Tier:', r.kyc_tier);
      console.log('ID Verified:', r.idVerified);
      console.log('');
      console.log('✅ KYC reset completed. Registration data preserved.');
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
