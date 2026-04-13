/**
 * MobileMart Reconciliation File Adapter
 * 
 * Parses MobileMart Fulcrum pipe-delimited recon files per:
 *   "Merchant Recon Spec Final (1).pdf" — Version 1.1, Jan 2025
 *
 * File format:
 *   Name:  FULCRUM.MERCHANT.[NAME].RECON.[DATETIME].txt
 *   Encoding: Plain text, pipe-delimited (|)
 *   Sections: Header (H), Body (D rows), Footer (T)
 *
 * Header:  H|<version>|<CCYYMMDD>
 * Body:    D|<vasType>|<vasCategory>|<provider>|<fulcrumTxnId>|<merchantTxnId>|
 *          <txnType>|<txnStatus>|<date CCYYMMDD>|<time HHMMSS>|<tenderType>|
 *          <amount>|<barcode>|<productName>|<serialNumber>|<msisdn>|
 *          <accountNumber>|<meterNumber>|<unitType>|<units>|<municipality>|
 *          <freeBasicElectricity>|<fbeUnits>|<tenderPAN>
 * Footer:  T|<recordCount>
 *
 * Amount is in cents with implied decimal (e.g., 9900 = R99.00, -9900 = -R99.00).
 * Record count in footer includes header + all body rows + footer itself.
 *
 * @module services/reconciliation/adapters/MobileMartAdapter
 */

'use strict';

const logger = {
  info: (...args) => console.log('[MobileMartAdapter]', ...args),
  error: (...args) => console.error('[MobileMartAdapter]', ...args),
  warn: (...args) => console.warn('[MobileMartAdapter]', ...args),
  debug: (...args) => console.log('[MobileMartAdapter]', ...args)
};
const moment = require('moment-timezone');

/** Body field positions (0-indexed after splitting on pipe) */
const BODY = {
  RECORD_ID:        0,   // Always 'D'
  VAS_TYPE:         1,   // Airtime | Data | Voucher | Bill Payment | Utility
  VAS_CATEGORY:     2,   // Pinned | Pinless | Betting | Gaming | Services | ...
  PROVIDER:         3,   // Content creator / service provider name
  FULCRUM_TXN_ID:   4,   // Unique Fulcrum GUID
  MERCHANT_TXN_ID:  5,   // MMTP's transaction reference
  TXN_TYPE:         6,   // Payment / Purchase
  TXN_STATUS:       7,   // Successful | Binned
  TXN_DATE:         8,   // CCYYMMDD
  TXN_TIME:         9,   // HHMMSS
  TENDER_TYPE:     10,   // Credit Card | Debit Card | Cash | Wallet | EFT | ...
  AMOUNT:          11,   // Cents with implied decimal
  BARCODE:         12,   // MobileMart barcode (optional)
  PRODUCT_NAME:    13,   // Product name
  SERIAL_NUMBER:   14,   // Voucher/PIN serial (optional)
  MSISDN:          15,   // Cellphone number (optional)
  ACCOUNT_NUMBER:  16,   // Customer account / SA ID / smart card (optional)
  METER_NUMBER:    17,   // Electricity meter (optional)
  UNIT_TYPE:       18,   // KWH | KI | m3 (optional)
  UNITS:           19,   // Quantity dispensed (optional)
  MUNICIPALITY:    20,   // Municipality name (optional)
  FREE_BASIC_ELEC: 21,   // True | False (optional)
  FBE_UNITS:       22,   // Free basic electricity units (optional)
  TENDER_PAN:      23    // Card PAN (optional)
};

