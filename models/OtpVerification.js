/**
 * OtpVerification Model
 * 
 * Stores OTP records for password reset and phone number change flows
 * Implements banking-grade security with hashed OTPs and one-time use
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-30
 */

module.exports = (sequelize, DataTypes) => {
  const OtpVerification = sequelize.define('OtpVerification', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Null for password reset (user found by phone)
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User requesting OTP (null for password reset lookups)'
    },
    phoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'phone_number',
      comment: 'Phone number in E.164 format (+27XXXXXXXXX)'
    },
    otpHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: 'otp_hash',
      comment: 'Hashed OTP (bcrypt) - never store plaintext'
    },
    type: {
      type: DataTypes.STRING(30),
      allowNull: false,
      comment: 'OTP type: password_reset, phone_change, login_verification',
      validate: {
        isIn: [['password_reset', 'phone_change', 'login_verification']]
      }
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at',
      comment: 'OTP expiry time (10 minutes from creation)'
    },
    verified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether OTP has been verified (one-time use)'
    },
    verifiedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'verified_at',
      comment: 'When OTP was verified'
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Number of verification attempts (max 3)'
    },
    ipAddress: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'ip_address',
      comment: 'IP address of requester (audit trail)'
    },
    userAgent: {
      type: DataTypes.STRING(500),
      allowNull: true,
      field: 'user_agent',
      comment: 'User agent of requester (audit trail)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Additional metadata (new phone number for phone_change, etc.)'
    }
  }, {
    tableName: 'otp_verifications',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false
  });

  // Instance Methods

  /**
   * Check if OTP is expired
   * @returns {boolean} True if expired
   */
  OtpVerification.prototype.isExpired = function() {
    return new Date() > this.expiresAt;
  };

  /**
   * Check if OTP can be verified (not expired, not already verified, attempts < max)
   * @returns {object} { canVerify: boolean, reason?: string }
   */
  OtpVerification.prototype.canVerify = function() {
    if (this.verified) {
      return { canVerify: false, reason: 'OTP already used' };
    }
    if (this.isExpired()) {
      return { canVerify: false, reason: 'OTP expired' };
    }
    if (this.attempts >= 3) {
      return { canVerify: false, reason: 'Maximum attempts exceeded' };
    }
    return { canVerify: true };
  };

  /**
   * Increment attempt counter
   * @returns {Promise<OtpVerification>}
   */
  OtpVerification.prototype.incrementAttempts = async function() {
    this.attempts += 1;
    await this.save();
    return this;
  };

  /**
   * Mark OTP as verified (one-time use)
   * @returns {Promise<OtpVerification>}
   */
  OtpVerification.prototype.markAsVerified = async function() {
    this.verified = true;
    this.verifiedAt = new Date();
    await this.save();
    return this;
  };

  // Associations
  OtpVerification.associate = (models) => {
    OtpVerification.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  return OtpVerification;
};

