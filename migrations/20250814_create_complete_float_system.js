/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableExists = async (name) => {
      const [r] = await queryInterface.sequelize.query(
        `SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='${name}'`
      );
      return r && r.length > 0;
    };
    const safeAddIndex = async (table, columns, opts = {}) => {
      try {
        await queryInterface.addIndex(table, columns, opts);
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    };
    const safeAddConstraint = async (table, constraint) => {
      try {
        await queryInterface.addConstraint(table, constraint);
      } catch (e) {
        if (!e.message?.includes('already exists')) throw e;
      }
    };

    // Create client_floats table (idempotent)
    if (!(await tableExists('client_floats'))) {
    await queryInterface.createTable('client_floats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Client identification
      clientId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique client identifier' 
      },
      clientName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Client company name' 
      },
      clientType: { 
        type: Sequelize.ENUM('sports_betting', 'employer', 'gaming', 'retail', 'other'), 
        allowNull: false,
        comment: 'Type of B2B client' 
      },
      
      // Float account details
      floatAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique float account number for this client' 
      },
      floatAccountName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Descriptive name for the float account' 
      },
      
      // Financial tracking
      currentBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Current available balance in the float account' 
      },
      initialBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Initial balance when float account was created' 
      },
      minimumBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Minimum balance threshold for alerts' 
      },
      maximumBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Maximum balance limit for the float account' 
      },
      
      // Settlement configuration
      settlementPeriod: { 
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
        allowNull: false, 
        defaultValue: 'real_time',
        comment: 'Settlement frequency with the client' 
      },
      settlementMethod: { 
        type: Sequelize.ENUM('prefunded', 'postpaid', 'hybrid'), 
        allowNull: false, 
        defaultValue: 'prefunded',
        comment: 'Settlement method with the client' 
      },
      
      // Account status
      status: { 
        type: Sequelize.ENUM('active', 'suspended', 'closed'), 
        allowNull: false, 
        defaultValue: 'active',
        comment: 'Current status of the float account' 
      },
      isActive: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: true,
        comment: 'Whether the float account is active' 
      },
      
      // Integration details
      integrationType: { 
        type: Sequelize.ENUM('api', 'webhook', 'batch'), 
        allowNull: false, 
        defaultValue: 'api',
        comment: 'Integration method with the client' 
      },
      apiEndpoint: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client API endpoint for callbacks' 
      },
      webhookUrl: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client webhook URL for notifications' 
      },
      
      // Bank account details for settlements
      bankAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank account number for settlements' 
      },
      bankCode: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank code for settlements' 
      },
      bankName: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank name for settlements' 
      },
      
      // Business rules
      maxTransactionAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Maximum transaction amount allowed' 
      },
      dailyTransactionLimit: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Daily transaction limit' 
      },
      monthlyTransactionLimit: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Monthly transaction limit' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional client-specific configuration' 
      },
      
      // Timestamps
      lastSettlementAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Last settlement timestamp' 
      },
      nextSettlementAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Next scheduled settlement timestamp' 
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
      },
    });
    }

    // Create merchant_floats table (idempotent)
    if (!(await tableExists('merchant_floats'))) {
    await queryInterface.createTable('merchant_floats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Merchant identification
      merchantId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique merchant identifier' 
      },
      merchantName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Merchant business name' 
      },
      merchantType: { 
        type: Sequelize.ENUM('retail', 'supermarket', 'pharmacy', 'fuel_station', 'restaurant', 'other'), 
        allowNull: false,
        comment: 'Type of merchant business' 
      },
      
      // Float account details
      floatAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique float account number for this merchant' 
      },
      floatAccountName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Descriptive name for the float account' 
      },
      
      // Financial tracking
      currentBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Current available balance in the float account' 
      },
      initialBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Initial balance when float account was created' 
      },
      minimumBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Minimum balance threshold for alerts' 
      },
      maximumBalance: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Maximum balance limit for the float account' 
      },
      
      // Settlement configuration
      settlementPeriod: { 
        type: Sequelize.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
        allowNull: false, 
        defaultValue: 'real_time',
        comment: 'Settlement frequency with the merchant' 
      },
      settlementMethod: { 
        type: Sequelize.ENUM('prefunded', 'postpaid', 'hybrid'), 
        allowNull: false, 
        defaultValue: 'prefunded',
        comment: 'Settlement method with the merchant' 
      },
      
      // Account status
      status: { 
        type: Sequelize.ENUM('active', 'suspended', 'closed'), 
        allowNull: false, 
        defaultValue: 'active',
        comment: 'Current status of the float account' 
      },
      isActive: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: true,
        comment: 'Whether the float account is active' 
      },
      
      // Voucher services
      canSellVouchers: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: true,
        comment: 'Whether merchant can sell MMVouchers' 
      },
      canRedeemVouchers: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: true,
        comment: 'Whether merchant can redeem MMVouchers' 
      },
      
      // Commission structure
      voucherSaleCommission: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false, 
        defaultValue: 0.025,
        comment: 'Commission rate for voucher sales (2.5% default)' 
      },
      voucherRedemptionFee: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false, 
        defaultValue: 0.010,
        comment: 'Fee rate for voucher redemptions (1% default)' 
      },
      
      // Bank account details for settlements
      bankAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank account number for settlements' 
      },
      bankCode: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank code for settlements' 
      },
      bankName: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank name for settlements' 
      },
      
      // Business rules
      maxVoucherAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Maximum voucher amount merchant can sell' 
      },
      dailyVoucherLimit: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Daily voucher transaction limit' 
      },
      
      // Location details
      storeNumber: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Store/branch number' 
      },
      location: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Store location/address' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional merchant-specific configuration' 
      },
      
      // Timestamps
      lastSettlementAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Last settlement timestamp' 
      },
      nextSettlementAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Next scheduled settlement timestamp' 
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
      },
    });
    }

    // Create mymoolah_transactions table (idempotent)
    if (!(await tableExists('mymoolah_transactions'))) {
    await queryInterface.createTable('mymoolah_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Transaction identification
      transactionId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique transaction identifier' 
      },
      reference: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'External reference number' 
      },
      
      // Business context
      businessContext: { 
        type: Sequelize.ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement'), 
        allowNull: false,
        comment: 'Business context of the transaction' 
      },
      
      // User/Customer identification
      userId: { 
        type: Sequelize.INTEGER, 
        allowNull: true,
        comment: 'MyMoolah wallet user ID (for wallet_user context)' 
      },
      clientId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client ID (for client_integration context)' 
      },
      employeeId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client employee ID (for client_integration context)' 
      },
      merchantId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Merchant ID (for merchant_voucher context)' 
      },
      
      // Transaction details
      transactionType: { 
        type: Sequelize.ENUM('vas_purchase', 'voucher_sale', 'voucher_redemption', 'cash_out', 'float_topup', 'commission', 'fee', 'adjustment'), 
        allowNull: false,
        comment: 'Type of transaction' 
      },
      transactionDirection: { 
        type: Sequelize.ENUM('inbound', 'outbound'), 
        allowNull: false,
        comment: 'Direction of money flow' 
      },
      
      // Financial details
      amount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Transaction amount' 
      },
      currency: { 
        type: Sequelize.STRING(3), 
        allowNull: false, 
        defaultValue: 'ZAR',
        comment: 'Transaction currency' 
      },
      fee: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Transaction fee' 
      },
      commission: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Commission amount' 
      },
      netAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Net amount after fees and commissions' 
      },
      
      // Float account tracking
      supplierFloatAccount: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Supplier float account number involved' 
      },
      clientFloatAccount: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client float account number involved' 
      },
      merchantFloatAccount: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Merchant float account number involved' 
      },
      
      // Balance tracking
      balanceBefore: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Balance before transaction' 
      },
      balanceAfter: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Balance after transaction' 
      },
      
      // Product/Service details
      productId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Product ID (for VAS purchases)' 
      },
      productName: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Product name' 
      },
      productCategory: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Product category (airtime, data, electricity, etc.)' 
      },
      supplierId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Supplier ID for the product/service' 
      },
      
      // Voucher details (for voucher transactions)
      voucherId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Voucher ID (for voucher transactions)' 
      },
      voucherAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Voucher amount' 
      },
      
      // Transaction status
      status: { 
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'), 
        allowNull: false, 
        defaultValue: 'pending',
        comment: 'Transaction status' 
      },
      
      // Processing details
      processedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When transaction was processed' 
      },
      completedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When transaction was completed' 
      },
      
      // Error handling
      errorCode: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Error code if transaction failed' 
      },
      errorMessage: { 
        type: Sequelize.TEXT, 
        allowNull: true,
        comment: 'Error message if transaction failed' 
      },
      
      // External references
      supplierReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Supplier reference number' 
      },
      clientReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Client reference number' 
      },
      merchantReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Merchant reference number' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional transaction metadata' 
      },
      
      // Timestamps
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') 
      },
    });
    }

    // Add indexes for client_floats (idempotent)
    await safeAddIndex('client_floats', ['clientId']);
    await safeAddIndex('client_floats', ['floatAccountNumber']);
    await safeAddIndex('client_floats', ['clientType']);
    await safeAddIndex('client_floats', ['status']);
    await safeAddIndex('client_floats', ['isActive']);
    await safeAddIndex('client_floats', ['settlementPeriod']);

    // Add indexes for merchant_floats (idempotent)
    await safeAddIndex('merchant_floats', ['merchantId']);
    await safeAddIndex('merchant_floats', ['floatAccountNumber']);
    await safeAddIndex('merchant_floats', ['merchantType']);
    await safeAddIndex('merchant_floats', ['status']);
    await safeAddIndex('merchant_floats', ['isActive']);
    await safeAddIndex('merchant_floats', ['canSellVouchers']);
    await safeAddIndex('merchant_floats', ['canRedeemVouchers']);
    await safeAddIndex('merchant_floats', ['settlementPeriod']);

    // Add indexes for mymoolah_transactions (idempotent)
    await safeAddIndex('mymoolah_transactions', ['transactionId']);
    await safeAddIndex('mymoolah_transactions', ['reference']);
    await safeAddIndex('mymoolah_transactions', ['businessContext']);
    await safeAddIndex('mymoolah_transactions', ['userId']);
    await safeAddIndex('mymoolah_transactions', ['clientId']);
    await safeAddIndex('mymoolah_transactions', ['merchantId']);
    await safeAddIndex('mymoolah_transactions', ['transactionType']);
    await safeAddIndex('mymoolah_transactions', ['status']);
    await safeAddIndex('mymoolah_transactions', ['supplierId']);
    await safeAddIndex('mymoolah_transactions', ['createdAt']);

    // Add foreign key constraints (idempotent)
    await safeAddConstraint('mymoolah_transactions', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'mymoolah_transactions_userId_fkey',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await safeAddConstraint('mymoolah_transactions', {
      fields: ['clientFloatAccount'],
      type: 'foreign key',
      name: 'mymoolah_transactions_clientFloatAccount_fkey',
      references: {
        table: 'client_floats',
        field: 'floatAccountNumber'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    await safeAddConstraint('mymoolah_transactions', {
      fields: ['merchantFloatAccount'],
      type: 'foreign key',
      name: 'mymoolah_transactions_merchantFloatAccount_fkey',
      references: {
        table: 'merchant_floats',
        field: 'floatAccountNumber'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Add supplierFloatAccount FK only if supplier_floats exists (created by create_settlement_system)
    const [supplierFloats] = await queryInterface.sequelize.query(`
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'supplier_floats'
    `);
    if (supplierFloats && supplierFloats.length > 0) {
      await safeAddConstraint('mymoolah_transactions', {
        fields: ['supplierFloatAccount'],
        type: 'foreign key',
        name: 'mymoolah_transactions_supplierFloatAccount_fkey',
        references: {
          table: 'supplier_floats',
          field: 'floatAccountNumber'
        },
        onDelete: 'SET NULL',
        onUpdate: 'CASCADE'
      });
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints (supplierFloatAccount may not exist if supplier_floats was missing)
    try {
      await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_supplierFloatAccount_fkey');
    } catch (e) { /* may not exist */ }
    await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_userId_fkey');
    await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_clientFloatAccount_fkey');
    await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_merchantFloatAccount_fkey');

    // Remove indexes
    await queryInterface.removeIndex('mymoolah_transactions', ['transactionId']);
    await queryInterface.removeIndex('mymoolah_transactions', ['reference']);
    await queryInterface.removeIndex('mymoolah_transactions', ['businessContext']);
    await queryInterface.removeIndex('mymoolah_transactions', ['userId']);
    await queryInterface.removeIndex('mymoolah_transactions', ['clientId']);
    await queryInterface.removeIndex('mymoolah_transactions', ['merchantId']);
    await queryInterface.removeIndex('mymoolah_transactions', ['transactionType']);
    await queryInterface.removeIndex('mymoolah_transactions', ['status']);
    await queryInterface.removeIndex('mymoolah_transactions', ['supplierId']);
    await queryInterface.removeIndex('mymoolah_transactions', ['createdAt']);

    await queryInterface.removeIndex('merchant_floats', ['merchantId']);
    await queryInterface.removeIndex('merchant_floats', ['floatAccountNumber']);
    await queryInterface.removeIndex('merchant_floats', ['merchantType']);
    await queryInterface.removeIndex('merchant_floats', ['status']);
    await queryInterface.removeIndex('merchant_floats', ['isActive']);
    await queryInterface.removeIndex('merchant_floats', ['canSellVouchers']);
    await queryInterface.removeIndex('merchant_floats', ['canRedeemVouchers']);
    await queryInterface.removeIndex('merchant_floats', ['settlementPeriod']);

    await queryInterface.removeIndex('client_floats', ['clientId']);
    await queryInterface.removeIndex('client_floats', ['floatAccountNumber']);
    await queryInterface.removeIndex('client_floats', ['clientType']);
    await queryInterface.removeIndex('client_floats', ['status']);
    await queryInterface.removeIndex('client_floats', ['isActive']);
    await queryInterface.removeIndex('client_floats', ['settlementPeriod']);

    // Drop tables
    await queryInterface.dropTable('mymoolah_transactions');
    await queryInterface.dropTable('merchant_floats');
    await queryInterface.dropTable('client_floats');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_client_floats_clientType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_client_floats_settlementPeriod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_client_floats_settlementMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_client_floats_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_client_floats_integrationType;');
    
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_merchant_floats_merchantType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_merchant_floats_settlementPeriod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_merchant_floats_settlementMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_merchant_floats_status;');
    
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_mymoolah_transactions_businessContext;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_mymoolah_transactions_transactionType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_mymoolah_transactions_transactionDirection;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_mymoolah_transactions_status;');
  }
};
