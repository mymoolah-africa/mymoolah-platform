#!/usr/bin/env node

/**
 * Check if easypay_voucher ENUM value exists in the database
 * This helps verify if the migration actually worked
 */

require('dotenv').config();
const { getUATClient, closeAll } = require('./db-connection-helper');

async function checkEnum() {
  let client;
  
  try {
    console.log('📋 Connecting to UAT database...');
    client = await getUATClient();
    console.log('✅ Connected to database');
    
    // Find all ENUM types that might be voucherType
    console.log('\n📋 Checking for voucherType ENUM types...');
    const enumTypesResult = await client.query(`
      SELECT typname, typtype 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname LIKE '%voucher%'
      ORDER BY typname;
    `);
    
    const enumTypes = enumTypesResult.rows;
    
    if (enumTypes.length === 0) {
      console.log('⚠️  No ENUM types found with "voucher" in the name');
      console.log('\n📋 Checking all ENUM types...');
      const allEnumsResult = await client.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
      `);
      console.log('Found ENUM types:', allEnumsResult.rows.map(e => e.typname).join(', '));
    } else {
      console.log(`\n✅ Found ${enumTypes.length} ENUM type(s) with "voucher" in name:`);
      enumTypes.forEach(e => console.log(`   - ${e.typname}`));
      
      // Check each ENUM for easypay_voucher value
      for (const enumType of enumTypes) {
        const enumName = enumType.typname;
        console.log(`\n📋 Checking ENUM: ${enumName}`);
        
        const valuesResult = await client.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
          ORDER BY enumsortorder;
        `, [enumName]);
        
        const values = valuesResult.rows;
        console.log(`   Values: ${values.map(v => v.enumlabel).join(', ')}`);
        
        const hasEasypayVoucher = values.some(v => v.enumlabel === 'easypay_voucher');
        if (hasEasypayVoucher) {
          console.log(`   ✅ easypay_voucher EXISTS in ${enumName}`);
        } else {
          console.log(`   ❌ easypay_voucher NOT FOUND in ${enumName}`);
        }
      }
    }
    
    // Also check the vouchers table structure
    console.log('\n📋 Checking vouchers table structure...');
    const tableInfoResult = await client.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `);
    
    const tableInfo = tableInfoResult.rows;
    if (tableInfo.length > 0) {
      console.log(`   Column type: ${tableInfo[0].data_type}`);
      console.log(`   UDT name: ${tableInfo[0].udt_name}`);
    } else {
      console.log('   ⚠️  voucherType column not found');
    }
    
    client.release();
    console.log('\n✅ Check completed');
    
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

checkEnum();
