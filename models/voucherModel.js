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
      unique: true
    },
    easyPayCode: {
      type: DataTypes.STRING(255),
      allowNull: true,
      unique: true
    },
    originalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
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
      type: DataTypes.ENUM('standard', 'premium', 'business', 'corporate', 'student', 'senior', 'easypay_pending', 'easypay_active', 'easypay_topup', 'easypay_topup_active', 'easypay_cashout', 'easypay_cashout_active'),
      allowNull: false,
      defaultValue: 'standard'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true
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
    return this.voucherType === 'easypay_pending' ||
           this.voucherType === 'easypay_active' ||
           this.voucherType === 'easypay_topup' ||
           this.voucherType === 'easypay_topup_active' ||
           this.voucherType === 'easypay_cashout' ||
           this.voucherType === 'easypay_cashout_active';
  };

  Voucher.prototype.isPendingEasyPay = function() {
    return this.voucherType === 'easypay_pending' && this.status === 'pending_payment';
  };

  Voucher.prototype.isActiveEasyPay = function() {
    return this.voucherType === 'easypay_active' && this.status === 'active';
  };

  Voucher.prototype.isTopupEasyPay = function() {
    return this.voucherType === 'easypay_topup' || this.voucherType === 'easypay_topup_active';
  };

  Voucher.prototype.isPendingTopupEasyPay = function() {
    return this.voucherType === 'easypay_topup' && this.status === 'pending_payment';
  };

  Voucher.prototype.isActiveTopupEasyPay = function() {
    return this.voucherType === 'easypay_topup_active' && this.status === 'active';
  };

  Voucher.prototype.isRedeemedEasyPay = function() {
    return this.voucherType === 'easypay_active' && this.status === 'redeemed';
  };

  Voucher.prototype.isCashoutEasyPay = function() {
    return this.voucherType === 'easypay_cashout' || this.voucherType === 'easypay_cashout_active';
  };

  Voucher.prototype.isPendingCashoutEasyPay = function() {
    return this.voucherType === 'easypay_cashout' && this.status === 'pending_payment';
  };

  Voucher.prototype.isActiveCashoutEasyPay = function() {
    return this.voucherType === 'easypay_cashout_active' && this.status === 'active';
  };

  return Voucher;
};