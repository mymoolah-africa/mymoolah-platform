'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async (tableName) => {
      const tables = await queryInterface.showAllTables();
      return tables.map((table) => (typeof table === 'string' ? table : table.tableName)).includes(tableName);
    };

    const addIndexIfMissing = async (tableName, fields, options) => {
      if (!(await tableExists(tableName))) return;
      const indexes = await queryInterface.showIndex(tableName);
      if (indexes.some((index) => index.name === options.name)) return;
      await queryInterface.addIndex(tableName, fields, options);
    };

    if (!(await tableExists('sbsa_inbound_credit_events'))) {
      await queryInterface.createTable('sbsa_inbound_credit_events', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        canonical_fingerprint: {
          type: Sequelize.STRING(96),
          allowNull: false,
          unique: true,
          comment: 'Logical inbound credit fingerprint. Enforces one credit event per claimed source identity.',
        },
        reconciliation_key: {
          type: Sequelize.STRING(96),
          allowNull: false,
          unique: true,
          comment: 'Channel-neutral reference+amount+currency key used to identify delayed duplicate sources.',
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: 'processing',
          comment: 'processing, credited, duplicate, suspense, failed',
        },
        reference_number: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        normalized_reference: {
          type: Sequelize.STRING(128),
          allowNull: false,
        },
        amount: {
          type: Sequelize.DECIMAL(15, 2),
          allowNull: false,
        },
        amount_cents: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        currency: {
          type: Sequelize.STRING(3),
          allowNull: false,
          defaultValue: 'ZAR',
        },
        account_type: {
          type: Sequelize.STRING(32),
          allowNull: true,
        },
        account_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        wallet_id: {
          type: Sequelize.STRING,
          allowNull: true,
          references: { model: 'wallets', key: 'walletId' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        credited_standard_bank_transaction_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'standard_bank_transactions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        credited_wallet_transaction_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: 'transactions', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
        },
        journal_reference: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        first_source: {
          type: Sequelize.STRING(32),
          allowNull: false,
        },
        duplicate_policy: {
          type: Sequelize.STRING(64),
          allowNull: false,
          defaultValue: 'reconciliation_key_single_credit',
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
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
    }

    if (!(await tableExists('sbsa_inbound_credit_event_sources'))) {
      await queryInterface.createTable('sbsa_inbound_credit_event_sources', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        event_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'sbsa_inbound_credit_events', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        source_type: {
          type: Sequelize.STRING(32),
          allowNull: false,
          comment: 'payshap_inbound, payshap_rpp_callback, h2h_statement_trf',
        },
        source_fingerprint: {
          type: Sequelize.STRING(96),
          allowNull: false,
          unique: true,
          comment: 'Unique observed-source fingerprint. Prevents replay of a source file/callback.',
        },
        source_transaction_id: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        source_reference: {
          type: Sequelize.STRING(128),
          allowNull: true,
        },
        statement_run_id: {
          type: Sequelize.STRING(64),
          allowNull: true,
        },
        statement_transaction_id: {
          type: Sequelize.STRING(96),
          allowNull: true,
        },
        value_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        observed_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('NOW()'),
        },
        status: {
          type: Sequelize.STRING(32),
          allowNull: false,
          defaultValue: 'primary',
          comment: 'primary, duplicate, suspense',
        },
        raw_payload: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: false,
          defaultValue: {},
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
    }

    await addIndexIfMissing('sbsa_inbound_credit_events', ['canonical_fingerprint'], {
      name: 'idx_sbsa_in_credit_events_canonical',
      unique: true,
    });
    await addIndexIfMissing('sbsa_inbound_credit_events', ['reconciliation_key', 'status'], {
      name: 'idx_sbsa_in_credit_events_recon_status',
    });
    await addIndexIfMissing('sbsa_inbound_credit_events', ['reconciliation_key'], {
      name: 'idx_sbsa_in_credit_events_recon_unique',
      unique: true,
    });
    await addIndexIfMissing('sbsa_inbound_credit_events', ['wallet_id', 'created_at'], {
      name: 'idx_sbsa_in_credit_events_wallet_created',
    });
    await addIndexIfMissing('sbsa_inbound_credit_events', ['status', 'created_at'], {
      name: 'idx_sbsa_in_credit_events_status_created',
    });
    await addIndexIfMissing('sbsa_inbound_credit_event_sources', ['source_fingerprint'], {
      name: 'idx_sbsa_in_credit_sources_fingerprint',
      unique: true,
    });
    await addIndexIfMissing('sbsa_inbound_credit_event_sources', ['event_id'], {
      name: 'idx_sbsa_in_credit_sources_event',
    });
    await addIndexIfMissing('sbsa_inbound_credit_event_sources', ['source_type', 'created_at'], {
      name: 'idx_sbsa_in_credit_sources_type_created',
    });
    await addIndexIfMissing('sbsa_inbound_credit_event_sources', ['statement_run_id'], {
      name: 'idx_sbsa_in_credit_sources_statement_run',
    });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));

    if (tableNames.includes('sbsa_inbound_credit_event_sources')) {
      await queryInterface.dropTable('sbsa_inbound_credit_event_sources');
    }
    if (tableNames.includes('sbsa_inbound_credit_events')) {
      await queryInterface.dropTable('sbsa_inbound_credit_events');
    }
  },
};
