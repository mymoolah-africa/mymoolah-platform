'use strict';

/**
 * Migration 2 of 2 — Field-Level PII Encryption
 * ------------------------------------------------
 * RUN THIS ONLY AFTER the backfill script has successfully populated
 * `idNumberHash` for all existing users.
 *
 * This migration:
 *   1. Adds a UNIQUE index on `idNumberHash`
 *   2. Marks `idNumberHash` as NOT NULL
 *   3. Drops the old UNIQUE index on `idNumber` (now stores ciphertext,
 *      uniqueness is enforced by the hash column)
 *
 * PREREQUISITE: Verify backfill is complete with:
 *   SELECT COUNT(*) FROM users WHERE "idNumberHash" IS NULL;
 *   → Must return 0 before running this migration.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Safety check: abort if any rows still have a null hash
    const [results] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) AS missing FROM users WHERE "idNumberHash" IS NULL;
    `);
    const missing = parseInt(results[0].missing, 10);
    if (missing > 0) {
      throw new Error(
        `❌ Cannot apply migration: ${missing} user(s) still have NULL idNumberHash. ` +
        'Run node scripts/backfill-encrypt-id-numbers.js first.'
      );
    }

    console.log('All idNumberHash values populated — proceeding...');

    // 1. Add unique index on idNumberHash
    await queryInterface.addIndex('users', ['idNumberHash'], {
      unique: true,
      name: 'users_id_number_hash_unique',
    });
    console.log('✅ Added UNIQUE INDEX on users.idNumberHash');

    // 2. Mark idNumberHash NOT NULL
    await queryInterface.changeColumn('users', 'idNumberHash', {
      type: Sequelize.STRING(64),
      allowNull: false,
    });
    console.log('✅ Set users.idNumberHash NOT NULL');

    // 3. Drop the old unique index/constraint on idNumber
    //    (idNumber now holds ciphertext; uniqueness is enforced by idNumberHash)
    await queryInterface.sequelize.query(`
      ALTER TABLE users DROP CONSTRAINT IF EXISTS users_id_number_key;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS users_id_number_key;
    `);
    // Also try the Sequelize-generated name patterns
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS "users_idNumber_key";
    `);
    console.log('✅ Dropped unique constraint on users.idNumber (ciphertext, not searchable)');
  },

  async down(queryInterface, Sequelize) {
    console.log('Rolling back migration 02...');

    await queryInterface.removeIndex('users', 'users_id_number_hash_unique');
    console.log('✅ Removed UNIQUE INDEX from users.idNumberHash');

    await queryInterface.changeColumn('users', 'idNumberHash', {
      type: Sequelize.STRING(64),
      allowNull: true,
    });
    console.log('✅ Reverted users.idNumberHash to nullable');

    // Re-add unique constraint on idNumber
    await queryInterface.addIndex('users', ['idNumber'], {
      unique: true,
      name: 'users_id_number_key',
    });
    console.log('✅ Restored unique index on users.idNumber');
  },
};
