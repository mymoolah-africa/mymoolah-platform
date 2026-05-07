'use strict';

const mockTransaction = {
  commit: jest.fn(),
  rollback: jest.fn(),
};

const mockSupplier = { id: 44, code: 'OTT', name: 'OTT Mobile' };
const mockBrand = { id: 55, name: 'PicknPay Voucher' };
const mockProduct = {
  id: 66,
  constraints: {},
  metadata: {},
  update: jest.fn(),
};
const mockVariant = {
  id: 77,
  constraints: {},
  metadata: {},
  update: jest.fn(),
};
const mockTerm = {
  supplierCode: 'OTT',
  providerCode: '68',
  providerName: 'PicknPay Voucher',
  providerType: 'voucher',
  serviceFamily: 'voucher',
  commercialType: 'commission',
  grossCommissionPct: '1.000',
  serviceFeePct: '0.300',
  netCommissionPct: '0.700',
  monthlySwitchingFeePct: '0.300',
  isCustomerFacing: true,
  isMock: false,
  effectiveFrom: '2026-05-01',
  effectiveTo: null,
  metadata: {},
};

const mockModels = {
  sequelize: { transaction: jest.fn() },
  Supplier: { findOrCreate: jest.fn() },
  SupplierCommercialTerm: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  ProductBrand: { findOrCreate: jest.fn() },
  Product: { findOrCreate: jest.fn() },
  ProductVariant: { findOrCreate: jest.fn() },
};

jest.mock('../models', () => mockModels);
jest.mock('../services/ott/ottClient', () => ({
  OttClient: jest.fn(),
}));

const service = require('../services/ott/ottProviderCatalogService');

