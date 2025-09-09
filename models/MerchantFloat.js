module.exports = (sequelize, DataTypes) => {
  const MerchantFloat = sequelize.define('MerchantFloat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Merchant identification
    merchantId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique merchant identifier' 
    },
    merchantName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Merchant business name' 
    },
    merchantType: { 
      type: DataTypes.ENUM('retail', 'supermarket', 'pharmacy', 'fuel_station', 'restaurant', 'other'), 
      allowNull: false,
      comment: 'Type of merchant business' 
    },
    
    // Float account details
    floatAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique float account number for this merchant' 
    },
    floatAccountName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Descriptive name for the float account' 
    },
    
    // Financial tracking
    currentBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Current available balance in the float account' 
    },
    initialBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Initial balance when float account was created' 
    },
    minimumBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Minimum balance threshold for alerts' 
    },
    maximumBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum balance limit for the float account' 
    },
    
    // Settlement configuration
    settlementPeriod: { 
      type: DataTypes.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
      allowNull: false, 
      defaultValue: 'real_time',
      comment: 'Settlement frequency with the merchant' 
    },
    settlementMethod: { 
      type: DataTypes.ENUM('prefunded', 'postpaid', 'hybrid'), 
      allowNull: false, 
      defaultValue: 'prefunded',
      comment: 'Settlement method with the merchant' 
    },
    
    // Account status
    status: { 
      type: DataTypes.ENUM('active', 'suspended', 'closed'), 
      allowNull: false, 
      defaultValue: 'active',
      comment: 'Current status of the float account' 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether the float account is active' 
    },
    
    // Voucher services
    canSellVouchers: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether merchant can sell MMVouchers' 
    },
    canRedeemVouchers: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether merchant can redeem MMVouchers' 
    },
    
    // Commission structure
    voucherSaleCommission: { 
      type: DataTypes.DECIMAL(5, 4), 
      allowNull: false, 
      defaultValue: 0.025,
      comment: 'Commission rate for voucher sales (2.5% default)' 
    },
    voucherRedemptionFee: { 
      type: DataTypes.DECIMAL(5, 4), 
      allowNull: false, 
      defaultValue: 0.010,
      comment: 'Fee rate for voucher redemptions (1% default)' 
    },
    
    // Bank account details for settlements
    bankAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank account number for settlements' 
    },
    bankCode: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank code for settlements' 
    },
    bankName: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank name for settlements' 
    },
    
    // Business rules
    maxVoucherAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum voucher amount merchant can sell' 
    },
    dailyVoucherLimit: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Daily voucher transaction limit' 
    },
    
    // Location details
    storeNumber: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Store/branch number' 
    },
    location: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Store location/address' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional merchant-specific configuration' 
    },
    
    // Timestamps
    lastSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Last settlement timestamp' 
    },
    nextSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Next scheduled settlement timestamp' 
    },
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
    tableName: 'merchant_floats',
    timestamps: true,
    indexes: [
      { fields: ['merchantId'] },
      { fields: ['floatAccountNumber'] },
      { fields: ['merchantType'] },
      { fields: ['status'] },
      { fields: ['isActive'] },
      { fields: ['canSellVouchers'] },
      { fields: ['canRedeemVouchers'] },
      { fields: ['settlementPeriod'] }
    ]
  });

  // Instance methods
  MerchantFloat.prototype.updateBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.currentBalance = parseFloat(this.currentBalance) - parseFloat(amount);
    }
    return this.save();
  };

  MerchantFloat.prototype.hasSufficientBalance = function(amount) {
    return parseFloat(this.currentBalance) >= parseFloat(amount);
  };

  MerchantFloat.prototype.getUtilizationPercentage = function() {
    if (parseFloat(this.maximumBalance) === 0) return 0;
    return (parseFloat(this.currentBalance) / parseFloat(this.maximumBalance)) * 100;
  };

  MerchantFloat.prototype.calculateVoucherSaleCommission = function(amount) {
    return parseFloat(amount) * parseFloat(this.voucherSaleCommission);
  };

  MerchantFloat.prototype.calculateVoucherRedemptionFee = function(amount) {
    return parseFloat(amount) * parseFloat(this.voucherRedemptionFee);
  };

  return MerchantFloat;
};
