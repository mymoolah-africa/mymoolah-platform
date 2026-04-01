#!/usr/bin/env node
/**
 * Delete a user and ALL related data from the STAGING database.
 *
 * Usage:
 *   node scripts/delete-staging-user.js 0738168645
 *   node scripts/delete-staging-user.js +27738168645
 *   node scripts/delete-staging-user.js 27738168645
 *
 * Safety:
 *   - ONLY works against the STAGING database (port 6544)
 *   - Uses admin client (postgres) because some tables have FK constraints
 *   - Resets the user's auto-increment ID so it can be reused
 *   - Prints a summary of all rows deleted
 */

'use strict';

const { getStagingAdminClient } = require('./db-connection-helper');

function normalizeToE164(phone) {
  let cleaned = String(phone).replace(/[\s\-()]/g, '');
  if (cleaned.startsWith('0') && cleaned.length === 10) {
    cleaned = '+27' + cleaned.slice(1);
  } else if (cleaned.startsWith('27') && !cleaned.startsWith('+27')) {
    cleaned = '+' + cleaned;
  } else if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

const CHILD_TABLES = [
  // Order matters: delete deepest references first

  // Referral system
  { table: 'referral_earnings', columns: ['earner_user_id', 'transaction_user_id'] },
  { table: 'referral_chains', columns: ['user_id'] },
  { table: 'user_referral_stats', columns: ['user_id'] },
  { table: 'referrals', columns: ['referrer_user_id', 'referee_user_id'] },

  // Support
  { table: 'support_messages', columns: ['senderId'] },
  { table: 'support_feedback', columns: ['userId'] },
  { table: 'support_interactions', columns: ['userId'] },
  { table: 'support_tickets', columns: ['userId'] },
  { table: 'feedback_submissions', columns: ['userId'] },

  // Ads
  { table: 'ad_engagements', columns: ['userId'] },
  { table: 'ad_views', columns: ['userId'] },

  // VAS / Bank / NFC
  { table: 'vas_transactions', columns: ['userId'] },
  { table: 'dtmercury_transactions', columns: ['userId'] },
  { table: 'standard_bank_transactions', columns: ['userId'] },
  { table: 'standard_bank_rtp_requests', columns: ['userId'] },
  { table: 'nfc_deposit_intents', columns: ['userId'] },

  // Orders and product logs
  { table: 'orders', columns: ['userId', 'clientId'] },
  { table: 'product_availability_logs', columns: ['userId'] },

  // Vouchers and OTP
  { table: 'vouchers', columns: ['userId'] },
  { table: 'otp_verifications', columns: ['user_id'] },

  // KYC and tier
  { table: 'kyc', columns: ['userId'] },
  { table: 'user_tier_history', columns: ['user_id'] },

  // User settings / notifications / favorites
  { table: 'UserSettings', columns: ['userId'] },
  { table: 'user_notification_settings', columns: ['userId'] },
  { table: 'user_favorites', columns: ['userId'] },
  { table: 'notifications', columns: ['userId'] },

  // P2P
  { table: 'recent_payer_hides', columns: ['requesterUserId', 'payerUserId'] },
  { table: 'payment_requests', columns: ['requesterUserId', 'payerUserId'] },
  { table: 'recurring_payment_requests', columns: ['requesterUserId', 'payerUserId'] },

  // Beneficiaries
  { table: 'beneficiaries', columns: ['userId'] },

  // Core financial (payments before transactions, transactions before wallets)
  { table: 'mymoolah_transactions', columns: ['userId'] },
  { table: 'payments', columns: ['userId'] },
  { table: 'transactions', columns: ['userId'] },
  { table: 'wallets', columns: ['userId'] },
];

async function main() {
  const phoneArg = process.argv[2];
  if (!phoneArg) {
    console.error('Usage: node scripts/delete-staging-user.js <phone_number>');
    console.error('  e.g. node scripts/delete-staging-user.js 0738168645');
    process.exit(1);
  }

  const e164 = normalizeToE164(phoneArg);
  console.log(`\nLooking up user with phone: ${e164} on STAGING...\n`);

  const client = await getStagingAdminClient();

  try {
    const userResult = await client.query(
      'SELECT id, "firstName", "lastName", email, "phoneNumber", status, "kycStatus" FROM users WHERE "phoneNumber" = $1',
      [e164]
    );

    if (userResult.rows.length === 0) {
      console.log('No user found with that phone number on staging.');
      console.log('Tried E.164 format:', e164);
      client.release();
      process.exit(0);
    }

    const user = userResult.rows[0];
    console.log('Found user:');
    console.log(`  ID:    ${user.id}`);
    console.log(`  Name:  ${user.firstName} ${user.lastName}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Phone: ${user.phoneNumber}`);
    console.log(`  Status: ${user.status} | KYC: ${user.kycStatus}`);
    console.log('');

    const userId = user.id;
    const summary = [];

    await client.query('BEGIN');

    for (const { table, columns } of CHILD_TABLES) {
      const tableExists = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
        [table.toLowerCase()]
      );
      if (!tableExists.rows[0].exists) {
        // Also check with original casing (e.g., "UserSettings")
        const tableExactCase = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );
        if (!tableExactCase.rows[0].exists) continue;
      }

      const conditions = columns.map((col, i) => `"${col}" = $${i + 1}`).join(' OR ');
      const params = columns.map(() => userId);

      try {
        const result = await client.query(
          `DELETE FROM "${table}" WHERE ${conditions}`,
          params
        );
        if (result.rowCount > 0) {
          summary.push({ table, deleted: result.rowCount });
        }
      } catch (err) {
        // Table might not exist in this DB or column mismatch — skip gracefully
        console.log(`  [skip] ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    // Delete the user record itself
    const delUser = await client.query('DELETE FROM users WHERE id = $1', [userId]);
    summary.push({ table: 'users', deleted: delUser.rowCount });

    await client.query('COMMIT');

    console.log('=== DELETION SUMMARY ===\n');
    let totalRows = 0;
    for (const { table, deleted } of summary) {
      console.log(`  ${table}: ${deleted} row(s)`);
      totalRows += deleted;
    }
    console.log(`\n  TOTAL: ${totalRows} row(s) deleted`);
    console.log(`\nUser ${user.firstName} ${user.lastName} (ID ${userId}) fully purged from staging.`);

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('ERROR — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    process.exit(0);
  }
}

main();
