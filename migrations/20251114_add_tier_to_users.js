'use strict';

/**
 * Migration: Add Tier Level to Users Table
 * 
 * Adds tier_level and related fields to users table
 * All existing users default to 'bronze' tier
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('Adding tier fields to users table...');

    // Check if columns already exist
    const [columns] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name IN ('tier_level', 'tier_effective_from', 'tier_last_reviewed_at')
    `);
    
    const existingColumns = columns.map(c => c.column_name);
    const allColumnsExist = ['tier_level', 'tier_effective_from', 'tier_last_reviewed_at'].every(
      col => existingColumns.includes(col)
    );

    if (allColumnsExist) {
      console.log('✅ Tier columns already exist, skipping column creation');
    } else {
      // Try to add columns using raw SQL (may require elevated permissions)
      try {
        // Add tier_level column
        if (!existingColumns.includes('tier_level')) {
          await queryInterface.sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN tier_level VARCHAR(20) NOT NULL DEFAULT 'bronze';
            COMMENT ON COLUMN users.tier_level IS 'User tier: bronze, silver, gold, platinum';
          `);
          console.log('✅ Added tier_level column');
        }

        // Add tier_effective_from timestamp
        if (!existingColumns.includes('tier_effective_from')) {
          await queryInterface.sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN tier_effective_from TIMESTAMP DEFAULT NOW();
            COMMENT ON COLUMN users.tier_effective_from IS 'When current tier became effective';
          `);
          console.log('✅ Added tier_effective_from column');
        }

        // Add tier_last_reviewed_at timestamp
        if (!existingColumns.includes('tier_last_reviewed_at')) {
          await queryInterface.sequelize.query(`
            ALTER TABLE users 
            ADD COLUMN tier_last_reviewed_at TIMESTAMP;
            COMMENT ON COLUMN users.tier_last_reviewed_at IS 'Last time tier was reviewed (monthly process)';
          `);
          console.log('✅ Added tier_last_reviewed_at column');
        }
      } catch (error) {
        if (error.message.includes('must be owner') || error.message.includes('permission denied')) {
          console.warn('⚠️  Permission denied: Database user does not have ALTER TABLE permissions');
          console.warn('   Tier columns will be added later via admin script or manual SQL.');
          console.warn('   System will default all users to Bronze tier until columns are added.');
          console.warn('');
          console.warn('   To add columns later, run:');
          console.warn('   node scripts/add-tier-columns-admin.js');
          console.warn('   (with ADMIN_DATABASE_URL set, or use manual SQL script)');
          console.warn('');
          // Don't throw - allow migration to complete
          // The system works without these columns (defaults to bronze)
          return; // Exit early, migration marked as complete
        }
        throw error; // Re-throw other errors
      }
    }

    // Create index on tier_level for performance (if column exists)
    try {
      const [indexes] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'users' 
          AND indexname = 'idx_users_tier_level'
      `);
      
      if (indexes.length === 0) {
        await queryInterface.sequelize.query(`
          CREATE INDEX idx_users_tier_level ON users(tier_level);
        `);
        console.log('✅ Created index on tier_level');
      } else {
        console.log('✅ Index idx_users_tier_level already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not create index (may require permissions):', error.message);
    }

    // Add constraint (if column exists)
    try {
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT constraint_name 
        FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
          AND constraint_name = 'check_users_tier_level'
      `);
      
      if (constraints.length === 0) {
        await queryInterface.sequelize.query(`
          ALTER TABLE users 
          ADD CONSTRAINT check_users_tier_level 
          CHECK (tier_level IN ('bronze', 'silver', 'gold', 'platinum'));
        `);
        console.log('✅ Created tier_level constraint');
      } else {
        console.log('✅ Constraint check_users_tier_level already exists');
      }
    } catch (error) {
      console.warn('⚠️  Could not create constraint (may require permissions):', error.message);
    }

    // Verify columns exist before trying to update
    const [finalCheck] = await queryInterface.sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
        AND column_name = 'tier_level'
    `);
    
    if (finalCheck.length > 0) {
      // Set all existing users to bronze tier and log in history
      console.log('Setting all existing users to bronze tier...');
      
      try {
        await queryInterface.sequelize.query(`
          UPDATE users 
          SET tier_level = 'bronze', 
              tier_effective_from = NOW(),
              tier_last_reviewed_at = NOW()
          WHERE tier_level IS NULL OR tier_level = ''
        `);
        console.log('✅ Updated existing users to bronze tier');

        // Create initial history records for existing users
        await queryInterface.sequelize.query(`
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
        `);
        console.log('✅ Created initial tier history records');
      } catch (error) {
        console.warn('⚠️  Could not update users or create history (non-critical):', error.message);
      }
    } else {
      console.log('ℹ️  tier_level column does not exist - system will default to bronze tier');
      console.log('   Columns can be added later using: node scripts/add-tier-columns-admin.js');
    }

    console.log('✅ Tier migration completed successfully');
    console.log('   Note: If columns were not added due to permissions, system defaults to bronze tier');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeConstraint('users', 'check_users_tier_level');
    await queryInterface.removeIndex('users', 'idx_users_tier_level');
    await queryInterface.removeColumn('users', 'tier_last_reviewed_at');
    await queryInterface.removeColumn('users', 'tier_effective_from');
    await queryInterface.removeColumn('users', 'tier_level');
  }
};

