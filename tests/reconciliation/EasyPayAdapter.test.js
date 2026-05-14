'use strict';

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const EasyPayAdapter = require('../../services/reconciliation/adapters/EasyPayAdapter');
const FileParserService = require('../../services/reconciliation/FileParserService');

const VALID_SOF = [
  'SOF,1,2138,20260211,093806,148',
  'X,TERM001,20260211,092001,000001,00014208557',
  'P,    439.00,      5.21,921381000007156909',
  'T,    439.00,      0.88,Cash',
  'X,TERM002,20260211,092501,000002,00014208558',
  'P,    559.00,      5.21,921381000007156910',
  'T,    559.00,      1.12,Cash',
  '2,998.00,10.42,2,998.00,2.00'
].join('\n');

describe('EasyPayAdapter', () => {
  let adapter;

  beforeEach(() => {
    adapter = new EasyPayAdapter();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.log.mockRestore();
    console.warn.mockRestore();
    console.error.mockRestore();
  });

  it('parses EasyPay SOF header, transaction groups, and footer totals', async () => {
    const parsed = await adapter.parse(VALID_SOF, { timezone: 'Africa/Johannesburg' });

    expect(parsed.header).toMatchObject({
      file_type: 'easypay_sof',
      version: '1',
      receiver_id: '2138',
      settlement_date: '2026-02-11',
      sequence: '148'
    });
    expect(parsed.body).toHaveLength(2);
    expect(parsed.body[0]).toMatchObject({
      supplier_transaction_id: '00014208557',
      supplier_reference: '921381000007156909',
      supplier_amount: '439.00',
      supplier_fee: '5.21',
      supplier_net_amount: '433.79',
      supplier_status: 'success'
    });
    expect(parsed.footer).toMatchObject({
      total_count: 2,
      total_amount: '998.00',
      total_fees: '10.42',
      total_vat: '2.00'
    });
  });

  it('rejects files that do not start with an SOF header', async () => {
    await expect(adapter.parse([
      'BAD,1,2138,20260211,093806,148',
      'X,TERM001,20260211,092001,000001,00014208557'
    ].join('\n'), {})).rejects.toThrow('Invalid SOF header');
  });

  it('rejects P records without a preceding X record', async () => {
    await expect(adapter.parse([
      'SOF,1,2138,20260211,093806,148',
      'P,100.00,5.21,921381000007156909'
    ].join('\n'), {})).rejects.toThrow('without preceding X record');
  });

  it('lets FileParserService fail footer count mismatches', async () => {
    const parser = new FileParserService();
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'easypay-adapter-test-'));
    const tmpFile = path.join(tmpDir, 'easy2138.148');
    const invalidFooterCount = VALID_SOF.replace('2,998.00,10.42,2,998.00,2.00', '3,998.00,10.42,2,998.00,2.00');

    try {
      await fs.writeFile(tmpFile, invalidFooterCount, 'utf-8');
      await expect(parser.parse(tmpFile, {
        supplier_name: 'EasyPay',
        adapter_class: 'EasyPayAdapter',
        file_format: 'sof',
        timezone: 'Africa/Johannesburg'
      })).rejects.toThrow('Transaction count mismatch');
    } finally {
      await fs.rm(tmpDir, { recursive: true, force: true });
    }
  });
});