describe('OTT provider catalog service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.sequelize.transaction.mockResolvedValue(mockTransaction);
    mockTransaction.commit.mockResolvedValue();
    mockTransaction.rollback.mockResolvedValue();
    mockModels.Supplier.findOrCreate.mockResolvedValue([mockSupplier]);
    mockModels.SupplierCommercialTerm.findAll.mockResolvedValue([mockTerm]);
    mockModels.ProductBrand.findOrCreate.mockResolvedValue([mockBrand]);
    mockModels.Product.findOrCreate.mockResolvedValue([mockProduct]);
    mockModels.ProductVariant.findOrCreate.mockResolvedValue([mockVariant]);
    mockProduct.update.mockResolvedValue(mockProduct);
    mockVariant.update.mockResolvedValue(mockVariant);
  });

  it('classifies known payout, voucher, electricity, gift-card, and mock providers', () => {
    expect(service.classifyProvider({ providerCode: '112', providerName: 'ABSA CashSend' }).providerType).toBe('payout');
    expect(service.classifyProvider({ providerCode: '67', providerName: 'ABSA CashSend' }).providerType).toBe('payout');
    expect(service.classifyProvider({ providerCode: '10', providerName: 'Nedbank Cardless Cash Send' }).providerType).toBe('payout');
    expect(service.classifyProvider({ providerCode: '4', providerName: 'Nedbank Cardless Withdrawal' }).providerType).toBe('payout');
    expect(service.classifyProvider({ providerCode: '2', providerName: 'Standard Bank Instant Money' }).customerFacing).toBe(false);
    expect(service.classifyProvider({ providerCode: '127', providerName: 'PayShap Account' }).customerFacing).toBe(false);
    expect(service.classifyProvider({ providerCode: '68', providerName: 'PicknPay Voucher' }).providerType).toBe('voucher');
    expect(service.classifyProvider({ providerCode: '140', providerName: 'Electricity Token' }).providerType).toBe('electricity');
    expect(service.classifyProvider({ providerCode: '141', providerName: 'AMAZON Gift Card' }).providerType).toBe('gift_card');
    expect(service.classifyProvider({ providerCode: '2001', providerName: 'OTT Mobile Gift Cards | KFC' }).providerType).toBe('gift_card');
    expect(service.classifyProvider({ providerCode: '78', providerName: 'OTT Mobile Gift Cards | Ackermans' }).providerType).toBe('gift_card');
    expect(service.classifyProvider({ providerCode: '94', providerName: 'OTT Mobile Gift Cards | Roccomamas' }).providerType).toBe('gift_card');
    expect(service.classifyProvider({ providerCode: '29', providerName: 'Uber and Uber Eats' }).providerType).toBe('voucher');
    expect(service.classifyProvider({ providerCode: '71', providerName: 'Mock Provider' }).isMock).toBe(true);
  });

  it('imports customer-facing OTT voucher terms with net commission and audit split', async () => {
    const result = await service.importOttCatalogProducts({
      limits: [{ providerCode: '68', minAmount: 10, maxAmount: 1000 }],
      transaction: mockTransaction,
    });

    expect(result).toEqual([expect.objectContaining({ imported: true, providerCode: '68' })]);
    expect(mockModels.ProductVariant.findOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        transaction: mockTransaction,
        defaults: expect.objectContaining({
          supplierProductId: 'OTT-68',
          commission: 0.7,
          pricing: expect.objectContaining({
            defaultCommissionRate: 0.7,
            auditSplit: {
              grossCommissionPct: 1,
              ottServiceFeePct: 0.3,
              netCommissionPct: 0.7,
              monthlySwitchingFeePct: 0.3,
            },
          }),
        }),
      })
    );
    expect(mockVariant.update).toHaveBeenCalledWith(expect.objectContaining({
      commission: 0.7,
      pricing: expect.objectContaining({
        auditSplit: expect.objectContaining({ grossCommissionPct: 1, ottServiceFeePct: 0.3 }),
      }),
    }), { transaction: mockTransaction });
  });

  it('creates synced payout metadata as non-customer-facing until fixed fees exist', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue(null);
    mockModels.SupplierCommercialTerm.create.mockResolvedValue({ id: 99, providerCode: '10' });

    await service.upsertProviderMetadata({
      provider: { providerCode: '10', providerName: 'Nedbank Cardless Withdrawal' },
      limits: [{ providerCode: '10', minAmount: 20, maxAmount: 5000 }],
      transaction: mockTransaction,
    });

    expect(mockModels.SupplierCommercialTerm.create).toHaveBeenCalledWith(expect.objectContaining({
      providerCode: '10',
      providerType: 'payout',
      commercialType: 'fixed_fee',
      isCustomerFacing: false,
      metadata: expect.objectContaining({ economicTermsMissing: true }),
    }), { transaction: mockTransaction });
  });

  it('creates approved OTT gift-card providers with standard VAS commission terms', async () => {
    mockModels.SupplierCommercialTerm.findOne.mockResolvedValue(null);
    mockModels.SupplierCommercialTerm.create.mockResolvedValue({ id: 100, providerCode: '2001' });

    await service.upsertProviderMetadata({
      provider: { providerCode: '2001', providerName: 'OTT Mobile Gift Cards | KFC' },
      limits: [{ providerCode: '2001', minAmount: 5, maxAmount: 5000 }],
      transaction: mockTransaction,
    });

    expect(mockModels.SupplierCommercialTerm.create).toHaveBeenCalledWith(expect.objectContaining({
      providerCode: '2001',
      providerName: 'OTT Mobile Gift Cards | KFC',
      providerType: 'gift_card',
      serviceFamily: 'voucher',
      commercialType: 'commission',
      grossCommissionPct: 1,
      serviceFeePct: 0.3,
      netCommissionPct: 0.7,
      monthlySwitchingFeePct: 0.3,
      isCustomerFacing: true,
      metadata: expect.objectContaining({
        economicTermsMissing: false,
        commercialTermsSource: 'ott_agreement_3_5_default_vas_commission',
      }),
    }), { transaction: mockTransaction });
  });
});
