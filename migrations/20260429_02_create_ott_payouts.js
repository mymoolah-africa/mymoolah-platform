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

    await queryInterface.sequelize.query(`
      INSERT INTO ledger_accounts (code, name, type, "normalSide", "createdAt", "updatedAt")
      VALUES ('1200-10-08', 'OTT Payout Float Account', 'asset', 'debit', NOW(), NOW())
      ON CONFLICT (code) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        "normalSide" = EXCLUDED."normalSide",
        "updatedAt" = NOW();
    `);

    if (!(await tableExists('ott_payouts'))) {
      await queryInterface.createTable('ott_payouts', {
        id: { type: Sequelize.INTEGER, autoIncrement: true, primaryKey: true },
        payout_id: { type: Sequelize.STRING(64), allowNull: false, unique: true },
        unique_reference_id: { type: Sequelize.STRING(80), allowNull: false, unique: true },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        wallet_id: {
          type: Sequelize.STRING,
          allowNull: false,
          references: { model: 'wallets', key: 'walletId' },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT',
        },
        status: { type: Sequelize.STRING(32), allowNull: false, defaultValue: 'pending' },
        amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        provider_fee_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        mmtp_fee_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false, defaultValue: 0 },
        total_debit: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
        currency: { type: Sequelize.STRING(3), allowNull: false, defaultValue: 'ZAR' },
        provider_code: { type: Sequelize.STRING(64), allowNull: false },
        recipient_mobile_last4: { type: Sequelize.STRING(4), allowNull: true },
        recipient_name_masked: { type: Sequelize.STRING(120), allowNull: true },
        account_number_last4: { type: Sequelize.STRING(4), allowNull: true },
        branch_code: { type: Sequelize.STRING(16), allowNull: true },
        reference: { type: Sequelize.STRING(80), allowNull: true },
        idempotency_key: { type: Sequelize.STRING(255), allowNull: true },
        ott_payment_reference: { type: Sequelize.STRING(120), allowNull: true },
        provider_transaction_reference: { type: Sequelize.STRING(120), allowNull: true },
        webhook_event_id: { type: Sequelize.STRING(120), allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        processed_at: { type: Sequelize.DATE, allowNull: true },
        reversed_at: { type: Sequelize.DATE, allowNull: true },
        fee_snapshot: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        provider_response: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        metadata: { type: Sequelize.JSONB, allowNull: false, defaultValue: {} },
        createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
        updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('NOW()') },
      });
    }

    await addIndexIfMissing('ott_payouts', ['user_id', 'createdAt'], { name: 'idx_ott_payouts_user_created' });
    await addIndexIfMissing('ott_payouts', ['wallet_id', 'createdAt'], { name: 'idx_ott_payouts_wallet_created' });
    await addIndexIfMissing('ott_payouts', ['status'], { name: 'idx_ott_payouts_status' });
    await addIndexIfMissing('ott_payouts', ['provider_code'], { name: 'idx_ott_payouts_provider_code' });
    await addIndexIfMissing('ott_payouts', ['unique_reference_id'], { name: 'idx_ott_payouts_unique_reference_id' });
    await addIndexIfMissing('ott_payouts', ['webhook_event_id'], { name: 'idx_ott_payouts_webhook_event_id' });
  },

  async down(queryInterface) {
    const tables = await queryInterface.showAllTables();
    const tableNames = tables.map((table) => (typeof table === 'string' ? table : table.tableName));
    if (tableNames.includes('ott_payouts')) {
      await queryInterface.dropTable('ott_payouts');
    }
    await queryInterface.sequelize.query(`
      DELETE FROM ledger_accounts
      WHERE code = '1200-10-08'
        AND NOT EXISTS (
          SELECT 1
          FROM journal_lines jl
          JOIN ledger_accounts la ON la.id = jl."accountId"
          WHERE la.code = '1200-10-08'
        );
    `);
  },
};
