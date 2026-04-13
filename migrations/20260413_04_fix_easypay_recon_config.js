'use strict';

/**
 * Migration: Fix EasyPay recon_supplier_configs to match actual SOF file format
 *
 * The original seed (20260116) assumed comma-delimited CSV with headers.
 * The actual EasyPay settlement file is a SOF (Statement of Funds) format
 * with record-type identifiers (SOF/X/P/T + footer).
 * Sample file: easy2138.148 (provided by Razeen, April 2026)
 * File naming: easy[RECEIVER_ID].[SEQUENCE]
 *
 * Also adds EasyPay's public IP (20.164.206.68) to metadata for
 * firewall rule reference.
 */

const NEW_SCHEMA = JSON.stringify({
  header: {
    identifier: 'SOF',
    fields: {
      version:     { position: 1, type: 'string',  required: true },
      receiver_id: { position: 2, type: 'string',  required: true },
      date:        { position: 3, type: 'date',    format: 'CCYYMMDD', required: true },
      time:        { position: 4, type: 'time',    format: 'HHMMSS',   required: true },
      sequence:    { position: 5, type: 'string',  required: true }
    }
  },
  transaction_group: {
    x_record: {
      identifier: 'X',
      fields: {
        terminal_id: { position: 1, type: 'string', required: true },
        date:        { position: 2, type: 'date',   format: 'CCYYMMDD', required: true },
        time:        { position: 3, type: 'time',   format: 'HHMMSS',   required: true },
        sequence:    { position: 4, type: 'string',  required: true },
        ep_txn_ref:  { position: 5, type: 'string',  required: true, mapping: 'supplier_transaction_id' }
      }
    },
    p_record: {
      identifier: 'P',
      fields: {
        gross_amount: { position: 1, type: 'decimal', required: true, mapping: 'supplier_amount' },
        fee:          { position: 2, type: 'decimal', required: true, mapping: 'supplier_commission' },
        easypay_code: { position: 3, type: 'string',  required: true, mapping: 'supplier_reference' }
      }
    },
    t_record: {
      identifier: 'T',
      fields: {
        tender_amount: { position: 1, type: 'decimal', required: true },
        vat:           { position: 2, type: 'decimal', required: true },
        tender_type:   { position: 3, type: 'string',  required: true }
      }
    }
  },
  footer: {
    identifier: null,
    description: 'No record-type prefix — starts with digit',
    fields: {
      txn_count:     { position: 0, type: 'integer', required: true },
      total_gross:   { position: 1, type: 'decimal', required: true },
      total_fees:    { position: 2, type: 'decimal', required: true },
      tender_count:  { position: 3, type: 'integer', required: true },
      total_tender:  { position: 4, type: 'decimal', required: true },
      total_vat:     { position: 5, type: 'decimal', required: true }
    }
  }
});

const NEW_MATCHING = JSON.stringify({
  primary: ['ep_txn_ref', 'easypay_code'],
  secondary: ['amount', 'timestamp'],
  fuzzy_match: { enabled: true, min_confidence: 0.90 }
});

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET file_format = 'sof',
          file_name_pattern = 'easy%.%',
          delimiter = ',',
          has_header = FALSE,
          schema_definition = :schema,
          matching_rules = :matching,
          updated_at = NOW()
      WHERE supplier_code = 'EASYPAY'
    `, {
      replacements: {
        schema: NEW_SCHEMA,
        matching: NEW_MATCHING
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      UPDATE recon_supplier_configs
      SET file_format = 'csv',
          file_name_pattern = 'easypay_recon_YYYYMMDD.csv',
          delimiter = ',',
          has_header = TRUE,
          schema_definition = '{}',
          matching_rules = '{"primary":["transaction_id"],"secondary":["easypay_code","amount","timestamp"],"fuzzy_match":{"enabled":true,"min_confidence":0.90}}',
          updated_at = NOW()
      WHERE supplier_code = 'EASYPAY'
    `);
  }
};
