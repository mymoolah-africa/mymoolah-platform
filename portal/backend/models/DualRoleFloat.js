module.exports = (sequelize, DataTypes) => {
  const DualRoleFloat = sequelize.define('DualRoleFloat', {
    id: { 
      type: DataTypes.INTEGER, 
      primaryKey: true, 
      autoIncrement: true 
    },
    
    // Entity identification
    entityId: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique entity identifier' 
    },
    entityName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Human readable entity name' 
    },
    entityType: { 
      type: DataTypes.ENUM('supplier', 'client', 'merchant', 'reseller'), 
      allowNull: false,
      comment: 'Primary entity type' 
    },
    
    // Dual roles configuration
    roles: { 
      type: DataTypes.JSONB, 
      allowNull: false,
      defaultValue: [],
      comment: 'Array of roles this entity can perform' 
    },
    primaryRole: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Primary role (supplier, merchant, etc.)' 
    },
    
    // Supplier Float (when acting as supplier)
    supplierFloatBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Balance when acting as supplier' 
    },
    supplierCommissionEarned: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Total commission earned as supplier' 
    },
    supplierSettlementMethod: { 
      type: DataTypes.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
      allowNull: true,
      comment: 'Settlement method for supplier role' 
    },
    supplierLastSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Last settlement timestamp for supplier role' 
    },
    
    // Merchant Float (when acting as merchant)
    merchantFloatBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Balance when acting as merchant' 
    },
    merchantFeesEarned: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Total fees earned as merchant' 
    },
    merchantSettlementMethod: { 
      type: DataTypes.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
      allowNull: true,
      comment: 'Settlement method for merchant role' 
    },
    merchantLastSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Last settlement timestamp for merchant role' 
    },
    
    // Net Position Management
    netBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 0.00,
      comment: 'Net balance (supplier - merchant)' 
    },
    netSettlementThreshold: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: false, 
      defaultValue: 1000.00,
      comment: 'Minimum amount for net settlement' 
    },
    autoSettlementEnabled: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: false,
      comment: 'Whether automatic net settlement is enabled' 
    },
    
    // Settlement Configuration
    settlementFrequency: { 
      type: DataTypes.ENUM('real_time', 'daily', 'weekly', 'monthly'), 
      allowNull: false, 
      defaultValue: 'daily',
      comment: 'Frequency of net settlement processing' 
    },
    nextSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Next scheduled settlement timestamp' 
    },
    lastNetSettlementAt: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Last net settlement timestamp' 
    },
    
    // Account Status
    status: { 
      type: DataTypes.ENUM('active', 'suspended', 'closed'), 
      allowNull: false, 
      defaultValue: 'active',
      comment: 'Current status of the dual-role float account' 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether the dual-role float account is active' 
    },
    
    // Limits and Controls
    maxSupplierBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum balance allowed for supplier role' 
    },
    maxMerchantBalance: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum balance allowed for merchant role' 
    },
    dailyTransactionLimit: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Daily transaction limit across all roles' 
    },
    
    // Integration Details
    integrationType: { 
      type: DataTypes.ENUM('api', 'webhook', 'batch'), 
      allowNull: false, 
      defaultValue: 'api',
      comment: 'Integration method with the entity' 
    },
    apiEndpoint: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Entity API endpoint for callbacks' 
    },
    webhookUrl: { 
      type: DataTypes.STRING, 
      allowNull: true,
      comment: 'Entity webhook URL for notifications' 
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
      comment: 'Additional entity-specific configuration' 
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
    }
  }, {
    tableName: 'dual_role_floats',
    timestamps: true,
    indexes: [
      { fields: ['entityId'] },
      { fields: ['entityType'] },
      { fields: ['primaryRole'] },
      { fields: ['status'] },
      { fields: ['isActive'] },
      { fields: ['nextSettlementAt'] },
      { fields: ['createdAt'] }
    ],
    hooks: {
      beforeUpdate: (dualRoleFloat) => {
        dualRoleFloat.updatedAt = new Date();
        // Recalculate net balance
        dualRoleFloat.netBalance = parseFloat(dualRoleFloat.supplierFloatBalance) - parseFloat(dualRoleFloat.merchantFloatBalance);
      }
    }
  });

  // Instance methods
  DualRoleFloat.prototype.updateSupplierBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.supplierFloatBalance = parseFloat(this.supplierFloatBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.supplierFloatBalance = parseFloat(this.supplierFloatBalance) - parseFloat(amount);
    }
    
    // Recalculate net balance
    this.netBalance = parseFloat(this.supplierFloatBalance) - parseFloat(this.merchantFloatBalance);
    
    return this.save();
  };

  DualRoleFloat.prototype.updateMerchantBalance = function(amount, transactionType) {
    if (transactionType === 'credit') {
      this.merchantFloatBalance = parseFloat(this.merchantFloatBalance) + parseFloat(amount);
    } else if (transactionType === 'debit') {
      this.merchantFloatBalance = parseFloat(this.merchantFloatBalance) - parseFloat(amount);
    }
    
    // Recalculate net balance
    this.netBalance = parseFloat(this.supplierFloatBalance) - parseFloat(this.merchantFloatBalance);
    
    return this.save();
  };

  DualRoleFloat.prototype.hasSufficientSupplierBalance = function(amount) {
    return parseFloat(this.supplierFloatBalance) >= parseFloat(amount);
  };

  DualRoleFloat.prototype.hasSufficientMerchantBalance = function(amount) {
    return parseFloat(this.merchantFloatBalance) >= parseFloat(amount);
  };

  DualRoleFloat.prototype.requiresSettlement = function() {
    return Math.abs(parseFloat(this.netBalance)) >= parseFloat(this.netSettlementThreshold);
  };

  DualRoleFloat.prototype.getSettlementAmount = function() {
    return parseFloat(this.netBalance);
  };

  DualRoleFloat.prototype.getSettlementDirection = function() {
    const netBalance = parseFloat(this.netBalance);
    if (netBalance > 0) {
      return 'payout'; // MM owes entity
    } else if (netBalance < 0) {
      return 'collection'; // Entity owes MM
    } else {
      return 'balanced'; // No settlement needed
    }
  };

  DualRoleFloat.prototype.getUtilizationPercentage = function(role) {
    if (role === 'supplier') {
      if (parseFloat(this.maxSupplierBalance) === 0) return 0;
      return (parseFloat(this.supplierFloatBalance) / parseFloat(this.maxSupplierBalance)) * 100;
    } else if (role === 'merchant') {
      if (parseFloat(this.maxMerchantBalance) === 0) return 0;
      return (parseFloat(this.merchantFloatBalance) / parseFloat(this.maxMerchantBalance)) * 100;
    }
    return 0;
  };

  DualRoleFloat.prototype.checkTransactionLimits = function(amount, role) {
    const checks = {
      maxBalance: true,
      dailyLimit: true
    };

    if (role === 'supplier') {
      if (this.maxSupplierBalance && parseFloat(amount) > parseFloat(this.maxSupplierBalance)) {
        checks.maxBalance = false;
      }
    } else if (role === 'merchant') {
      if (this.maxMerchantBalance && parseFloat(amount) > parseFloat(this.maxMerchantBalance)) {
        checks.maxBalance = false;
      }
    }

    // Note: Daily limits would need additional logic with transaction history
    return checks;
  };

  // Class methods
  DualRoleFloat.findByEntity = function(entityId) {
    return this.findOne({
      where: {
        entityId: entityId,
        isActive: true
      }
    });
  };

  DualRoleFloat.findRequiringSettlement = function() {
    return this.findAll({
      where: {
        isActive: true,
        autoSettlementEnabled: true
      },
      order: [['nextSettlementAt', 'ASC']]
    });
  };

  DualRoleFloat.getDualRoleEntities = function() {
    return this.findAll({
      where: {
        isActive: true
      },
      order: [['entityName', 'ASC']]
    });
  };

  DualRoleFloat.getSettlementSummary = function() {
    return this.findAll({
      where: {
        isActive: true
      },
      attributes: [
        'entityId',
        'entityName',
        'netBalance',
        'supplierFloatBalance',
        'merchantFloatBalance',
        'nextSettlementAt'
      ],
      order: [['netBalance', 'DESC']]
    });
  };

  return DualRoleFloat;
};
