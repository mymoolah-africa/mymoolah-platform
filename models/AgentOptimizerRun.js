'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class AgentOptimizerRun extends Model {}

  AgentOptimizerRun.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    run_key: {
      type: DataTypes.STRING(80),
      allowNull: false,
      unique: true,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'processing',
    },
    triggered_by: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    environment: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'unknown',
    },
    mode: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'dry_run',
    },
    branch_name: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    pr_url: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    files_changed: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    findings: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
    },
    risk_level: {
      type: DataTypes.STRING(16),
      allowNull: false,
      defaultValue: 'low',
    },
    summary: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    error_message: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    started_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    finished_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'AgentOptimizerRun',
    tableName: 'agent_optimizer_runs',
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ['run_key'], name: 'idx_agent_optimizer_runs_run_key' },
      { fields: ['status', 'started_at'], name: 'idx_agent_optimizer_runs_status_started' },
    ],
  });

  return AgentOptimizerRun;
};
