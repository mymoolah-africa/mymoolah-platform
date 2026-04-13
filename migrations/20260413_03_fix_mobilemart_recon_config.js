'use strict';

/**
 * Migration: Fix MobileMart recon_supplier_configs to match actual Fulcrum spec
 *
 * The original seed (20260113) assumed comma-delimited CSV with a generic
 * header/body/footer schema. The real MobileMart Recon Spec (v1.1, Jan 2025)
 * uses pipe-delimited plain text with H/D/T record identifiers and 24 body
 * fields. This migration corrects:
 *   - file_format: csv -> pipe_delimited
 *   - file_name_pattern: matches FULCRUM.MERCHANT.*.RECON.*.txt
 *   - delimiter: ',' -> '|'
 *   - has_header: TRUE -> TRUE (H row is header, parsed by adapter)
 *   - schema_definition: full 24-field body spec per PDF
 *   - matching_rules: updated to use fulcrum_txn_id + merchant_txn_id
 */

const NEW_SCHEMA = JSON.stringify({
  header: {
    identifier: 'H',
    fields: {
      version: { position: 1, type: 'string', required: true },
      date: { position: 2, type: 'date', format: 'CCYYMMDD', required: true }
    }
  },
  body: {
    identifier: 'D',
    fields: {
      record_id:         { position: 0,  type: 'string',  required: true, value: 'D' },
      vas_type:          { position: 1,  type: 'string',  required: true },
      vas_category:      { position: 2,  type: 'string',  required: true },
      provider:          { position: 3,  type: 'string',  required: true },
      fulcrum_txn_id:    { position: 4,  type: 'string',  required: true, mapping: 'supplier_transaction_id' },
      merchant_txn_id:   { position: 5,  type: 'string',  required: true, mapping: 'supplier_reference' },
      txn_type:          { position: 6,  type: 'string',  required: true },
      txn_status:        { position: 7,  type: 'string',  required: true, mapping: 'supplier_status' },
      txn_date:          { position: 8,  type: 'date',    format: 'CCYYMMDD', required: true },
      txn_time:          { position: 9,  type: 'time',    format: 'HHMMSS',   required: true },
      tender_type:       { position: 10, type: 'string',  required: false },
      amount:            { position: 11, type: 'cents',   required: true, mapping: 'supplier_amount' },
      barcode:           { position: 12, type: 'string',  required: false },
      product_name:      { position: 13, type: 'string',  required: true, mapping: 'supplier_product_name' },
      serial_number:     { position: 14, type: 'string',  required: false },
      msisdn:            { position: 15, type: 'string',  required: false },
      account_number:    { position: 16, type: 'string',  required: false },
      meter_number:      { position: 17, type: 'string',  required: false },
      unit_type:         { position: 18, type: 'string',  required: false },
      units:             { position: 19, type: 'string',  required: false },
      municipality:      { position: 20, type: 'string',  required: false },
      free_basic_elec:   { position: 21, type: 'string',  required: false },
      fbe_units:         { position: 22, type: 'string',  required: false },
      tender_pan:        { position: 23, type: 'string',  required: false }
    }
  },
  footer: {
    identifier: 'T',
    fields: {
      record_count: { position: 1, type: 'integer', required: true,
        description: 'Total lines in file including header, body, and footer' }
    }
  }
});

const NEW_MATCHING = JSON.stringify({
  primary: ['fulcrum_txn_id', 'merchant_txn_id'],
  secondary: ['amount', 'timestamp', 'product_name'],
  fuzzy_match: { enabled: true, min_confidence: 0.85 }
});

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET file_format = 'pipe_delimited',
          file_name_pattern = 'FULCRUM.MERCHANT.%.RECON.%.txt',
          delimiter = '|',
          schema_definition = :schema,
          matching_rules = :matching,
          updated_at = NOW()
      WHERE supplier_code = 'MMART'
    `, {
      replacements: {
        schema: NEW_SCHEMA,
        matching: NEW_MATCHING
      }
    });
  },

  async down(queryInterface) {
    const OLD_SCHEMA = JSON.stringify({
      header: { row: 0, fields: { merchant_id: { column: 0, type: 'string', required: true }, merchant_name: { column: 1, type: 'string', required: true }, settlement_date: { column: 2, type: 'date', format: 'YYYY-MM-DD', required: true }, total_transactions: { column: 3, type: 'integer', required: true }, total_amount: { column: 4, type: 'decimal', required: true }, total_commission: { column: 5, type: 'decimal', required: true } } },
      body: { start_row: 1, fields: { transaction_id: { column: 0, type: 'string', required: true, mapping: 'supplier_transaction_id' }, transaction_date: { column: 1, type: 'datetime', format: 'YYYY-MM-DD HH:mm:ss', required: true, mapping: 'supplier_timestamp' }, product_code: { column: 2, type: 'string', required: true, mapping: 'supplier_product_code' }, product_name: { column: 3, type: 'string', required: true, mapping: 'supplier_product_name' }, amount: { column: 4, type: 'decimal', required: true, mapping: 'supplier_amount' }, commission: { column: 5, type: 'decimal', required: true, mapping: 'supplier_commission' }, status: { column: 6, type: 'string', required: true, mapping: 'supplier_status' }, reference: { column: 7, type: 'string', required: false, mapping: 'supplier_reference' } } },
      footer: { row_offset: -1, fields: { total_count: { column: 0, type: 'integer', required: true }, total_amount: { column: 1, type: 'decimal', required: true }, total_commission: { column: 2, type: 'decimal', required: true } } }
    });

    const OLD_MATCHING = JSON.stringify({
      primary: ['transaction_id', 'reference'],
      secondary: ['amount', 'timestamp', 'product_code'],
      fuzzy_match: { enabled: true, min_confidence: 0.85 }
    });

    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET file_format = 'csv',
          file_name_pattern = 'recon_YYYYMMDD.csv',
          delimiter = ',',
          schema_definition = :schema,
          matching_rules = :matching,
          updated_at = NOW()
      WHERE supplier_code = 'MMART'
    `, {
      replacements: {
        schema: OLD_SCHEMA,
        matching: OLD_MATCHING
      }
    });
  }
};
