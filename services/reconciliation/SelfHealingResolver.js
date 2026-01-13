/**
 * Self-Healing Resolver
 * 
 * Automatically resolves common, minor discrepancies:
 * - Timing differences (<5 minutes)
 * - Rounding errors (<R0.10)
 * - Status progression (pending → completed)
 * 
 * Routes complex discrepancies to manual review queue.
 * 
 * @module services/reconciliation/SelfHealingResolver
 */

'use strict';

const logger = require('../../utils/logger');
const db = require('../../models');

class SelfHealingResolver {
  /**
   * Resolve discrepancies automatically where possible
   * 
   * @param {Array} discrepancies - Discrepancies to resolve
   * @param {string} runId - Reconciliation run ID
   * @returns {Promise<Object>} Resolution results
   */
  async resolve(discrepancies, runId) {
    try {
      logger.info('[SelfHealingResolver] Starting resolution', {
        discrepancy_count: discrepancies.length,
        run_id: runId
      });
      
      let autoResolved = 0;
      let manualReview = 0;
      let escalated = 0;
      
      for (const disc of discrepancies) {
        const resolution = this.attemptAutoResolve(disc);
        
        if (resolution.resolved) {
          // Auto-resolved
          await db.ReconTransactionMatch.update({
            resolution_status: 'auto_resolved',
            resolution_method: resolution.method,
            resolution_notes: resolution.notes,
            resolved_at: new Date(),
            resolved_by: 'system'
          }, {
            where: { id: disc.id }
          });
          autoResolved++;
        } else if (resolution.escalate) {
          // Critical issue - escalate
          await db.ReconTransactionMatch.update({
            resolution_status: 'escalated',
            resolution_notes: resolution.notes
          }, {
            where: { id: disc.id }
          });
          escalated++;
        } else {
          // Requires manual review
          await db.ReconTransactionMatch.update({
            resolution_status: 'manual_review',
            resolution_notes: resolution.notes
          }, {
            where: { id: disc.id }
          });
          manualReview++;
        }
      }
      
      logger.info('[SelfHealingResolver] Resolution complete', {
        auto_resolved: autoResolved,
        manual_review: manualReview,
        escalated: escalated
      });
      
      return {
        autoResolved,
        manualReview,
        escalated
      };
    } catch (error) {
      logger.error('[SelfHealingResolver] Resolution failed', {
        error: error.message,
        run_id: runId
      });
      throw error;
    }
  }
  
  /**
   * Attempt to auto-resolve a discrepancy
   */
  attemptAutoResolve(disc) {
    const details = disc.discrepancy_details || {};
    const types = (disc.discrepancy_type || '').split(',');
    
    // Rule 1: Timing difference only (<5 minutes) with same amount
    if (types.length === 1 && types[0] === 'timestamp_diff') {
      if (details.timestamp_diff_seconds <= 300) {
        return {
          resolved: true,
          method: 'auto_timing',
          notes: `Timing difference of ${details.timestamp_diff_seconds}s is within acceptable tolerance (5 min)`
        };
      }
    }
    
    // Rule 2: Rounding error only (<R0.10)
    if (types.length === 1 && types[0] === 'amount_mismatch') {
      const diff = Math.abs(parseFloat(details.amount_diff || 0));
      if (diff <= 0.10) {
        return {
          resolved: true,
          method: 'auto_rounding',
          notes: `Amount difference of R${diff.toFixed(2)} is within rounding tolerance (R0.10)`
        };
      }
    }
    
    // Rule 3: Status progression (pending → completed) with matching amounts
    if (types.length === 1 && types[0] === 'status_mismatch') {
      const mmtpStatus = details.mmtp_status?.toLowerCase();
      const supplierStatus = details.supplier_status?.toLowerCase();
      
      if (
        (mmtpStatus === 'pending' && supplierStatus === 'completed') ||
        (mmtpStatus === 'processing' && supplierStatus === 'completed')
      ) {
        return {
          resolved: true,
          method: 'auto_status_progression',
          notes: `Status progression from ${mmtpStatus} to ${supplierStatus} is acceptable`
        };
      }
    }
    
    // Rule 4: Commission variance <R1.00 (minor calculation difference)
    if (types.length === 1 && types[0] === 'commission_mismatch') {
      const diff = Math.abs(parseFloat(details.commission_diff || 0));
      if (diff <= 1.00) {
        return {
          resolved: true,
          method: 'auto_commission_rounding',
          notes: `Commission difference of R${diff.toFixed(2)} is within tolerance (R1.00)`
        };
      }
    }
    
    // Escalation Rule: Large amount discrepancy (>R100)
    if (types.includes('amount_mismatch')) {
      const diff = Math.abs(parseFloat(details.amount_diff || 0));
      if (diff > 100.00) {
        return {
          resolved: false,
          escalate: true,
          notes: `CRITICAL: Amount discrepancy of R${diff.toFixed(2)} exceeds escalation threshold (R100)`
        };
      }
    }
    
    // Escalation Rule: Multiple issues
    if (types.length >= 3) {
      return {
        resolved: false,
        escalate: true,
        notes: `CRITICAL: Multiple discrepancies detected: ${types.join(', ')}`
      };
    }
    
    // Default: Manual review required
    return {
      resolved: false,
      escalate: false,
      notes: `Requires manual review: ${types.join(', ')}`
    };
  }
}

module.exports = SelfHealingResolver;
