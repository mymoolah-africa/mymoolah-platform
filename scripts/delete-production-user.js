#!/usr/bin/env node
/**
 * Delete a user and ALL related data from the PRODUCTION database.
 * Resets the users_id_seq so the next registration gets the deleted user's ID.
 *
 * Usage:
 *   node scripts/delete-production-user.js <user_id>
 *
 * Safety:
 *   - Requires explicit --confirm flag for actual deletion
 *   - Dry-run by default (shows what would be deleted)
 *   - Uses getProductionClient (mymoolah_app on port 6545)
 *   - Uses getProductionAdminClient (postgres) for sequence reset
 *   - Does NOT touch product/supplier/catalog tables
 */

'use strict';

const { getProductionClient, getProductionAdminClient } = require('./db-connection-helper');

const CHILD_TABLES = [
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
  { table: 'flash_transactions', columns: ['userId'] },
  { table: 'supplier_transactions', columns: ['userId'] },
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

  // Ledger / journal entries referencing this user's wallet
  { table: 'journal_entries', columns: ['userId'] },
  { table: 'tax_transactions', columns: ['userId'] },

  // Core financial
  { table: 'mymoolah_transactions', columns: ['userId'] },
  { table: 'payments', columns: ['userId'] },
  { table: 'transactions', columns: ['userId'] },
  { table: 'wallets', columns: ['userId'] },
];

async function main() {
  const userIdArg = process.argv[2];
  const confirmFlag = process.argv.includes('--confirm');

  if (!userIdArg || isNaN(parseInt(userIdArg, 10))) {
    console.error('Usage: node scripts/delete-production-user.js <user_id> [--confirm]');
    console.error('  Without --confirm: dry-run (shows what would be deleted)');
    console.error('  With --confirm: actually deletes the data');
    process.exit(1);
  }

  const userId = parseInt(userIdArg, 10);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  PRODUCTION USER CLEANUP — User ID: ${userId}`);
  console.log(`  Mode: ${confirmFlag ? '*** LIVE DELETE ***' : 'DRY RUN (use --confirm to execute)'}`);
  console.log(`${'='.repeat(60)}\n`);

  const client = await getProductionClient();

  try {
    const userResult = await client.query(
      'SELECT id, "firstName", "lastName", email, "phoneNumber", status, "kycStatus" FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      console.log(`No user found with ID ${userId} on production.`);
      client.release();
      process.exit(0);
    }

    const user = userResult.rows[0];
    console.log('Found user:');
    console.log(`  ID:     ${user.id}`);
    console.log(`  Name:   ${user.firstName} ${user.lastName}`);
    console.log(`  Email:  ${user.email}`);
    console.log(`  Phone:  ${user.phoneNumber}`);
    console.log(`  Status: ${user.status} | KYC: ${user.kycStatus}`);
    console.log('');

    const summary = [];

    await client.query('BEGIN');

    for (const { table, columns } of CHILD_TABLES) {
      const tableExists = await client.query(
        `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
        [table.toLowerCase()]
      );
      let exists = tableExists.rows[0].exists;
      if (!exists) {
        const tableExactCase = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1)`,
          [table]
        );
        exists = tableExactCase.rows[0].exists;
      }
      if (!exists) continue;

      const conditions = columns.map((col, i) => `"${col}" = $${i + 1}`).join(' OR ');
      const params = columns.map(() => userId);

      try {
        if (confirmFlag) {
          await client.query(`SAVEPOINT sp_${table.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
          const result = await client.query(`DELETE FROM "${table}" WHERE ${conditions}`, params);
          await client.query(`RELEASE SAVEPOINT sp_${table.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
          if (result.rowCount > 0) {
            summary.push({ table, deleted: result.rowCount });
          }
        } else {
          await client.query(`SAVEPOINT sp_${table.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
          const countResult = await client.query(
            `SELECT COUNT(*) as cnt FROM "${table}" WHERE ${conditions}`, params
          );
          await client.query(`RELEASE SAVEPOINT sp_${table.toLowerCase().replace(/[^a-z0-9]/g, '_')}`);
          const cnt = parseInt(countResult.rows[0].cnt, 10);
          if (cnt > 0) {
            summary.push({ table, deleted: cnt });
          }
        }
      } catch (err) {
        const sp = `sp_${table.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await client.query(`ROLLBACK TO SAVEPOINT ${sp}`).catch(() => {});
        console.log(`  [skip] ${table}: ${err.message.split('\n')[0]}`);
      }
    }

    // Delete the user record itself
    if (confirmFlag) {
      const delUser = await client.query('DELETE FROM users WHERE id = $1', [userId]);
      summary.push({ table: 'users', deleted: delUser.rowCount });
      await client.query('COMMIT');
    } else {
      summary.push({ table: 'users', deleted: 1 });
      await client.query('ROLLBACK');
    }

    const action = confirmFlag ? 'DELETED' : 'WOULD DELETE';
    console.log(`\n=== ${action} SUMMARY ===\n`);
    let totalRows = 0;
    for (const { table, deleted } of summary) {
      console.log(`  ${table}: ${deleted} row(s)`);
      totalRows += deleted;
    }
    console.log(`\n  TOTAL: ${totalRows} row(s) ${confirmFlag ? 'deleted' : 'would be deleted'}`);

    if (confirmFlag) {
      console.log(`\nUser ${user.firstName} ${user.lastName} (ID ${userId}) fully purged from PRODUCTION.`);

      // Reset sequence so next user gets this ID
      console.log(`\nResetting users_id_seq to allow ID ${userId} to be reused...`);
      client.release();

      const adminClient = await getProductionAdminClient();
      try {
        const maxIdResult = await adminClient.query('SELECT COALESCE(MAX(id), 0) as max_id FROM users');
        const maxId = parseInt(maxIdResult.rows[0].max_id, 10);
        const seqVal = Math.max(maxId, 0);
        await adminClient.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${seqVal + 1}`);
        console.log(`  Sequence reset: next user will get ID ${seqVal + 1}`);
        if (seqVal === 0) {
          console.log(`  (No users remain — next registration will be ID 1)`);
        }
      } finally {
        adminClient.release();
      }
    } else {
      console.log(`\nRun with --confirm to execute the deletion.`);
      client.release();
    }

  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    console.error('ERROR — rolled back:', err.message);
    client.release();
    process.exit(1);
  }

  process.exit(0);
}

main();
