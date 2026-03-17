'use strict';

/**
 * Migration: Create disbursement_runs and disbursement_payments tables
 *
 * Supports the SBSA H2H Wage/Salary Disbursement feature.
 * Employers submit bulk payment files (Pain.001) via the admin portal.
 * SBSA responds with Pain.002 files detailing per-payment acceptance/rejection.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── disbursement_runs ────────────────────────────────────────────────
    await queryInterface.createTable('disbursement_runs', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Portal user / client who initiated the run',
      },
      run_reference: {
        type: Sequelize.STRING(60),
        allowNull: false,
        unique: true,
        comment: 'Internal unique run ID (e.g. PAYROLL-2026-03-00001)',
      },
      rail: {
        type: Sequelize.STRING(10),
        allowNull: false,
        defaultValue: 'eft',
        comment: 'eft | rtc | payshap',
      },
      pay_period: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: 'e.g. 2026-03 (for display)',
      },
      total_amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      total_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      success_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      pending_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'draft',
        comment: 'draft | pending_approval | approved | submitted | processing | partial | completed | failed | cancelled',
      },
      pain001_filename: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      pain001_gcs_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      pain002_filename: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      pain002_gcs_path: {
        type: Sequelize.STRING(500),
        allowNull: true,
      },
      maker_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Portal user ID who created the run (maker)',
      },
      checker_user_id: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Portal user ID who approved (checker)',
      },
      notification_channels: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'e.g. {"webhook":"https://...", "email":"hr@corp.com", "sftp": {...}}',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      submitted_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      completed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('disbursement_runs', ['client_id'],   { name: 'idx_disb_runs_client' });
    await queryInterface.addIndex('disbursement_runs', ['status'],       { name: 'idx_disb_runs_status' });
    await queryInterface.addIndex('disbursement_runs', ['created_at'],   { name: 'idx_disb_runs_created' });

    // ── disbursement_payments ────────────────────────────────────────────
    await queryInterface.createTable('disbursement_payments', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      run_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'disbursement_runs', key: 'id' },
        onDelete: 'CASCADE',
      },
      employee_ref: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: "Employer's internal employee ID",
      },
      beneficiary_name: {
        type: Sequelize.STRING(140),
        allowNull: false,
      },
      account_number: {
        type: Sequelize.STRING(20),
        allowNull: false,
      },
      branch_code: {
        type: Sequelize.STRING(10),
        allowNull: false,
      },
      bank_name: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      amount: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false,
      },
      reference: {
        type: Sequelize.STRING(35),
        allowNull: true,
        comment: 'Payment reference on employee bank statement (e.g. SALARY MAR 2026)',
      },
      end_to_end_id: {
        type: Sequelize.STRING(35),
        allowNull: true,
        comment: 'ISO 20022 EndToEndId for this credit transfer line',
      },
      status: {
        type: Sequelize.STRING(15),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending | accepted | rejected | resubmitted | cancelled',
      },
      rejection_code: {
        type: Sequelize.STRING(10),
        allowNull: true,
        comment: 'ISO 20022 Pain.002 reason code (AC01, AC04, etc.)',
      },
      rejection_reason: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Human-readable mapped from rejection_code',
      },
      retry_of: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'disbursement_payments', key: 'id' },
        comment: 'ID of the original payment this is a retry of',
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addIndex('disbursement_payments', ['run_id'],   { name: 'idx_disb_payments_run' });
    await queryInterface.addIndex('disbursement_payments', ['status'],   { name: 'idx_disb_payments_status' });
    await queryInterface.addIndex('disbursement_payments', ['end_to_end_id'], { name: 'idx_disb_payments_e2e' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('disbursement_payments');
    await queryInterface.dropTable('disbursement_runs');
  },
};
