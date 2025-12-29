/**
 * ReferralPayout Model
 * 
 * Tracks daily batch payout processing
 * Runs at 2:00 AM SAST daily
 * Aggregates and pays out pending earnings
 * 
 * @author MyMoolah Treasury Platform
 * @date 2025-12-22
 */

module.exports = (sequelize, DataTypes) => {
  const ReferralPayout = sequelize.define('ReferralPayout', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    batchId: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      field: 'batch_id',
      comment: 'Unique batch ID (e.g., PAYOUT-2025-12-22)'
    },
    
    payoutDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: 'payout_date',
      comment: 'Date of payout batch'
    },
    totalUsers: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_users',
      comment: 'Number of users paid'
    },
    totalAmountCents: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_amount_cents',
      comment: 'Total amount paid (cents)'
    },
    totalEarningsCount: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: 'total_earnings_count',
      comment: 'Number of earning records processed'
    },
    
    // Status tracking
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: 'processing',
      comment: 'processing, completed, failed, reversed'
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'started_at'
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'completed_at'
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'failed_at'
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'error_message'
    },
    
    // Audit
    processedBy: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: 'processed_by',
      comment: 'System user or admin'
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'referral_payouts',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: false,
    underscored: false
  });

  ReferralPayout.associate = (models) => {
    ReferralPayout.hasMany(models.ReferralEarning, {
      foreignKey: 'payoutBatchId',
      sourceKey: 'batchId',
      as: 'earnings'
    });
  };

  /**
   * Get formatted total amount
   * @returns {string} e.g., "R1,234.56"
   */
  ReferralPayout.prototype.getFormattedTotal = function() {
    return `R${(this.totalAmountCents / 100).toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  /**
   * Get payout duration in seconds
   * @returns {number|null}
   */
  ReferralPayout.prototype.getDuration = function() {
    if (!this.startedAt || !this.completedAt) return null;
    return Math.floor((this.completedAt - this.startedAt) / 1000);
  };

  return ReferralPayout;
};

