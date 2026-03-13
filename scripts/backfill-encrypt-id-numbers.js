#!/usr/bin/env node
'use strict';

/**
 * Backfill Script — Encrypt existing plaintext idNumber values
 * =============================================================
 * Reads every user row that has a plaintext `idNumber` (not yet encrypted),
 * encrypts it with AES-256-GCM, computes the HMAC-SHA256 blind index, and
 * writes both values back to the database in safe batches.
 *
 * PREREQUISITES:
 *   1. Migration 01 must have run: 20260313_01_add_idnumberhash_column.js
 *   2. FIELD_ENCRYPTION_KEY and FIELD_HMAC_KEY must be set in environment
 *
 * SAFETY:
 *   - Only processes rows where idNumber is NOT already encrypted (no `enc:v1:` prefix)
 *   - Dry-run mode available: NODE_ENV=dryrun node scripts/backfill-encrypt-id-numbers.js
 *   - Processes in batches of 100 to avoid memory issues on large tables
 *   - Each row update is individual so a failure mid-run is safe to re-run
 *   - Logs progress with user IDs (no actual ID numbers in logs)
 *
 * USAGE:
 *   node scripts/backfill-encrypt-id-numbers.js
 *   node scripts/backfill-encrypt-id-numbers.js --dry-run
 *
 * AFTER RUNNING:
 *   Verify completion:
 *     SELECT COUNT(*) FROM users WHERE "idNumberHash" IS NULL;  → must be 0
 *   Then run migration 02:
 *     npx sequelize-cli db:migrate --name 20260313_02_idnumberhash_unique_notnull
 */

require('dotenv').config();

const { encrypt, blindIndex, isEncrypted, checkConfiguration } = require('../utils/fieldEncryption');

const BATCH_SIZE = 100;
const isDryRun = process.argv.includes('--dry-run');

async function run() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Backfill: Encrypt idNumber + set idNumberHash      ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  if (isDryRun) {
    console.log('🔍 DRY RUN MODE — no changes will be written to the database');
    console.log('');
  }

  // Validate encryption keys are configured
  const config = checkConfiguration();
  if (!config.configured) {
    console.error('❌ Encryption keys not configured:');
    console.error(`   FIELD_ENCRYPTION_KEY: ${config.encryptionKey ? '✅ set' : '❌ missing'}`);
    console.error(`   FIELD_HMAC_KEY:        ${config.hmacKey ? '✅ set' : '❌ missing'}`);
    console.error('');
    console.error('Generate keys with:');
    console.error('  node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
    console.error('Run that twice — once for FIELD_ENCRYPTION_KEY, once for FIELD_HMAC_KEY.');
    console.error('Add both to .env and to GCP Secret Manager before running this script.');
    process.exit(1);
  }
  console.log('✅ Encryption keys configured');
  console.log('');

  // Load DB models after env validation
  const db = require('../models');

  // Count rows to process
  const total = await db.User.count({
    where: db.Sequelize.literal(`"idNumber" NOT LIKE 'enc:v1:%'`),
  });

  console.log(`📊 Users with plaintext idNumber: ${total}`);

  if (total === 0) {
    console.log('✅ Nothing to do — all idNumber values are already encrypted.');
    await db.sequelize.close();
    return;
  }

  console.log(`   Processing in batches of ${BATCH_SIZE}...`);
  console.log('');

  let offset = 0;
  let processed = 0;
  let errors = 0;

  while (offset < total) {
    const users = await db.User.findAll({
      attributes: ['id', 'idNumber'],
      where: db.Sequelize.literal(`"idNumber" NOT LIKE 'enc:v1:%'`),
      limit: BATCH_SIZE,
      offset,
      raw: true, // raw: true so we get plain objects — no afterFind decrypt hook
    });

    if (users.length === 0) break;

    for (const user of users) {
      try {
        if (isEncrypted(user.idNumber)) {
          // Already encrypted by the time we fetched (race condition) — skip
          continue;
        }

        const encryptedIdNumber = encrypt(user.idNumber);
        const hash = blindIndex(user.idNumber);

        if (isDryRun) {
          console.log(`  [DRY RUN] User ${user.id}: would encrypt idNumber → ${encryptedIdNumber.substring(0, 30)}... hash=${hash.substring(0, 16)}...`);
        } else {
          // Direct DB update using raw query to bypass model hooks
          // (hooks would try to re-encrypt an already-encrypted value)
          await db.sequelize.query(
            `UPDATE users SET "idNumber" = :encrypted, "idNumberHash" = :hash WHERE id = :id`,
            {
              replacements: {
                encrypted: encryptedIdNumber,
                hash: hash,
                id: user.id,
              },
              type: db.Sequelize.QueryTypes.UPDATE,
            }
          );
        }
        processed++;
      } catch (err) {
        console.error(`❌ Error processing user ${user.id}: ${err.message}`);
        errors++;
      }
    }

    offset += BATCH_SIZE;
    const pct = Math.min(100, Math.round((processed / total) * 100));
    console.log(`   Processed ${processed}/${total} (${pct}%) — ${errors} errors`);
  }

  console.log('');
  console.log('════════════════════════════════════════════════════════');
  if (isDryRun) {
    console.log(`✅ DRY RUN complete. ${processed} rows would be encrypted.`);
  } else {
    console.log(`✅ Backfill complete. ${processed} rows encrypted. ${errors} errors.`);
  }
  console.log('');

  if (!isDryRun && errors === 0) {
    // Verify completion
    const remaining = await db.User.count({
      where: db.Sequelize.literal(`"idNumber" NOT LIKE 'enc:v1:%'`),
    });
    if (remaining === 0) {
      console.log('🔒 Verification passed: all idNumber values are now encrypted.');
      console.log('');
      console.log('NEXT STEP: Run migration 02 to enforce the unique constraint:');
      console.log('  npx sequelize-cli db:migrate --name 20260313_02_idnumberhash_unique_notnull');
    } else {
      console.warn(`⚠️  ${remaining} rows still have plaintext idNumber. Re-run this script.`);
    }
  }

  if (errors > 0) {
    console.error(`⚠️  ${errors} rows failed to encrypt. Review errors above and re-run.`);
    process.exit(1);
  }

  await db.sequelize.close();
}

run().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
