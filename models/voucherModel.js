// mymoolah/models/voucherModel.js

module.exports = (sequelize, DataTypes) => {
  const Voucher = sequelize.define('Voucher', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
    },
    voucherCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 50],
      },
    },
    originalAmount: {
      type: DataTypes.DECIMAL(15, 2), // Banking-grade precision
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'redeemed', 'expired', 'cancelled', 'suspended'),
      allowNull: false,
      defaultValue: 'active',
    },
    voucherType: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'standard',
      validate: {
        notEmpty: true,
      },
    },
    issuedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    issuedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    brandLocked: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    lockedToId: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    redemptionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    maxRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 1,
      },
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Voucher configuration and settings',
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional voucher metadata',
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
    tableName: 'vouchers',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['voucherCode'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['voucherType'],
      },
      {
        fields: ['issuedTo'],
      },
      {
        fields: ['expiresAt'],
      },
    ],
    hooks: {
      beforeCreate: (voucher) => {
        // Generate voucher code if not provided
        if (!voucher.voucherCode) {
          voucher.voucherCode = generateVoucherCode();
        }
        
        // Set initial balance to original amount
        if (!voucher.balance) {
          voucher.balance = voucher.originalAmount;
        }
        
        // Set expiration (30 days from creation if not specified)
        if (!voucher.expiresAt) {
          voucher.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        }
      },
      beforeUpdate: (voucher) => {
        // Ensure balance doesn't go negative
        if (voucher.changed('balance') && voucher.balance < 0) {
          voucher.balance = 0;
        }
        
        // Mark as expired if past expiration date
        if (voucher.expiresAt && new Date() > voucher.expiresAt && voucher.status === 'active') {
          voucher.status = 'expired';
        }
      },
    },
  });

  // Helper function
  function generateVoucherCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `VOUCHER${timestamp}${random}`;
  }

  // Define associations
  Voucher.associate = (models) => {
    // Voucher belongs to one User
    Voucher.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Voucher belongs to one VoucherType
    Voucher.belongsTo(models.VoucherType, {
      foreignKey: 'voucherType',
      targetKey: 'typeName',
      as: 'voucherTypeAssoc',
    });
  };

  // Instance methods
  Voucher.prototype.isActive = function() {
    return this.status === 'active';
  };

  Voucher.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Voucher.prototype.isRedeemed = function() {
    return this.status === 'redeemed';
  };

  Voucher.prototype.canRedeem = function(amount) {
    if (this.status !== 'active') {
      return { allowed: false, reason: 'Voucher is not active' };
    }
    
    if (this.isExpired()) {
      return { allowed: false, reason: 'Voucher has expired' };
    }
    
    if (this.balance < amount) {
      return { allowed: false, reason: 'Insufficient voucher balance' };
    }
    
    if (this.redemptionCount >= this.maxRedemptions) {
      return { allowed: false, reason: 'Maximum redemptions reached' };
    }
    
    return { allowed: true };
  };

  Voucher.prototype.redeem = async function(amount, redeemerId, merchantId, serviceProviderId, routeUsed = 'general_purchase') {
    const canRedeem = this.canRedeem(amount);
    if (!canRedeem.allowed) {
      throw new Error(canRedeem.reason);
    }
    
    this.balance -= amount;
    this.redemptionCount += 1;
    
    // Mark as redeemed if balance reaches zero or max redemptions reached
    if (this.balance <= 0 || this.redemptionCount >= this.maxRedemptions) {
      this.status = 'redeemed';
    }
    
    await this.save();
    return this;
  };

  Voucher.prototype.getFormattedAmount = function() {
    return `R${(this.originalAmount / 100).toFixed(2)}`;
  };

  Voucher.prototype.getFormattedBalance = function() {
    return `R${(this.balance / 100).toFixed(2)}`;
  };

  Voucher.prototype.getTimeToExpiry = function() {
    if (!this.expiresAt) return null;
    return this.expiresAt.getTime() - Date.now();
  };

  return Voucher;
};