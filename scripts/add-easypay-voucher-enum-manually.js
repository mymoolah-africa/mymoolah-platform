#!/usr/bin/env node

/**
 * Manually add easypay_voucher ENUM value if migration didn't work
 * This script finds the actual ENUM type name and adds the value
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function addEnumValue() {
  // Use the same DATABASE_URL construction as migration script
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    const dbUser = process.env.DB_USER || 'mymoolah_app';
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.PROXY_PORT || '6543';
    const dbName = process.env.DB_NAME || 'mymoolah';
    
    if (!dbPassword) {
      console.error('❌ DB_PASSWORD or DATABASE_URL must be set');
      process.exit(1);
    }
    
    // URL encode password
    const encodedPassword = encodeURIComponent(dbPassword);
    databaseUrl = `postgres://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable`;
  }
  
  const sequelize = new Sequelize(databaseUrl, {
    logging: false,
    dialect: 'postgres'
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Find the actual ENUM type name from the column definition
    console.log('\n📋 Finding voucherType ENUM type...');
    const [columnInfo] = await sequelize.query(`
      SELECT udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `);
    
    if (columnInfo.length === 0) {
      console.error('❌ vouchers.voucherType column not found');
      await sequelize.close();
      process.exit(1);
    }
    
    const enumTypeName = columnInfo[0].udt_name;
    console.log(`✅ Found ENUM type: ${enumTypeName}`);
    
    // Check if easypay_voucher already exists
    const [valueCheck] = await sequelize.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_enum 
        WHERE enumlabel = 'easypay_voucher' 
        AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      ) as exists;
    `, {
      bind: [enumTypeName],
      type: Sequelize.QueryTypes.SELECT
    });
    
    if (valueCheck[0].exists) {
      console.log(`✅ easypay_voucher already exists in ${enumTypeName}`);
      console.log('   No action needed!');
    } else {
      console.log(`\n📝 Adding easypay_voucher to ${enumTypeName}...`);
      
      await sequelize.query(`
        ALTER TYPE "${enumTypeName}" ADD VALUE 'easypay_voucher';
      `);
      
      console.log(`✅ Successfully added easypay_voucher to ${enumTypeName}`);
      
      // Verify it was added
      const [verifyCheck] = await sequelize.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_enum 
          WHERE enumlabel = 'easypay_voucher' 
          AND enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
        ) as exists;
      `, {
        bind: [enumTypeName],
        type: Sequelize.QueryTypes.SELECT
      });
      
      if (verifyCheck[0].exists) {
        console.log('✅ Verification: easypay_voucher confirmed in ENUM');
      } else {
        console.error('❌ Verification failed: easypay_voucher not found after addition');
      }
    }
    
    // Show all current values
    const [allValues] = await sequelize.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = $1)
      ORDER BY enumsortorder;
    `, {
      bind: [enumTypeName],
      type: Sequelize.QueryTypes.SELECT
    });
    
    console.log(`\n📋 All values in ${enumTypeName}:`);
    console.log(`   ${allValues.map(v => v.enumlabel).join(', ')}`);
    
    await sequelize.close();
    console.log('\n✅ Script completed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('   Stack:', error.stack);
    await sequelize.close();
    process.exit(1);
  }
}

addEnumValue();
