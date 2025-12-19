'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create sweep_patterns_cache table for banking-grade persistence
    await queryInterface.createTable('sweep_patterns_cache', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      patternType: {
        type: Sequelize.STRING(50),
        allowNull: false,
        comment: 'Type: "pattern" or "keyword"'
      },
      patternValue: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'The actual pattern or keyword value'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Category mapping (for patterns only)'
      },
      sweepVersion: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Version identifier from codebase sweep'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Create unique constraint to prevent duplicates
    await queryInterface.addIndex('sweep_patterns_cache', ['patternType', 'patternValue'], {
      unique: true,
      name: 'idx_sweep_patterns_unique'
    });

    // Create index for fast lookups by type
    await queryInterface.addIndex('sweep_patterns_cache', ['patternType'], {
      name: 'idx_sweep_patterns_type'
    });

    // Create index for category lookups
    await queryInterface.addIndex('sweep_patterns_cache', ['category'], {
      name: 'idx_sweep_patterns_category'
    });

    // Create index for version tracking
    await queryInterface.addIndex('sweep_patterns_cache', ['sweepVersion'], {
      name: 'idx_sweep_patterns_version'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('sweep_patterns_cache', 'idx_sweep_patterns_version');
    await queryInterface.removeIndex('sweep_patterns_cache', 'idx_sweep_patterns_category');
    await queryInterface.removeIndex('sweep_patterns_cache', 'idx_sweep_patterns_type');
    await queryInterface.removeIndex('sweep_patterns_cache', 'idx_sweep_patterns_unique');
    
    // Drop table
    await queryInterface.dropTable('sweep_patterns_cache');
  }
};

