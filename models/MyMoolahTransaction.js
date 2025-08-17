module.exports = (sequelize, DataTypes) => {
  const MyMoolahTransaction = sequelize.define('MyMoolahTransaction', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Transaction identification
    transactionId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique transaction identifier' 
    },
    reference: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'External reference number' 
    },
    
    // Business context
    businessContext: { 
      type: DataTypes.ENUM('wallet_user', 'client_integration', 'merchant_voucher', 'supplier_settlement', 'reseller'), 
      allowNull: false,
      comment: 'Business context of the transaction' 
    },
    
    // User/Customer identification
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: true,
      comment: 'MyMoolah wallet user ID (for wallet_user context)' 
    },
    clientId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client ID (for client_integration context)' 
    },
    employeeId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client employee ID (for client_integration context)' 
    },
    merchantId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Merchant ID (for merchant_voucher context)' 
    },
    resellerId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Reseller ID (for reseller context)' 
    },
    
    // Transaction details
    transactionType: { 
      type: DataTypes.ENUM('vas_purchase', 'voucher_sale', 'voucher_redemption', 'cash_out', 'float_topup', 'commission', 'fee', 'adjustment'), 
      allowNull: false,
      comment: 'Type of transaction' 
    },
    transactionDirection: { 
      type: DataTypes.ENUM('inbound', 'outbound'), 
      allowNull: false,
      comment: 'Direction of money flow' 
    },
    
    // Financial details
    amount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Transaction amount' 
    },
    currency: { 
      type: DataTypes.STRING(3), 
      allowNull: false, 
      defaultValue: 'ZAR',
      comment: 'Transaction currency' 
    },
    fee: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Transaction fee' 
    },
    commission: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Commission amount' 
    },
    netAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Net amount after fees and commissions' 
    },
    
    // Float account tracking
    supplierFloatAccount: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Supplier float account number involved' 
    },
    clientFloatAccount: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client float account number involved' 
    },
    merchantFloatAccount: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Merchant float account number involved' 
    },
    resellerFloatAccount: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Reseller float account number involved' 
    },
    
    // Balance tracking
    balanceBefore: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Balance before transaction' 
    },
    balanceAfter: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Balance after transaction' 
    },
    
    // Product/Service details
    productId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Product ID (for VAS purchases)' 
    },
    productName: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Product name' 
    },
    productCategory: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Product category (airtime, data, electricity, etc.)' 
    },
    supplierId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Supplier ID for the product/service' 
    },
    
    // Voucher details (for voucher transactions)
    voucherId: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Voucher ID (for voucher transactions)' 
    },
    voucherAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Voucher amount' 
    },
    
    // Transaction status
    status: { 
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'), 
      allowNull: false, 
      defaultValue: 'pending',
      comment: 'Transaction status' 
    },
    
    // Processing details
    processedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When transaction was processed' 
    },
    completedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When transaction was completed' 
    },
    
    // Error handling
    errorCode: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Error code if transaction failed' 
    },
    errorMessage: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Error message if transaction failed' 
    },
    
    // External references
    supplierReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Supplier reference number' 
    },
    clientReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client reference number' 
    },
    merchantReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Merchant reference number' 
    },
    resellerReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Reseller reference number' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional transaction metadata' 
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
    tableName: 'mymoolah_transactions',
    timestamps: true,
    indexes: [
      { fields: ['transactionId'] },
      { fields: ['reference'] },
      { fields: ['businessContext'] },
      { fields: ['userId'] },
      { fields: ['clientId'] },
      { fields: ['merchantId'] },
      { fields: ['transactionType'] },
      { fields: ['status'] },
      { fields: ['supplierId'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  MyMoolahTransaction.prototype.calculateNetAmount = function() {
    this.netAmount = parseFloat(this.amount) - parseFloat(this.fee || 0) - parseFloat(this.commission || 0);
    return this.netAmount;
  };

  MyMoolahTransaction.prototype.updateBalance = function(balanceAfter) {
    this.balanceAfter = balanceAfter;
    return this.save();
  };

  MyMoolahTransaction.prototype.markAsCompleted = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
  };

  MyMoolahTransaction.prototype.markAsFailed = function(errorCode, errorMessage) {
    this.status = 'failed';
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    return this.save();
  };

  MyMoolahTransaction.prototype.isWalletTransaction = function() {
    return this.businessContext === 'wallet_user';
  };

  MyMoolahTransaction.prototype.isClientTransaction = function() {
    return this.businessContext === 'client_integration';
  };

  MyMoolahTransaction.prototype.isMerchantTransaction = function() {
    return this.businessContext === 'merchant_voucher';
  };

      MyMoolahTransaction.prototype.isSupplierTransaction = function() {
      return this.businessContext === 'supplier_settlement';
    };

    MyMoolahTransaction.prototype.isResellerTransaction = function() {
      return this.businessContext === 'reseller';
    };

  return MyMoolahTransaction;
};
