/**
 * Flash Reconciliation File Generator
 * 
 * Generates CSV reconciliation files for Flash as per their requirements:
 * - Date
 * - Product_id
 * - Product_description
 * - Amount
 * - Partner_transaction_reference
 * - Flash_transactionID
 * - Transaction_state
 * 
 * @module services/reconciliation/FlashReconciliationFileGenerator
 */

'use strict';

const fs = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

// Simple logger using console
const logger = {
  info: (...args) => console.log('[FlashReconFileGenerator]', ...args),
  error: (...args) => console.error('[FlashReconFileGenerator]', ...args),
  warn: (...args) => console.warn('[FlashReconFileGenerator]', ...args)
};

class FlashReconciliationFileGenerator {
  constructor() {
    this.timezone = 'Africa/Johannesburg';
  }
  
  /**
   * Generate Flash reconciliation file from MMTP transactions
   * 
   * @param {Array} transactions - MMTP transactions for the period
   * @param {Date} settlementDate - Settlement date
   * @param {string} outputPath - Output file path
   * @returns {Promise<string>} Generated file path
   */
  async generate(transactions, settlementDate, outputPath) {
    try {
      logger.info('[FlashReconFileGenerator] Generating reconciliation file', {
        transaction_count: transactions.length,
        settlement_date: settlementDate
      });
      
      // Generate CSV content
      const csvLines = [];
      
      // Header row (comma-delimited for Flash upload requirement)
      csvLines.push('Date,Product_id,Product_description,Amount,Partner_transaction_reference,Flash_transactionID,Transaction_state');
      
      // Body rows
      for (const txn of transactions) {
        const row = this.formatTransactionRow(txn, settlementDate);
        csvLines.push(row);
      }
      
      // Write to file
      const csvContent = csvLines.join('\n');
      await fs.writeFile(outputPath, csvContent, 'utf-8');
      
      logger.info('[FlashReconFileGenerator] File generated successfully', {
        file: outputPath,
        rows: csvLines.length - 1 // Exclude header
      });
      
      return outputPath;
    } catch (error) {
      logger.error('[FlashReconFileGenerator] Failed to generate file', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Format transaction row for Flash CSV
   */
  formatTransactionRow(txn, settlementDate) {
    const date = moment(settlementDate).tz(this.timezone).format('YYYY/MM/DD HH:mm');
    const productId = txn.product_id || txn.product_variant?.supplier_product_code || '';
    const productDescription = txn.product_name || txn.product_variant?.product?.name || '';
    const amount = (txn.amount || 0).toFixed(2);
    const partnerRef = txn.reference_number || txn.transaction_id || '';
    const flashTransactionId = txn.supplier_reference || txn.supplier_transaction_id || '';
    const transactionState = this.mapTransactionState(txn.status);
    
    // CSV format: Date,Product_id,Product_description,Amount,Partner_transaction_reference,Flash_transactionID,Transaction_state
    // Escape commas in product description if present
    const escapedProductDesc = productDescription.includes(',') 
      ? `"${productDescription}"` 
      : productDescription;
    
    return `${date},${productId},${escapedProductDesc},${amount},${partnerRef},${flashTransactionId},${transactionState}`;
  }
  
  /**
   * Map MMTP transaction status to Flash transaction state
   */
  mapTransactionState(mmtpStatus) {
    const statusMap = {
      'completed': 'Success',
      'pending': 'Pending',
      'failed': 'Failed',
      'cancelled': 'Cancelled',
      'refunded': 'Refunded'
    };
    
    return statusMap[mmtpStatus?.toLowerCase()] || 'Unknown';
  }
}

module.exports = FlashReconciliationFileGenerator;
