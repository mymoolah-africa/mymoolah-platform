'use strict';

const FileParserService = require('../../services/reconciliation/FileParserService');

describe('FileParserService.validateParsedData', () => {
  let parser;

  beforeEach(() => {
    parser = new FileParserService();
  });

  it('allows a zero-transaction file when the footer total_count is zero', () => {
    expect(() => parser.validateParsedData({
      header: { file_type: 'easypay_sof' },
      body: [],
      footer: {
        total_count: 0,
        total_amount: '0.00',
        total_fees: '0.00',
        total_tender: '0.00',
        total_vat: '0.00'
      }
    }, { supplier_name: 'EasyPay' })).not.toThrow();
  });

  it('rejects an empty body when the footer expects transactions', () => {
    expect(() => parser.validateParsedData({
      header: { file_type: 'easypay_sof' },
      body: [],
      footer: {
        total_count: 1,
        total_amount: '100.00'
      }
    }, { supplier_name: 'EasyPay' })).toThrow('Empty body in parsed data');
  });

  it('still rejects parsed data without a footer', () => {
    expect(() => parser.validateParsedData({
      header: { file_type: 'easypay_sof' },
      body: []
    }, { supplier_name: 'EasyPay' })).toThrow('Missing footer in parsed data');
  });
});
