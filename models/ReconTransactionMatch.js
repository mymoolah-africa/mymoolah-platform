/**
 * ReconTransactionMatch Model
 * 
 * Stores detailed match results for each transaction including MMTP data,
 * supplier data, match status, discrepancies, and resolution details.
 * 
 * @module models/ReconTransactionMatch
 */

'use strict';

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class ReconTransactionMatch extends Model {
    static associate(models) {
      // A match belongs to a recon run
      this.belongsTo(models.ReconRun, {
        foreignKey: 'run_id',
        targetKey: 'run_id',
        as: 'reconRun'
      });
    }
    
    /**
     * Check if this is a successful match
     */
    isMatched() {
      return ['exact_match', 'fuzzy_match'].includes(this.match_status);
    }
    
    /**
     * Check if requires manual review
     */
    requiresManualReview() {
      return this.has_discrepancy && 
             ['pending', 'manual_review'].includes(this.resolution_status);
    }
    
    /**
     * Get amount discrepancy
     */
    getAmountDiscrepancy() {
      if (!this.mmtp_amount || !this.supplier_amount) return null;
      return parseFloat(this.mmtp_amount) - parseFloat(this.supplier_amount);
    }
  }

  ReconTransactionMatch.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    run_id: {
      type: DataTypes.UUID,
      allowNull: false
    },
    
    // MMTP transaction data
    mmtp_transaction_id: {
      type: DataTypes.STRING(100)
    },
    mmtp_order_id: {
      type: DataTypes.INTEGER
    },
    mmtp_reference: {
      type: DataTypes.STRING(100)
    },
    mmtp_amount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    mmtp_commission: {
      type: DataTypes.DECIMAL(15, 2)
    },
    mmtp_status: {
      type: DataTypes.STRING(50)
    },
    mmtp_timestamp: {
      type: DataTypes.DATE
    },
    mmtp_product_id: {
      type: DataTypes.INTEGER
    },
    mmtp_product_name: {
      type: DataTypes.STRING(255)
    },
    mmtp_metadata: {
      type: DataTypes.JSONB
    },
    
    // Supplier transaction data
    supplier_transaction_id: {
      type: DataTypes.STRING(100)
    },
    supplier_reference: {
      type: DataTypes.STRING(100)
    },
    supplier_amount: {
      type: DataTypes.DECIMAL(15, 2)
    },
    supplier_commission: {
      type: DataTypes.DECIMAL(15, 2)
    },
    supplier_status: {
      type: DataTypes.STRING(50)
    },
    supplier_timestamp: {
      type: DataTypes.DATE
    },
    supplier_product_code: {
      type: DataTypes.STRING(100)
    },
    supplier_product_name: {
      type: DataTypes.STRING(255)
    },
    supplier_metadata: {
      type: DataTypes.JSONB
    },
    
    // Match result
    match_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        isIn: [['exact_match', 'fuzzy_match', 'unmatched_mmtp', 'unmatched_supplier']]
      }
    },
    match_confidence: {
      type: DataTypes.DECIMAL(5, 4),
      validate: {
        min: 0.0000,
        max: 1.0000
      }
    },
    match_method: {
      type: DataTypes.STRING(100)
    },
    
    // Discrepancies
    has_discrepancy: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    discrepancy_type: {
      type: DataTypes.STRING(100)
    },
    discrepancy_details: {
      type: DataTypes.JSONB
    },
    
    // Resolution
    resolution_status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: [['pending', 'auto_resolved', 'manual_review', 'resolved', 'escalated']]
      }
    },
    resolution_method: {
      type: DataTypes.STRING(100)
    },
    resolution_notes: {
      type: DataTypes.TEXT
    },
    resolved_at: {
      type: DataTypes.DATE
    },
    resolved_by: {
      type: DataTypes.STRING(100)
    },
    
    // Metadata for analytics & marketing
    enriched_metadata: {
      type: DataTypes.JSONB
    },
    
    // Audit
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
    modelName: 'ReconTransactionMatch',
    tableName: 'recon_transaction_matches',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        fields: ['run_id']
      },
      {
        fields: ['mmtp_transaction_id']
      },
      {
        fields: ['supplier_transaction_id']
      },
      {
        fields: ['match_status']
      }
    ]
  });

  return ReconTransactionMatch;
};
