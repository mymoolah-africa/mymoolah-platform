/**
 * MobileMart Reconciliation File Adapter
 * 
 * Parses MobileMart-specific CSV reconciliation files according to their spec:
 * - Header row: Merchant details and settlement summary
 * - Body rows: Individual transactions
 * - Footer row: Totals validation
 * 
 * Spec Reference: Merchant Recon Spec Final.pdf
 * 
 * @module services/reconciliation/adapters/MobileMartAdapter
 */

'use strict';

// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[MobileMartAdapter]', ...args),
  error: (...args) => console.error('[MobileMartAdapter]', ...args),
  warn: (...args) => console.warn('[MobileMartAdapter]', ...args),
  debug: (...args) => console.log('[MobileMartAdapter]', ...args)
};
const { parse } = require('csv-parse/sync');
const moment = require('moment-timezone');

class MobileMartAdapter {
  /**
   * Parse MobileMart CSV file
   * 
   * @param {string} content - File content
   * @param {Object} supplierConfig - Supplier configuration
   * @returns {Promise<Object>} Parsed data { header, body, footer }
   */
  async parse(content, supplierConfig) {
    try {
      // Parse CSV
      const records = parse(content, {
        delimiter: supplierConfig.delimiter || ',',
        relax_column_count: false,
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length < 3) {
        throw new Error('File must contain at least header, 1 transaction, and footer');
      }
      
      // Extract sections
      const headerRow = records[0];
      const bodyRows = records.slice(1, records.length - 1);
      const footerRow = records[records.length - 1];
      
      // Parse header
      const header = this.parseHeader(headerRow, supplierConfig);
      
      // Parse body transactions
      const body = bodyRows.map((row, index) => {
        try {
          return this.parseTransaction(row, supplierConfig, index + 1);
        } catch (error) {
          logger.error('[MobileMartAdapter] Failed to parse transaction row', {
            row: index + 1,
            error: error.message
          });
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });
      
      // Parse footer
      const footer = this.parseFooter(footerRow, supplierConfig);
      
      logger.info('[MobileMartAdapter] Parsed successfully', {
        merchant_id: header.merchant_id,
        settlement_date: header.settlement_date,
        transactions: body.length,
        total_amount: footer.total_amount
      });
      
      return { header, body, footer };
    } catch (error) {
      logger.error('[MobileMartAdapter] Parse failed', {
        error: error.message
      });
      throw error;
    }
  }
  
  /**
   * Parse header row
   * 
   * Format: merchant_id, merchant_name, settlement_date, total_transactions, total_amount, total_commission
   */
  parseHeader(row, config) {
    const schema = config.schema_definition.header.fields;
    
    return {
      merchant_id: this.extractField(row, schema.merchant_id, 'merchant_id'),
      merchant_name: this.extractField(row, schema.merchant_name, 'merchant_name'),
      settlement_date: this.extractDateField(row, schema.settlement_date, 'settlement_date', config.timezone),
      total_transactions: this.extractIntegerField(row, schema.total_transactions, 'total_transactions'),
      total_amount: this.extractDecimalField(row, schema.total_amount, 'total_amount'),
      total_commission: this.extractDecimalField(row, schema.total_commission, 'total_commission')
    };
  }
  
  /**
   * Parse transaction row
   * 
   * Format: transaction_id, transaction_date, product_code, product_name, amount, commission, status, reference
   */
  parseTransaction(row, config, rowNumber) {
    const schema = config.schema_definition.body.fields;
    
    return {
      supplier_transaction_id: this.extractField(row, schema.transaction_id, 'transaction_id'),
      supplier_timestamp: this.extractDateTimeField(row, schema.transaction_date, 'transaction_date', config.timezone),
      supplier_product_code: this.extractField(row, schema.product_code, 'product_code'),
      supplier_product_name: this.extractField(row, schema.product_name, 'product_name'),
      supplier_amount: this.extractDecimalField(row, schema.amount, 'amount'),
      supplier_commission: this.extractDecimalField(row, schema.commission, 'commission'),
      supplier_status: this.extractField(row, schema.status, 'status'),
      supplier_reference: this.extractField(row, schema.reference, 'reference', false), // Optional
      row_number: rowNumber
    };
  }
  
  /**
   * Parse footer row
   * 
   * Format: total_count, total_amount, total_commission
   */
  parseFooter(row, config) {
    const schema = config.schema_definition.footer.fields;
    
    return {
      total_count: this.extractIntegerField(row, schema.total_count, 'total_count'),
      total_amount: this.extractDecimalField(row, schema.total_amount, 'total_amount'),
      total_commission: this.extractDecimalField(row, schema.total_commission, 'total_commission')
    };
  }
  
  /**
   * Extract string field from row
   */
  extractField(row, fieldDef, fieldName, required = true) {
    const value = row[fieldDef.column];
    
    if (required && !value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
    
    return value || null;
  }
  
  /**
   * Extract date field (YYYY-MM-DD)
   */
  extractDateField(row, fieldDef, fieldName, timezone) {
    const value = row[fieldDef.column];
    
    if (!value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
    
    const date = moment.tz(value, fieldDef.format || 'YYYY-MM-DD', timezone);
    
    if (!date.isValid()) {
      throw new Error(`Invalid date format for ${fieldName}: ${value}`);
    }
    
    return date.format('YYYY-MM-DD');
  }
  
  /**
   * Extract datetime field (YYYY-MM-DD HH:mm:ss)
   */
  extractDateTimeField(row, fieldDef, fieldName, timezone) {
    const value = row[fieldDef.column];
    
    if (!value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
    
    const datetime = moment.tz(value, fieldDef.format || 'YYYY-MM-DD HH:mm:ss', timezone);
    
    if (!datetime.isValid()) {
      throw new Error(`Invalid datetime format for ${fieldName}: ${value}`);
    }
    
    return datetime.toDate();
  }
  
  /**
   * Extract integer field
   */
  extractIntegerField(row, fieldDef, fieldName) {
    const value = row[fieldDef.column];
    
    if (!value) {
      throw new Error(`Missing required field: ${fieldName}`);
    }
    
    const intValue = parseInt(value, 10);
    
    if (isNaN(intValue)) {
      throw new Error(`Invalid integer format for ${fieldName}: ${value}`);
    }
    
    return intValue;
  }
  
  /**
   * Extract decimal field
   */
  extractDecimalField(row, fieldDef, fieldName) {
    const value = row[fieldDef.column];
    
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

module.exports = MobileMartAdapter;
