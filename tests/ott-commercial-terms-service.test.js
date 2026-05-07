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
      mmtpFeeExVat: '1.34',
      reversalFeeExVat: '9.96',
      effectiveFrom: '2026-05-07',
      effectiveTo: null,
      metadata: { source: 'agreement_3_2' },
    });

    const policy = await service.getPayoutFeePolicy({ providerCode: '112' });

    expect(policy).toEqual(expect.objectContaining({
      source: 'supplier_commercial_terms',
      providerCode: '112',
      providerFeeExVat: 9.96,
      providerFeeAmount: 11.45,
      mmtpFeeExVat: 1.34,
      mmtpFeeAmount: 1.55,
      totalFeeAmount: 13.00,
      reversalFeeExVat: 9.96,
    }));
  });

  it('fails closed when payout terms are missing', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue(null);

    await expect(service.getPayoutFeePolicy({ providerCode: '999' }))
      .rejects.toMatchObject({ code: 'OTT_FEE_POLICY_MISSING', statusCode: 500 });
  });

  it('fails closed when payout terms were synced without fee economics', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue({
      supplierCode: 'OTT',
      providerCode: '10',
      providerName: 'Nedbank Cardless Withdrawal',
      providerType: 'payout',
      serviceFamily: 'cash_send',
      commercialType: 'fixed_fee',
      fixedFeeExVat: null,
      fixedFeeVatRate: '0.1500',
      fixedFeeIsVatExclusive: true,
      mmtpFeeExVat: null,
      effectiveFrom: '2026-05-07',
      effectiveTo: null,
      metadata: { economicTermsMissing: true },
    });

    await expect(service.getPayoutFeePolicy({ providerCode: '10' }))
      .rejects.toMatchObject({ code: 'OTT_FEE_POLICY_INCOMPLETE', statusCode: 500 });
  });
});
