'use strict';

const { parse } = require('csv-parse/sync');

class OttAdapter {
  async parse(content, supplierConfig = {}) {
    const text = typeof content === 'string' ? content : content.toString('utf-8');
    const trimmed = text.trim();
    if (!trimmed) throw new Error('OTT reconciliation file is empty');

    const records = trimmed.startsWith('{') || trimmed.startsWith('[')
      ? this.parseJson(trimmed)
      : this.parseCsv(trimmed, supplierConfig);

    if (records.length === 0) throw new Error('OTT reconciliation file contains no transactions');

    const body = records.map((record, index) => this.normaliseRecord(record, supplierConfig, index + 1));
    return {
      header: {
        file_type: 'ott_payout_reconciliation',
        settlement_date: supplierConfig.settlement_date || null,
      },
      body,
      footer: this.calculateFooter(body),
    };
  }

  parseJson(text) {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) return parsed;
    if (Array.isArray(parsed.transactions)) return parsed.transactions;
    if (Array.isArray(parsed.data)) return parsed.data;
    throw new Error('OTT JSON reconciliation must be an array or contain transactions/data array');
  }

  parseCsv(text, supplierConfig) {
    return parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      delimiter: supplierConfig.delimiter || ',',
      relax_column_count: true,
    });
  }

  field(record, names) {
    for (const name of names) {
      if (record[name] !== undefined && record[name] !== null && record[name] !== '') return record[name];
    }
    const lowerMap = Object.fromEntries(Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]));
    for (const name of names) {
      const value = lowerMap[String(name).toLowerCase()];
      if (value !== undefined && value !== null && value !== '') return value;
    }
    return null;
  }

  parseAmount(value, fieldName) {
    const amount = Number(String(value || '').replace(/[^\d.-]/g, ''));
    if (!Number.isFinite(amount)) throw new Error(`Invalid OTT amount field: ${fieldName}`);
    return amount.toFixed(2);
  }

  normaliseRecord(record, supplierConfig, rowNumber) {
    const mapping = supplierConfig.field_mapping || {};
    const transactionId = this.field(record, [
      mapping.transactionId,
      'transactionId',
      'TransactionId',
      'paymentReference',
      'PaymentReference',
      'ottPaymentReference',
    ].filter(Boolean));
    const uniqueReferenceId = this.field(record, [
      mapping.uniqueReferenceId,
      'uniqueReferenceId',
      'UniqueReferenceId',
      'merchantUniqueReference',
      'merchant_reference',
    ].filter(Boolean));
    const amount = this.field(record, [mapping.amount, 'amount', 'Amount', 'principalAmount'].filter(Boolean));
    const status = this.field(record, [mapping.status, 'status', 'Status', 'transactionStatus'].filter(Boolean));

    if (!transactionId && !uniqueReferenceId) {
      throw new Error(`Row ${rowNumber}: missing OTT transaction/payment reference`);
    }
    if (amount === null) {
      throw new Error(`Row ${rowNumber}: missing OTT amount`);
    }

    return {
      supplier_transaction_id: transactionId || uniqueReferenceId,
      supplier_reference: uniqueReferenceId || transactionId,
      supplier_timestamp: this.field(record, [mapping.timestamp, 'timestamp', 'createdAt', 'processedAt', 'date'].filter(Boolean)),
      supplier_product_code: this.field(record, [mapping.providerCode, 'providerCode', 'provider_providerCode'].filter(Boolean)),
      supplier_product_name: this.field(record, [mapping.providerName, 'providerName'].filter(Boolean)),
      supplier_amount: this.parseAmount(amount, 'amount'),
      supplier_commission: this.parseAmount(this.field(record, [mapping.commission, 'commission', 'fee'].filter(Boolean)) || 0, 'commission'),
      supplier_fee: this.parseAmount(this.field(record, [mapping.providerFee, 'providerFee', 'provider_fee'].filter(Boolean)) || 0, 'providerFee'),
      supplier_net_amount: this.parseAmount(this.field(record, [mapping.netAmount, 'netAmount', 'net_amount'].filter(Boolean)) || amount, 'netAmount'),
      supplier_status: String(status || 'unknown').toLowerCase(),
      supplier_account_number: this.field(record, [mapping.accountNumber, 'accountNumber', 'account_number'].filter(Boolean)),
      supplier_account_name: this.field(record, [mapping.accountName, 'accountName', 'account_name'].filter(Boolean)),
      supplier_transaction_type: 'ott_payout',
      supplier_metadata: {
        raw_keys: Object.keys(record),
      },
      row_number: rowNumber,
    };
  }

  calculateFooter(body) {
    const total = body.reduce((sum, txn) => sum + Number(txn.supplier_amount || 0), 0);
    return {
      total_count: body.length,
      total_amount: total.toFixed(2),
    };
  }
}

module.exports = OttAdapter;
