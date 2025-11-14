#!/usr/bin/env node

/**
 * Admin Script: Add Tier Columns to Users Table
 * 
 * This script adds tier_level columns to the users table.
 * It can be run with admin database credentials.
 * 
 * Usage:
 *   DATABASE_URL="postgres://admin_user:admin_pass@host/db" node scripts/add-tier-columns-admin.js
 * 
 * Or set ADMIN_DATABASE_URL in .env for admin access
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');

// Use ADMIN_DATABASE_URL if available, otherwise use DATABASE_URL
const databaseUrl = process.env.ADMIN_DATABASE_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ ERROR: DATABASE_URL or ADMIN_DATABASE_URL must be set');
  process.exit(1);
}

// Parse URL to handle proxy connection
const url = new URL(databaseUrl);
const isProxy = url.hostname === '127.0.0.1' || url.hostname === 'localhost';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: isProxy ? {
    // Disable SSL for proxy connections
  } : {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

async function addTierColumns() {
  const transaction = await sequelize.transaction();
  
  try {
    console.log('🔄 Adding tier columns to users table...\n');
    
    // Check if columns already exist
    const [columns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('tier_level', 'tier_effective_from', 'tier_last_reviewed_at')
    `, { transaction });
    
    const existingColumns = columns.map(c => c.column_name);
    
    // Add tier_level column
    if (!existingColumns.includes('tier_level')) {
      console.log('📦 Adding tier_level column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_level VARCHAR(20) NOT NULL DEFAULT 'bronze';
        COMMENT ON COLUMN users.tier_level IS 'User tier: bronze, silver, gold, platinum';
      `, { transaction });
      console.log('✅ Added tier_level column');
    } else {
      console.log('✅ tier_level column already exists');
    }
    
    // Add tier_effective_from timestamp
    if (!existingColumns.includes('tier_effective_from')) {
      console.log('📦 Adding tier_effective_from column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_effective_from TIMESTAMP DEFAULT NOW();
        COMMENT ON COLUMN users.tier_effective_from IS 'When current tier became effective';
      `, { transaction });
      console.log('✅ Added tier_effective_from column');
    } else {
      console.log('✅ tier_effective_from column already exists');
    }
    
    // Add tier_last_reviewed_at timestamp
    if (!existingColumns.includes('tier_last_reviewed_at')) {
      console.log('📦 Adding tier_last_reviewed_at column...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD COLUMN tier_last_reviewed_at TIMESTAMP;
        COMMENT ON COLUMN users.tier_last_reviewed_at IS 'Last time tier was reviewed (monthly process)';
      `, { transaction });
      console.log('✅ Added tier_last_reviewed_at column');
    } else {
      console.log('✅ tier_last_reviewed_at column already exists');
    }
    
    // Create index on tier_level for performance
    const [indexes] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'users' 
        AND indexname = 'idx_users_tier_level'
    `, { transaction });
    
    if (indexes.length === 0) {
      console.log('📦 Creating index on tier_level...');
      await sequelize.query(`
        CREATE INDEX idx_users_tier_level ON users(tier_level);
      `, { transaction });
      console.log('✅ Created index idx_users_tier_level');
    } else {
      console.log('✅ Index idx_users_tier_level already exists');
    }
    
    // Add constraint to ensure valid tier values
    const [constraints] = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'users' 
        AND constraint_name = 'check_users_tier_level'
    `, { transaction });
    
    if (constraints.length === 0) {
      console.log('📦 Adding tier_level constraint...');
      await sequelize.query(`
        ALTER TABLE users 
        ADD CONSTRAINT check_users_tier_level 
        CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum'));
      `, { transaction });
      console.log('✅ Created constraint check_users_tier_level');
    } else {
      console.log('✅ Constraint check_users_tier_level already exists');
    }
    
    // Set all existing users to bronze tier
    console.log('\n📦 Setting all existing users to bronze tier...');
    const [updateResult] = await sequelize.query(`
      UPDATE users 
      SET tier_level = 'bronze', 
          tier_effective_from = NOW(),
          tier_last_reviewed_at = NOW()
      WHERE tier_level IS NULL OR tier_level = ''
    `, { transaction });
    console.log(`✅ Updated ${updateResult[1] || 0} users to bronze tier`);
    
    // Create initial history records for existing users
    console.log('📦 Creating initial tier history records...');
    const [historyResult] = await sequelize.query(`
      INSERT INTO user_tier_history (user_id, old_tier, new_tier, change_reason, effective_from, created_at)
      SELECT 
        id,
        NULL,
        'bronze',
        'initial_migration',
        NOW(),
        NOW()
      FROM users
      WHERE NOT EXISTS (
        SELECT 1 FROM user_tier_history WHERE user_tier_history.user_id = users.id
      )
    `, { transaction });
    console.log(`✅ Created ${historyResult[1] || 0} initial history records`);
    
    await transaction.commit();
    
    console.log('\n🎉 Successfully added tier columns to users table!');
    console.log('\n📊 Verification:');
    const [verify] = await sequelize.query(`
      SELECT 
        column_name, 
        data_type, 
        column_default,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('tier_level', 'tier_effective_from', 'tier_last_reviewed_at')
      ORDER BY column_name
    `);
    
    console.table(verify);
    
    process.exit(0);
    
  } catch (error) {
    await transaction.rollback();
    console.error('\n❌ Error adding tier columns:', error.message);
    
    if (error.message.includes('must be owner') || error.message.includes('permission denied')) {
      console.error('\n💡 This script requires database administrator privileges.');
      console.error('   Please either:');
      console.error('   1. Set ADMIN_DATABASE_URL with admin credentials, or');
      console.error('   2. Run the SQL script manually: migrations/20251114_add_tier_to_users_manual.sql');
    }
    
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

// Run the script
addTierColumns().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

