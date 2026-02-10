'use strict';

/**
 * Migration: Referral 3-level schema - remove level 4
 *
 * - Delete referral_earnings where level=4 (UAT only)
 * - Change referral_earnings CHECK constraint to level BETWEEN 1 AND 3
 * - Drop level_4_user_id from referral_chains
 * - Drop level_4_count, level_4_month_cents, level_4_capped from user_referral_stats
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-02-02
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // 1. Delete level 4 historical earnings (UAT only)
    await queryInterface.bulkDelete('referral_earnings', {
      level: 4
    });
    console.log('✅ Deleted referral_earnings with level=4');

    // 2. Alter referral_earnings CHECK constraint
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE referral_earnings
        DROP CONSTRAINT IF EXISTS check_level_range;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE referral_earnings
        ADD CONSTRAINT check_level_range CHECK (level BETWEEN 1 AND 3);
      `);
    }
    console.log('✅ Updated referral_earnings CHECK to level 1-3');

    // 3. Drop level_4_user_id from referral_chains (index drops with column)
    await queryInterface.removeColumn('referral_chains', 'level_4_user_id');
    console.log('✅ Dropped level_4_user_id from referral_chains');

    // 4. Drop level 4 columns from user_referral_stats
    await queryInterface.removeColumn('user_referral_stats', 'level_4_count');
    await queryInterface.removeColumn('user_referral_stats', 'level_4_month_cents');
    await queryInterface.removeColumn('user_referral_stats', 'level_4_capped');
    console.log('✅ Dropped level 4 columns from user_referral_stats');
  },

  async down(queryInterface, Sequelize) {
    const dialect = queryInterface.sequelize.getDialect();

    // 4. Restore level 4 columns to user_referral_stats
    await queryInterface.addColumn('user_referral_stats', 'level_4_count', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Level 4 network size'
    });
    await queryInterface.addColumn('user_referral_stats', 'level_4_month_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Level 4 earnings this month (cents)'
    });
    await queryInterface.addColumn('user_referral_stats', 'level_4_capped', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Hit Level 4 monthly cap'
    });

    // 3. Restore level_4_user_id to referral_chains
    await queryInterface.addColumn('referral_chains', 'level_4_user_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
      comment: 'Level 4 referrer (earns 1%)'
    });
    await queryInterface.addIndex('referral_chains', ['level_4_user_id'], { name: 'idx_chains_l4' });

    // 2. Restore referral_earnings CHECK to 1-4
    if (dialect === 'postgres') {
      await queryInterface.sequelize.query(`
        ALTER TABLE referral_earnings
        DROP CONSTRAINT IF EXISTS check_level_range;
      `);
      await queryInterface.sequelize.query(`
        ALTER TABLE referral_earnings
        ADD CONSTRAINT check_level_range CHECK (level BETWEEN 1 AND 4);
      `);
    }

    // 1. Deleted L4 earnings cannot be restored
    console.log('⚠️ Rollback: level 4 referral_earnings were deleted and cannot be restored');
  }
};
