'use strict';

/**
 * Migration: Create sbsa_statement_runs table
 *
 * Tracks processing of SBSA H2H MT940/MT942 statement files.
 * Provides idempotency (skip already-processed files by MD5 hash)
 * and an audit trail of all statement runs.
 *
 * @date 2026-03-19
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sbsa_statement_runs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },

      // File identification
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Original filename from GCS (e.g. MT940_20260319_001.txt)',
      },
      file_hash: {
        type: Sequelize.STRING(64),
        allowNull: false,
        unique: true,
        comment: 'MD5 hash of file content — used for idempotency',
      },

      // Statement metadata
      statement_type: {
        type: Sequelize.ENUM('MT940', 'MT942'),
        allowNull: false,
        defaultValue: 'MT940',
        comment: 'MT940 = end-of-day, MT942 = intraday',
      },
      statement_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
        comment: 'Number of statement blocks in the file',
      },

      // Processing status
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        allowNull: false,
        defaultValue: 'processing',
      },

      // Results
      total_credits: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of credit transactions processed',
      },
      total_debits: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Number of debit transactions processed',
      },
      unmatched_credits: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Credits delegated to deposit notification service (unmatched by reference)',
      },

      // Timestamps
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });

    // Index on file_hash for idempotency lookups
    await queryInterface.addIndex('sbsa_statement_runs', ['file_hash'], {
      name: 'idx_sbsa_statement_runs_file_hash',
      unique: true,
    });

    // Index on status for monitoring queries
    await queryInterface.addIndex('sbsa_statement_runs', ['status', 'created_at'], {
      name: 'idx_sbsa_statement_runs_status_created',
    });

    // Index on statement_type for reporting
    await queryInterface.addIndex('sbsa_statement_runs', ['statement_type', 'created_at'], {
      name: 'idx_sbsa_statement_runs_type_created',
    });

    console.log('✅ Migration: sbsa_statement_runs table created');
  },

  async down(queryInterface) {
    await queryInterface.dropTable('sbsa_statement_runs');
    console.log('✅ Rollback: sbsa_statement_runs table dropped');
  },
};
