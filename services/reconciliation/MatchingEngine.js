/**
 * Matching Engine
 * 
 * Matches MMTP transactions with supplier records using:
 * - Exact matching (transaction ID, reference)
 * - Fuzzy matching (amount + timestamp + product)
 * - ML-assisted confidence scoring
 * 
 * @module services/reconciliation/MatchingEngine
 */

'use strict';

// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[MatchingEngine]', ...args),
  error: (...args) => console.error('[MatchingEngine]', ...args),
  warn: (...args) => console.warn('[MatchingEngine]', ...args),
  debug: (...args) => console.log('[MatchingEngine]', ...args)
};
const db = require('../../models');
const moment = require('moment');

class MatchingEngine {
  /**
   * Match MMTP transactions with supplier records
   * 
   * @param {Array} mmtpTransactions - MMTP transaction records
   * @param {Array} supplierRecords - Parsed supplier records
   * @param {Object} supplierConfig - Supplier configuration
   * @param {string} runId - Reconciliation run ID
   * @returns {Promise<Object>} Match results
   */
  async match(mmtpTransactions, supplierRecords, supplierConfig, runId) {
    try {
      logger.info('[MatchingEngine] Starting matching', {
        mmtp_count: mmtpTransactions.length,
        supplier_count: supplierRecords.length,
        run_id: runId
      });
      
      const matchingRules = supplierConfig.matching_rules;
      const toleranceSeconds = supplierConfig.timestamp_tolerance_seconds || 300;
      const toleranceCents = supplierConfig.amount_tolerance_cents || 0;
      
      const matches = [];
      const matched = new Set(); // Track matched MMTP transactions
      const matchedSupplier = new Set(); // Track matched supplier records
      
      let exactMatches = 0;
      let fuzzyMatches = 0;
      
      // PHASE 1: Exact matching on primary keys
      logger.debug('[MatchingEngine] Phase 1: Exact matching');
      
      for (const mmtpTxn of mmtpTransactions) {
        if (matched.has(mmtpTxn.transaction_id)) continue;
        
        for (const supplierTxn of supplierRecords) {
          if (matchedSupplier.has(supplierTxn.supplier_transaction_id)) continue;
          
          // Try matching on transaction_id
          if (this.exactMatchTransactionId(mmtpTxn, supplierTxn, matchingRules)) {
            matches.push(await this.createMatch(
              mmtpTxn,
              supplierTxn,
              'exact_match',
              'transaction_id',
              1.0,
              runId
            ));
            
            matched.add(mmtpTxn.transaction_id);
            matchedSupplier.add(supplierTxn.supplier_transaction_id);
            exactMatches++;
            break;
          }
          
          // Try matching on reference
          if (this.exactMatchReference(mmtpTxn, supplierTxn, matchingRules)) {
            matches.push(await this.createMatch(
              mmtpTxn,
              supplierTxn,
              'exact_match',
              'reference',
              1.0,
              runId
            ));
            
            matched.add(mmtpTxn.transaction_id);
            matchedSupplier.add(supplierTxn.supplier_transaction_id);
            exactMatches++;
            break;
          }
        }
      }
      
      logger.debug('[MatchingEngine] Phase 1 complete', { exact_matches: exactMatches });
      
      // PHASE 2: Fuzzy matching on secondary keys (if enabled)
      if (matchingRules.fuzzy_match?.enabled) {
        logger.debug('[MatchingEngine] Phase 2: Fuzzy matching');
        const minConfidence = matchingRules.fuzzy_match.min_confidence || 0.85;
        
        for (const mmtpTxn of mmtpTransactions) {
          if (matched.has(mmtpTxn.transaction_id)) continue;
          
          let bestMatch = null;
          let bestConfidence = 0;
          
          for (const supplierTxn of supplierRecords) {
            if (matchedSupplier.has(supplierTxn.supplier_transaction_id)) continue;
            
            const confidence = this.calculateMatchConfidence(
              mmtpTxn,
              supplierTxn,
              matchingRules,
              toleranceSeconds,
              toleranceCents
            );
            
            if (confidence >= minConfidence && confidence > bestConfidence) {
              bestMatch = supplierTxn;
              bestConfidence = confidence;
            }
          }
          
          if (bestMatch) {
            matches.push(await this.createMatch(
              mmtpTxn,
              bestMatch,
              'fuzzy_match',
              'amount_timestamp_product',
              bestConfidence,
              runId
            ));
            
            matched.add(mmtpTxn.transaction_id);
            matchedSupplier.add(bestMatch.supplier_transaction_id);
            fuzzyMatches++;
          }
        }
        
        logger.debug('[MatchingEngine] Phase 2 complete', { fuzzy_matches: fuzzyMatches });
      }
      
      // PHASE 3: Record unmatched transactions
      logger.debug('[MatchingEngine] Phase 3: Recording unmatched');
      
      const unmatchedMMTP = [];
      for (const mmtpTxn of mmtpTransactions) {
        if (!matched.has(mmtpTxn.transaction_id)) {
          matches.push(await this.createMatch(
            mmtpTxn,
            null,
            'unmatched_mmtp',
            null,
            null,
            runId
          ));
          unmatchedMMTP.push(mmtpTxn);
        }
      }
      
      const unmatchedSupplier = [];
      for (const supplierTxn of supplierRecords) {
        if (!matchedSupplier.has(supplierTxn.supplier_transaction_id)) {
          matches.push(await this.createMatch(
            null,
            supplierTxn,
            'unmatched_supplier',
            null,
            null,
            runId
          ));
          unmatchedSupplier.push(supplierTxn);
        }
      }
      
      // Save all matches to database
      logger.debug('[MatchingEngine] Saving matches to database');
      await db.ReconTransactionMatch.bulkCreate(matches);
      
      // Calculate totals
      const totalAmountMMTP = mmtpTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const totalAmountSupplier = supplierRecords.reduce((sum, t) => sum + parseFloat(t.supplier_amount || 0), 0);
      
      logger.info('[MatchingEngine] Matching complete', {
        total_matches: matches.length,
        exact_matches: exactMatches,
        fuzzy_matches: fuzzyMatches,
        unmatched_mmtp: unmatchedMMTP.length,
        unmatched_supplier: unmatchedSupplier.length,
        match_rate: ((exactMatches + fuzzyMatches) / mmtpTransactions.length * 100).toFixed(2) + '%'
      });
      
      return {
        matches,
        exactMatches,
        fuzzyMatches,
        unmatchedMMTP,
        unmatchedSupplier,
        totalAmountMMTP,
        totalAmountSupplier
      };
    } catch (error) {
      logger.error('[MatchingEngine] Matching failed', {
        error: error.message,
        run_id: runId
      });
      throw error;
    }
  }
  
