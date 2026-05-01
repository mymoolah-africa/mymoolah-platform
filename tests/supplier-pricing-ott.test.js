'use strict';

const mockSequelize = { query: jest.fn() };

jest.mock('../models', () => ({
  sequelize: mockSequelize,
}));

const supplierPricingService = require('../services/supplierPricingService');

describe('supplierPricingService OTT fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses OTT product variant net commission when commission tier rows are absent', async () => {
    mockSequelize.query.mockImplementation(async (sql) => {
      if (String(sql).includes('FROM product_variants')) {
        return [[{
          commission: '0.70',
          pricing: { auditSplit: { netCommissionPct: 0.7 } },
        }]];
      }
      if (String(sql).includes('FROM suppliers')) {
        return [[{ id: 9 }]];
      }
      return [[]];
    });

    const info = await supplierPricingService.getCommissionInfo('OTT', 'voucher', 370);

    expect(info).toEqual({
      type: 'percentage',
      ratePct: 0.7,
      fixedAmountCents: 0,
    });
  });
});
