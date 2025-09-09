module.exports = (sequelize, DataTypes) => {
  const Settlement = sequelize.define('Settlement', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Settlement identification
    settlementId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique settlement identifier' 
    },
    supplierId: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Supplier identifier for this settlement' 
    },
    floatAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Float account number for this settlement' 
    },
    
    // Settlement details
    settlementType: { 
      type: DataTypes.ENUM('topup', 'withdrawal', 'adjustment', 'fee', 'commission'), 
      allowNull: false,
      comment: 'Type of settlement transaction' 
    },
    settlementDirection: { 
      type: DataTypes.ENUM('inbound', 'outbound'), 
      allowNull: false,
      comment: 'Direction of settlement (inbound = money coming in, outbound = money going out)' 
    },
    
    // Financial details
    amount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Settlement amount' 
    },
    currency: { 
      type: DataTypes.STRING(3), 
      allowNull: false, 
      defaultValue: 'ZAR',
      comment: 'Settlement currency' 
    },
    fee: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Settlement fee' 
    },
    netAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Net amount after fees' 
    },
    
    // Balance tracking
    balanceBefore: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Float account balance before settlement' 
    },
    balanceAfter: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false,
      comment: 'Float account balance after settlement' 
    },
    
    // Settlement status
    status: { 
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled'), 
      allowNull: false, 
      defaultValue: 'pending',
      comment: 'Settlement status' 
    },
    
    // Reference information
    supplierReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Supplier reference number for this settlement' 
    },
    bankReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank reference number for this settlement' 
    },
    transactionReference: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Internal transaction reference' 
    },
    
    // Settlement method
    settlementMethod: { 
      type: DataTypes.ENUM('eft', 'rtgs', 'payShap', 'card', 'cash'), 
      allowNull: false,
      comment: 'Method used for settlement' 
    },
    
    // Bank account details
    bankAccountNumber: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank account number for settlement' 
    },
    bankCode: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank code for settlement' 
    },
    bankName: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Bank name for settlement' 
    },
    
    // Processing details
    processedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When settlement was processed' 
    },
    completedAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'When settlement was completed' 
    },
    
    // Error handling
    errorCode: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Error code if settlement failed' 
    },
    errorMessage: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Error message if settlement failed' 
    },
    
    // Metadata
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional settlement metadata' 
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
    tableName: 'settlements',
    timestamps: true,
    indexes: [
      { fields: ['settlementId'] },
      { fields: ['supplierId'] },
      { fields: ['floatAccountNumber'] },
      { fields: ['status'] },
      { fields: ['settlementType'] },
      { fields: ['settlementDirection'] },
      { fields: ['processedAt'] },
      { fields: ['createdAt'] }
    ]
  });

  // Instance methods
  Settlement.prototype.calculateNetAmount = function() {
    this.netAmount = parseFloat(this.amount) - parseFloat(this.fee || 0);
    return this.netAmount;
  };

  Settlement.prototype.updateBalance = function(balanceAfter) {
    this.balanceAfter = balanceAfter;
    return this.save();
  };

  Settlement.prototype.markAsCompleted = function() {
    this.status = 'completed';
    this.completedAt = new Date();
    return this.save();
  };

  Settlement.prototype.markAsFailed = function(errorCode, errorMessage) {
    this.status = 'failed';
    this.errorCode = errorCode;
    this.errorMessage = errorMessage;
    return this.save();
  };

  return Settlement;
};
