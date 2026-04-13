/**
 * EasyPay Reconciliation File Adapter
 *
 * Parses EasyPay SOF (Statement of Funds) files.
 * Format: Comma-delimited plain text with record-type identifiers.
 *
 * File naming: easy[RECEIVER_ID].[SEQUENCE] (e.g., easy2138.148)
 *
 * Record types:
 *   SOF  — File header: SOF,version,receiverId,date(CCYYMMDD),time(HHMMSS),sequence
 *   X    — Transaction header: X,terminalId,date(CCYYMMDD),time(HHMMSS),sequence,epTxnRef
 *   P    — Payment detail: P,grossAmount,fee,easypayCode
 *   T    — Tender detail: T,tenderAmount,vat,tenderType
 *   (footer line) — count,totalGross,totalFees,tenderCount,totalTender,totalVAT
 *
 * Each transaction is a group of X + P + T records.
 * The footer is the last line (no record-type prefix, starts with a digit).
 *
 * Source: Sample file `easy2138.148` provided by Razeen (EasyPay), April 2026.
 *
 * @module services/reconciliation/adapters/EasyPayAdapter
 */

'use strict';

const logger = {
  info: (...args) => console.log('[EasyPayAdapter]', ...args),
  error: (...args) => console.error('[EasyPayAdapter]', ...args),
  warn: (...args) => console.warn('[EasyPayAdapter]', ...args),
  debug: (...args) => console.log('[EasyPayAdapter]', ...args)
};
const moment = require('moment-timezone');

class EasyPayAdapter {
  /**
   * Parse EasyPay SOF file
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

      if (lines.length < 2) {
        throw new Error('SOF file must contain at least header and 1 transaction');
      }

      const sofLine = lines[0];
      if (!sofLine.startsWith('SOF')) {
        throw new Error(`Invalid SOF header: expected line starting with 'SOF', got '${sofLine.substring(0, 20)}'`);
      }

      const header = this.parseSOFHeader(sofLine, supplierConfig);

      const bodyLines = lines.slice(1);
      const lastLine = bodyLines[bodyLines.length - 1];
      const hasFooter = lastLine && /^\d/.test(lastLine);

      const transactionLines = hasFooter ? bodyLines.slice(0, -1) : bodyLines;
      const body = this.parseTransactions(transactionLines, supplierConfig);
      const footer = hasFooter
        ? this.parseFooter(lastLine, body.length)
        : this.calculateFooter(body);

      logger.info('Parsed successfully', {
        settlement_date: header.settlement_date,
        receiver_id: header.receiver_id,
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
   * Parse SOF header: SOF,version,receiverId,date,time,sequence
   */
  parseSOFHeader(line, config) {
    const fields = line.split(',');

    if (fields[0] !== 'SOF') {
      throw new Error(`Invalid SOF identifier: '${fields[0]}'`);
    }

    const version = (fields[1] || '').trim();
    const receiverId = (fields[2] || '').trim();
    const dateStr = (fields[3] || '').trim();
    const timeStr = (fields[4] || '').trim();
    const sequence = (fields[5] || '').trim();

    if (!dateStr || dateStr.length !== 8) {
      throw new Error(`Invalid SOF date: '${dateStr}' (expected CCYYMMDD)`);
    }

    const tz = config.timezone || 'Africa/Johannesburg';
    const settlementDate = moment.tz(dateStr, 'YYYYMMDD', tz);

    if (!settlementDate.isValid()) {
      throw new Error(`Cannot parse SOF date: '${dateStr}'`);
    }

    return {
      file_type: 'easypay_sof',
      version,
      receiver_id: receiverId,
      settlement_date: settlementDate.format('YYYY-MM-DD'),
      generation_time: timeStr,
      sequence
    };
  }

  /**
   * Parse transaction groups (X + P + T records).
   * Each transaction starts with an X record, followed by P and T records.
   */
  parseTransactions(lines, config) {
    const transactions = [];
    let currentTxn = null;
    const tz = config.timezone || 'Africa/Johannesburg';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const fields = line.split(',').map(f => f.trim());
      const recordType = fields[0];

      if (recordType === 'X') {
        if (currentTxn) {
          transactions.push(this.finaliseTransaction(currentTxn, transactions.length + 1));
        }
        currentTxn = this.parseXRecord(fields, tz);
      } else if (recordType === 'P') {
        if (!currentTxn) {
          throw new Error(`P record at line ${i + 2} without preceding X record`);
        }
        this.applyPRecord(currentTxn, fields);
      } else if (recordType === 'T') {
        if (!currentTxn) {
          throw new Error(`T record at line ${i + 2} without preceding X record`);
        }
        this.applyTRecord(currentTxn, fields);
      } else {
        logger.warn('Unknown record type', { line: i + 2, type: recordType });
      }
    }

    if (currentTxn) {
      transactions.push(this.finaliseTransaction(currentTxn, transactions.length + 1));
    }