  /**
   * Exact match on transaction ID
   */
  exactMatchTransactionId(mmtpTxn, supplierTxn, rules) {
    if (!rules.primary.includes('transaction_id')) return false;
    
    return mmtpTxn.transaction_id === supplierTxn.supplier_transaction_id ||
           mmtpTxn.reference === supplierTxn.supplier_transaction_id;
  }
  
  /**
   * Exact match on reference number
   */
  exactMatchReference(mmtpTxn, supplierTxn, rules) {
    if (!rules.primary.includes('reference')) return false;
    if (!mmtpTxn.reference || !supplierTxn.supplier_reference) return false;
    
    return mmtpTxn.reference === supplierTxn.supplier_reference;
  }
  
  /**
   * Calculate fuzzy match confidence score (0.0 - 1.0)
   */
  calculateMatchConfidence(mmtpTxn, supplierTxn, rules, toleranceSeconds, toleranceCents) {
    let score = 0;
    let maxScore = 0;
    
    // Amount match (weight: 40%)
    if (rules.secondary.includes('amount')) {
      maxScore += 0.40;
      const mmtpAmount = parseFloat(mmtpTxn.amount || 0);
      const supplierAmount = parseFloat(supplierTxn.supplier_amount || 0);
      const diff = Math.abs(mmtpAmount - supplierAmount) * 100; // Convert to cents
      
      if (diff <= toleranceCents) {
        score += 0.40;
      } else if (diff <= toleranceCents * 2) {
        score += 0.20;
      }
    }
    
    // Timestamp match (weight: 30%)
    if (rules.secondary.includes('timestamp')) {
      maxScore += 0.30;
      const mmtpTime = moment(mmtpTxn.timestamp);
      const supplierTime = moment(supplierTxn.supplier_timestamp);
      const diffSeconds = Math.abs(mmtpTime.diff(supplierTime, 'seconds'));
      
      if (diffSeconds <= toleranceSeconds) {
        score += 0.30;
      } else if (diffSeconds <= toleranceSeconds * 2) {
        score += 0.15;
      }
    }
    
    // Product match (weight: 30%)
    if (rules.secondary.includes('product_code')) {
      maxScore += 0.30;
      
      // Try exact product code match
      if (mmtpTxn.supplier_product_code === supplierTxn.supplier_product_code) {
        score += 0.30;
      } else {
        // Try fuzzy product name match
        const similarity = this.calculateStringSimilarity(
          mmtpTxn.product_name || '',
          supplierTxn.supplier_product_name || ''
        );
        score += 0.30 * similarity;
      }
    }
    
    return maxScore > 0 ? score / maxScore : 0;
  }
  
