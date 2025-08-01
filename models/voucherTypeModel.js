// mymoolah/models/voucherTypeModel.js

module.exports = (sequelize, DataTypes) => {
  const VoucherType = sequelize.define('VoucherType', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    typeName: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [3, 50],
      },
    },
    displayName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [3, 100],
      },
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    pricingModel: {
      type: DataTypes.ENUM('fixed_rate', 'percentage_rate', 'bundle_rate', 'tiered_rate'),
      allowNull: false,
      defaultValue: 'fixed_rate',
    },
    baseRate: {
      type: DataTypes.DECIMAL(10, 4),
      allowNull: false,
      defaultValue: 1.0,
      validate: {
        min: 0,
      },
    },
    minAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 5.00,
      validate: {
        min: 0,
      },
    },
    maxAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 4000.00,
      validate: {
        min: 0,
      },
    },
    validationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Validation rules for this voucher type',
    },
    redemptionRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Redemption rules for this voucher type',
    },
    expirationRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Expiration rules for this voucher type',
    },
    merchantRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Merchant restrictions for this voucher type',
    },
    routeRules: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Route restrictions for this voucher type',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional metadata for this voucher type',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    tableName: 'voucher_types',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['typeName'],
      },
      {
        fields: ['isActive'],
      },
      {
        fields: ['pricingModel'],
      },
    ],
    hooks: {
      beforeCreate: (voucherType) => {
        // Set default validation rules if not provided
        if (!voucherType.validationRules) {
          voucherType.validationRules = {
            allowPartialRedemption: true,
            requireMerchantValidation: false,
            allowMultipleRedemptions: true,
          };
        }
        
        // Set default redemption rules if not provided
        if (!voucherType.redemptionRules) {
          voucherType.redemptionRules = {
            minRedemptionAmount: 1.0,
            maxRedemptionAmount: null,
            allowPartial: true,
          };
        }
        
        // Set default expiration rules if not provided
        if (!voucherType.expirationRules) {
          voucherType.expirationRules = {
            expiresInDays: 365,
            allowExtension: false,
          };
        }
        
        // Set default merchant rules if not provided
        if (!voucherType.merchantRules) {
          voucherType.merchantRules = {
            allowedMerchants: [],
            restrictedMerchants: [],
            requireMerchantApproval: false,
          };
        }
        
        // Set default route rules if not provided
        if (!voucherType.routeRules) {
          voucherType.routeRules = {
            allowedRoutes: ['general_purchase'],
            restrictedRoutes: [],
          };
        }
      },
    },
  });

  // Define associations
  VoucherType.associate = (models) => {
    // VoucherType has many Vouchers
    VoucherType.hasMany(models.Voucher, {
      foreignKey: 'voucherType',
      sourceKey: 'typeName',
      as: 'vouchers',
    });
  };

  // Instance methods
  VoucherType.prototype.isActiveType = function() {
    return this.isActive === true;
  };

  VoucherType.prototype.validateAmount = function(amount) {
    const numAmount = parseFloat(amount);
    if (numAmount < this.minAmount) {
      return { valid: false, reason: `Amount must be at least ${this.minAmount}` };
    }
    if (numAmount > this.maxAmount) {
      return { valid: false, reason: `Amount cannot exceed ${this.maxAmount}` };
    }
    return { valid: true };
  };

  VoucherType.prototype.validateRedemption = function(amount, merchantId, routeUsed) {
    const redemptionRules = this.redemptionRules || {};
    const merchantRules = this.merchantRules || {};
    const routeRules = this.routeRules || {};
    
    // Check minimum redemption amount
    if (redemptionRules.minRedemptionAmount && amount < redemptionRules.minRedemptionAmount) {
      return { valid: false, reason: `Minimum redemption amount is ${redemptionRules.minRedemptionAmount}` };
    }
    
    // Check maximum redemption amount
    if (redemptionRules.maxRedemptionAmount && amount > redemptionRules.maxRedemptionAmount) {
      return { valid: false, reason: `Maximum redemption amount is ${redemptionRules.maxRedemptionAmount}` };
    }
    
    // Check merchant restrictions
    if (merchantRules.allowedMerchants && merchantRules.allowedMerchants.length > 0) {
      if (!merchantRules.allowedMerchants.includes(merchantId)) {
        return { valid: false, reason: `Voucher can only be redeemed at: ${merchantRules.allowedMerchants.join(', ')}` };
      }
    }
    
    // Check route restrictions
    if (routeRules.allowedRoutes && routeRules.allowedRoutes.length > 0) {
      if (!routeRules.allowedRoutes.includes(routeUsed)) {
        return { valid: false, reason: `Voucher can only be used for: ${routeRules.allowedRoutes.join(', ')}` };
      }
    }
    
    return { valid: true };
  };

  VoucherType.prototype.getExpirationDate = function() {
    const expirationRules = this.expirationRules || {};
    if (expirationRules.expiresInDays) {
      return new Date(Date.now() + expirationRules.expiresInDays * 24 * 60 * 60 * 1000);
    }
    return null;
  };

  return VoucherType;
}; 