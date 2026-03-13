'use strict';

/**
 * Migration 1 of 2 — Field-Level PII Encryption
 * ------------------------------------------------
 * Adds the `idNumberHash` column to the `users` table.
 * This column stores a deterministic HMAC-SHA256 blind index of the
 * plaintext ID number, enabling WHERE-clause lookups and unique constraints
 * on the encrypted `idNumber` field.
 *
 * ROLLOUT ORDER:
 *   1. Run THIS migration  →  adds nullable `idNumberHash` column
 *   2. Run backfill script →  node scripts/backfill-encrypt-id-numbers.js
 *   3. Run migration 02    →  adds unique index + marks column NOT NULL
 *
 * The column is nullable until the backfill populates values for all
 * existing rows. New registrations (via model hooks) will populate it
 * immediately after this migration runs.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding idNumberHash column to users table...');

    await queryInterface.addColumn('users', 'idNumberHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
      comment: 'HMAC-SHA256 blind index of idNumber. Used for WHERE lookups and uniqueness. See utils/fieldEncryption.js',
    });

    console.log('✅ Added users.idNumberHash column (nullable)');
    console.log('');
    console.log('NEXT STEPS:');
    console.log('  1. Set FIELD_ENCRYPTION_KEY and FIELD_HMAC_KEY in your environment / Secret Manager');
    console.log('  2. Run: node scripts/backfill-encrypt-id-numbers.js');
    console.log('  3. Run: npx sequelize-cli db:migrate --name 20260313_02_idnumberhash_unique_notnull');
  },

  async down(queryInterface) {
    console.log('Removing idNumberHash column from users table...');
    await queryInterface.removeColumn('users', 'idNumberHash');
    console.log('✅ Removed users.idNumberHash column');
  },
};
