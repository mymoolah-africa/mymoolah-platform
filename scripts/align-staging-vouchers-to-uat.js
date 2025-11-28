#!/usr/bin/env node
/**
 * Align staging vouchers table to match UAT schema
 * 
 * UAT uses: voucherCode, voucherType, originalAmount, expiresAt
 * Staging uses: voucherId, type, amount, expiryDate
 * 
 * This script renames staging columns to match UAT.
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

  if (!stagingUrl) {
    console.error('❌ STAGING_DATABASE_URL (or DATABASE_URL) is required.');
    process.exit(1);
  }

  const staging = getSequelize(stagingUrl, 'Staging');

  try {
    console.log('🔌 Connecting to Staging database...');
    await staging.authenticate();
    console.log('✅ Connection established\n');

    const transaction = await staging.transaction();

    try {
      console.log('🔧 Aligning vouchers table to match UAT schema...\n');

      // Rename columns to match UAT
      console.log('📋 Renaming voucherId → voucherCode...');
      await staging.query(
        `ALTER TABLE vouchers RENAME COLUMN "voucherId" TO "voucherCode"`,
        { transaction }
      );

      console.log('📋 Renaming type → voucherType...');
      await staging.query(
        `ALTER TABLE vouchers RENAME COLUMN type TO "voucherType"`,
        { transaction }
      );

      console.log('📋 Renaming amount → originalAmount...');
      await staging.query(
        `ALTER TABLE vouchers RENAME COLUMN amount TO "originalAmount"`,
        { transaction }
      );

      console.log('📋 Renaming expiryDate → expiresAt...');
      await staging.query(
        `ALTER TABLE vouchers RENAME COLUMN "expiryDate" TO "expiresAt"`,
        { transaction }
      );

      await transaction.commit();

      console.log('\n✅ Vouchers table schema aligned with UAT!');
      console.log('✅ Columns now match: voucherCode, voucherType, originalAmount, expiresAt\n');

    } catch (error) {
      await transaction.rollback();
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