  /**
   * Calculate string similarity (Levenshtein distance)
   */
  calculateStringSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();
    
    const len1 = s1.length;
    const len2 = s2.length;
    
    if (len1 === 0) return len2 === 0 ? 1 : 0;
    if (len2 === 0) return 0;
    
    const matrix = [];
    
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }
    
    const distance = matrix[len1][len2];
    const maxLen = Math.max(len1, len2);
    return 1 - (distance / maxLen);
  }
  
  /**
   * Create match record
   */
  async createMatch(mmtpTxn, supplierTxn, matchStatus, matchMethod, confidence, runId) {
    return {
      run_id: runId,
      
      // MMTP data
      mmtp_transaction_id: mmtpTxn?.transaction_id || null,
      mmtp_order_id: mmtpTxn?.order_id || null,
      mmtp_reference: mmtpTxn?.reference || null,
      mmtp_amount: mmtpTxn?.amount || null,
      mmtp_commission: mmtpTxn?.commission || null,
      mmtp_status: mmtpTxn?.status || null,
      mmtp_timestamp: mmtpTxn?.timestamp || null,
      mmtp_product_id: mmtpTxn?.product_id || null,
      mmtp_product_name: mmtpTxn?.product_name || null,
      mmtp_metadata: mmtpTxn ? {
        supplier_id: mmtpTxn.supplier_id,
        supplier_product_code: mmtpTxn.supplier_product_code
      } : null,
      
      // Supplier data
      supplier_transaction_id: supplierTxn?.supplier_transaction_id || null,
      supplier_reference: supplierTxn?.supplier_reference || null,
      supplier_amount: supplierTxn?.supplier_amount || null,
      supplier_commission: supplierTxn?.supplier_commission || null,
      supplier_status: supplierTxn?.supplier_status || null,
      supplier_timestamp: supplierTxn?.supplier_timestamp || null,
      supplier_product_code: supplierTxn?.supplier_product_code || null,
      supplier_product_name: supplierTxn?.supplier_product_name || null,
      supplier_metadata: supplierTxn || null,
      
      // Match result
      match_status: matchStatus,
      match_method: matchMethod,
      match_confidence: confidence,
      
      // Discrepancy (will be detected in next phase)
      has_discrepancy: false,
      resolution_status: 'pending'
    };
  }
}

module.exports = MatchingEngine;