    return transactions;
  }

  /**
   * Parse X record: X,terminalId,date,time,sequence,epTxnRef
   */
  parseXRecord(fields, tz) {
    const terminalId = fields[1] || '';
    const dateStr = fields[2] || '';
    const timeStr = fields[3] || '';
    const sequence = fields[4] || '';
    const epTxnRef = fields[5] || '';

    let timestamp = null;
    if (dateStr && timeStr) {
      timestamp = moment.tz(`${dateStr}${timeStr}`, 'YYYYMMDDHHMMSS', tz);
      if (!timestamp.isValid()) {
        logger.warn('Invalid X record date/time', { date: dateStr, time: timeStr });
        timestamp = null;
      }
    }

    return {
      terminal_id: terminalId,
      ep_txn_ref: epTxnRef,
      sequence,
      timestamp,
      gross_amount: null,
      fee: null,
      easypay_code: null,
      tender_amount: null,
      vat: null,
      tender_type: null
    };
  }

  /**
   * Apply P record data: P,grossAmount,fee,easypayCode
   */
  applyPRecord(txn, fields) {
    txn.gross_amount = this.parseAmount(fields[1], 'P.gross_amount');
    txn.fee = this.parseAmount(fields[2], 'P.fee');
    txn.easypay_code = (fields[3] || '').trim();
  }

  /**
   * Apply T record data: T,tenderAmount,vat,tenderType
   */
  applyTRecord(txn, fields) {
    txn.tender_amount = this.parseAmount(fields[1], 'T.tender_amount');
    txn.vat = this.parseAmount(fields[2], 'T.vat');
    txn.tender_type = (fields[3] || '').trim();
  }

  /**
   * Finalise a transaction group into normalised output shape
   */
  finaliseTransaction(txn, rowNumber) {
    if (!txn.ep_txn_ref) {
      throw new Error(`Transaction at row ${rowNumber}: missing EasyPay transaction reference`);
    }

    return {
      supplier_transaction_id: txn.ep_txn_ref,
      supplier_reference: txn.easypay_code || txn.ep_txn_ref,
      supplier_timestamp: txn.timestamp ? txn.timestamp.toDate() : null,
      supplier_product_code: 'topup',
      supplier_product_name: 'EasyPay Cash-In',
      supplier_amount: txn.gross_amount !== null ? txn.gross_amount.toFixed(2) : '0.00',
      supplier_commission: txn.fee !== null ? txn.fee.toFixed(2) : '0.00',
      supplier_fee: txn.fee !== null ? txn.fee.toFixed(2) : '0.00',
      supplier_net_amount: (txn.gross_amount !== null && txn.fee !== null)
        ? (txn.gross_amount - txn.fee).toFixed(2)
        : '0.00',
      supplier_status: 'success',
      supplier_account_number: null,
      supplier_account_name: null,
      supplier_transaction_type: txn.tender_type || 'Cash',
      supplier_metadata: {
        terminal_id: txn.terminal_id,
        sequence: txn.sequence,
        easypay_code: txn.easypay_code,
        tender_type: txn.tender_type,
        tender_amount: txn.tender_amount !== null ? txn.tender_amount.toFixed(2) : null,
        vat_on_fee: txn.vat !== null ? txn.vat.toFixed(2) : null
      },
      row_number: rowNumber
    };
  }

  /**
   * Parse footer line: count,totalGross,totalFees,tenderCount,totalTender,totalVAT
   */
  parseFooter(line, bodyCount) {
    const fields = line.split(',').map(f => f.trim());

    const txnCount = parseInt(fields[0], 10);
    const totalGross = this.parseAmount(fields[1], 'footer.total_gross');
    const totalFees = this.parseAmount(fields[2], 'footer.total_fees');
    const tenderCount = parseInt(fields[3], 10);
    const totalTender = this.parseAmount(fields[4], 'footer.total_tender');
    const totalVAT = this.parseAmount(fields[5], 'footer.total_vat');

    if (!isNaN(txnCount) && txnCount !== bodyCount) {
      logger.warn('Footer transaction count mismatch', {
        footer_count: txnCount,
        parsed_count: bodyCount
      });
    }

    return {
      total_count: isNaN(txnCount) ? bodyCount : txnCount,
      total_amount: totalGross.toFixed(2),
      total_fees: totalFees.toFixed(2),
      tender_count: isNaN(tenderCount) ? bodyCount : tenderCount,
      total_tender: totalTender.toFixed(2),
      total_vat: totalVAT.toFixed(2)
    };
  }

  /**
   * Calculate footer from body when no explicit footer line
   */
  calculateFooter(body) {
    const totals = body.reduce((acc, txn) => {
      acc.count++;
      acc.gross += parseFloat(txn.supplier_amount || 0);
      acc.fees += parseFloat(txn.supplier_fee || 0);
      acc.vat += parseFloat(txn.supplier_metadata?.vat_on_fee || 0);
      return acc;
    }, { count: 0, gross: 0, fees: 0, vat: 0 });

    return {
      total_count: totals.count,
      total_amount: totals.gross.toFixed(2),
      total_fees: totals.fees.toFixed(2),
      tender_count: totals.count,
      total_tender: totals.gross.toFixed(2),
      total_vat: totals.vat.toFixed(2)
    };
  }

  /**
   * Parse amount string (handles leading/trailing spaces)
   */
  parseAmount(value, fieldName) {
    if (value === undefined || value === null || value === '') {
      return 0;
    }
    const cleaned = value.replace(/\s/g, '');
    const parsed = parseFloat(cleaned);
    if (isNaN(parsed)) {
      throw new Error(`Invalid amount for ${fieldName}: '${value}'`);
    }
    return parsed;
  }
}

module.exports = EasyPayAdapter;
