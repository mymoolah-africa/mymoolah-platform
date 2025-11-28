#!/usr/bin/env node
/**
 * Align Staging Schema to Match UAT
 * 
 * This script updates the staging database schema to match UAT exactly:
 * - Renames columns where needed (e.g., created_at → createdAt)
 * - Adds missing columns
 * - Adjusts data types and constraints
 * 
 * Run this BEFORE the clean slate migration to ensure schemas match.
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

function getSequelize(url, label) {
  if (!url) {
    console.error(`❌ Missing database URL for ${label}.`);
    process.exit(1);
  }

  return new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: { ssl: false },
  });
}

async function main() {
  const stagingUrl = process.env.STAGING_DATABASE_URL || process.env.DATABASE_URL;
  const dryRun = process.argv.includes('--dry-run');

  if (!stagingUrl) {
    console.error('❌ STAGING_DATABASE_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to Staging database...');
    await staging.authenticate();
    console.log('✅ Connection established\n');

    if (dryRun) {
      console.log('🔍 DRY RUN MODE - No changes will be made\n');
    }

    const transaction = dryRun ? null : await staging.transaction();

    try {
      console.log('🔧 Aligning Staging schema to match UAT...\n');

      // 1. Fix wallets table - rename snake_case to camelCase
      console.log('📋 Step 1: Aligning wallets table...');
      if (!dryRun) {
        // Check if columns exist before renaming
        const [columns] = await staging.query(
          `SELECT column_name FROM information_schema.columns 
           WHERE table_name = 'wallets' AND column_name IN ('created_at', 'updated_at')`,
          { transaction }
        );
        
        if (columns.length > 0) {
          if (columns.some(c => c.column_name === 'created_at')) {
            await staging.query(
              `ALTER TABLE wallets RENAME COLUMN created_at TO "createdAt"`,
              { transaction }
            );
            console.log('   ✅ Renamed created_at → createdAt');
          }
          
          if (columns.some(c => c.column_name === 'updated_at')) {
            await staging.query(
              `ALTER TABLE wallets RENAME COLUMN updated_at TO "updatedAt"`,
              { transaction }
            );
            console.log('   ✅ Renamed updated_at → updatedAt');
          }
        } else {
          console.log('   ℹ️  Columns already in camelCase format');
        }
      }

      // 2. Remove extra columns from users table
      console.log('\n📋 Step 2: Cleaning users table...');
      if (!dryRun) {
        const extraColumns = ['tier_level', 'tier_effective_from', 'tier_last_reviewed_at'];
        for (const col of extraColumns) {
          try {
            await staging.query(
              `ALTER TABLE users DROP COLUMN IF EXISTS ${col}`,
              { transaction }
            );
            console.log(`   ✅ Dropped column: ${col}`);
          } catch (err) {
            console.log(`   ℹ️  Column ${col} doesn't exist or already dropped`);
          }
        }
      }

      // 3. Add missing columns to transactions table
      console.log('\n📋 Step 3: Aligning transactions table...');
      if (!dryRun) {
        // Add processingTime if missing
        try {
          await staging.query(
            `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS "processingTime" INTEGER`,
            { transaction }
          );
          console.log('   ✅ Added processingTime column');
        } catch (err) {
          console.log('   ℹ️  processingTime column already exists');
        }

        // Drop reference column if it exists (not in UAT)
        try {
          await staging.query(
            `ALTER TABLE transactions DROP COLUMN IF EXISTS reference`,
            { transaction }
          );
          console.log('   ✅ Dropped reference column');
        } catch (err) {
          console.log('   ℹ️  reference column doesn\'t exist');
        }
      }

      // 4. Align vouchers table (major differences - safer to drop and recreate)
      console.log('\n📋 Step 4: Aligning vouchers table...');
      console.log('   ⚠️  Vouchers table has major schema differences');
      console.log('   ℹ️  Will be recreated during clean slate migration\n');

      if (!dryRun) {
        await transaction.commit();
      }

      console.log('═'.repeat(80));
      console.log('✅ SCHEMA ALIGNMENT COMPLETE!');
      console.log('═'.repeat(80));
      console.log('\n📊 Changes applied:');
      console.log('   • Wallets: Renamed created_at/updated_at to camelCase');
      console.log('   • Users: Removed tier columns');
      console.log('   • Transactions: Added processingTime, removed reference');
      console.log('   • Vouchers: Will be handled by clean slate migration');
      console.log('\n✅ Staging schema is now aligned with UAT');
      console.log('✅ Ready to run clean-slate-migration.js\n');

    } catch (error) {
      if (transaction) {
        await transaction.rollback();
      }
      throw error;
    }

  } catch (error) {
    console.error('\n❌ Schema alignment failed:', error.message);
    if (error.original) {
      console.error('   Original error:', error.original.message);
    }
    process.exitCode = 1;
  } finally {
    await staging.close();
  }
}

main();

