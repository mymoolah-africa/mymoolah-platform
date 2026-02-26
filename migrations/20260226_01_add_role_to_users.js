'use strict';

/**
 * Migration: Add role column to users table
 *
 * The catalogSynchronizationService.notifyAdminOfChanges() queries
 * WHERE role = 'admin'. This column was present in UAT but missing
 * from Staging and Production schemas.
 *
 * Idempotent: checks for column existence before adding.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableDescription = await queryInterface.describeTable('users');

    if (!tableDescription.role) {
      await queryInterface.addColumn('users', 'role', {
        type: Sequelize.ENUM('user', 'admin', 'agent', 'support'),
        allowNull: false,
        defaultValue: 'user',
        comment: 'User role for access control',
      });

      await queryInterface.addIndex('users', ['role'], {
        name: 'idx_users_role',
      });

      console.log('✅ Added role column and index to users table');
    } else {
      console.log('ℹ️  role column already exists on users table — skipping');
    }
  },

  async down(queryInterface) {
    const tableDescription = await queryInterface.describeTable('users');

    if (tableDescription.role) {
      await queryInterface.removeIndex('users', 'idx_users_role').catch(() => {});
      await queryInterface.removeColumn('users', 'role');
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_users_role";');
      console.log('✅ Removed role column from users table');
    }
  },
};
