// mymoolah/models/User.js

const { encrypt, decrypt, blindIndex, isEncrypted } = require('../utils/fieldEncryption');

/**
 * Encrypt PII fields on a User instance and set blind index hashes.
 * Called from beforeCreate and beforeUpdate hooks.
 * Only encrypts if the value is currently plaintext (idempotent).
 */
function _encryptUserFields(user) {
  if (user.idNumber && !isEncrypted(user.idNumber)) {
    user.idNumberHash = blindIndex(user.idNumber);
    user.idNumber = encrypt(user.idNumber);
  }
}

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
        // Enforce canonical E.164 format for ZA mobile numbers
        is: /^\+27[6-8][0-9]{8}$/,
      },
    },
    accountNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: true,
    },
    idNumber: {
      type: DataTypes.STRING(512), // Encrypted ciphertext is longer than plaintext
      allowNull: false,
      validate: {
        notEmpty: true,
        // Validates the PLAINTEXT before beforeCreate/beforeUpdate encrypts it.
        // afterFind decrypts on load, so this always sees plaintext at validate time.
        len: [5, 20],
      },
    },
    idNumberHash: {
      // HMAC-SHA256 blind index — used for WHERE lookups and unique constraint
      // instead of the idNumber column (which holds non-deterministic ciphertext).
      type: DataTypes.STRING(64),
      allowNull: true, // Null until backfill runs for legacy rows
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
        // Unique constraint lives on the hash column, not the encrypted column.
        // The hash is deterministic (same plaintext → same hash) so uniqueness
        // is enforced correctly even though the ciphertext varies per encryption.
        unique: true,
        fields: ['idNumberHash'],
        name: 'users_id_number_hash_unique',
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
      // Runs AFTER Sequelize validation, BEFORE DB write.
      // At this point idNumber is still plaintext (validation passed on plaintext).
      beforeCreate: (user) => {
        if (!user.accountNumber && user.phoneNumber) {
          user.accountNumber = user.phoneNumber;
        }
        _encryptUserFields(user);
      },
      beforeUpdate: (user) => {
        if (user.changed('kycStatus') && user.kycStatus === 'verified') {
          user.kycVerifiedAt = new Date();
        }
        _encryptUserFields(user);
      },
      // Decrypt on every load so the rest of the app always sees plaintext.
      afterFind: (result) => {
        if (!result) return;
        const instances = Array.isArray(result) ? result : [result];
        for (const user of instances) {
          if (user && user.idNumber) {
            user.idNumber = decrypt(user.idNumber);
          }
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