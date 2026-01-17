#!/usr/bin/env node

/**
 * Check if easypay_voucher ENUM value exists in the database
 * This helps verify if the migration actually worked
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

async function checkEnum() {
  // Construct DATABASE_URL if not set
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    const dbUser = process.env.DB_USER || 'mymoolah_app';
    const dbPassword = process.env.DB_PASSWORD;
    const dbHost = process.env.DB_HOST || '127.0.0.1';
    const dbPort = process.env.PROXY_PORT || process.env.DB_PORT || '6543';
    const dbName = process.env.DB_NAME || 'mymoolah';
    
    if (!dbPassword) {
      console.error('❌ DB_PASSWORD or DATABASE_URL must be set');
      console.error('   Please ensure .env file is loaded or DATABASE_URL is set');
      process.exit(1);
    }
    
    // URL encode password (handle special characters)
    const encodedPassword = encodeURIComponent(dbPassword);
    databaseUrl = `postgres://${dbUser}:${encodedPassword}@${dbHost}:${dbPort}/${dbName}?sslmode=disable`;
    console.log(`📋 Constructed DATABASE_URL (host: ${dbHost}, port: ${dbPort})`);
  } else {
    console.log('📋 Using DATABASE_URL from environment');
  }
  
  const sequelize = new Sequelize(databaseUrl, {
    logging: false,
    dialect: 'postgres',
    dialectOptions: {
      ssl: false
    }
  });
  
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to database');
    
    // Find all ENUM types that might be voucherType
    console.log('\n📋 Checking for voucherType ENUM types...');
    const [enumTypes] = await sequelize.query(`
      SELECT typname, typtype 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typname LIKE '%voucher%'
      ORDER BY typname;
    `);
    
    if (enumTypes.length === 0) {
      console.log('⚠️  No ENUM types found with "voucher" in the name');
      console.log('\n📋 Checking all ENUM types...');
      const [allEnums] = await sequelize.query(`
        SELECT typname 
        FROM pg_type 
        WHERE typtype = 'e'
        ORDER BY typname;
      `);
      console.log('Found ENUM types:', allEnums.map(e => e.typname).join(', '));
    } else {
      console.log(`\n✅ Found ${enumTypes.length} ENUM type(s) with "voucher" in name:`);
      enumTypes.forEach(e => console.log(`   - ${e.typname}`));
      
      // Check each ENUM for easypay_voucher value
      for (const enumType of enumTypes) {
        const enumName = enumType.typname;
        console.log(`\n📋 Checking ENUM: ${enumName}`);
        
        const [values] = await sequelize.query(`
          SELECT enumlabel 
          FROM pg_enum 
          WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = '${enumName}')
          ORDER BY enumsortorder;
        `);
        
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
    const [tableInfo] = await sequelize.query(`
      SELECT column_name, data_type, udt_name
      FROM information_schema.columns
      WHERE table_name = 'vouchers' 
      AND column_name = 'voucherType';
    `);
    
    if (tableInfo.length > 0) {
      console.log(`   Column type: ${tableInfo[0].data_type}`);
      console.log(`   UDT name: ${tableInfo[0].udt_name}`);
    } else {
      console.log('   ⚠️  voucherType column not found');
    }
    
    await sequelize.close();
    console.log('\n✅ Check completed');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await sequelize.close();
    process.exit(1);
  }
}

checkEnum();
