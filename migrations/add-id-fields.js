'use strict';

/**
 * Sequelize migration: add ID fields to users table
 * - idNumber (string, nullable)
 * - idType (string, nullable)
 * - idVerified (boolean, default false)
 * - index on idNumber
 *
 * Works on PostgreSQL and SQLite.
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tableName = 'users';
    const columns = await queryInterface.describeTable(tableName);

    if (!columns.idNumber) {
      await queryInterface.addColumn(tableName, 'idNumber', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!columns.idType) {
      await queryInterface.addColumn(tableName, 'idType', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    if (!columns.idVerified) {
      await queryInterface.addColumn(tableName, 'idVerified', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    }

    // Add index on idNumber (ignore if it already exists)
    try {
      await queryInterface.addIndex(tableName, ['idNumber'], {
        name: 'idx_users_idNumber',
      });
    } catch (_) {
      // index exists; no-op
    }
  },

  down: async (queryInterface /*, Sequelize */) => {
    const tableName = 'users';
    try {
      await queryInterface.removeIndex(tableName, 'idx_users_idNumber');
    } catch (_) {
      // ignore if not present
    }

    const columns = await queryInterface.describeTable(tableName);

    if (columns.idVerified) {
      await queryInterface.removeColumn(tableName, 'idVerified');
    }
    if (columns.idType) {
      await queryInterface.removeColumn(tableName, 'idType');
    }
    if (columns.idNumber) {
      await queryInterface.removeColumn(tableName, 'idNumber');
    }
  },
};