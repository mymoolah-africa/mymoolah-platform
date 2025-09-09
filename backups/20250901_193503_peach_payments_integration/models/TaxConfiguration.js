module.exports = (sequelize, DataTypes) => {
  const TaxConfiguration = sequelize.define('TaxConfiguration', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // Tax identification
    taxCode: { 
      type: DataTypes.STRING, 
      allowNull: false, 
      unique: true,
      comment: 'Unique tax code identifier' 
    },
    taxName: { 
      type: DataTypes.STRING, 
      allowNull: false,
      comment: 'Tax name (e.g., VAT, Income Tax)' 
    },
    taxType: { 
      type: DataTypes.ENUM('vat', 'income_tax', 'withholding_tax', 'customs_duty', 'other'), 
      allowNull: false,
      comment: 'Type of tax' 
    },
    
    // Tax rates
    taxRate: { 
      type: DataTypes.DECIMAL(5, 4), 
      allowNull: false,
      comment: 'Tax rate as decimal (e.g., 0.15 for 15%)' 
    },
    effectiveFrom: { 
      type: DataTypes.DATE, 
      allowNull: false,
      comment: 'Date from which this tax rate is effective' 
    },
    effectiveTo: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Date until which this tax rate is effective (null for current)' 
    },
    
    // Tax calculation
    calculationMethod: { 
      type: DataTypes.ENUM('inclusive', 'exclusive', 'compound'), 
      allowNull: false, 
      defaultValue: 'exclusive',
      comment: 'How tax is calculated' 
    },
    isActive: { 
      type: DataTypes.BOOLEAN, 
      allowNull: false, 
      defaultValue: true,
      comment: 'Whether this tax configuration is active' 
    },
    
    // Applicability
    appliesTo: { 
      type: DataTypes.ENUM('all', 'products', 'services', 'fees', 'commissions', 'specific'), 
      allowNull: false, 
      defaultValue: 'all',
      comment: 'What this tax applies to' 
    },
    applicableProducts: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Specific products this tax applies to' 
    },
    applicableServices: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Specific services this tax applies to' 
    },
    
    // Thresholds and exemptions
    minimumAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Minimum amount for tax to apply' 
    },
    maximumAmount: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Maximum amount for tax to apply' 
    },
    exemptionThreshold: { 
      type: DataTypes.DECIMAL(15, 2), 
      allowNull: true,
      comment: 'Amount below which tax is exempt' 
    },
    
    // Reporting
    taxPeriod: { 
      type: DataTypes.ENUM('monthly', 'quarterly', 'annually'), 
      allowNull: false, 
      defaultValue: 'monthly',
      comment: 'Tax reporting period' 
    },
    nextReportingDate: { 
      type: DataTypes.DATE, 
      allowNull: true,
      comment: 'Next tax reporting date' 
    },
    
    // Metadata
    description: { 
      type: DataTypes.TEXT, 
      allowNull: true,
      comment: 'Description of the tax' 
    },
    metadata: { 
      type: DataTypes.JSONB, 
      allowNull: true,
      comment: 'Additional tax configuration metadata' 
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
    tableName: 'tax_configurations',
    timestamps: true,
    indexes: [
      { fields: ['taxCode'] },
      { fields: ['taxType'] },
      { fields: ['isActive'] },
      { fields: ['effectiveFrom'] },
      { fields: ['effectiveTo'] },
      { fields: ['appliesTo'] }
    ]
  });

  // Instance methods
  TaxConfiguration.prototype.calculateTax = function(amount) {
    if (this.minimumAmount && parseFloat(amount) < parseFloat(this.minimumAmount)) {
      return 0;
    }
    
    if (this.maximumAmount && parseFloat(amount) > parseFloat(this.maximumAmount)) {
      amount = this.maximumAmount;
    }
    
    if (this.exemptionThreshold && parseFloat(amount) <= parseFloat(this.exemptionThreshold)) {
      return 0;
    }
    
    return parseFloat(amount) * parseFloat(this.taxRate);
  };

  TaxConfiguration.prototype.isCurrentlyActive = function() {
    const now = new Date();
    return this.isActive && 
           now >= this.effectiveFrom && 
           (!this.effectiveTo || now <= this.effectiveTo);
  };

  TaxConfiguration.prototype.appliesToTransaction = function(transactionType, productCategory) {
    if (this.appliesTo === 'all') return true;
    
    if (this.appliesTo === 'products' && ['vas_purchase', 'voucher_sale'].includes(transactionType)) {
      return true;
    }
    
    if (this.appliesTo === 'services' && ['commission', 'fee'].includes(transactionType)) {
      return true;
    }
    
    if (this.appliesTo === 'specific') {
      if (this.applicableProducts && this.applicableProducts.includes(productCategory)) {
        return true;
      }
      if (this.applicableServices && this.applicableServices.includes(transactionType)) {
        return true;
      }
    }
    
    return false;
  };

  return TaxConfiguration;
};
