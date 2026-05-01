'use strict';

const mockModels = {
  SupplierCommercialTerm: { findOne: jest.fn() },
};

jest.mock('../models', () => mockModels);

const service = require('../services/ott/ottCommercialTermsService');

describe('OTT commercial terms service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.VAT_RATE = '0.15';
  });

  afterEach(() => {
    delete process.env.VAT_RATE;
  });

  it('calculates payout fee policy from effective supplier commercial terms', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue({
      supplierCode: 'OTT',
      providerCode: '112',
      providerName: 'ABSA CashSend',
      providerType: 'payout',
      serviceFamily: 'cash_send',
      commercialType: 'fixed_fee',
      fixedFeeExVat: '9.96',
      fixedFeeVatRate: '0.1500',
      fixedFeeIsVatExclusive: true,
      mmtpFeeExVat: '0.87',
      reversalFeeExVat: '10.00',
      effectiveFrom: '2026-05-01',
      effectiveTo: null,
      metadata: { source: 'agreement_3_2' },
    });

    const policy = await service.getPayoutFeePolicy({ providerCode: '112' });

    expect(policy).toEqual(expect.objectContaining({
      source: 'supplier_commercial_terms',
      providerCode: '112',
      providerFeeExVat: 9.96,
      providerFeeAmount: 11.45,
      mmtpFeeExVat: 0.87,
      mmtpFeeAmount: 1.00,
      reversalFeeExVat: 10.00,
    }));
  });

  it('fails closed when payout terms are missing', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue(null);

    await expect(service.getPayoutFeePolicy({ providerCode: '999' }))
      .rejects.toMatchObject({ code: 'OTT_FEE_POLICY_MISSING', statusCode: 500 });
  });
});
