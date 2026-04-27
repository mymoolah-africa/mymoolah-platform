'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

    if (!tableNames.includes('agent_optimizer_runs')) {
      await queryInterface.createTable('agent_optimizer_runs', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        run_key: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'processing' },
        triggered_by: { type: Sequelize.STRING(255), allowNull: true },
        environment: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'unknown' },
        mode: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'dry_run' },
        branch_name: { type: Sequelize.STRING(160), allowNull: true },
        pr_url: { type: Sequelize.TEXT, allowNull: true },
        files_changed: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        findings: { type: Sequelize.JSONB, allowNull: false, defaultValue: [] },
        risk_level: { type: Sequelize.STRING(16), allowNull: false, defaultValue: 'low' },
        summary: { type: Sequelize.TEXT, allowNull: true },
        error_message: { type: Sequelize.TEXT, allowNull: true },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        started_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        finished_at: { type: Sequelize.DATE, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    const indexes = await queryInterface.showIndex('agent_optimizer_runs');
    const hasIndex = (name) => indexes.some((index) => index.name === name);

    if (!hasIndex('idx_agent_optimizer_runs_run_key')) {
      await queryInterface.addIndex('agent_optimizer_runs', ['run_key'], {
        name: 'idx_agent_optimizer_runs_run_key',
        unique: true,
      });
    }

    if (!hasIndex('idx_agent_optimizer_runs_status_started')) {
      await queryInterface.addIndex('agent_optimizer_runs', ['status', 'started_at'], {
        name: 'idx_agent_optimizer_runs_status_started',
      });
    }
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

    if (tableNames.includes('agent_optimizer_runs')) {
      await queryInterface.dropTable('agent_optimizer_runs');
    }
  },
};
