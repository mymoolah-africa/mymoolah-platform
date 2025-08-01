// mymoolah/models/Payment.js

module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
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
    walletId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'wallets',
        key: 'walletId',
      },
    },
    merchantId: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    terminalId: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [1, 50],
      },
    },
    paymentDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    reference: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 100],
      },
    },
    easyPayNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [10, 50],
      },
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        len: [5, 50],
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2), // Banking-grade precision
      allowNull: false,
      validate: {
        min: 0,
      },
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'ZAR',
      validate: {
        isIn: [['ZAR', 'USD', 'EUR']],
      },
    },
    paymentType: {
      type: DataTypes.ENUM('bill_payment', 'transfer', 'deposit', 'withdrawal', 'voucher', 'flash_payment'),
      allowNull: false,
      defaultValue: 'bill_payment',
    },
    paymentMethod: {
      type: DataTypes.ENUM('wallet', 'card', 'bank_transfer', 'cash', 'voucher'),
      allowNull: false,
      defaultValue: 'wallet',
    },
    echoData: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional payment data from external systems',
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'bills',
        key: 'id',
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'),
      allowNull: false,
      defaultValue: 'pending',
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processingTime: {
      type: DataTypes.INTEGER, // milliseconds
      allowNull: true,
    },
    transactionFee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      validate: {
        min: 0,
      },
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
    tableName: 'payments',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['reference'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['walletId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['paymentType'],
      },
      {
        fields: ['paymentDate'],
      },
      {
        fields: ['easyPayNumber'],
      },
      {
        fields: ['billId'],
      },
    ],
    hooks: {
      beforeCreate: (payment) => {
        // Generate reference if not provided
        if (!payment.reference) {
          payment.reference = `PAY-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        }
      },
      beforeUpdate: (payment) => {
        // Calculate processing time if status changes to completed
        if (payment.changed('status') && payment.status === 'completed' && !payment.processingTime) {
          payment.processingTime = Date.now() - payment.createdAt.getTime();
        }
      },
    },
  });

  // Define associations
  Payment.associate = (models) => {
    // Payment belongs to one User
    Payment.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Payment belongs to one Wallet
    Payment.belongsTo(models.Wallet, {
      foreignKey: 'walletId',
      as: 'wallet',
    });

    // Payment belongs to one Bill
    Payment.belongsTo(models.Bill, {
      foreignKey: 'billId',
      as: 'bill',
    });

    // Payment has one Transaction
    Payment.hasOne(models.Transaction, {
      foreignKey: 'paymentId',
      as: 'transaction',
    });
  };

  // Instance methods
  Payment.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  Payment.prototype.isFailed = function() {
    return this.status === 'failed';
  };

  Payment.prototype.isPending = function() {
    return this.status === 'pending';
  };

  Payment.prototype.complete = async function() {
    this.status = 'completed';
    this.processingTime = Date.now() - this.createdAt.getTime();
    await this.save();
    return this;
  };

  Payment.prototype.fail = async function(reason = '') {
    this.status = 'failed';
    this.failureReason = reason;
    await this.save();
    return this;
  };

  Payment.prototype.getFormattedAmount = function() {
    return `R${(this.amount / 100).toFixed(2)}`;
  };

  Payment.prototype.getTotalAmount = function() {
    return parseFloat(this.amount) + parseFloat(this.transactionFee || 0);
  };

  return Payment;
};