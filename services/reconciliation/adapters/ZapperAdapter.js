/**
 * Zapper Reconciliation File Adapter
 * 
 * Parses Zapper daily mark-off CSV files.
 * Format: Comma-delimited CSV with header row
 * 
 * Expected columns (based on Sarah-Lee Fortuin's recon data):
 * ZapperId,TransactionProcessorReference,PaymentCreatedUTCDate,ProcessedAmount,
 * ZapperMerchantId,ZoomLoginMerchantName,OrganisationReference,PaymentMethodType,
 * PaymentMethodTitle,TotalThirdPartyVouchersRedeemedAmount,TotalMerchantVouchersRedeemedAmount
 * 
 * Sample row:
 * LX6N8803ZQ5Z35PQ58,1887c896-5d07-c525-6fd2-f653678fcbc3,Jan 5 2026 8:32am,5.00,52843,Easybet Group (Pty) Limited,2f053500-c05c-11f0-b818-e12393dd6bc4,2,ExternalPaymentMethod,0.00,0.00
 * 
 * @module services/reconciliation/adapters/ZapperAdapter
 */

'use strict';

const logger = {
  info: (...args) => console.log('[ZapperAdapter]', ...args),
  error: (...args) => console.error('[ZapperAdapter]', ...args),
  warn: (...args) => console.warn('[ZapperAdapter]', ...args),
  debug: (...args) => console.log('[ZapperAdapter]', ...args)
};
const { parse } = require('csv-parse/sync');
const moment = require('moment-timezone');

