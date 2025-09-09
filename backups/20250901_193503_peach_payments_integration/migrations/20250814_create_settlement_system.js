/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create supplier_floats table
    await queryInterface.createTable('supplier_floats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Supplier identification
      supplierId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        comment: 'Supplier identifier (easypay, flash, mobilemart, peach, dtmercury)' 
      },
      supplierName: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        comment: 'Human readable supplier name' 
      },
      
      // Float account details
      floatAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique float account number for this supplier' 
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
        comment: 'Settlement frequency with the supplier' 
      },
      settlementMethod: { 
        type: Sequelize.ENUM('prefunded', 'postpaid', 'hybrid'), 
        allowNull: false, 
        defaultValue: 'prefunded',
        comment: 'Settlement method with the supplier' 
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
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional supplier-specific configuration' 
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

    // Create settlements table
    await queryInterface.createTable('settlements', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Settlement identification
      settlementId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique settlement identifier' 
      },
      supplierId: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Supplier identifier for this settlement' 
      },
      floatAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Float account number for this settlement' 
      },
      
      // Settlement details
      settlementType: { 
        type: Sequelize.ENUM('topup', 'withdrawal', 'adjustment', 'fee', 'commission'), 
        allowNull: false,
        comment: 'Type of settlement transaction' 
      },
      settlementDirection: { 
        type: Sequelize.ENUM('inbound', 'outbound'), 
        allowNull: false,
        comment: 'Direction of settlement (inbound = money coming in, outbound = money going out)' 
      },
      
      // Financial details
      amount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Settlement amount' 
      },
      currency: { 
        type: Sequelize.STRING(3), 
        allowNull: false, 
        defaultValue: 'ZAR',
        comment: 'Settlement currency' 
      },
      fee: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false, 
        defaultValue: 0.00,
        comment: 'Settlement fee' 
      },
      netAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Net amount after fees' 
      },
      
      // Balance tracking
      balanceBefore: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Float account balance before settlement' 
      },
      balanceAfter: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Float account balance after settlement' 
      },
      
      // Settlement status
      status: { 
        type: Sequelize.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'), 
        allowNull: false, 
        defaultValue: 'pending',
        comment: 'Settlement status' 
      },
      
      // Reference information
      supplierReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Supplier reference number for this settlement' 
      },
      bankReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank reference number for this settlement' 
      },
      transactionReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Internal transaction reference' 
      },
      
      // Settlement method
      settlementMethod: { 
        type: Sequelize.ENUM('eft', 'rtgs', 'payShap', 'card', 'cash'), 
        allowNull: false,
        comment: 'Method used for settlement' 
      },
      
      // Bank account details
      bankAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank account number for settlement' 
      },
      bankCode: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank code for settlement' 
      },
      bankName: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Bank name for settlement' 
      },
      
      // Processing details
      processedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When settlement was processed' 
      },
      completedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When settlement was completed' 
      },
      
      // Error handling
      errorCode: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Error code if settlement failed' 
      },
      errorMessage: { 
        type: Sequelize.TEXT, 
        allowNull: true,
        comment: 'Error message if settlement failed' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional settlement metadata' 
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

    // Add indexes for supplier_floats
    await queryInterface.addIndex('supplier_floats', ['supplierId']);
    await queryInterface.addIndex('supplier_floats', ['floatAccountNumber']);
    await queryInterface.addIndex('supplier_floats', ['status']);
    await queryInterface.addIndex('supplier_floats', ['isActive']);
    await queryInterface.addIndex('supplier_floats', ['settlementPeriod']);

    // Add indexes for settlements
    await queryInterface.addIndex('settlements', ['settlementId']);
    await queryInterface.addIndex('settlements', ['supplierId']);
    await queryInterface.addIndex('settlements', ['floatAccountNumber']);
    await queryInterface.addIndex('settlements', ['status']);
    await queryInterface.addIndex('settlements', ['settlementType']);
    await queryInterface.addIndex('settlements', ['settlementDirection']);
    await queryInterface.addIndex('settlements', ['processedAt']);
    await queryInterface.addIndex('settlements', ['createdAt']);

    // Add foreign key constraints
    await queryInterface.addConstraint('settlements', {
      fields: ['floatAccountNumber'],
      type: 'foreign key',
      name: 'settlements_floatAccountNumber_fkey',
      references: {
        table: 'supplier_floats',
        field: 'floatAccountNumber'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints
    await queryInterface.removeConstraint('settlements', 'settlements_floatAccountNumber_fkey');

    // Remove indexes
    await queryInterface.removeIndex('settlements', ['settlementId']);
    await queryInterface.removeIndex('settlements', ['supplierId']);
    await queryInterface.removeIndex('settlements', ['floatAccountNumber']);
    await queryInterface.removeIndex('settlements', ['status']);
    await queryInterface.removeIndex('settlements', ['settlementType']);
    await queryInterface.removeIndex('settlements', ['settlementDirection']);
    await queryInterface.removeIndex('settlements', ['processedAt']);
    await queryInterface.removeIndex('settlements', ['createdAt']);

    await queryInterface.removeIndex('supplier_floats', ['supplierId']);
    await queryInterface.removeIndex('supplier_floats', ['floatAccountNumber']);
    await queryInterface.removeIndex('supplier_floats', ['status']);
    await queryInterface.removeIndex('supplier_floats', ['isActive']);
    await queryInterface.removeIndex('supplier_floats', ['settlementPeriod']);

    // Drop tables
    await queryInterface.dropTable('settlements');
    await queryInterface.dropTable('supplier_floats');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_supplier_floats_settlementPeriod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_supplier_floats_settlementMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_supplier_floats_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_settlements_settlementType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_settlements_settlementDirection;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_settlements_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_settlements_settlementMethod;');
  }
};
