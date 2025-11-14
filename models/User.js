// mymoolah/models/User.js

module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true,
        notEmpty: true,
      },
    },
    password_hash: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [60, 60], // bcrypt hash length
      },
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        len: [1, 50],
      },
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        is: /^(\+27|0)[6-8][0-9]{8}$/, // South African mobile format
      },
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    idNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        notEmpty: true,
        len: [5, 20], // Reasonable length for ID numbers
      },
    },
    idType: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        notEmpty: true,
        isIn: [['south_african_id', 'south_african_passport', 'south_african_driving_license', 'south_african_temporary_id', 'nigerian_passport', 'kenyan_passport', 'ghanaian_passport', 'egyptian_passport', 'moroccan_passport', 'ethiopian_passport', 'tanzanian_passport', 'ugandan_passport', 'rwandan_passport', 'zambian_passport', 'zimbabwean_passport', 'malawian_passport', 'mozambican_passport', 'angolan_passport', 'namibian_passport', 'botswanan_passport', 'lesothan_passport', 'eswatini_passport', 'international_passport', 'generic_passport', 'generic_id']],
      },
    },
    idVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2), // Banking-grade precision
      allowNull: false,
      defaultValue: 0.00,
      validate: {
        min: 0,
      },
    },
    status: {
      type: DataTypes.ENUM('active', 'suspended', 'inactive', 'pending'),
      allowNull: false,
      defaultValue: 'active',
    },
    kycStatus: {
      type: DataTypes.ENUM('not_started', 'pending', 'verified', 'rejected'),
      allowNull: false,
      defaultValue: 'not_started',
    },
    kycVerifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    kycVerifiedBy: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastLoginAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    loginAttempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
        max: 10,
      },
    },
    lockedUntil: {
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
    tableName: 'users',
    timestamps: true,
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    indexes: [
      {
        unique: true,
        fields: ['email'],
      },
      {
        unique: true,
        fields: ['accountNumber'],
      },
      {
        unique: true,
        fields: ['idNumber'],
      },
      {
        fields: ['phoneNumber'],
      },
      {
        fields: ['status'],
      },
      {
        fields: ['kycStatus'],
      },
    ],
    hooks: {
      beforeCreate: (user) => {
        // Generate account number if not provided
        if (!user.accountNumber && user.phoneNumber) {
          user.accountNumber = user.phoneNumber;
        }
      },
      beforeUpdate: (user) => {
        // Update kycVerifiedAt when KYC status changes to verified
        if (user.changed('kycStatus') && user.kycStatus === 'verified') {
          user.kycVerifiedAt = new Date();
        }
      },
    },
  });

  // Define associations
  User.associate = (models) => {
    // User has one Wallet
    User.hasOne(models.Wallet, {
      foreignKey: 'userId',
      as: 'wallet',
    });

    // User has many Transactions
    User.hasMany(models.Transaction, {
      foreignKey: 'userId',
      as: 'transactions',
    });

    // User has many Payments
    User.hasMany(models.Payment, {
      foreignKey: 'userId',
      as: 'payments',
    });

    // User has one KYC record
    User.hasOne(models.Kyc, {
      foreignKey: 'userId',
      as: 'kyc',
    });

    // User has many Support Tickets
    User.hasMany(models.SupportTicket, {
      foreignKey: 'userId',
      as: 'supportTickets',
    });

    // User has many Favorites - temporarily commented out to debug
    // User.hasMany(models.UserFavorite, {
    //   foreignKey: 'userId',
    //   as: 'favorites',
    // });
  };

  // Instance methods
  User.prototype.generateWalletId = function() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `WAL${timestamp}${random}`;
  };

  User.prototype.isLocked = function() {
    return this.lockedUntil && new Date() < this.lockedUntil;
  };

  User.prototype.incrementLoginAttempts = async function() {
    this.loginAttempts += 1;
    if (this.loginAttempts >= 5) {
      this.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
    }
    await this.save();
  };

  User.prototype.resetLoginAttempts = async function() {
    this.loginAttempts = 0;
    this.lockedUntil = null;
    await this.save();
  };

  // Tier-related methods
  User.prototype.getTierLevel = function() {
    return this.tier_level || 'bronze';
  };

  User.prototype.getTierDisplay = function() {
    const tier = this.getTierLevel();
    return tier.charAt(0).toUpperCase() + tier.slice(1);
  };

  User.prototype.isBronzeTier = function() {
    return this.getTierLevel() === 'bronze';
  };

  User.prototype.isSilverTier = function() {
    return this.getTierLevel() === 'silver';
  };

  User.prototype.isGoldTier = function() {
    return this.getTierLevel() === 'gold';
  };

  User.prototype.isPlatinumTier = function() {
    return this.getTierLevel() === 'platinum';
  };

  User.prototype.getTierBadge = function() {
    const badges = {
      bronze: '🥉',
      silver: '🥈',
      gold: '🥇',
      platinum: '💎'
    };
    return badges[this.getTierLevel()] || '🥉';
  };

  return User;
};