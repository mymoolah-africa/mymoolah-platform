/**
 * EasyPay Reconciliation File Adapter
 * 
 * Parses EasyPay-specific CSV reconciliation files.
 * Format: Comma-delimited CSV with header row
 * 
 * Sample file structure:
 * transaction_id,easypay_code,transaction_type,merchant_id,terminal_id,cashier_id,transaction_timestamp,gross_amount,settlement_status,merchant_name,receipt_number
 * EP_TXN_20260116_001,9123412345678,topup,EP_MERCHANT_12345,EP_TERMINAL_001,CASHIER_789,2026-01-16T13:40:33+02:00,100.00,settled,Pick n Pay - Sandton City,RCP-001234
 * 
 * @module services/reconciliation/adapters/EasyPayAdapter
 */

'use strict';

// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[EasyPayAdapter]', ...args),
  error: (...args) => console.error('[EasyPayAdapter]', ...args),
  warn: (...args) => console.warn('[EasyPayAdapter]', ...args),
  debug: (...args) => console.log('[EasyPayAdapter]', ...args)
};
const { parse } = require('csv-parse/sync');
const moment = require('moment-timezone');

class EasyPayAdapter {
  /**
   * Parse EasyPay CSV file
   * 
   * @param {string} content - File content
   * @param {Object} supplierConfig - Supplier configuration
   * @returns {Promise<Object>} Parsed data { header, body, footer }
   */
  async parse(content, supplierConfig) {
    try {
      // Parse CSV with comma delimiter
      const records = parse(content, {
        delimiter: supplierConfig.delimiter || ',',
        relax_column_count: false,
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length < 2) {
        throw new Error('File must contain at least header and 1 transaction');
      }
      
      // Extract sections
      const headerRow = records[0];
      const bodyRows = records.slice(1);
      
      // Parse header (first row contains column names)
      const header = this.parseHeader(headerRow, supplierConfig, bodyRows);
      
      // Parse body transactions
      const body = bodyRows.map((row, index) => {
        try {
          return this.parseTransaction(row, headerRow, supplierConfig, index + 1);
        } catch (error) {
          logger.error('[EasyPayAdapter] Failed to parse transaction row', {
            row: index + 1,
            error: error.message
          });
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });
      
      // EasyPay files don't have footer - calculate totals from body
      const footer = this.calculateFooter(body);
      
      logger.info('[EasyPayAdapter] Parsed successfully', {
        settlement_date: header.settlement_date,
        transactions: body.length,
        total_amount: footer.total_amount
      });
      
      return { header, body, footer };
    } catch (error) {
      logger.error('[EasyPayAdapter] Parse failed', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Parse header row (column names)
   * Extract settlement date from first transaction
   */
  parseHeader(headerRow, config, bodyRows) {
    // EasyPay header is just column names, no summary data
    // Settlement date will be extracted from first transaction
    let settlementDate = null;
    
    if (bodyRows.length > 0) {
      // Extract date from first transaction (transaction_timestamp column)
      const firstRow = bodyRows[0];
      const timestampIndex = headerRow.findIndex(col => col.toLowerCase() === 'transaction_timestamp');
      if (timestampIndex >= 0 && firstRow[timestampIndex]) {
        const timestampStr = firstRow[timestampIndex];
        try {
          // Parse ISO 8601 timestamp
          const parsed = moment.tz(timestampStr, 'Africa/Johannesburg');
          if (parsed.isValid()) {
            settlementDate = parsed.format('YYYY-MM-DD');
          }
        } catch (error) {
          logger.warn('[EasyPayAdapter] Failed to parse settlement date from first transaction');
        }
      }
    }
    
    return {
      settlement_date: settlementDate || moment.tz('Africa/Johannesburg').format('YYYY-MM-DD'),
      file_type: 'easypay_reconciliation',
      supplier: 'EasyPay'
    };
  }
  
  /**
   * Parse transaction row
   */
  parseTransaction(row, headerRow, config, rowNumber) {
    // Map column names to indices
    const columnMap = {};
    headerRow.forEach((col, index) => {
      columnMap[col.toLowerCase()] = index;
    });
    
    // Extract fields
    const getValue = (fieldName) => {
      const index = columnMap[fieldName.toLowerCase()];
      return index >= 0 ? row[index] : null;
    };
    
    const transactionId = getValue('transaction_id');
    const easypayCode = getValue('easypay_code');
    const transactionType = getValue('transaction_type');
    const merchantId = getValue('merchant_id');
    const terminalId = getValue('terminal_id');
    const cashierId = getValue('cashier_id');
    const timestampStr = getValue('transaction_timestamp');
    const grossAmountStr = getValue('gross_amount');
    const settlementStatus = getValue('settlement_status');
    const merchantName = getValue('merchant_name');
    const receiptNumber = getValue('receipt_number');
    
    // Validate required fields
    if (!transactionId) {
      throw new Error('Missing transaction_id');
    }
    if (!easypayCode) {
      throw new Error('Missing easypay_code');
    }
    if (!transactionType) {
      throw new Error('Missing transaction_type');
    }
    if (!merchantId) {
      throw new Error('Missing merchant_id');
    }
    if (!terminalId) {
      throw new Error('Missing terminal_id');
    }
    if (!timestampStr) {
      throw new Error('Missing transaction_timestamp');
    }
    if (!grossAmountStr) {
      throw new Error('Missing gross_amount');
    }
    if (!settlementStatus) {
      throw new Error('Missing settlement_status');
    }
    
    // Parse timestamp
    let timestamp;
    try {
      timestamp = moment.tz(timestampStr, 'Africa/Johannesburg').toDate();
      if (!moment(timestamp).isValid()) {
        throw new Error('Invalid timestamp format');
      }
    } catch (error) {
      throw new Error(`Invalid transaction_timestamp format: ${timestampStr}`);
    }
    
    // Parse amount
    const grossAmount = this.parseDecimal(grossAmountStr, 'gross_amount');
    
    // Validate transaction type
    if (!['topup', 'cashout'].includes(transactionType.toLowerCase())) {
      throw new Error(`Invalid transaction_type: ${transactionType}. Must be 'topup' or 'cashout'`);
    }
    
    // Validate settlement status
    if (!['settled', 'pending', 'failed'].includes(settlementStatus.toLowerCase())) {
      logger.warn(`[EasyPayAdapter] Unknown settlement_status: ${settlementStatus}`);
    }
    
    return {
      supplier_transaction_id: transactionId,
      supplier_reference: easypayCode,
      supplier_product_code: transactionType,
      supplier_product_name: `EasyPay ${transactionType}`,
      supplier_amount: grossAmount,
      supplier_timestamp: timestamp,
      supplier_status: settlementStatus.toLowerCase(),
      metadata: {
        easypay_code: easypayCode,
        transaction_type: transactionType.toLowerCase(),
        merchant_id: merchantId,
        terminal_id: terminalId,
        cashier_id: cashierId || null,
        merchant_name: merchantName || null,
        receipt_number: receiptNumber || null
      }
    };
  }
  
  /**
   * Calculate footer totals from body
   */
  calculateFooter(body) {
    const totalCount = body.length;
    const totalAmount = body.reduce((sum, txn) => sum + parseFloat(txn.supplier_amount || 0), 0);
    
    // Count by transaction type
    const topupCount = body.filter(txn => txn.metadata?.transaction_type === 'topup').length;
    const cashoutCount = body.filter(txn => txn.metadata?.transaction_type === 'cashout').length;
    
    // Count by status
    const settledCount = body.filter(txn => txn.supplier_status === 'settled').length;
    const pendingCount = body.filter(txn => txn.supplier_status === 'pending').length;
    const failedCount = body.filter(txn => txn.supplier_status === 'failed').length;
    
    return {
      total_count: totalCount,
      total_amount: totalAmount.toFixed(2),
      topup_count: topupCount,
      cashout_count: cashoutCount,
      settled_count: settledCount,
      pending_count: pendingCount,
      failed_count: failedCount
    };
  }
  
  /**
   * Parse decimal value
   */
  parseDecimal(value, fieldName) {
    if (!value) {
      throw new Error(`Missing ${fieldName}`);
    }
    
    const parsed = parseFloat(value);
    if (isNaN(parsed)) {
      throw new Error(`Invalid ${fieldName}: ${value}`);
    }
    
    return parsed;
  }
}

module.exports = EasyPayAdapter;
