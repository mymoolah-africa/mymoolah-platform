/**
 * UserReferralStats Model
 * 
 * Denormalized statistics table for fast dashboard queries
 * Updated in real-time as referrals and earnings occur
 * Enables instant display of user's referral performance
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = (sequelize, DataTypes) => {
  const UserReferralStats = sequelize.define('UserReferralStats', {
    userId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User these stats belong to'
    },
    
    // Referral counts
    totalReferrals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_referrals',
      comment: 'Total referrals ever sent'
    },
    activeReferrals: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'active_referrals',
      comment: 'Referrals that completed 1st transaction'
    },
    
    // By level (network size)
    level1Count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_1_count',
      comment: 'Direct referrals (Level 1)'
    },
    level2Count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_2_count',
      comment: 'Level 2 network size'
    },
    level3Count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_3_count',
      comment: 'Level 3 network size'
    },
    level4Count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_4_count',
      comment: 'Level 4 network size'
    },
    
    // Earnings (all time, in cents)
    totalEarnedCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_earned_cents',
      comment: 'Total earnings all time'
    },
    totalPaidCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_paid_cents',
      comment: 'Total paid to wallet'
    },
    pendingCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'pending_cents',
      comment: 'Pending earnings not yet paid'
    },
    
    // Current month tracking
    monthYear: {
      type: DataTypes.STRING(7),
      allowNull: true,
      field: 'month_year',
      comment: 'Current month (YYYY-MM)'
    },
    monthEarnedCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'month_earned_cents',
      comment: 'Earnings this month'
    },
    monthPaidCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'month_paid_cents',
      comment: 'Paid this month'
    },
    
    // Monthly cap status per level
    level1MonthCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_1_month_cents',
      comment: 'Level 1 earnings this month'
    },
    level1Capped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'level_1_capped',
      comment: 'Hit R10,000 cap for Level 1'
    },
    level2MonthCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_2_month_cents'
    },
    level2Capped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'level_2_capped',
      comment: 'Hit R5,000 cap for Level 2'
    },
    level3MonthCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_3_month_cents'
    },
    level3Capped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'level_3_capped',
      comment: 'Hit R2,500 cap for Level 3'
    },
    level4MonthCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'level_4_month_cents'
    },
    level4Capped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'level_4_capped',
      comment: 'Hit R1,000 cap for Level 4'
    }
  }, {
    tableName: 'user_referral_stats',
    timestamps: true,
    createdAt: false,
    updatedAt: 'updated_at',
    underscored: false
  });

  UserReferralStats.associate = (models) => {
    UserReferralStats.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user'
    });
  };

  /**
   * Get total network size across all levels
   * @returns {number}
   */
  UserReferralStats.prototype.getTotalNetworkSize = function() {
    return this.level1Count + this.level2Count + this.level3Count + this.level4Count;
  };

  /**
   * Get formatted total earnings
   * @returns {string}
   */
  UserReferralStats.prototype.getFormattedTotalEarned = function() {
    return `R${(this.totalEarnedCents / 100).toLocaleString('en-ZA', {
      minimumFractionDigits: 2
    })}`;
  };

  /**
   * Check if any level is capped this month
   * @returns {boolean}
   */
  UserReferralStats.prototype.isAnyCapped = function() {
    return this.level1Capped || this.level2Capped || this.level3Capped || this.level4Capped;
  };

  /**
   * Reset monthly stats for new month
   */
  UserReferralStats.prototype.resetMonthly = async function(newMonthYear) {
    await this.update({
      monthYear: newMonthYear,
      monthEarnedCents: 0,
      monthPaidCents: 0,
      level1MonthCents: 0,
      level1Capped: false,
      level2MonthCents: 0,
      level2Capped: false,
      level3MonthCents: 0,
      level3Capped: false,
      level4MonthCents: 0,
      level4Capped: false
    });
  };

  return UserReferralStats;
};

