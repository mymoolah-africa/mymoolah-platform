/**
 * ReconRun Model
 * 
 * Stores metadata for each reconciliation run including file details,
 * transaction counts, financial totals, and discrepancy summaries.
 * 
 * @module models/ReconRun
 */

'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ReconRun extends Model {
    static associate(models) {
      // A recon run belongs to a supplier
      this.belongsTo(models.ReconSupplierConfig, {
        foreignKey: 'supplier_id',
        as: 'supplier'
      });
      
      // A recon run has many transaction matches
      this.hasMany(models.ReconTransactionMatch, {
        foreignKey: 'run_id',
        sourceKey: 'run_id',
        as: 'matches'
      });
      
      // A recon run has many audit trail entries
      this.hasMany(models.ReconAuditTrail, {
        foreignKey: 'run_id',
        sourceKey: 'run_id',
        as: 'auditTrail'
      });
    }
    
    /**
     * Calculate match success rate
     */
    getMatchRate() {
      if (this.total_transactions === 0) return 0;
      const matched = this.matched_exact + this.matched_fuzzy;
      return (matched / this.total_transactions) * 100;
    }
    
    /**
     * Check if reconciliation passed (>99% match rate, variance <threshold)
     */
    isPassed(varianceThreshold = 1000.00) {
      const matchRate = this.getMatchRate();
      const variance = Math.abs(parseFloat(this.amount_variance || 0));
      return matchRate >= 99.0 && variance <= varianceThreshold;
    }
  }

  ReconRun.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    run_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      defaultValue: DataTypes.UUIDV4
    },
    supplier_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    file_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    file_size: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    file_received_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    
    // Reconciliation metadata
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'processing', 'completed', 'failed']]
      }
    },
    started_at: {
      type: DataTypes.DATE
    },
    completed_at: {
      type: DataTypes.DATE
    },
    
    // Transaction counts
    total_transactions: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    matched_exact: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    matched_fuzzy: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unmatched_mmtp: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    unmatched_supplier: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    auto_resolved: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    manual_review_required: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    
    // Financial totals
    total_amount_mmtp: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_amount_supplier: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    amount_variance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_commission_mmtp: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    total_commission_supplier: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    commission_variance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0
    },
    
    // Discrepancy summary
    discrepancies: {
      type: DataTypes.JSONB
    },
    error_log: {
      type: DataTypes.JSONB
    },
    
    // ML & Analytics
    ml_anomalies: {
      type: DataTypes.JSONB
    },
    processing_time_ms: {
      type: DataTypes.INTEGER
    },
    
    // Alerting
    alerts_sent: {
      type: DataTypes.JSONB
    },
    
    // Audit
    created_by: {
      type: DataTypes.STRING(100)
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ReconRun',
    tableName: 'recon_runs',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['supplier_id', 'file_hash'],
        name: 'recon_runs_file_hash_unique'
      },
      {
        fields: ['supplier_id']
      },
      {
        fields: ['status']
      },
      {
        fields: ['completed_at']
      },
      {
        fields: ['run_id']
      }
    ]
  });

  return ReconRun;
};