class MobileMartAdapter {
  /**
   * Parse MobileMart Fulcrum recon file
   *
   * @param {string|Buffer} content - Raw file content
   * @param {Object} supplierConfig - Supplier configuration from DB
   * @returns {Promise<Object>} { header, body, footer }
   */
  async parse(content, supplierConfig) {
    try {
      const text = typeof content === 'string' ? content : content.toString('utf-8');
      const lines = text
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l.length > 0);

      if (lines.length < 3) {
        throw new Error('File must contain at least header (H), 1 transaction (D), and footer (T)');
      }

      const headerLine = lines[0];
      const footerLine = lines[lines.length - 1];
      const bodyLines = lines.slice(1, lines.length - 1);

      if (!headerLine.startsWith('H')) {
        throw new Error(`Invalid header: expected line starting with 'H', got '${headerLine.substring(0, 20)}'`);
      }
      if (!footerLine.startsWith('T')) {
        throw new Error(`Invalid footer: expected line starting with 'T', got '${footerLine.substring(0, 20)}'`);
      }

      const header = this.parseHeader(headerLine, supplierConfig);

      const body = bodyLines.map((line, index) => {
        try {
          return this.parseTransaction(line, supplierConfig, index + 1);
        } catch (error) {
          logger.error('Failed to parse transaction row', {
            row: index + 1,
            error: error.message
          });
          throw new Error(`Row ${index + 1}: ${error.message}`);
        }
      });

      const footer = this.parseFooter(footerLine, lines.length);

      const totalAmount = body.reduce((sum, txn) => sum + parseFloat(txn.supplier_amount), 0);

      logger.info('Parsed successfully', {
        settlement_date: header.settlement_date,
        transactions: body.length,
        total_amount: totalAmount.toFixed(2)
      });

      return { header, body, footer };
    } catch (error) {
      logger.error('Parse failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Parse header line: H|<version>|<CCYYMMDD>
   */
  parseHeader(line, config) {
    const fields = line.split('|');

    if (fields[0] !== 'H') {
      throw new Error(`Invalid header identifier: '${fields[0]}'`);
    }

    const version = fields[1] || '1';
    const dateStr = fields[2];

    if (!dateStr || dateStr.length !== 8) {
      throw new Error(`Invalid header date: '${dateStr}' (expected CCYYMMDD)`);
    }

    const tz = config.timezone || 'Africa/Johannesburg';
    const settlementDate = moment.tz(dateStr, 'YYYYMMDD', tz);

    if (!settlementDate.isValid()) {
      throw new Error(`Cannot parse header date: '${dateStr}'`);
    }

    return {
      file_type: 'fulcrum_recon',
      version,
      settlement_date: settlementDate.format('YYYY-MM-DD')
    };
  }

  /**
   * Parse a single body line (D record) into our normalised transaction shape.
   */
  parseTransaction(line, config, rowNumber) {
    const fields = line.split('|');

    if (fields[BODY.RECORD_ID] !== 'D') {
      throw new Error(`Expected 'D' record identifier, got '${fields[BODY.RECORD_ID]}'`);
    }

    const fulcrumTxnId = this.requireField(fields, BODY.FULCRUM_TXN_ID, 'fulcrum_txn_id');
    const merchantTxnId = this.optionalField(fields, BODY.MERCHANT_TXN_ID);
    const vasType = this.requireField(fields, BODY.VAS_TYPE, 'vas_type');
    const vasCategory = this.optionalField(fields, BODY.VAS_CATEGORY);
    const provider = this.requireField(fields, BODY.PROVIDER, 'provider');
    const txnType = this.optionalField(fields, BODY.TXN_TYPE);
    const txnStatus = this.requireField(fields, BODY.TXN_STATUS, 'txn_status');
    const dateStr = this.requireField(fields, BODY.TXN_DATE, 'txn_date');
    const timeStr = this.optionalField(fields, BODY.TXN_TIME) || '000000';
    const productName = this.optionalField(fields, BODY.PRODUCT_NAME);

    const tz = config.timezone || 'Africa/Johannesburg';
    const timestamp = moment.tz(`${dateStr}${timeStr}`, 'YYYYMMDDHHMMSS', tz);
    if (!timestamp.isValid()) {
      throw new Error(`Invalid date/time: '${dateStr}' / '${timeStr}'`);
    }

    const amountCents = this.parseAmountCents(fields, BODY.AMOUNT, 'amount');

    return {
      supplier_transaction_id: fulcrumTxnId,
      supplier_reference: merchantTxnId || fulcrumTxnId,
      supplier_timestamp: timestamp.toDate(),
      supplier_product_code: this.optionalField(fields, BODY.BARCODE),
      supplier_product_name: productName,
      supplier_amount: amountCents.toFixed(2),
      supplier_commission: '0.00',
      supplier_fee: '0.00',
      supplier_net_amount: amountCents.toFixed(2),
      supplier_status: this.normaliseStatus(txnStatus),
      supplier_account_number: this.optionalField(fields, BODY.ACCOUNT_NUMBER),
      supplier_account_name: provider,
      supplier_transaction_type: txnType || 'Purchase',
      supplier_metadata: {
        vas_type: vasType,
        vas_category: vasCategory,
        provider,
        tender_type: this.optionalField(fields, BODY.TENDER_TYPE),
        serial_number: this.optionalField(fields, BODY.SERIAL_NUMBER),
        msisdn: this.redactMsisdn(this.optionalField(fields, BODY.MSISDN)),
        meter_number: this.redactMeterNumber(this.optionalField(fields, BODY.METER_NUMBER)),
        unit_type: this.optionalField(fields, BODY.UNIT_TYPE),
        units: this.optionalField(fields, BODY.UNITS),
        municipality: this.optionalField(fields, BODY.MUNICIPALITY),
        free_basic_electricity: this.optionalField(fields, BODY.FREE_BASIC_ELEC),
        fbe_units: this.optionalField(fields, BODY.FBE_UNITS)
      },
      row_number: rowNumber
    };
  }

  /**
   * Parse footer line: T|<recordCount>
   * Record count = header + body rows + footer (all lines in the file).
   */
  parseFooter(line, actualLineCount) {
    const fields = line.split('|');

    if (fields[0] !== 'T') {
      throw new Error(`Invalid footer identifier: '${fields[0]}'`);
    }

    const recordCount = parseInt(fields[1], 10);
    if (isNaN(recordCount)) {
      throw new Error(`Invalid footer record count: '${fields[1]}'`);
    }

    if (recordCount !== actualLineCount) {
      logger.warn('Footer record count mismatch', {
        footer_count: recordCount,
        actual_lines: actualLineCount
      });
    }

    return {
      total_count: recordCount - 2,
      record_count: recordCount
    };
  }

  // ---------------------------------------------------------------------------
  // Field helpers
  // ---------------------------------------------------------------------------

  requireField(fields, position, fieldName) {
    const value = (fields[position] || '').trim();
    if (!value) {
      throw new Error(`Missing required field: ${fieldName} (position ${position})`);
    }
    return value;
  }

  optionalField(fields, position) {
    if (position >= fields.length) return null;
    const value = (fields[position] || '').trim();
    return value || null;
  }

  /**
   * Parse amount field.
   * Spec: value is in cents with implied decimal point.
   * e.g., 9900 = R99.00, -9900 = -R99.00
   */
  parseAmountCents(fields, position, fieldName) {
    const raw = this.requireField(fields, position, fieldName);
    const cents = parseInt(raw, 10);
    if (isNaN(cents)) {
      throw new Error(`Invalid amount for ${fieldName}: '${raw}'`);
    }
    return cents / 100;
  }

  normaliseStatus(status) {
    const upper = (status || '').toUpperCase();
    if (upper === 'SUCCESSFUL') return 'success';
    if (upper === 'BINNED') return 'failed';
    return status ? status.toLowerCase() : 'unknown';
  }

  /** Redact MSISDN to last 4 digits for POPIA compliance */
  redactMsisdn(msisdn) {
    if (!msisdn || msisdn.length < 4) return msisdn;
    return '***' + msisdn.slice(-4);
  }

  /** Redact meter number to last 4 digits for POPIA compliance */
  redactMeterNumber(meter) {
    if (!meter || meter.length < 4) return meter;
    return '***' + meter.slice(-4);
  }
}

module.exports = MobileMartAdapter;
