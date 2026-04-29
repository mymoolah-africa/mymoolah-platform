const OttAdapter = require('../services/reconciliation/adapters/OttAdapter');

describe('OttAdapter', () => {
  it('parses partner CSV files into reconciliation records', async () => {
    const adapter = new OttAdapter();
    const csv = [
      'uniqueReferenceId,paymentReference,providerCode,amount,status,providerFee',
      'MM-OTT-1,OTT-123,NEDBANK,100.00,completed,9.96',
    ].join('\n');

    const parsed = await adapter.parse(csv, {});

    expect(parsed.header.file_type).toBe('ott_payout_reconciliation');
    expect(parsed.body).toHaveLength(1);
    expect(parsed.body[0]).toEqual(expect.objectContaining({
      supplier_transaction_id: 'OTT-123',
      supplier_reference: 'MM-OTT-1',
      supplier_product_code: 'NEDBANK',
      supplier_amount: '100.00',
      supplier_status: 'completed',
      supplier_fee: '9.96',
    }));
    expect(parsed.footer).toEqual({ total_count: 1, total_amount: '100.00' });
  });

  it('parses JSON transaction arrays for API-only reconciliation exports', async () => {
    const adapter = new OttAdapter();
    const parsed = await adapter.parse(JSON.stringify({
      transactions: [{
        uniqueReferenceId: 'MM-OTT-2',
        transactionId: 'OTT-456',
        provider_providerCode: 'ABSA',
        Amount: '250.50',
        Status: 'SUCCESS',
      }],
    }), {});

    expect(parsed.body[0]).toEqual(expect.objectContaining({
      supplier_transaction_id: 'OTT-456',
      supplier_reference: 'MM-OTT-2',
      supplier_product_code: 'ABSA',
      supplier_amount: '250.50',
      supplier_status: 'success',
    }));
  });
});
