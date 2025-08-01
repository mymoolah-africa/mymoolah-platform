// mymoolah/models/easypayVoucherModel.js

module.exports = (sequelize, DataTypes) => {
  const EasyPayVoucher = sequelize.define('EasyPayVoucher', {
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
    easypayCode: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [14, 14], // EasyPay numbers are 14 digits
      },
    },
    mmVoucherCode: {
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
    status: {
      type: DataTypes.ENUM('pending', 'issued', 'settled', 'expired', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending',
    },
    issuedTo: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    issuedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    settlementAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    settlementMerchant: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    settlementTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    callbackReceived: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    smsSent: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    smsTimestamp: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    callbackData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Raw callback data from EasyPay',
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
    tableName: 'easypay_vouchers',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['easypayCode'],
      },
      {
        unique: true,
        fields: ['mmVoucherCode'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
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
        // Generate EasyPay code if not provided
        if (!voucher.easypayCode) {
          voucher.easypayCode = generateEasyPayNumber();
        }
        
        // Generate MM voucher code if not provided
        if (!voucher.mmVoucherCode) {
          voucher.mmVoucherCode = generateMMVoucherCode();
        }
        
        // Set expiration (48 hours from creation)
        if (!voucher.expiresAt) {
          voucher.expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
        }
      },
      beforeUpdate: (voucher) => {
        // Update settlement timestamp when status changes to settled
        if (voucher.changed('status') && voucher.status === 'settled' && !voucher.settlementTimestamp) {
          voucher.settlementTimestamp = new Date();
        }
      },
    },
  });

  // Helper functions
  function generateLuhnCheckDigit(digits) {
    let sum = 0;
    let isEven = false;
    
    // Process from right to left
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return (10 - (sum % 10)) % 10;
  }

  function generateEasyPayNumber() {
    const EASYPAY_PREFIX = '9';
    const RECEIVER_ID = '1234'; // MyMoolah's EasyPay receiver ID
    
    // Generate random account number (8 digits)
    const accountNumber = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
    
    // Combine receiver ID and account number
    const baseDigits = RECEIVER_ID + accountNumber;
    
    // Calculate check digit
    const checkDigit = generateLuhnCheckDigit(baseDigits);
    
    // Return complete EasyPay number
    return EASYPAY_PREFIX + baseDigits + checkDigit;
  }

  function generateMMVoucherCode() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `MMVOUCHER${timestamp}${random}`;
  }

  // Define associations
  EasyPayVoucher.associate = (models) => {
    // EasyPayVoucher belongs to one User
    EasyPayVoucher.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  // Instance methods
  EasyPayVoucher.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  EasyPayVoucher.prototype.isSettled = function() {
    return this.status === 'settled';
  };

  EasyPayVoucher.prototype.isPending = function() {
    return this.status === 'pending';
  };

  EasyPayVoucher.prototype.settle = async function(settlementData) {
    this.status = 'settled';
    this.settlementAmount = settlementData.amount;
    this.settlementMerchant = settlementData.merchant;
    this.settlementTimestamp = new Date();
    this.callbackReceived = true;
    this.callbackData = settlementData;
    
    await this.save();
    return this;
  };

  EasyPayVoucher.prototype.markSMSSent = async function() {
    this.smsSent = true;
    this.smsTimestamp = new Date();
    await this.save();
    return this;
  };

  EasyPayVoucher.prototype.getFormattedAmount = function() {
    const amount = this.settlementAmount || this.originalAmount;
    return `R${(amount / 100).toFixed(2)}`;
  };

  EasyPayVoucher.prototype.getTimeToExpiry = function() {
    if (!this.expiresAt) return null;
    return this.expiresAt.getTime() - Date.now();
  };

  return EasyPayVoucher;
}; 