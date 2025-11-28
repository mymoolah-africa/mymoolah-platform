// mymoolah/models/voucherModel.js

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Voucher = sequelize.define('Voucher', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    voucherCode: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: 'voucherId' // Map to staging column name
    },
    easyPayCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    originalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'amount' // Map to staging column name
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    status: {
      type: DataTypes.ENUM('pending', 'active', 'redeemed', 'expired', 'cancelled', 'pending_payment'),
      allowNull: false,
      defaultValue: 'pending'
    },
    voucherType: {
      type: DataTypes.ENUM('standard', 'premium', 'business', 'corporate', 'student', 'senior', 'easypay_pending', 'easypay_active'),
      allowNull: false,
      defaultValue: 'standard',
      field: 'type' // Map to staging column name
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expiryDate' // Map to staging column name
    },
    redemptionCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    maxRedemptions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true
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
    }
  }, {
    tableName: 'vouchers',
    timestamps: true,
    indexes: [
      {
        fields: ['userId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['voucherType']
      },
      {
        fields: ['easyPayCode']
      },
      {
        fields: ['expiresAt']
      }
    ]
  });

  // Instance methods
  Voucher.prototype.isExpired = function() {
    return this.expiresAt && new Date() > this.expiresAt;
  };

  Voucher.prototype.canRedeem = function() {
    return this.status === 'active' && !this.isExpired() && this.balance > 0;
  };

  Voucher.prototype.isEasyPayVoucher = function() {
    return this.voucherType === 'easypay_pending' || this.voucherType === 'easypay_active';
  };

  Voucher.prototype.isPendingEasyPay = function() {
    return this.voucherType === 'easypay_pending' && this.status === 'pending';
  };

  Voucher.prototype.isActiveEasyPay = function() {
    return this.voucherType === 'easypay_active' && this.status === 'active';
  };

  Voucher.prototype.isRedeemedEasyPay = function() {
    return this.voucherType === 'easypay_active' && this.status === 'redeemed';
  };

  return Voucher;
};