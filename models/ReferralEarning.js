/**
 * ReferralEarning Model
 * 
 * Tracks individual earnings from the referral program
 * Records created for each transaction across the chain
 * Includes monthly cap tracking and payout status
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = (sequelize, DataTypes) => {
  const ReferralEarning = sequelize.define('ReferralEarning', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    
    // Who earned
    earnerUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'earner_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who earned this commission'
    },
    
    // From whose transaction
    transactionUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'transaction_user_id',
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'User who made the transaction'
    },
    transactionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'transaction_id',
      references: {
        model: 'transactions',
        key: 'id'
      },
      comment: 'The transaction that generated this earning'
    },
    
    // Earnings details
    level: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 3
      },
      comment: 'Level in chain: 1 (5%), 2 (3%), 3 (2%)'
    },
    percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      comment: 'Percentage earned (5.00, 3.00, or 2.00)'
    },
    transactionRevenueCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'transaction_revenue_cents',
      comment: 'MyMoolah net revenue from transaction'
    },
    earnedAmountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'earned_amount_cents',
      comment: 'Amount earned by this user'
    },
    
    // Monthly cap tracking
    monthYear: {
      type: DataTypes.STRING(7),
      allowNull: false,
      field: 'month_year',
      comment: 'Month for cap tracking (YYYY-MM)'
    },
    cumulativeMonthCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'cumulative_month_cents',
      comment: 'Cumulative earnings this month at this level'
    },
    capped: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this earning was capped'
    },
    originalAmountCents: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'original_amount_cents',
      comment: 'Original amount before capping'
    },
    
    // Status
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'pending',
      comment: 'pending, paid, failed, reversed'
    },
    paidAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'paid_at'
    },
    payoutBatchId: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'payout_batch_id'
    },
    
    // Metadata
    transactionType: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'transaction_type',
      comment: 'Type of transaction (vas, qr_payment, etc.)'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'referral_earnings',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: false
  });

  ReferralEarning.associate = (models) => {
    ReferralEarning.belongsTo(models.User, {
      foreignKey: 'earnerUserId',
      as: 'earner'
    });
    
    ReferralEarning.belongsTo(models.User, {
      foreignKey: 'transactionUserId',
      as: 'transactionUser'
    });
    
    ReferralEarning.belongsTo(models.Transaction, {
      foreignKey: 'transactionId',
      as: 'transaction'
    });
    
    ReferralEarning.belongsTo(models.ReferralPayout, {
      foreignKey: 'payoutBatchId',
      targetKey: 'batchId',
      as: 'payout'
    });
  };

  /**
   * Get formatted amount in Rands
   * @returns {string} e.g., "R1.23"
   */
  ReferralEarning.prototype.getFormattedAmount = function() {
    return `R${(this.earnedAmountCents / 100).toFixed(2)}`;
  };

  return ReferralEarning;
};

