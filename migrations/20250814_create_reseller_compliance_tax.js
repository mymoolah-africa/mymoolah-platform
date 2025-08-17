/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create reseller_floats table
    await queryInterface.createTable('reseller_floats', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Reseller identification
      resellerId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique reseller identifier' 
      },
      resellerName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Reseller business name' 
      },
      resellerType: { 
        type: Sequelize.ENUM('individual', 'business', 'agent', 'distributor'), 
        allowNull: false,
        comment: 'Type of reseller' 
      },
      
      // Float account details
      floatAccountNumber: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique float account number for this reseller' 
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
        comment: 'Settlement frequency with the reseller' 
      },
      settlementMethod: { 
        type: Sequelize.ENUM('prefunded', 'postpaid', 'hybrid'), 
        allowNull: false, 
        defaultValue: 'prefunded',
        comment: 'Settlement method with the reseller' 
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
      
      // Commission structure
      commissionRate: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false, 
        defaultValue: 0.050,
        comment: 'Default commission rate (5% default)' 
      },
      tierLevel: { 
        type: Sequelize.ENUM('bronze', 'silver', 'gold', 'platinum'), 
        allowNull: false, 
        defaultValue: 'bronze',
        comment: 'Reseller tier level' 
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
      
      // Contact information
      contactPerson: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Primary contact person' 
      },
      contactEmail: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Primary contact email' 
      },
      contactPhone: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Primary contact phone' 
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
      
      // Location details
      region: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Geographic region/area' 
      },
      territory: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Sales territory' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional reseller-specific configuration' 
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
        defaultValue: Sequelize.fn('NOW') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
    });

    // Create tax_configurations table
    await queryInterface.createTable('tax_configurations', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Tax identification
      taxCode: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique tax code identifier' 
      },
      taxName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax name (e.g., VAT, Income Tax)' 
      },
      taxType: { 
        type: Sequelize.ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other'), 
        allowNull: false,
        comment: 'Type of tax' 
      },
      
      // Tax rates
      taxRate: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false,
        comment: 'Tax rate as decimal (e.g., 0.15 for 15%)' 
      },
      effectiveFrom: { 
        type: Sequelize.DATE, 
        allowNull: false,
        comment: 'Date from which this tax rate is effective' 
      },
      effectiveTo: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Date until which this tax rate is effective (null for current)' 
      },
      
      // Tax calculation
      calculationMethod: { 
        type: Sequelize.ENUM('inclusive', 'exclusive', 'compound'), 
        allowNull: false, 
        defaultValue: 'exclusive',
        comment: 'How tax is calculated' 
      },
      isActive: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: true,
        comment: 'Whether this tax configuration is active' 
      },
      
      // Applicability
      appliesTo: { 
        type: Sequelize.ENUM('all', 'products', 'services', 'fees', 'commissions', 'specific'), 
        allowNull: false, 
        defaultValue: 'all',
        comment: 'What this tax applies to' 
      },
      applicableProducts: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Specific products this tax applies to' 
      },
      applicableServices: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Specific services this tax applies to' 
      },
      
      // Thresholds and exemptions
      minimumAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Minimum amount for tax to apply' 
      },
      maximumAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Maximum amount for tax to apply' 
      },
      exemptionThreshold: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: true,
        comment: 'Amount below which tax is exempt' 
      },
      
      // Reporting
      taxPeriod: { 
        type: Sequelize.ENUM('monthly', 'quarterly', 'annually'), 
        allowNull: false, 
        defaultValue: 'monthly',
        comment: 'Tax reporting period' 
      },
      nextReportingDate: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Next tax reporting date' 
      },
      
      // Metadata
      description: { 
        type: Sequelize.TEXT, 
        allowNull: true,
        comment: 'Description of the tax' 
      },
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional tax configuration metadata' 
      },
      
      // Timestamps
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
    });

    // Create tax_transactions table
    await queryInterface.createTable('tax_transactions', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Transaction identification
      taxTransactionId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique tax transaction identifier' 
      },
      originalTransactionId: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Reference to the original transaction' 
      },
      
      // Tax details
      taxCode: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax code applied' 
      },
      taxName: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax name' 
      },
      taxType: { 
        type: Sequelize.ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other'), 
        allowNull: false,
        comment: 'Type of tax' 
      },
      
      // Financial details
      baseAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Amount before tax' 
      },
      taxAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Tax amount calculated' 
      },
      totalAmount: { 
        type: Sequelize.DECIMAL(15, 2), 
        allowNull: false,
        comment: 'Total amount including tax' 
      },
      taxRate: { 
        type: Sequelize.DECIMAL(5, 4), 
        allowNull: false,
        comment: 'Tax rate applied' 
      },
      
      // Calculation method
      calculationMethod: { 
        type: Sequelize.ENUM('inclusive', 'exclusive', 'compound'), 
        allowNull: false,
        comment: 'How tax was calculated' 
      },
      
      // Business context
      businessContext: { 
        type: Sequelize.ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement', 'reseller'), 
        allowNull: false,
        comment: 'Business context of the transaction' 
      },
      transactionType: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Type of original transaction' 
      },
      
      // Entity identification
      entityId: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Entity ID (supplier, client, merchant, reseller)' 
      },
      entityType: { 
        type: Sequelize.ENUM('supplier', 'client', 'merchant', 'reseller', 'customer'), 
        allowNull: true,
        comment: 'Type of entity' 
      },
      
      // Tax period
      taxPeriod: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Tax period (YYYY-MM format)' 
      },
      taxYear: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        comment: 'Tax year' 
      },
      
      // Status
      status: { 
        type: Sequelize.ENUM('pending', 'calculated', 'paid', 'reported', 'refunded'), 
        allowNull: false, 
        defaultValue: 'pending',
        comment: 'Tax transaction status' 
      },
      
      // Payment details
      paymentReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Payment reference for tax payment' 
      },
      paymentDate: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Date tax was paid' 
      },
      
      // Reporting
      reportedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When tax was reported to authorities' 
      },
      reportReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Reference from tax authority' 
      },
      
      // Metadata
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional tax transaction metadata' 
      },
      
      // Timestamps
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
    });

    // Create compliance_records table
    await queryInterface.createTable('compliance_records', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      
      // Record identification
      recordId: { 
        type: Sequelize.STRING, 
        allowNull: false, 
        unique: true,
        comment: 'Unique compliance record identifier' 
      },
      complianceType: { 
        type: Sequelize.ENUM('kyc', 'aml', 'ctf', 'fica', 'poc', 'licensing', 'audit', 'other'), 
        allowNull: false,
        comment: 'Type of compliance record' 
      },
      
      // Entity details
      entityId: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Entity ID (user, supplier, client, merchant, reseller)' 
      },
      entityType: { 
        type: Sequelize.ENUM('user', 'supplier', 'client', 'merchant', 'reseller', 'company'), 
        allowNull: false,
        comment: 'Type of entity' 
      },
      
      // Compliance details
      requirement: { 
        type: Sequelize.STRING, 
        allowNull: false,
        comment: 'Compliance requirement description' 
      },
      status: { 
        type: Sequelize.ENUM('pending', 'in_progress', 'completed', 'failed', 'expired', 'waived'), 
        allowNull: false, 
        defaultValue: 'pending',
        comment: 'Compliance status' 
      },
      
      // Document details
      documentType: { 
        type: Sequelize.ENUM('id_document', 'proof_of_address', 'business_registration', 'tax_clearance', 'bank_statement', 'utility_bill', 'other'), 
        allowNull: true,
        comment: 'Type of document submitted' 
      },
      documentReference: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'Document reference number' 
      },
      documentUrl: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'URL to stored document' 
      },
      
      // Verification details
      verifiedBy: { 
        type: Sequelize.STRING, 
        allowNull: true,
        comment: 'User ID who verified the compliance' 
      },
      verifiedAt: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'When compliance was verified' 
      },
      verificationMethod: { 
        type: Sequelize.ENUM('manual', 'automated', 'third_party', 'government_api'), 
        allowNull: true,
        comment: 'Method used for verification' 
      },
      
      // Expiry and renewal
      validFrom: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Date from which compliance is valid' 
      },
      validUntil: { 
        type: Sequelize.DATE, 
        allowNull: true,
        comment: 'Date until which compliance is valid' 
      },
      renewalRequired: { 
        type: Sequelize.BOOLEAN, 
        allowNull: false, 
        defaultValue: false,
        comment: 'Whether renewal is required' 
      },
      renewalPeriod: { 
        type: Sequelize.INTEGER, 
        allowNull: true,
        comment: 'Renewal period in months' 
      },
      
      // Risk assessment
      riskLevel: { 
        type: Sequelize.ENUM('low', 'medium', 'high', 'critical'), 
        allowNull: false, 
        defaultValue: 'medium',
        comment: 'Risk level assessment' 
      },
      riskScore: { 
        type: Sequelize.INTEGER, 
        allowNull: true,
        comment: 'Numeric risk score (0-100)' 
      },
      
      // Notes and metadata
      notes: { 
        type: Sequelize.TEXT, 
        allowNull: true,
        comment: 'Additional notes about compliance' 
      },
      metadata: { 
        type: Sequelize.JSONB, 
        allowNull: true,
        comment: 'Additional compliance metadata' 
      },
      
      // Timestamps
      createdAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
      updatedAt: { 
        type: Sequelize.DATE, 
        allowNull: false, 
        defaultValue: Sequelize.fn('NOW') 
      },
    });

    // Add indexes for reseller_floats
    await queryInterface.addIndex('reseller_floats', ['resellerId']);
    await queryInterface.addIndex('reseller_floats', ['floatAccountNumber']);
    await queryInterface.addIndex('reseller_floats', ['resellerType']);
    await queryInterface.addIndex('reseller_floats', ['tierLevel']);
    await queryInterface.addIndex('reseller_floats', ['status']);
    await queryInterface.addIndex('reseller_floats', ['isActive']);
    await queryInterface.addIndex('reseller_floats', ['settlementPeriod']);
    await queryInterface.addIndex('reseller_floats', ['region']);

    // Add indexes for tax_configurations
    await queryInterface.addIndex('tax_configurations', ['taxCode']);
    await queryInterface.addIndex('tax_configurations', ['taxType']);
    await queryInterface.addIndex('tax_configurations', ['isActive']);
    await queryInterface.addIndex('tax_configurations', ['effectiveFrom']);
    await queryInterface.addIndex('tax_configurations', ['effectiveTo']);
    await queryInterface.addIndex('tax_configurations', ['appliesTo']);

    // Add indexes for tax_transactions
    await queryInterface.addIndex('tax_transactions', ['taxTransactionId']);
    await queryInterface.addIndex('tax_transactions', ['originalTransactionId']);
    await queryInterface.addIndex('tax_transactions', ['taxCode']);
    await queryInterface.addIndex('tax_transactions', ['taxType']);
    await queryInterface.addIndex('tax_transactions', ['businessContext']);
    await queryInterface.addIndex('tax_transactions', ['entityId']);
    await queryInterface.addIndex('tax_transactions', ['entityType']);
    await queryInterface.addIndex('tax_transactions', ['taxPeriod']);
    await queryInterface.addIndex('tax_transactions', ['taxYear']);
    await queryInterface.addIndex('tax_transactions', ['status']);
    await queryInterface.addIndex('tax_transactions', ['createdAt']);

    // Add indexes for compliance_records
    await queryInterface.addIndex('compliance_records', ['recordId']);
    await queryInterface.addIndex('compliance_records', ['complianceType']);
    await queryInterface.addIndex('compliance_records', ['entityId']);
    await queryInterface.addIndex('compliance_records', ['entityType']);
    await queryInterface.addIndex('compliance_records', ['status']);
    await queryInterface.addIndex('compliance_records', ['riskLevel']);
    await queryInterface.addIndex('compliance_records', ['validUntil']);
    await queryInterface.addIndex('compliance_records', ['createdAt']);

    // Add foreign key constraints for mymoolah_transactions
    await queryInterface.addConstraint('mymoolah_transactions', {
      fields: ['resellerFloatAccount'],
      type: 'foreign key',
      name: 'mymoolah_transactions_resellerFloatAccount_fkey',
      references: {
        table: 'reseller_floats',
        field: 'floatAccountNumber'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });

    // Add foreign key constraints for tax_transactions
    await queryInterface.addConstraint('tax_transactions', {
      fields: ['originalTransactionId'],
      type: 'foreign key',
      name: 'tax_transactions_originalTransactionId_fkey',
      references: {
        table: 'mymoolah_transactions',
        field: 'transactionId'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });

    await queryInterface.addConstraint('tax_transactions', {
      fields: ['taxCode'],
      type: 'foreign key',
      name: 'tax_transactions_taxCode_fkey',
      references: {
        table: 'tax_configurations',
        field: 'taxCode'
      },
      onDelete: 'RESTRICT',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove foreign key constraints
    await queryInterface.removeConstraint('tax_transactions', 'tax_transactions_originalTransactionId_fkey');
    await queryInterface.removeConstraint('tax_transactions', 'tax_transactions_taxCode_fkey');
    await queryInterface.removeConstraint('mymoolah_transactions', 'mymoolah_transactions_resellerFloatAccount_fkey');

    // Remove indexes
    await queryInterface.removeIndex('compliance_records', ['recordId']);
    await queryInterface.removeIndex('compliance_records', ['complianceType']);
    await queryInterface.removeIndex('compliance_records', ['entityId']);
    await queryInterface.removeIndex('compliance_records', ['entityType']);
    await queryInterface.removeIndex('compliance_records', ['status']);
    await queryInterface.removeIndex('compliance_records', ['riskLevel']);
    await queryInterface.removeIndex('compliance_records', ['validUntil']);
    await queryInterface.removeIndex('compliance_records', ['createdAt']);

    await queryInterface.removeIndex('tax_transactions', ['taxTransactionId']);
    await queryInterface.removeIndex('tax_transactions', ['originalTransactionId']);
    await queryInterface.removeIndex('tax_transactions', ['taxCode']);
    await queryInterface.removeIndex('tax_transactions', ['taxType']);
    await queryInterface.removeIndex('tax_transactions', ['businessContext']);
    await queryInterface.removeIndex('tax_transactions', ['entityId']);
    await queryInterface.removeIndex('tax_transactions', ['entityType']);
    await queryInterface.removeIndex('tax_transactions', ['taxPeriod']);
    await queryInterface.removeIndex('tax_transactions', ['taxYear']);
    await queryInterface.removeIndex('tax_transactions', ['status']);
    await queryInterface.removeIndex('tax_transactions', ['createdAt']);

    await queryInterface.removeIndex('tax_configurations', ['taxCode']);
    await queryInterface.removeIndex('tax_configurations', ['taxType']);
    await queryInterface.removeIndex('tax_configurations', ['isActive']);
    await queryInterface.removeIndex('tax_configurations', ['effectiveFrom']);
    await queryInterface.removeIndex('tax_configurations', ['effectiveTo']);
    await queryInterface.removeIndex('tax_configurations', ['appliesTo']);

    await queryInterface.removeIndex('reseller_floats', ['resellerId']);
    await queryInterface.removeIndex('reseller_floats', ['floatAccountNumber']);
    await queryInterface.removeIndex('reseller_floats', ['resellerType']);
    await queryInterface.removeIndex('reseller_floats', ['tierLevel']);
    await queryInterface.removeIndex('reseller_floats', ['status']);
    await queryInterface.removeIndex('reseller_floats', ['isActive']);
    await queryInterface.removeIndex('reseller_floats', ['settlementPeriod']);
    await queryInterface.removeIndex('reseller_floats', ['region']);

    // Drop tables
    await queryInterface.dropTable('compliance_records');
    await queryInterface.dropTable('tax_transactions');
    await queryInterface.dropTable('tax_configurations');
    await queryInterface.dropTable('reseller_floats');

    // Drop ENUMs
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_reseller_floats_resellerType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_reseller_floats_settlementPeriod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_reseller_floats_settlementMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_reseller_floats_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_reseller_floats_tierLevel;');
    
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_configurations_taxType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_configurations_calculationMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_configurations_appliesTo;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_configurations_taxPeriod;');
    
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_transactions_taxType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_transactions_calculationMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_transactions_businessContext;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_transactions_entityType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_tax_transactions_status;');
    
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_complianceType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_entityType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_status;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_documentType;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_verificationMethod;');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS enum_compliance_records_riskLevel;');
  }
};
