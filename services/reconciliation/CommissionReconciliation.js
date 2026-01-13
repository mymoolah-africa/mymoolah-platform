/**
 * Commission Reconciliation
 * 
 * Validates and reconciles commission calculations:
 * - Calculate expected commission from MMTP rules
 * - Compare with supplier-reported commission
 * - Detect variances and generate alerts
 * 
 * @module services/reconciliation/CommissionReconciliation
 */

'use strict';

const logger = require('../../utils/logger');
const db = require('../../models');

class CommissionReconciliation {
  /**
   * Reconcile commission calculations
   * 
   * @param {Array} matches - Transaction matches
   * @param {Object} supplierConfig - Supplier configuration
   * @param {string} runId - Reconciliation run ID
   * @returns {Promise<Object>} Commission reconciliation results
   */
  async reconcile(matches, supplierConfig, runId) {
    try {
      logger.info('[CommissionRecon] Starting commission reconciliation', {
        match_count: matches.length,
        run_id: runId
      });
      
      const commConfig = supplierConfig.commission_calculation;
      const commField = supplierConfig.commission_field;
      
      let totalCommissionMMTP = 0;
      let totalCommissionSupplier = 0;
      let mismatchCount = 0;
      const mismatches = [];
      
      for (const match of matches) {
        // Skip unmatched transactions
        if (match.match_status === 'unmatched_mmtp' || match.match_status === 'unmatched_supplier') {
          continue;
        }
        
        const mmtpCommission = parseFloat(match.mmtp_commission || 0);
        const supplierCommission = parseFloat(match.supplier_commission || 0);
        
        totalCommissionMMTP += mmtpCommission;
        totalCommissionSupplier += supplierCommission;
        
        // Check for commission mismatch
        const diff = Math.abs(mmtpCommission - supplierCommission);
        if (diff > 0.01) { // More than 1 cent
          mismatchCount++;
          mismatches.push({
            transaction_id: match.mmtp_transaction_id || match.supplier_transaction_id,
            mmtp_commission: mmtpCommission.toFixed(2),
            supplier_commission: supplierCommission.toFixed(2),
            variance: (mmtpCommission - supplierCommission).toFixed(2)
          });
        }
      }
      
      const variance = totalCommissionMMTP - totalCommissionSupplier;
      const variancePercent = totalCommissionSupplier > 0
        ? (variance / totalCommissionSupplier * 100).toFixed(2)
        : 0;
      
      logger.info('[CommissionRecon] Reconciliation complete', {
        total_commission_mmtp: totalCommissionMMTP.toFixed(2),
        total_commission_supplier: totalCommissionSupplier.toFixed(2),
        variance: variance.toFixed(2),
        variance_percent: `${variancePercent}%`,
        mismatch_count: mismatchCount
      });
      
      return {
        totalCommissionMMTP,
        totalCommissionSupplier,
        variance,
        variancePercent,
        mismatchCount,
        mismatches: mismatches.slice(0, 10) // Top 10 mismatches for report
      };
    } catch (error) {
      logger.error('[CommissionRecon] Reconciliation failed', {
        error: error.message,
        run_id: runId
      });
      throw error;
    }
  }
  
  /**
   * Calculate expected commission based on MMTP rules
   * (For future use when calculating from transaction data)
   */
  calculateExpectedCommission(transaction, commConfig) {
    if (!commConfig) return 0;
    
    const amount = parseFloat(transaction.amount || 0);
    
    if (commConfig.method === 'percentage') {
      const rate = parseFloat(commConfig.rate || 0);
      let commission = amount * rate;
      
      // Adjust for VAT if commission is VAT-inclusive
      if (commConfig.vat_inclusive) {
        const vatRate = parseFloat(commConfig.vat_rate || 0.15);
        commission = commission / (1 + vatRate);
      }
      
      return commission;
    }
    
    if (commConfig.method === 'flat') {
      return parseFloat(commConfig.amount || 0);
    }
    
    if (commConfig.method === 'from_file') {
      // Commission is already in the file
      return parseFloat(transaction.commission || 0);
    }
    
    return 0;
  }
}

module.exports = CommissionReconciliation;
