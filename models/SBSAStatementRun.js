'use strict';

/**
 * SBSAStatementRun model
 *
 * Tracks each MT940/MT942 bank statement file processed via SBSA H2H SFTP.
 * Provides idempotency (duplicate file detection by MD5 hash) and an audit trail.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-19
 */

module.exports = (sequelize, DataTypes) => {
  const SBSAStatementRun = sequelize.define('SBSAStatementRun', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    filename: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original GCS filename',
    },

    fileHash: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
      field: 'file_hash',
      comment: 'MD5 hash — idempotency key',
    },

    statementType: {
      type: DataTypes.ENUM('MT940', 'MT942'),
      allowNull: false,
      defaultValue: 'MT940',
      field: 'statement_type',
    },

    statementCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      field: 'statement_count',
    },

    status: {
      type: DataTypes.ENUM('processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'processing',
    },

    totalCredits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_credits',
    },

    totalDebits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'total_debits',
    },

    unmatchedCredits: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'unmatched_credits',
    },

    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at',
    },

    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at',
    },
  }, {
    tableName: 'sbsa_statement_runs',
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
      { unique: true, fields: ['file_hash'] },
      { fields: ['status', 'created_at'] },
      { fields: ['statement_type', 'created_at'] },
    ],
  });

  return SBSAStatementRun;
};
