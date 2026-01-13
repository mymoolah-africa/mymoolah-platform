/**
 * Discrepancy Detector
 * 
 * Detects and classifies discrepancies in matched transactions:
 * - Amount mismatches
 * - Status differences
 * - Timestamp variances
 * - Product mismatches
 * - Commission variances
 * 
 * @module services/reconciliation/DiscrepancyDetector
 */

'use strict';

const logger = require('../../utils/logger');
const db = require('../../models');
const moment = require('moment');

class DiscrepancyDetector {
  /**
   * Detect discrepancies in matched transactions
   * 
   * @param {Array} matches - Transaction matches
   * @param {string} runId - Reconciliation run ID
   * @returns {Promise<Array>} Discrepancies found
   */
  async detect(matches, runId) {
    try {
      logger.info('[DiscrepancyDetector] Detecting discrepancies', {
        match_count: matches.length,
        run_id: runId
      });
      
      const discrepancies = [];
      
      for (const match of matches) {
        // Skip unmatched transactions (they're already flagged)
        if (match.match_status === 'unmatched_mmtp' || match.match_status === 'unmatched_supplier') {
          continue;
        }
        
        const issues = [];
        const details = {};
        
        // Check amount discrepancy
        if (match.mmtp_amount && match.supplier_amount) {
          const mmtpAmount = parseFloat(match.mmtp_amount);
          const supplierAmount = parseFloat(match.supplier_amount);
          const diff = Math.abs(mmtpAmount - supplierAmount);
          
          if (diff > 0.01) { // More than 1 cent difference
            issues.push('amount_mismatch');
            details.amount_diff = (mmtpAmount - supplierAmount).toFixed(2);
            details.mmtp_amount = mmtpAmount.toFixed(2);
            details.supplier_amount = supplierAmount.toFixed(2);
          }
        }
        
        // Check status discrepancy
        if (match.mmtp_status && match.supplier_status) {
          const statusMatch = this.compareStatus(match.mmtp_status, match.supplier_status);
          if (!statusMatch) {
            issues.push('status_mismatch');
            details.mmtp_status = match.mmtp_status;
            details.supplier_status = match.supplier_status;
          }
        }
        
        // Check timestamp discrepancy
        if (match.mmtp_timestamp && match.supplier_timestamp) {
          const mmtpTime = moment(match.mmtp_timestamp);
          const supplierTime = moment(match.supplier_timestamp);
          const diffSeconds = Math.abs(mmtpTime.diff(supplierTime, 'seconds'));
          
          if (diffSeconds > 300) { // More than 5 minutes
            issues.push('timestamp_diff');
            details.timestamp_diff_seconds = diffSeconds;
            details.mmtp_timestamp = mmtpTime.format();
            details.supplier_timestamp = supplierTime.format();
          }
        }
        
        // Check product discrepancy
        if (match.mmtp_product_name && match.supplier_product_name) {
          if (match.mmtp_product_name !== match.supplier_product_name) {
            issues.push('product_mismatch');
            details.mmtp_product = match.mmtp_product_name;
            details.supplier_product = match.supplier_product_name;
          }
        }
        
        // Check commission discrepancy
        if (match.mmtp_commission && match.supplier_commission) {
          const mmtpComm = parseFloat(match.mmtp_commission);
          const supplierComm = parseFloat(match.supplier_commission);
          const diff = Math.abs(mmtpComm - supplierComm);
          
          if (diff > 0.01) {
            issues.push('commission_mismatch');
            details.commission_diff = (mmtpComm - supplierComm).toFixed(2);
            details.mmtp_commission = mmtpComm.toFixed(2);
            details.supplier_commission = supplierComm.toFixed(2);
          }
        }
        
        // If any issues found, flag as discrepancy
        if (issues.length > 0) {
          match.has_discrepancy = true;
          match.discrepancy_type = issues.join(',');
          match.discrepancy_details = details;
          discrepancies.push(match);
        }
      }
      
      // Update all matches in database
      if (discrepancies.length > 0) {
        logger.debug('[DiscrepancyDetector] Updating discrepancy flags');
        
        for (const disc of discrepancies) {
          await db.ReconTransactionMatch.update({
            has_discrepancy: true,
            discrepancy_type: disc.discrepancy_type,
            discrepancy_details: disc.discrepancy_details
          }, {
            where: { id: disc.id }
          });
        }
      }
      
      logger.info('[DiscrepancyDetector] Detection complete', {
        total_discrepancies: discrepancies.length,
        by_type: this.groupByType(discrepancies)
      });
      
      return discrepancies;
    } catch (error) {
      logger.error('[DiscrepancyDetector] Detection failed', {
        error: error.message,
        run_id: runId
      });
      throw error;
    }
  }
  
  /**
   * Compare status values (normalize differences)
   */
  compareStatus(mmtpStatus, supplierStatus) {
    const normalize = (status) => {
      const s = status.toLowerCase();
      if (['completed', 'success', 'successful'].includes(s)) return 'completed';
      if (['pending', 'processing'].includes(s)) return 'pending';
      if (['failed', 'error', 'rejected'].includes(s)) return 'failed';
      return s;
    };
    
    return normalize(mmtpStatus) === normalize(supplierStatus);
  }
  
  /**
   * Group discrepancies by type
   */
  groupByType(discrepancies) {
    return discrepancies.reduce((acc, disc) => {
      const types = disc.discrepancy_type.split(',');
      types.forEach(type => {
        acc[type] = (acc[type] || 0) + 1;
      });
      return acc;
    }, {});
  }
}

module.exports = DiscrepancyDetector;
