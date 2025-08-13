// mymoolah/models/Wallet.js

module.exports = (sequelize, DataTypes) => {
  const Wallet = sequelize.define('Wallet', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      validate: {
        notNull: true,
      },
    },
    walletId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [10, 50],
      },
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2), // Banking-grade precision
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
        isIn: [['ZAR', 'USD', 'EUR']], // Supported currencies
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'inactive', 'pending', 'locked'),
      allowNull: false,
      defaultValue: 'active',
    },
    kycVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    kycVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kycVerifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dailyLimit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 100000.00, // R100,000 daily limit
      validate: {
        min: 0,
      },
    },
    monthlyLimit: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 1000000.00, // R1,000,000 monthly limit
      validate: {
        min: 0,
      },
    },
    dailySpent: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    monthlySpent: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    lastTransactionAt: {
      type: DataTypes.DATE,
      allowNull: true,
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
    tableName: 'wallets',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['walletId'],
      },
      {
        fields: ['userId'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['kycVerified'],
      },
    ],
    hooks: {
      beforeCreate: (wallet) => {
        // Generate wallet ID if not provided
        if (!wallet.walletId) {
          wallet.walletId = `WAL-${Date.now()}-${wallet.userId}`;
        }
      },
      beforeUpdate: (wallet) => {
        // Update kycVerifiedAt when KYC status changes
        if (wallet.changed('kycVerified') && wallet.kycVerified) {
          wallet.kycVerifiedAt = new Date();
        }
        
        // Reset daily/monthly spent at appropriate intervals
        const now = new Date();
        const lastTransaction = wallet.lastTransactionAt;
        
        if (!lastTransaction || !isSameDay(now, lastTransaction)) {
          wallet.dailySpent = 0.00;
        }
        
        if (!lastTransaction || !isSameMonth(now, lastTransaction)) {
          wallet.monthlySpent = 0.00;
        }
      },
    },
  });

  // Helper functions for date comparison
  function isSameDay(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  function isSameMonth(date1, date2) {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth();
  }

  // Define associations
  Wallet.associate = (models) => {
    // Wallet belongs to one User
    Wallet.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });

    // Wallet has many Transactions
    Wallet.hasMany(models.Transaction, {
      foreignKey: 'walletId',
      as: 'transactions',
    });

    // Wallet has many Payments
    Wallet.hasMany(models.Payment, {
      foreignKey: 'walletId',
      as: 'payments',
    });
  };

  // Instance methods
  Wallet.prototype.canDebit = function(amount) {
    if (this.status !== 'active') {
      return { allowed: false, reason: 'Wallet is not active' };
    }

    const numericAmount = parseFloat(amount);
    const currentBalance = parseFloat(this.balance);
    const currentDailySpent = parseFloat(this.dailySpent || 0);
    const currentMonthlySpent = parseFloat(this.monthlySpent || 0);
    const allowedDailyLimit = parseFloat(this.dailyLimit || 0);
    const allowedMonthlyLimit = parseFloat(this.monthlyLimit || 0);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return { allowed: false, reason: 'Invalid debit amount' };
    }

    if (currentBalance < numericAmount) {
      return { allowed: false, reason: 'Insufficient balance' };
    }

    if (currentDailySpent + numericAmount > allowedDailyLimit) {
      return { allowed: false, reason: 'Daily limit exceeded' };
    }

    if (currentMonthlySpent + numericAmount > allowedMonthlyLimit) {
      return { allowed: false, reason: 'Monthly limit exceeded' };
    }

    return { allowed: true };
  };

  Wallet.prototype.debit = async function(amount, transactionType = 'debit', options = {}) {
    const numericAmount = parseFloat(amount);
    const canDebit = this.canDebit(numericAmount);
    if (!canDebit.allowed) {
      throw new Error(canDebit.reason);
    }
    
    const currentBalance = parseFloat(this.balance);
    this.balance = currentBalance - numericAmount;
    this.dailySpent = parseFloat(this.dailySpent) + numericAmount;
    this.monthlySpent = parseFloat(this.monthlySpent) + numericAmount;
    this.lastTransactionAt = new Date();
    
    await this.save(options);
    return this;
  };

  Wallet.prototype.credit = async function(amount, transactionType = 'credit', options = {}) {
    if (this.status !== 'active') {
      throw new Error('Wallet is not active');
    }
    
    const numericAmount = parseFloat(amount);
    const currentBalance = parseFloat(this.balance);
    this.balance = currentBalance + numericAmount;
    this.lastTransactionAt = new Date();
    
    await this.save(options);
    return this;
  };

  Wallet.prototype.verifyKYC = async function(verifiedBy = 'system') {
    this.kycVerified = true;
    this.kycVerifiedAt = new Date();
    this.kycVerifiedBy = verifiedBy;
    
    await this.save();
    return this;
  };

  Wallet.prototype.getBalance = function() {
    return parseFloat(this.balance);
  };

  Wallet.prototype.getFormattedBalance = function() {
    return `R${(this.balance / 100).toFixed(2)}`;
  };

  return Wallet;
};