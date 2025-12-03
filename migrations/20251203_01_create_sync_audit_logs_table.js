'use strict';

/**
 * Create Sync Audit Logs Table
 * 
 * Banking-grade audit trail for database synchronization operations
 * Mojaloop-compliant structured logging with full traceability
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sync_audit_logs', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      sync_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Correlation ID for entire sync operation (Mojaloop trace ID)'
      },
      operation_id: {
        type: Sequelize.UUID,
        allowNull: false,
        comment: 'Unique ID for each operation (Mojaloop span ID)'
      },
      operation_type: {
        type: Sequelize.ENUM(
          'MIGRATION',
          'SCHEMA_CHECK',
          'DATA_VERIFY',
          'LEDGER_INTEGRITY',
          'REFERENTIAL_INTEGRITY',
          'PERFORMANCE_BENCHMARK',
          'ROLLBACK',
          'VERIFICATION'
        ),
        allowNull: false,
        comment: 'Type of sync operation'
      },
      source_env: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Source environment (UAT)'
      },
      target_env: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'Target environment (STAGING)'
      },
      status: {
        type: Sequelize.ENUM('SUCCESS', 'FAILED', 'ROLLED_BACK', 'IN_PROGRESS'),
        allowNull: false,
        defaultValue: 'IN_PROGRESS'
      },
      started_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      duration_ms: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Operation duration in milliseconds'
      },
      migration_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Migration file name (if operation is migration)'
      },
      schema_changes: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Structured schema differences'
      },
      error_details: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Structured error information'
      },
      rollback_available: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      rollback_executed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      performed_by: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'User/service account that performed the operation'
      },
      ip_address: {
        type: Sequelize.INET,
        allowNull: true
      },
      user_agent: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional context and Mojaloop headers'
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

    // Banking-grade indexes for performance
    await queryInterface.addIndex('sync_audit_logs', ['sync_id'], {
      name: 'idx_sync_audit_sync_id',
      comment: 'Index for correlation ID queries'
    });

    await queryInterface.addIndex('sync_audit_logs', ['status'], {
      name: 'idx_sync_audit_status',
      comment: 'Index for status queries'
    });

    await queryInterface.addIndex('sync_audit_logs', ['operation_type'], {
      name: 'idx_sync_audit_operation_type',
      comment: 'Index for operation type queries'
    });

    await queryInterface.addIndex('sync_audit_logs', ['started_at'], {
      name: 'idx_sync_audit_started_at',
      comment: 'Index for time-based queries'
    });

    await queryInterface.addIndex('sync_audit_logs', ['source_env', 'target_env'], {
      name: 'idx_sync_audit_environments',
      comment: 'Index for environment-based queries'
    });

    // Composite index for common query pattern
    await queryInterface.addIndex('sync_audit_logs', ['sync_id', 'status'], {
      name: 'idx_sync_audit_sync_status',
      comment: 'Composite index for sync status tracking'
    });
  },

  async down(queryInterface, Sequelize) {
    // Drop indexes first
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_sync_id');
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_status');
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_operation_type');
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_started_at');
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_environments');
    await queryInterface.removeIndex('sync_audit_logs', 'idx_sync_audit_sync_status');
    
    // Drop table
    await queryInterface.dropTable('sync_audit_logs');
    
    // Drop enum types
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sync_audit_logs_operation_type";');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_sync_audit_logs_status";');
  }
};
