#!/usr/bin/env node

/**
 * Direct Password Reset Utility (break-glass tool)
 *
 * Resets a user's password_hash directly in the database, bypassing the
 * OTP + forgot-password flow. Intended for emergency use when SMS delivery
 * is unavailable (e.g. during UAT testing or provider outages).
 *
 * Also clears login_attempts and locked_until so the user has a clean slate.
 *
 * SECURITY:
 *   - Requires explicit environment argument (UAT | STAGING | PRODUCTION)
 *   - Production runs require a second confirmation flag
 *   - Logs an audit trail (target user id, email, timestamp, environment)
 *   - Uses bcrypt cost 12 (matches application default)
 *
 * Usage:
 *   node scripts/reset-user-password.js <ENV> <USER_ID> <NEW_PASSWORD> [--confirm-production]
 *
 * Examples:
 *   node scripts/reset-user-password.js UAT 1 'Andre123!'
 *   node scripts/reset-user-password.js STAGING 1 'NewPass!' 
 *   node scripts/reset-user-password.js PRODUCTION 1 'NewPass!' --confirm-production
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const {
  getUATClient,
  getStagingClient,
  getProductionClient,
} = require('./db-connection-helper');

async function main() {
  const args = process.argv.slice(2);
  const [envRaw, userIdRaw, newPassword, ...flags] = args;

  if (!envRaw || !userIdRaw || !newPassword) {
    console.error('❌ Usage: node scripts/reset-user-password.js <UAT|STAGING|PRODUCTION> <USER_ID> <NEW_PASSWORD> [--confirm-production]');
    process.exit(1);
  }

  const env = envRaw.toUpperCase();
  const userId = parseInt(userIdRaw, 10);
  if (!['UAT', 'STAGING', 'PRODUCTION'].includes(env)) {
    console.error(`❌ Invalid environment: ${envRaw}. Must be UAT, STAGING, or PRODUCTION.`);
    process.exit(1);
  }
  if (!Number.isInteger(userId) || userId <= 0) {
    console.error(`❌ Invalid user id: ${userIdRaw}. Must be a positive integer.`);
    process.exit(1);
  }
  if (newPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters.');
    process.exit(1);
  }

  if (env === 'PRODUCTION' && !flags.includes('--confirm-production')) {
    console.error('❌ Production resets require the --confirm-production flag for safety.');
    process.exit(1);
  }

  console.log('');
  console.log('🔐 Direct Password Reset (break-glass tool)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`   Environment: ${env}`);
  console.log(`   User ID:     ${userId}`);
  console.log(`   Password:    (${newPassword.length} chars, hashed with bcrypt cost 12)`);
  console.log(`   Timestamp:   ${new Date().toISOString()}`);
  console.log('');

  let client;
  try {
    if (env === 'UAT') client = await getUATClient();
    else if (env === 'STAGING') client = await getStagingClient();
    else client = await getProductionClient();

    // 1. Fetch user (sanity check)
    const before = await client.query(
      `SELECT id, email, "phoneNumber", "firstName", "lastName",
              "loginAttempts", "lockedUntil",
              LEFT("password_hash", 20) AS hash_preview
         FROM users WHERE id = $1`,
      [userId]
    );
    if (before.rowCount === 0) {
      console.error(`❌ User id ${userId} not found in ${env}.`);
      process.exit(2);
    }
    const user = before.rows[0];
    console.log('📋 Target user:');
    console.log(`   Email:           ${user.email}`);
    console.log(`   Phone:           ${user.phoneNumber}`);
    console.log(`   Name:            ${user.firstName} ${user.lastName}`);
    console.log(`   Login attempts:  ${user.loginAttempts}`);
    console.log(`   Locked until:    ${user.lockedUntil || '(not locked)'}`);
    console.log(`   Old hash prefix: ${user.hash_preview}...`);
    console.log('');

    // 2. Generate new bcrypt hash (matches app's cost factor of 12)
    const newHash = await bcrypt.hash(newPassword, 12);

    // 3. Atomic update — password_hash + clear lockout counters
    const result = await client.query(
      `UPDATE users
          SET password_hash  = $1,
              "loginAttempts" = 0,
              "lockedUntil"   = NULL,
              "updatedAt"     = NOW()
        WHERE id = $2
        RETURNING id, email, "phoneNumber", LEFT("password_hash", 20) AS new_hash_preview`,
      [newHash, userId]
    );

    if (result.rowCount !== 1) {
      console.error(`❌ Update affected ${result.rowCount} rows — aborting.`);
      process.exit(3);
    }

    console.log('✅ Password reset successful.');
    console.log(`   New hash prefix: ${result.rows[0].new_hash_preview}...`);
    console.log(`   Login attempts reset to 0, lockout cleared.`);
    console.log('');
    console.log(`ℹ️  User ${result.rows[0].email} (${result.rows[0].phoneNumber}) can now log in with the new password.`);
  } catch (err) {
    console.error('❌ Password reset failed:', err.message);
    if (err.stack) console.error(err.stack);
    process.exit(10);
  } finally {
    if (client) {
      try { await client.end(); } catch (_) { /* ignore */ }
    }
  }
}

main();
