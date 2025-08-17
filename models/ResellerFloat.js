module.exports = (sequelize, DataTypes) => {
  const ResellerFloat = sequelize.define('ResellerFloat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Reseller identification
    resellerId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique reseller identifier' 
    },
    resellerName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Reseller business name' 
    },
    resellerType: { 
      type: DataTypes.ENUM('individual', 'business', 'agent', 'distributor'), 
      allowNull: false,
      comment: 'Type of reseller' 
    },
    
    // Float account details
    floatAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique float account number for this reseller' 
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
      comment: 'Settlement frequency with the reseller' 
    },
    settlementMethod: { 
      type: DataTypes.ENUM('prefunded', 'postpaid', 'hybrid'), 
      allowNull: false, 
      defaultValue: 'prefunded',
      comment: 'Settlement method with the reseller' 
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
    
    // Commission structure
    commissionRate: { 
      type: DataTypes.DECIMAL(5, 4), 
      allowNull: false, 
      defaultValue: 0.050,
      comment: 'Default commission rate (5% default)' 
    },
    tierLevel: { 
      type: DataTypes.ENUM('bronze', 'silver', 'gold', 'platinum'), 
      allowNull: false, 
      defaultValue: 'bronze',
      comment: 'Reseller tier level' 
    },
    
    // Business rules
    maxTransactionAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum transaction amount allowed' 
    },
    dailyTransactionLimit: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Daily transaction limit' 
    },
    monthlyTransactionLimit: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Monthly transaction limit' 
    },
    
    // Contact information
    contactPerson: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Primary contact person' 
    },
    contactEmail: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Primary contact email' 
    },
    contactPhone: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Primary contact phone' 
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
    
    // Location details
    region: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Geographic region/area' 
    },
    territory: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Sales territory' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional reseller-specific configuration' 
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
    tableName: 'reseller_floats',
    timestamps: true,
    indexes: [
      { fields: ['resellerId'] },
      { fields: ['floatAccountNumber'] },
      { fields: ['resellerType'] },
      { fields: ['tierLevel'] },
      { fields: ['status'] },
      { fields: ['isActive'] },
      { fields: ['settlementPeriod'] },
      { fields: ['region'] }
    ]
  });

  // Instance methods
  ResellerFloat.prototype.updateBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.currentBalance = parseFloat(this.currentBalance) - parseFloat(amount);
    }
    return this.save();
  };

  ResellerFloat.prototype.hasSufficientBalance = function(amount) {
    return parseFloat(this.currentBalance) >= parseFloat(amount);
  };

  ResellerFloat.prototype.getUtilizationPercentage = function() {
    if (parseFloat(this.maximumBalance) === 0) return 0;
    return (parseFloat(this.currentBalance) / parseFloat(this.maximumBalance)) * 100;
  };

  ResellerFloat.prototype.calculateCommission = function(amount) {
    return parseFloat(amount) * parseFloat(this.commissionRate);
  };

  ResellerFloat.prototype.checkTransactionLimits = function(amount) {
    const checks = {
      maxTransaction: true,
      dailyLimit: true,
      monthlyLimit: true
    };

    if (this.maxTransactionAmount && parseFloat(amount) > parseFloat(this.maxTransactionAmount)) {
      checks.maxTransaction = false;
    }

    // Note: Daily and monthly limits would need additional logic with transaction history
    return checks;
  };

  return ResellerFloat;
};
