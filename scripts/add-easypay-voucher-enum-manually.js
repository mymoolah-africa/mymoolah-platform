#!/usr/bin/env node

/**
 * Manually add easypay_voucher ENUM value if migration didn't work
 * This script finds the actual ENUM type name and adds the value
 */

require('dotenv').config();
const { getUATClient, closeAll } = require('./db-connection-helper');

async function addEnumValue() {
  let client;
  
  try {
    console.log('📋 Connecting to UAT database...');
    client = await getUATClient();
    console.log('✅ Connected to database');
    
    // Find the actual ENUM type name from the column definition
    console.log('\n📋 Finding voucherType ENUM type...');
    const columnInfoResult = await client.query(`
      SELECT udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `);
    
    if (columnInfoResult.rows.length === 0) {
      console.error('❌ vouchers.voucherType column not found');
      client.release();
      await closeAll();
      process.exit(1);
    }
    
    const enumTypeName = columnInfoResult.rows[0].udt_name;
    console.log(`✅ Found ENUM type: ${enumTypeName}`);
    
    // Check if easypay_voucher already exists
    const valueCheckResult = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'easypay_voucher' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      ) as exists;
    `, [enumTypeName]);
    
    if (valueCheckResult.rows[0].exists) {
      console.log(`✅ easypay_voucher already exists in ${enumTypeName}`);
      console.log('   No action needed!');
    } else {
      console.log(`\n📝 Adding easypay_voucher to ${enumTypeName}...`);
      
      await client.query(`
        ALTER TYPE "${enumTypeName}" ADD VALUE 'easypay_voucher';
      `);
      
      console.log(`✅ Successfully added easypay_voucher to ${enumTypeName}`);
      
      // Verify it was added
      const verifyCheckResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
        ) as exists;
      `, [enumTypeName]);
      
      if (verifyCheckResult.rows[0].exists) {
        console.log('✅ Verification: easypay_voucher confirmed in ENUM');
      } else {
        console.error('❌ Verification failed: easypay_voucher not found after addition');
      }
    }
    
    // Show all current values
    const allValuesResult = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      ORDER BY enumsortorder;
    `, [enumTypeName]);
    
    console.log(`\n📋 All values in ${enumTypeName}:`);
    console.log(`   ${allValuesResult.rows.map(v => v.enumlabel).join(', ')}`);
    
    client.release();
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    if (client) {
      client.release();
    }
    await closeAll();
    process.exit(1);
  } finally {
    await closeAll();
  }
}

addEnumValue();
