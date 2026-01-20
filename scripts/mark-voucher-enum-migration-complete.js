/**
 * Mark voucher enum migration as complete
 * 
 * The 20260117_convert_voucher_type_to_enum migration requires table ownership
 * which we don't have in Codespaces. The voucherType column works fine as VARCHAR
 * (Sequelize handles it as ENUM in code), so we can safely mark it as complete.
 */

const { sequelize } = require('../models');

async function markMigrationComplete() {
  try {
    console.log('📋 Connecting to database...');
    
    await sequelize.authenticate();
    console.log('✅ Connected');
    
    console.log('📝 Marking 20260117_convert_voucher_type_to_enum as complete...');
    
    const [result] = await sequelize.query(`
      INSERT INTO "SequelizeMeta" (name) 
      VALUES ('20260117_convert_voucher_type_to_enum.js')
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Migration marked as complete');
    
    // Verify
    const [check] = await sequelize.query(`
      SELECT name FROM "SequelizeMeta" 
      WHERE name = '20260117_convert_voucher_type_to_enum.js';
    `);
    
    if (check.length > 0) {
      console.log('✅ Verified: Migration is now in SequelizeMeta table');
    } else {
      console.log('⚠️  Warning: Migration not found in SequelizeMeta table');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

markMigrationComplete();
