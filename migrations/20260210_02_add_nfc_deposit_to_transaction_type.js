'use strict';

/**
 * Migration: Add 'nfc_deposit' to Transaction type
 *
 * Enables Transaction.type = 'nfc_deposit' for NFC tap-to-deposit.
 * PostgreSQL: if column uses enum, add value; if VARCHAR, no-op.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-10
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      const possibleEnumNames = ['enum_transactions_type', 'enum_transactions_type_1'];
      let added = false;

      for (const enumName of possibleEnumNames) {
        const [exists] = await queryInterface.sequelize.query(`
          SELECT 1 FROM pg_type WHERE typname = '${enumName}'
        `, { type: Sequelize.QueryTypes.SELECT });

        if (exists) {
          await queryInterface.sequelize.query(`
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_enum
                WHERE enumlabel = 'nfc_deposit'
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumName}')
              ) THEN
                ALTER TYPE "${enumName}" ADD VALUE 'nfc_deposit';
                RAISE NOTICE 'Added nfc_deposit to ${enumName}';
              END IF;
            EXCEPTION WHEN duplicate_object THEN
              RAISE NOTICE 'nfc_deposit already in ${enumName}';
            END
            $$;
          `);
          added = true;
          console.log(`✅ nfc_deposit added to ${enumName}`);
          break;
        }
      }

      if (!added) {
        console.log('ℹ️ transactions.type may be VARCHAR - nfc_deposit can be used as string');
      }
    } catch (err) {
      if (err.message && err.message.includes('duplicate') && err.message.includes('enum')) {
        console.log('ℹ️ nfc_deposit already in enum - skipping');
      } else {
        throw err;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('⚠️ Cannot safely remove enum value in PostgreSQL');
    return Promise.resolve();
  },
};
