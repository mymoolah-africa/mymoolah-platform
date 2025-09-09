module.exports = (sequelize, DataTypes) => {
  const SupplierFloat = sequelize.define('SupplierFloat', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Supplier identification
    supplierId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      comment: 'Supplier identifier (easypay, flash, mobilemart, peach, dtmercury)' 
    },
    supplierName: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      comment: 'Human readable supplier name' 
    },
    
    // Float account details
    floatAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique float account number for this supplier' 
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
      comment: 'Settlement frequency with the supplier' 
    },
    settlementMethod: { 
      type: DataTypes.ENUM('prefunded', 'postpaid', 'hybrid'), 
      allowNull: false, 
      defaultValue: 'prefunded',
      comment: 'Settlement method with the supplier' 
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
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional supplier-specific configuration' 
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
    tableName: 'supplier_floats',
    timestamps: true,
    indexes: [
      { fields: ['supplierId'] },
      { fields: ['floatAccountNumber'] },
      { fields: ['status'] },
      { fields: ['isActive'] },
      { fields: ['settlementPeriod'] }
    ]
  });

  // Instance methods
  SupplierFloat.prototype.updateBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.currentBalance = parseFloat(this.currentBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.currentBalance = parseFloat(this.currentBalance) - parseFloat(amount);
    }
    return this.save();
  };

  SupplierFloat.prototype.hasSufficientBalance = function(amount) {
    return parseFloat(this.currentBalance) >= parseFloat(amount);
  };

  SupplierFloat.prototype.getUtilizationPercentage = function() {
    if (parseFloat(this.maximumBalance) === 0) return 0;
    return (parseFloat(this.currentBalance) / parseFloat(this.maximumBalance)) * 100;
  };

  return SupplierFloat;
};
