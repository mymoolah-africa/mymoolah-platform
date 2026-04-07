'use strict';

/**
 * Migration: Create disbursement client management tables
 *
 * Adds corporate client onboarding, KYB verification, fee configuration,
 * notification preferences, and white-label user management for the
 * multi-tenant disbursement service.
 *
 * Also adds fee_cents and payment_rail columns to disbursement_payments.
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-08
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // ── disbursement_clients ──────────────────────────────────────────────
    await queryInterface.createTable('disbursement_clients', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_code: {
        type: Sequelize.STRING(20),
        allowNull: false,
        unique: true,
        comment: "Unique short code e.g. 'ACME01'",
      },
      company_name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      entity_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'company',
        comment: 'company | sole_proprietor | trust | partnership | npo',
      },
      registration_number: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'CIPC registration number',
      },
      contact_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      contact_email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      contact_phone: {
        type: Sequelize.STRING(20),
        allowNull: true,
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending | active | suspended | closed',
      },
      kyb_status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'none',
        comment: 'none | submitted | verified | rejected',
      },
      ledger_account_code: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: "Dedicated float account per client e.g. '2100-20-01'",
      },
      float_limit: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true,
        comment: 'Admin-set maximum float balance',
      },
      api_key: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'REST API key (generated on request)',
      },
      api_secret_hash: {
        type: Sequelize.STRING(128),
        allowNull: true,
        comment: 'bcrypt hash of HMAC secret',
      },
      white_label_slug: {
        type: Sequelize.STRING(50),
        allowNull: true,
        unique: true,
        comment: "URL path e.g. 'acme-corp'",
      },
      white_label_config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Branding: logo_url, primary_color, etc.',
      },
      notification_channels: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'Default webhook_url, email, etc.',
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Portal user who created this client',
      },
      approved_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Portal user who approved activation',
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

    await queryInterface.addIndex('disbursement_clients', ['status'],          { name: 'idx_disb_clients_status' });
    await queryInterface.addIndex('disbursement_clients', ['kyb_status'],      { name: 'idx_disb_clients_kyb_status' });

    // ── disbursement_client_fees ──────────────────────────────────────────
    await queryInterface.createTable('disbursement_client_fees', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'disbursement_clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      rail: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'eft | payshap | wallet',
      },
      fee_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'flat | percentage | flat_plus_percentage',
      },
      flat_fee_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'e.g. 500 = R5.00',
      },
      percentage_fee: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: false,
        defaultValue: 0,
        comment: 'e.g. 0.0150 = 1.50%',
      },
      min_fee_cents: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      max_fee_cents: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Fee cap in cents',
      },
      effective_from: {
        type: Sequelize.DATEONLY,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_DATE'),
      },
      effective_to: {
        type: Sequelize.DATEONLY,
        allowNull: true,
        comment: 'null = currently active',
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('NOW()'),
      },
    });

    await queryInterface.addConstraint('disbursement_client_fees', {
      fields: ['client_id', 'rail', 'effective_from'],
      type: 'unique',
      name: 'uq_disb_client_fees_client_rail_from',
    });

    await queryInterface.addIndex('disbursement_client_fees', ['client_id'], { name: 'idx_disb_client_fees_client' });

    // ── kyb_documents ─────────────────────────────────────────────────────
    await queryInterface.createTable('kyb_documents', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'disbursement_clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      document_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'cor15 | id_document | proof_of_address | trust_deed | partnership_agreement | npo_certificate',
      },
      entity_type: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'company | sole_proprietor | trust | partnership | npo',
      },
      file_url: {
        type: Sequelize.STRING(500),
        allowNull: false,
        comment: 'GCS path',
      },
      file_hash: {
        type: Sequelize.STRING(64),
        allowNull: true,
        comment: 'SHA-256 hash for integrity',
      },
      extracted_data: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'GPT-4o OCR output',
      },
      validation_result: {
        type: Sequelize.JSONB,
        allowNull: true,
        comment: 'Pass/fail per rule with reasons',
      },
      status: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'pending',
        comment: 'pending | processing | verified | rejected | expired',
      },
      verified_at: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      verified_by: {
        type: Sequelize.STRING(20),
        allowNull: true,
        comment: "'auto' or portal_user_id",
      },
      rejection_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      expires_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Address docs expire after 90 days',
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

    await queryInterface.addIndex('kyb_documents', ['client_id'],                    { name: 'idx_kyb_docs_client' });
    await queryInterface.addIndex('kyb_documents', ['status'],                       { name: 'idx_kyb_docs_status' });
    await queryInterface.addIndex('kyb_documents', ['client_id', 'document_type'],   { name: 'idx_kyb_docs_client_type' });

    // ── disbursement_notification_preferences ─────────────────────────────
    await queryInterface.createTable('disbursement_notification_preferences', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'disbursement_clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      event_type: {
        type: Sequelize.STRING(30),
        allowNull: false,
        comment: 'run_submitted | run_approved | run_rejected | payment_settled | payment_failed | run_completed | float_low | file_received | pain002_received | report_ready',
      },
      channel: {
        type: Sequelize.STRING(20),
        allowNull: false,
        comment: 'email | webhook',
      },
      enabled: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      config: {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: {},
        comment: 'email: {recipients: []}, webhook: {url, secret_hash}',
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

    await queryInterface.addConstraint('disbursement_notification_preferences', {
      fields: ['client_id', 'event_type', 'channel'],
      type: 'unique',
      name: 'uq_disb_notif_client_event_channel',
    });

    await queryInterface.addIndex('disbursement_notification_preferences', ['client_id'], { name: 'idx_disb_notif_client' });

    // ── disbursement_client_users ─────────────────────────────────────────
    await queryInterface.createTable('disbursement_client_users', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      client_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'disbursement_clients', key: 'id' },
        onDelete: 'CASCADE',
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      password_hash: {
        type: Sequelize.STRING(128),
        allowNull: false,
      },
      name: {
        type: Sequelize.STRING(255),
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING(20),
        allowNull: false,
        defaultValue: 'viewer',
        comment: 'admin | maker | checker | viewer',
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      last_login_at: {
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

    await queryInterface.addConstraint('disbursement_client_users', {
      fields: ['client_id', 'email'],
      type: 'unique',
      name: 'uq_disb_client_users_client_email',
    });

    await queryInterface.addIndex('disbursement_client_users', ['client_id'], { name: 'idx_disb_client_users_client' });

    // ── Add columns to disbursement_payments ──────────────────────────────
    await queryInterface.addColumn('disbursement_payments', 'fee_cents', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Fee charged for this payment in cents',
    });

    await queryInterface.addColumn('disbursement_payments', 'payment_rail', {
      type: Sequelize.STRING(20),
      allowNull: false,
      defaultValue: 'eft',
      comment: 'Actual rail used: eft | payshap | wallet',
    });

    console.log('✅ Migration: Created disbursement_clients, disbursement_client_fees, kyb_documents, disbursement_notification_preferences, disbursement_client_users + added fee_cents/payment_rail to disbursement_payments');
  },

  async down(queryInterface) {
    // Remove added columns from disbursement_payments first
    await queryInterface.removeColumn('disbursement_payments', 'payment_rail');
    await queryInterface.removeColumn('disbursement_payments', 'fee_cents');

    // Drop tables in reverse order (FK dependencies)
    await queryInterface.dropTable('disbursement_client_users');
    await queryInterface.dropTable('disbursement_notification_preferences');
    await queryInterface.dropTable('kyb_documents');
    await queryInterface.dropTable('disbursement_client_fees');
    await queryInterface.dropTable('disbursement_clients');

    console.log('✅ Migration rollback: Dropped disbursement client tables + removed fee_cents/payment_rail from disbursement_payments');
  },
};
