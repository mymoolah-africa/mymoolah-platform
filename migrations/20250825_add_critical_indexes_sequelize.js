/**
 * Critical Performance Indexes Migration - Sequelize Version
 * 
 * Attempts to create critical indexes using Sequelize's addIndex method
 * This may work with current database permissions
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    console.log('🔄 Attempting to create critical performance indexes via Sequelize...');

    const indexes = [
      // Transactions table indexes (MOST CRITICAL)
      {
        tableName: 'transactions',
        indexName: 'idx_transactions_user_created',
        fields: ['userId', 'createdAt'],
        options: {
          order: [['userId', 'ASC'], ['createdAt', 'DESC']]
        }
      },
      {
        tableName: 'transactions',
        indexName: 'idx_transactions_wallet_created',
        fields: ['walletId', 'createdAt'],
        options: {
          order: [['walletId', 'ASC'], ['createdAt', 'DESC']]
        }
      },
      {
        tableName: 'transactions',
        indexName: 'idx_transactions_status_created',
        fields: ['status', 'createdAt'],
        options: {
          order: [['status', 'ASC'], ['createdAt', 'DESC']]
        }
      },
      {
        tableName: 'transactions',
        indexName: 'idx_transactions_type_created',
        fields: ['type', 'createdAt'],
        options: {
          order: [['type', 'ASC'], ['createdAt', 'DESC']]
        }
      },
      {
        tableName: 'transactions',
        indexName: 'idx_transactions_transaction_id',
        fields: ['transactionId'],
        options: {
          unique: true
        }
      },

      // Wallets table indexes
      {
        tableName: 'wallets',
        indexName: 'idx_wallets_user_status',
        fields: ['userId', 'status'],
        options: {
          order: [['userId', 'ASC'], ['status', 'ASC']]
        }
      },

      // Users table indexes
      {
        tableName: 'users',
        indexName: 'idx_users_phone_number',
        fields: ['phoneNumber'],
        options: {
          where: "phoneNumber IS NOT NULL"
        }
      },
      {
        tableName: 'users',
        indexName: 'idx_users_account_number',
        fields: ['accountNumber'],
        options: {
          where: "accountNumber IS NOT NULL"
        }
      },
      {
        tableName: 'users',
        indexName: 'idx_users_kyc_status',
        fields: ['kycStatus', 'kycVerifiedAt'],
        options: {
          order: [['kycStatus', 'ASC'], ['kycVerifiedAt', 'DESC']]
        }
      },

      // KYC table indexes
      {
        tableName: 'kyc',
        indexName: 'idx_kyc_user_status',
        fields: ['userId', 'status'],
        options: {
          order: [['userId', 'ASC'], ['status', 'ASC']]
        }
      },
      {
        tableName: 'kyc',
        indexName: 'idx_kyc_validation_status',
        fields: ['validationStatus', 'createdAt'],
        options: {
          order: [['validationStatus', 'ASC'], ['createdAt', 'DESC']]
        }
      },

      // Vouchers table indexes
      {
        tableName: 'vouchers',
        indexName: 'idx_vouchers_user_status_created',
        fields: ['userId', 'status', 'createdAt'],
        options: {
          order: [['userId', 'ASC'], ['status', 'ASC'], ['createdAt', 'DESC']]
        }
      },
      {
        tableName: 'vouchers',
        indexName: 'idx_vouchers_status_expires',
        fields: ['status', 'expiresAt'],
        options: {
          order: [['status', 'ASC'], ['expiresAt', 'ASC']]
        }
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const index of indexes) {
      try {
        await queryInterface.addIndex(
          index.tableName, 
          index.fields, 
          {
            name: index.indexName,
            ...index.options
          }
        );
        console.log(`✅ Created index: ${index.indexName}`);
        successCount++;
      } catch (error) {
        console.log(`⚠️ Failed to create index ${index.indexName}: ${error.message}`);
        errorCount++;
      }
    }

    console.log(`\n📊 Index Creation Summary:`);
    console.log(`✅ Successfully created: ${successCount} indexes`);
    console.log(`❌ Failed to create: ${errorCount} indexes`);

    if (errorCount > 0) {
      console.log(`\n⚠️ Some indexes failed to create due to permission issues.`);
      console.log(`💡 To create all indexes, you need to:`);
      console.log(`   1. Connect as database owner/superuser`);
      console.log(`   2. Run: GRANT CREATE ON SCHEMA public TO mymoolah_app;`);
      console.log(`   3. Run: GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO mymoolah_app;`);
      console.log(`   4. Re-run this migration`);
    }

    if (successCount > 0) {
      console.log(`\n🎉 Successfully created ${successCount} critical performance indexes!`);
      console.log(`🚀 Database performance will be significantly improved.`);
    }
  },

  down: async (queryInterface, Sequelize) => {
    console.log('🔄 Removing critical performance indexes...');

    const indexNames = [
      'idx_transactions_user_created',
      'idx_transactions_wallet_created',
      'idx_transactions_status_created',
      'idx_transactions_type_created',
      'idx_transactions_transaction_id',
      'idx_wallets_user_status',
      'idx_users_phone_number',
      'idx_users_account_number',
      'idx_users_kyc_status',
      'idx_kyc_user_status',
      'idx_kyc_validation_status',
      'idx_vouchers_user_status_created',
      'idx_vouchers_status_expires'
    ];

    let removedCount = 0;

    for (const indexName of indexNames) {
      try {
        // Determine table name from index name
        let tableName = 'transactions';
        if (indexName.includes('wallets')) tableName = 'wallets';
        else if (indexName.includes('users')) tableName = 'users';
        else if (indexName.includes('kyc')) tableName = 'kyc';
        else if (indexName.includes('vouchers')) tableName = 'vouchers';

        await queryInterface.removeIndex(tableName, indexName);
        console.log(`✅ Removed index: ${indexName}`);
        removedCount++;
      } catch (error) {
        console.log(`⚠️ Failed to remove index ${indexName}: ${error.message}`);
      }
    }

    console.log(`\n📊 Index Removal Summary:`);
    console.log(`✅ Successfully removed: ${removedCount} indexes`);
  }
};
