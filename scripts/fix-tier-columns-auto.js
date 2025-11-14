#!/usr/bin/env node

/**
 * Auto-Fix Script: Add Tier Columns to Users Table
 * 
 * This script tries multiple methods to add the tier columns:
 * 1. Try with current DATABASE_URL (may work if permissions were granted)
 * 2. Try with gcloud sql connect if available
 * 3. Provide clear instructions for manual fix
 * 
 * Usage: node scripts/fix-tier-columns-auto.js
 */

require('dotenv').config();
const { execSync } = require('child_process');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL must be set');
  process.exit(1);
}

const SQL_FILE = path.join(__dirname, '../migrations/20251114_add_tier_to_users_manual.sql');

async function tryWithCurrentConnection() {
  console.log('🔄 Attempting to add columns with current DATABASE_URL...\n');
  
  const url = new URL(databaseUrl);
  const isProxy = url.hostname === '127.0.0.1' || url.hostname === 'localhost';
  
  const sequelize = new Sequelize(databaseUrl, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: isProxy ? {} : {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  });
  
  try {
    // Check if columns already exist
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('tier_level', 'tier_effective_from', 'tier_last_reviewed_at')
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    
    if (existingColumns.length === 3) {
      console.log('✅ All tier columns already exist!');
      await sequelize.close();
      return true;
    }
    
    // Try to add missing columns
    if (!existingColumns.includes('tier_level')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_level VARCHAR(20) NOT NULL DEFAULT 'bronze';
      `);
      console.log('✅ Added tier_level column');
    }
    
    if (!existingColumns.includes('tier_effective_from')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_effective_from TIMESTAMP DEFAULT NOW();
      `);
      console.log('✅ Added tier_effective_from column');
    }
    
    if (!existingColumns.includes('tier_last_reviewed_at')) {
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_last_reviewed_at TIMESTAMP;
      `);
      console.log('✅ Added tier_last_reviewed_at column');
    }
    
    // Create index
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_users_tier_level ON users(tier_level);
    `);
    console.log('✅ Created index');
    
    // Add constraint
    await sequelize.query(`
      ALTER TABLE users 
      DROP CONSTRAINT IF EXISTS check_users_tier_level;
      ALTER TABLE users 
      ADD CONSTRAINT check_users_tier_level 
      CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum'));
    `);
    console.log('✅ Added constraint');
    
    // Update existing users
    await sequelize.query(`
      UPDATE users 
      SET tier_level = 'bronze', 
          tier_effective_from = NOW(),
          tier_last_reviewed_at = NOW()
      WHERE tier_level IS NULL OR tier_level = ''
    `);
    console.log('✅ Updated existing users to bronze tier');
    
    await sequelize.close();
    console.log('\n🎉 Successfully added all tier columns!');
    return true;
    
  } catch (error) {
    await sequelize.close();
    
    if (error.message.includes('must be owner') || error.message.includes('permission denied')) {
      console.log('❌ Permission denied with current connection\n');
      return false;
    }
    
    throw error;
  }
}

async function tryWithGcloud() {
  console.log('🔄 Attempting to use gcloud sql connect...\n');
  
  try {
    // Check if gcloud is available
    execSync('which gcloud', { stdio: 'ignore' });
    
    // Check if SQL file exists
    if (!fs.existsSync(SQL_FILE)) {
      console.log('❌ SQL file not found:', SQL_FILE);
      return false;
    }
    
    console.log('💡 To add columns using gcloud, run:');
    console.log(`   gcloud sql connect mmtp-pg --database=mymoolah --project=mymoolah-db`);
    console.log('   Then paste the SQL from:', SQL_FILE);
    console.log('');
    console.log('   Or run:');
    console.log(`   gcloud sql connect mmtp-pg --database=mymoolah --project=mymoolah-db < ${SQL_FILE}`);
    
    return false; // Can't automate this, need user interaction
    
  } catch (error) {
    console.log('ℹ️  gcloud not available or not configured\n');
    return false;
  }
}

async function main() {
  console.log('🔧 Auto-Fix: Adding Tier Columns to Users Table\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Method 1: Try with current connection
  const success = await tryWithCurrentConnection();
  
  if (success) {
    console.log('\n✅ All done! Tier columns are now in place.');
    process.exit(0);
  }
  
  // Method 2: Try with gcloud
  await tryWithGcloud();
  
  // Method 3: Provide manual instructions
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('📋 Manual Fix Required:\n');
  console.log('Option 1: Run admin script with admin credentials:');
  console.log('   ADMIN_DATABASE_URL="postgres://admin_user:admin_pass@host/db" node scripts/add-tier-columns-admin.js\n');
  console.log('Option 2: Connect to database as admin and run SQL:');
  console.log(`   psql \$DATABASE_URL -f ${SQL_FILE}\n`);
  console.log('Option 3: Use gcloud (if available):');
  console.log(`   gcloud sql connect mmtp-pg --database=mymoolah --project=mymoolah-db < ${SQL_FILE}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('ℹ️  Note: The system works without these columns (defaults to bronze tier).');
  console.log('   Columns can be added later when admin access is available.\n');
  
  process.exit(0);
}

main().catch(error => {
  console.error('❌ Fatal error:', error.message);
  process.exit(1);
});