class ZapperAdapter {
  /**
   * Parse Zapper CSV file
   * 
   * @param {string} content - File content
   * @param {Object} supplierConfig - Supplier configuration
   * @returns {Promise<Object>} Parsed data { header, body, footer }
   */
  async parse(content, supplierConfig) {
    try {
      const records = parse(content, {
        delimiter: supplierConfig.delimiter || ',',
        relax_column_count: true,
        skip_empty_lines: true,
        trim: true
      });
      
      if (records.length < 2) {
        throw new Error('File must contain at least header and 1 transaction');
      }
      
      const headerRow = records[0];
      const bodyRows = records.slice(1);
      
      const header = this.parseHeader(headerRow, supplierConfig, bodyRows);
      
      const body = bodyRows.map((row, index) => {
        try {
          return this.parseTransaction(row, headerRow, supplierConfig, index + 1);
        } catch (error) {
          logger.error('Failed to parse transaction row', {
            row: index + 1,
            error: error.message
          });
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });
      
      const footer = this.calculateFooter(body);
      
      logger.info('Parsed successfully', {
        settlement_date: header.settlement_date,
        transactions: body.length,
        total_amount: footer.total_amount
      });
      
      return { header, body, footer };
    } catch (error) {
      logger.error('Parse failed', { error: error.message });
      throw error;
    }
  }
  
  /**
   * Parse header row and extract settlement date from first transaction
   */
  parseHeader(headerRow, config, bodyRows) {
    let settlementDate = null;
    
    if (bodyRows.length > 0) {
      const dateStr = bodyRows[0][this.getColumnIndex(headerRow, 'PaymentCreatedUTCDate')];
      if (dateStr) {
        const date = this.parseZapperDate(dateStr, config.timezone);
        if (date && date.isValid()) {
          settlementDate = date.format('YYYY-MM-DD');
        }
      }
    }
    
    return {
      file_type: 'zapper_markoff',
      columns: headerRow,
      settlement_date: settlementDate
    };
  }
  
  /**
   * Parse a single transaction row.
   * 
   * Zapper CSV columns (based on recon data from Sarah-Lee):
   *  0: ZapperId
   *  1: TransactionProcessorReference
   *  2: TotalThirdPartyVouchersRedeemedAmount
   *  3: TotalMerchantVouchersRedeemedAmount
   *  4: PaymentCreatedUTCDate
   *  5: InstanceId
   *  6: Card Processor Name
   *  7: PaymentMethodType
   *  8: PaymentMethodTitle
   *  9: PaymentMethodTypeId
   * 10: PaymentMethodTypeName
   * 11: ProcessedAmount
   * 12: ZapperMerchantId
   * 13: ZoomLoginMerchantName
   * 14: OrganisationReference
   * 15: Organisation Name
   * 16: ZoomloginMerchantId
   * 
   * Column order may vary — we use header-based lookup for resilience.
   */
  parseTransaction(row, headerRow, config, rowNumber) {
    const zapperId = this.getField(row, headerRow, 'ZapperId');
    if (!zapperId) {
      throw new Error('Missing required field: ZapperId');
    }
    
    const processorRef = this.getField(row, headerRow, 'TransactionProcessorReference');
    
    const dateStr = this.getField(row, headerRow, 'PaymentCreatedUTCDate');
    if (!dateStr) {
      throw new Error('Missing required field: PaymentCreatedUTCDate');
    }
    const transactionDate = this.parseZapperDate(dateStr, config.timezone || 'UTC');
    if (!transactionDate || !transactionDate.isValid()) {
      throw new Error(`Invalid date format: ${dateStr}`);
    }
    
    const processedAmountStr = this.getField(row, headerRow, 'ProcessedAmount');
    if (!processedAmountStr) {
      throw new Error('Missing required field: ProcessedAmount');
    }
    const processedAmount = this.parseDecimal(processedAmountStr, 'ProcessedAmount');
    
    const merchantName = this.getField(row, headerRow, 'ZoomLoginMerchantName') 
      || this.getField(row, headerRow, 'ZoomloginMerchantName');
    const merchantId = this.getField(row, headerRow, 'ZapperMerchantId');
    const orgRef = this.getField(row, headerRow, 'OrganisationReference');
    const paymentMethodType = this.getField(row, headerRow, 'PaymentMethodType');
    const paymentMethodTitle = this.getField(row, headerRow, 'PaymentMethodTitle');
    const thirdPartyVouchers = this.parseDecimalSafe(
      this.getField(row, headerRow, 'TotalThirdPartyVouchersRedeemedAmount')
    );
    const merchantVouchers = this.parseDecimalSafe(
      this.getField(row, headerRow, 'TotalMerchantVouchersRedeemedAmount')
    );
    
    return {
      supplier_transaction_id: zapperId,
      supplier_reference: processorRef || zapperId,
      supplier_timestamp: transactionDate.toDate(),
      supplier_product_code: merchantId || null,
      supplier_product_name: merchantName || null,
      supplier_amount: processedAmount,
      supplier_commission: '0.00',
      supplier_fee: '0.00',
      supplier_net_amount: processedAmount,
      supplier_status: 'success',
      supplier_account_number: orgRef || null,
      supplier_account_name: merchantName || null,
      supplier_transaction_type: paymentMethodTitle || paymentMethodType || null,
      supplier_metadata: {
        zapper_merchant_id: merchantId,
        payment_method_type: paymentMethodType,
        payment_method_title: paymentMethodTitle,
        third_party_vouchers: thirdPartyVouchers,
        merchant_vouchers: merchantVouchers,
        organisation_reference: orgRef
      },
      row_number: rowNumber
    };
  }
  
  /**
   * Calculate footer totals from body transactions
   */
  calculateFooter(body) {
    const totals = body.reduce((acc, txn) => {
      acc.total_count++;
      acc.total_amount += parseFloat(txn.supplier_amount || 0);
      return acc;
    }, {
      total_count: 0,
      total_amount: 0
    });
    
    return {
      total_count: totals.total_count,
      total_amount: totals.total_amount.toFixed(2)
    };
  }
  
  /**
   * Get column index by header name (case-insensitive, whitespace-tolerant)
   */
  getColumnIndex(headerRow, columnName) {
    const normalized = columnName.toLowerCase().replace(/\s+/g, '');
    return headerRow.findIndex(h => 
      h.toLowerCase().replace(/\s+/g, '') === normalized
    );
  }
  
  /**
   * Get field value by header name
   */
  getField(row, headerRow, columnName) {
    const idx = this.getColumnIndex(headerRow, columnName);
    if (idx === -1) return null;
    const val = row[idx];
    return (val !== undefined && val !== null && val !== '') ? val : null;
  }
  
  /**
   * Parse Zapper date formats.
   * Zapper uses: "Jan 5, 2026 8:32am" or "Dec 11, 2025 9:25am"
   */
  parseZapperDate(dateStr, timezone) {
    const formats = [
      'MMM D, YYYY h:mma',
      'MMM D, YYYY h:mm a',
      'MMM DD, YYYY h:mma',
      'MMM DD, YYYY h:mm a',
      'YYYY-MM-DDTHH:mm:ssZ',
      'YYYY-MM-DD HH:mm:ss',
      'YYYY/MM/DD HH:mm'
    ];
    
    for (const fmt of formats) {
      const d = moment.tz(dateStr.trim(), fmt, timezone || 'UTC');
      if (d.isValid()) return d;
    }
    
    const fallback = moment(dateStr.trim());
    return fallback.isValid() ? fallback : null;
  }
  
  /**
   * Parse decimal field (required)
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
  
  /**
   * Parse decimal field (optional, returns '0.00' on failure)
   */
  parseDecimalSafe(value) {
    if (!value) return '0.00';
    const decimalValue = parseFloat(value);
    return isNaN(decimalValue) ? '0.00' : decimalValue.toFixed(2);
  }
}

module.exports = ZapperAdapter;
