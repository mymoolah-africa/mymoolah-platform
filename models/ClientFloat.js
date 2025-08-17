module.exports = (sequelize, DataTypes) => {
  const ClientFloat = sequelize.define('ClientFloat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Client identification
    clientId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique client identifier' 
    },
    clientName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Client company name' 
    },
    clientType: { 
      type: DataTypes.ENUM('sports_betting', 'employer', 'gaming', 'retail', 'other'), 
      allowNull: false,
      comment: 'Type of B2B client' 
    },
    
    // Float account details
    floatAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique float account number for this client' 
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
      comment: 'Settlement frequency with the client' 
    },
    settlementMethod: { 
      type: DataTypes.ENUM('prefunded', 'postpaid', 'hybrid'), 
      allowNull: false, 
      defaultValue: 'prefunded',
      comment: 'Settlement method with the client' 
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
    
    // Integration details
    integrationType: { 
      type: DataTypes.ENUM('api', 'webhook', 'batch'), 
      allowNull: false, 
      defaultValue: 'api',
      comment: 'Integration method with the client' 
    },
    apiEndpoint: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client API endpoint for callbacks' 
    },
    webhookUrl: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Client webhook URL for notifications' 
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
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional client-specific configuration' 
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
    tableName: 'client_floats',
    timestamps: true,
    indexes: [
      { fields: ['clientId'] },
      { fields: ['floatAccountNumber'] },
      { fields: ['clientType'] },
      { fields: ['status'] },
      { fields: ['isActive'] },
      { fields: ['settlementPeriod'] }
    ]
  });

  // Instance methods
  ClientFloat.prototype.updateBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.currentBalance = parseFloat(this.currentBalance) - parseFloat(amount);
    }
    return this.save();
  };

  ClientFloat.prototype.hasSufficientBalance = function(amount) {
    return parseFloat(this.currentBalance) >= parseFloat(amount);
  };

  ClientFloat.prototype.getUtilizationPercentage = function() {
    if (parseFloat(this.maximumBalance) === 0) return 0;
    return (parseFloat(this.currentBalance) / parseFloat(this.maximumBalance)) * 100;
  };

  ClientFloat.prototype.checkTransactionLimits = function(amount) {
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

  return ClientFloat;
};
