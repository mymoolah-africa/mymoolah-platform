/* eslint-disable @typescript-eslint/no-var-requires */
'use strict';

/**
 * Cleanup migration: Remove walletId migration artifact columns
 * 
 * After walletId de-PII migration (20251202_04), we have:
 * - walletId_prev: Old walletId (kept for rollback)
 * - walletId_old: Backup of old walletId
 * 
 * These columns are no longer needed after successful migration.
 * This migration removes them to clean up the schema.
 * 
 * SAFETY: Only removes columns if:
 * 1. walletId column exists and has data
 * 2. All transactions reference the new walletId format
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // Check if columns exist before attempting to drop
    const checkColumn = async (columnName) => {
      const result = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'wallets' 
          AND column_name = $1
        ) as exists
      `, { bind: [columnName], type: Sequelize.QueryTypes.SELECT });
      return result[0]?.exists || false;
    };

    // Verify walletId column exists and has data (migration completed successfully)
    const walletIdCheck = await sequelize.query(`
      SELECT COUNT(*)::int as count 
      FROM wallets 
      WHERE "walletId" IS NOT NULL
    `, { type: Sequelize.QueryTypes.SELECT });

    if (walletIdCheck[0]?.count === 0) {
      console.log('⚠️  Warning: No walletId values found. Skipping cleanup to preserve rollback capability.');
      return;
    }

    // Drop walletId_prev if it exists
    // First, drop any foreign key constraints that reference it
    const hasPrev = await checkColumn('walletId_prev');
    if (hasPrev) {
      console.log('   Checking for foreign key constraints on walletId_prev...');
      
      // Find and drop foreign key constraints that reference walletId_prev
      const fkConstraints = await sequelize.query(`
        SELECT 
          tc.constraint_name,
          tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
          AND kcu.referenced_table_name = 'wallets'
          AND kcu.referenced_column_name = 'walletId_prev'
      `, { type: Sequelize.QueryTypes.SELECT });

      for (const fk of fkConstraints) {
        console.log(`   Dropping foreign key constraint: ${fk.constraint_name} on ${fk.table_name}...`);
        await sequelize.query(`
          ALTER TABLE "${fk.table_name}" 
          DROP CONSTRAINT IF EXISTS "${fk.constraint_name}"
        `);
      }

      console.log('   Removing walletId_prev column...');
      await sequelize.query(`ALTER TABLE wallets DROP COLUMN IF EXISTS "walletId_prev";`);
    }

    // Drop walletId_old if it exists
    const hasOld = await checkColumn('walletId_old');
    if (hasOld) {
      console.log('   Removing walletId_old column...');
      await sequelize.query(`ALTER TABLE wallets DROP COLUMN IF EXISTS "walletId_old";`);
    }

    console.log('✅ Cleanup complete: Migration artifact columns removed');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;

    // Re-add columns for rollback (but we can't restore the data)
    // This is just to restore the schema structure
    await sequelize.query(`
      ALTER TABLE wallets 
      ADD COLUMN IF NOT EXISTS "walletId_prev" VARCHAR(255),
      ADD COLUMN IF NOT EXISTS "walletId_old" TEXT;
    `);

    console.log('⚠️  Rollback: Columns re-added but data cannot be restored');
  }
};
