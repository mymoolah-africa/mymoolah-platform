// mymoolah/models/Transaction.js

module.exports = (sequelize, DataTypes) => {
  const Transaction = sequelize.define('Transaction', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    transactionId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 50],
      },
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
    senderWalletId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'wallets',
        key: 'walletId',
      },
    },
    receiverWalletId: {
      type: DataTypes.STRING,
      allowNull: true,
      references: {
        model: 'wallets',
        key: 'walletId',
      },
    },
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'payments',
        key: 'id',
      },
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2), // Banking-grade precision
      allowNull: false,
      // Amount validation is handled in beforeValidate hook to allow negative amounts for fee transactions
    },
    type: {
      type: DataTypes.ENUM('send', 'receive', 'deposit', 'withdraw', 'transfer', 'payment', 'refund', 'fee', 'nfc_deposit'),
      allowNull: false,
      validate: {
        notEmpty: true,
      },
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'cancelled', 'reversed'),
      allowNull: false,
      defaultValue: 'pending',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    fee: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
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
    exchangeRate: {
      type: DataTypes.DECIMAL(10, 6),
      allowNull: true,
      validate: {
        min: 0,
      },
    },
    failureReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processingTime: {
      type: DataTypes.INTEGER, // milliseconds
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Additional transaction metadata',
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
    tableName: 'transactions',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['transactionId'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['walletId'],
      },
      {
        fields: ['senderWalletId'],
      },
      {
        fields: ['receiverWalletId'],
      },
      {
        fields: ['paymentId'],
      },
      {
        fields: ['type'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['createdAt'],
      },
    ],
    hooks: {
      beforeValidate: (transaction) => {
        // Allow negative amounts for fee, payment, and sent transactions (debits / outflows)
        // Fee: negative = deduction; Payment: negative = outgoing; Sent: negative = USDC/crypto sent
        if (transaction.type === 'fee' || transaction.type === 'payment' || transaction.type === 'sent') {
          return;
        }
        // For all other transaction types (deposit, receive, refund, etc.), amount must be >= 0
        if (transaction.amount !== null && transaction.amount !== undefined) {
          const amountValue = parseFloat(transaction.amount);
          if (amountValue < 0) {
            throw new Error(`Amount must be greater than or equal to 0 for ${transaction.type} transactions`);
          }
        }
      },
      beforeCreate: (transaction) => {
        // Generate transaction ID if not provided
        if (!transaction.transactionId) {
          transaction.transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
        }
      },
      beforeUpdate: (transaction) => {
        // Calculate processing time if status changes to completed
        if (transaction.changed('status') && transaction.status === 'completed' && !transaction.processingTime) {
          transaction.processingTime = Date.now() - transaction.createdAt.getTime();
        }
      },
    },
  });

  // Define associations
  Transaction.associate = (models) => {
    // Transaction belongs to one User
    Transaction.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Transaction belongs to one Wallet
    Transaction.belongsTo(models.Wallet, {
      foreignKey: 'walletId',
      as: 'wallet',
    });

    // Transaction belongs to sender Wallet
    Transaction.belongsTo(models.Wallet, {
      foreignKey: 'senderWalletId',
      as: 'senderWallet',
    });

    // Transaction belongs to receiver Wallet
    Transaction.belongsTo(models.Wallet, {
      foreignKey: 'receiverWalletId',
      as: 'receiverWallet',
    });

    // Transaction belongs to one Payment
    Transaction.belongsTo(models.Payment, {
      foreignKey: 'paymentId',
      as: 'payment',
    });
  };

  // Instance methods
  Transaction.prototype.isCompleted = function() {
    return this.status === 'completed';
  };

  Transaction.prototype.isFailed = function() {
    return this.status === 'failed';
  };

  Transaction.prototype.isPending = function() {
    return this.status === 'pending';
  };

  Transaction.prototype.complete = async function() {
    this.status = 'completed';
    this.processingTime = Date.now() - this.createdAt.getTime();
    await this.save();
    return this;
  };

  Transaction.prototype.fail = async function(reason = '') {
    this.status = 'failed';
    this.failureReason = reason;
    await this.save();
    return this;
  };

  Transaction.prototype.getFormattedAmount = function() {
    return `R${(this.amount / 100).toFixed(2)}`;
  };

  Transaction.prototype.getTotalAmount = function() {
    return parseFloat(this.amount) + parseFloat(this.fee || 0);
  };

  Transaction.prototype.isDebit = function() {
    return ['send', 'withdraw', 'payment', 'fee'].includes(this.type);
  };

  Transaction.prototype.isCredit = function() {
    return ['receive', 'deposit', 'transfer', 'refund'].includes(this.type);
  };

  return Transaction;
};