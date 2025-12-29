/**
 * Referral Model
 * 
 * Tracks individual referral invitations and their status
 * Part of MyMoolah 4-level earnings network for job creation
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = (sequelize, DataTypes) => {
  const Referral = sequelize.define('Referral', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    referrerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'referrer_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who sent the referral'
    },
    refereeUserId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'referee_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who signed up (null until signup)'
    },
    referralCode: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
      field: 'referral_code',
      comment: 'Unique referral code'
    },
    refereePhoneNumber: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: 'referee_phone_number',
      comment: 'Phone number of referee'
    },
    
    // Tracking
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending, invited, signed_up, activated, expired'
    },
    invitedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'invited_at'
    },
    smsSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'sms_sent_at'
    },
    signedUpAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'signed_up_at'
    },
    activatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'activated_at'
    },
    
    // Rewards
    signupBonusPaid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'signup_bonus_paid'
    },
    signupBonusAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: 'signup_bonus_amount'
    },
    signupBonusPaidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'signup_bonus_paid_at'
    },
    
    // Metadata
    invitationChannel: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'sms',
      field: 'invitation_channel'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'referrals',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    underscored: false
  });

  Referral.associate = (models) => {
    Referral.belongsTo(models.User, {
      foreignKey: 'referrerUserId',
      as: 'referrer'
    });
    
    Referral.belongsTo(models.User, {
      foreignKey: 'refereeUserId',
      as: 'referee'
    });
  };

  return Referral;
};

