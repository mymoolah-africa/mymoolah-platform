/**
 * Flash Reconciliation File Adapter
 * 
 * Parses Flash-specific CSV reconciliation files.
 * Format: Semicolon-delimited CSV with header row
 * 
 * Sample file structure:
 * Date;Reference;Transaction ID;Transaction Type;Product Code;Product;Account Number;Account Name;Gross Amount;Fee;Commission;Net Amount;Status;Metadata
 * 2025/10/29 08:38;87fb6bbb-daca-4e98-b2ec-2dcf99d78849;520861729;Purchase;311;R1 - R4000 1Voucher Token;7111-6222-4444-3692;Test;500.0000;0.0000;1.0000;499.0000;Success;"{""additionalProp1"":""string""}"
 * 
 * @module services/reconciliation/adapters/FlashAdapter
 */

'use strict';

// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[FlashAdapter]', ...args),
  error: (...args) => console.error('[FlashAdapter]', ...args),
  warn: (...args) => console.warn('[FlashAdapter]', ...args),
  debug: (...args) => console.log('[FlashAdapter]', ...args)
};
const { parse } = require('csv-parse/sync');
const moment = require('moment-timezone');

class FlashAdapter {
  /**
   * Parse Flash CSV file
   * 
   * @param {string} content - File content
   * @param {Object} supplierConfig - Supplier configuration
   * @returns {Promise<Object>} Parsed data { header, body, footer }
   */
  async parse(content, supplierConfig) {
    try {
      // Parse CSV with semicolon delimiter
      const records = parse(content, {
        delimiter: supplierConfig.delimiter || ';',
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
          logger.error('[FlashAdapter] Failed to parse transaction row', {
            row: index + 1,
            error: error.message
          });
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });
      
      // Flash files don't have footer - calculate totals from body
      const footer = this.calculateFooter(body);
      
      logger.info('[FlashAdapter] Parsed successfully', {
        settlement_date: header.settlement_date,
        transactions: body.length,
        total_amount: footer.total_amount,
        total_commission: footer.total_commission
      });
      
      return { header, body, footer };
    } catch (error) {
      logger.error('[FlashAdapter] Parse failed', {
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
    // Flash header is just column names, no summary data
    // Settlement date will be extracted from first transaction
    let settlementDate = null;
    
    if (bodyRows.length > 0) {
      // Extract date from first transaction (column 0)
      const firstRow = bodyRows[0];
      const dateStr = firstRow[0];
      if (dateStr) {
        const date = moment.tz(
          dateStr,
          'YYYY/MM/DD HH:mm',
          config.timezone || 'Africa/Johannesburg'
        );
        if (date.isValid()) {
          // Use date part only (YYYY-MM-DD)
          settlementDate = date.format('YYYY-MM-DD');
        }
      }
    }
    
    return {
      file_type: 'flash_reconciliation',
      columns: headerRow,
      settlement_date: settlementDate
    };
  }
  
  /**
   * Parse transaction row
   * 
   * Flash CSV columns (in order):
   * 0: Date
   * 1: Reference
   * 2: Transaction ID
   * 3: Transaction Type
   * 4: Product Code
   * 5: Product
   * 6: Account Number
   * 7: Account Name
   * 8: Gross Amount
   * 9: Fee
   * 10: Commission
   * 11: Net Amount
   * 12: Status
   * 13: Metadata
   */
  parseTransaction(row, headerRow, config, rowNumber) {
    // Map column indices to field names
    const columnMap = {
      date: 0,
      reference: 1,
      transaction_id: 2,
      transaction_type: 3,
      product_code: 4,
      product: 5,
      account_number: 6,
      account_name: 7,
      gross_amount: 8,
      fee: 9,
      commission: 10,
      net_amount: 11,
      status: 12,
      metadata: 13
    };
    
    // Extract date (format: YYYY/MM/DD HH:mm)
    const dateStr = row[columnMap.date];
    if (!dateStr) {
      throw new Error('Missing required field: Date');
    }
    
    const transactionDate = moment.tz(
      dateStr, 
      'YYYY/MM/DD HH:mm', 
      config.timezone || 'Africa/Johannesburg'
    );
    
    if (!transactionDate.isValid()) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    // Extract reference (UUID format)
    const reference = row[columnMap.reference];
    if (!reference) {
      throw new Error('Missing required field: Reference');
    }
    
    // Extract transaction ID
    const transactionId = row[columnMap.transaction_id];
    if (!transactionId) {
      throw new Error('Missing required field: Transaction ID');
    }
    
    // Extract amounts (decimal format, e.g., "500.0000")
    const grossAmount = this.parseDecimal(row[columnMap.gross_amount], 'Gross Amount');
    const fee = this.parseDecimal(row[columnMap.fee], 'Fee');
    const commission = this.parseDecimal(row[columnMap.commission], 'Commission');
    const netAmount = this.parseDecimal(row[columnMap.net_amount], 'Net Amount');
    
    // Extract status (normalize to lowercase for comparison)
    const status = row[columnMap.status];
    if (!status) {
      throw new Error('Missing required field: Status');
    }
    
    // Parse metadata (JSON string with escaped quotes)
    let metadata = null;
    if (row[columnMap.metadata]) {
      try {
        // Flash metadata is JSON string with escaped quotes: "{""key"":""value""}"
        // Need to unescape: "{"key":"value"}"
        const metadataStr = row[columnMap.metadata];
        let unescaped = metadataStr;
        
        // Remove outer quotes if present
        if (unescaped.startsWith('"') && unescaped.endsWith('"')) {
          unescaped = unescaped.slice(1, -1);
        }
        
        // Replace double quotes with single quotes for JSON parsing
        unescaped = unescaped.replace(/""/g, '"');
        
        metadata = JSON.parse(unescaped);
      } catch (error) {
        logger.warn('[FlashAdapter] Failed to parse metadata', {
          row: rowNumber,
          metadata: row[columnMap.metadata],
          error: error.message
        });
        // Continue without metadata
      }
    }
    
    return {
      supplier_transaction_id: transactionId,
      supplier_reference: reference,
      supplier_timestamp: transactionDate.toDate(),
      supplier_product_code: row[columnMap.product_code] || null,
      supplier_product_name: row[columnMap.product] || null,
      supplier_amount: grossAmount, // Use gross amount for reconciliation
      supplier_commission: commission,
      supplier_fee: fee,
      supplier_net_amount: netAmount,
      supplier_status: status.toLowerCase(), // Normalize to lowercase
      supplier_account_number: row[columnMap.account_number] || null,
      supplier_account_name: row[columnMap.account_name] || null,
      supplier_transaction_type: row[columnMap.transaction_type] || null,
      supplier_metadata: metadata,
      row_number: rowNumber
    };
  }
  
  /**
   * Calculate footer totals from body transactions
   * Flash files don't have footer row, so we calculate it
   */
  calculateFooter(body) {
    const totals = body.reduce((acc, txn) => {
      acc.total_count++;
      acc.total_amount += parseFloat(txn.supplier_amount || 0);
      acc.total_commission += parseFloat(txn.supplier_commission || 0);
      acc.total_fee += parseFloat(txn.supplier_fee || 0);
      acc.total_net += parseFloat(txn.supplier_net_amount || 0);
      return acc;
    }, {
      total_count: 0,
      total_amount: 0,
      total_commission: 0,
      total_fee: 0,
      total_net: 0
    });
    
    return {
      total_count: totals.total_count,
      total_amount: totals.total_amount.toFixed(2),
      total_commission: totals.total_commission.toFixed(2),
      total_fee: totals.total_fee.toFixed(2),
      total_net: totals.total_net.toFixed(2)
    };
  }
  
  /**
   * Parse decimal field (handles "500.0000" format)
   */
  parseDecimal(value, fieldName) {
    if (!value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
    
    const decimalValue = parseFloat(value);
    
    if (isNaN(decimalValue)) {
      throw new Error(`Invalid decimal format for ${fieldName}: ${value}`);
    }
    
    return decimalValue.toFixed(2);
  }
}

module.exports = FlashAdapter;
