module.exports = (sequelize, DataTypes) => {
  const TaxTransaction = sequelize.define('TaxTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Transaction identification
    taxTransactionId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique tax transaction identifier' 
    },
    originalTransactionId: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Reference to the original transaction' 
    },
    
    // Tax details
    taxCode: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Tax code applied' 
    },
    taxName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Tax name' 
    },
    taxType: { 
      type: DataTypes.ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other'), 
      allowNull: false,
      comment: 'Type of tax' 
    },
    
    // Financial details
    baseAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Amount before tax' 
    },
    taxAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Tax amount calculated' 
    },
    totalAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Total amount including tax' 
    },
    taxRate: { 
      type: DataTypes.DECIMAL(5, 4), 
      allowNull: false,
      comment: 'Tax rate applied' 
    },
    
    // Calculation method
    calculationMethod: { 
      type: DataTypes.ENUM('inclusive', 'exclusive', 'compound'), 
      allowNull: false,
      comment: 'How tax was calculated' 
    },
    
    // Business context
    businessContext: { 
      type: DataTypes.ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement', 'reseller'), 
      allowNull: false,
      comment: 'Business context of the transaction' 
    },
    transactionType: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Type of original transaction' 
    },
    
    // Entity identification
    entityId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Entity ID (supplier, client, merchant, reseller)' 
    },
    entityType: { 
      type: DataTypes.ENUM('supplier', 'client', 'merchant', 'reseller', 'customer'), 
      allowNull: true,
      comment: 'Type of entity' 
    },
    
    // Tax period
    taxPeriod: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Tax period (YYYY-MM format)' 
    },
    taxYear: { 
      type: DataTypes.INTEGER, 
      allowNull: false,
      comment: 'Tax year' 
    },
    
    // Status
    status: { 
      type: DataTypes.ENUM('pending', 'calculated', 'paid', 'reported', 'refunded'), 
      allowNull: false, 
      defaultValue: 'pending',
      comment: 'Tax transaction status' 
    },
    
    // Payment details
    paymentReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Payment reference for tax payment' 
    },
    paymentDate: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Date tax was paid' 
    },
    
    // Reporting
    reportedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When tax was reported to authorities' 
    },
    reportReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Reference from tax authority' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional tax transaction metadata' 
    },
    
    // Timestamps
    createdAt: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
    updatedAt: { 
      type: DataTypes.DATE, 
      allowNull: false, 
      defaultValue: DataTypes.NOW 
    },
  }, {
    tableName: 'tax_transactions',
    timestamps: true,
    indexes: [
      { fields: ['taxTransactionId'] },
      { fields: ['originalTransactionId'] },
      { fields: ['taxCode'] },
      { fields: ['taxType'] },
      { fields: ['businessContext'] },
      { fields: ['entityId'] },
      { fields: ['entityType'] },
      { fields: ['taxPeriod'] },
      { fields: ['taxYear'] },
      { fields: ['status'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  TaxTransaction.prototype.calculateTotal = function() {
    if (this.calculationMethod === 'inclusive') {
      this.totalAmount = this.baseAmount;
      this.baseAmount = this.totalAmount / (1 + this.taxRate);
      this.taxAmount = this.totalAmount - this.baseAmount;
    } else {
      this.taxAmount = this.baseAmount * this.taxRate;
      this.totalAmount = this.baseAmount + this.taxAmount;
    }
    return this.save();
  };

  TaxTransaction.prototype.markAsPaid = function(paymentReference) {
    this.status = 'paid';
    this.paymentReference = paymentReference;
    this.paymentDate = new Date();
    return this.save();
  };

  TaxTransaction.prototype.markAsReported = function(reportReference) {
    this.status = 'reported';
    this.reportReference = reportReference;
    this.reportedAt = new Date();
    return this.save();
  };

  return TaxTransaction;
};
