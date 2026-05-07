jest.mock('../models', () => ({}));

const ProductCatalogGovernanceService = require('../services/productCatalogGovernanceService');

class FakeMapping {
  constructor(values) {
    Object.assign(this, values);
  }

  async update(values) {
    Object.assign(this, values);
    return this;
  }

  get() {
    return { ...this };
  }
}

function buildService(mapping) {
  const audits = [];
  return {
    audits,
    service: new ProductCatalogGovernanceService({
      ProductCatalogMapping: {
        findByPk: jest.fn(async () => mapping),
        findOrCreate: jest.fn(),
        findAll: jest.fn(),
        findAndCountAll: jest.fn(),
      },
      ProductCatalogAuditEvent: {
        create: jest.fn(async (event) => {
          audits.push(event);
          return event;
        }),
      },
    }),
  };
}

describe('ProductCatalogGovernanceService', () => {
  test('submitForApproval requires canonical display fields', async () => {
    const mapping = new FakeMapping({
      id: 1,
      reviewStatus: 'draft',
      publishStatus: 'unpublished',
      canonicalName: '',
      canonicalBrand: 'Apple',
      category: 'entertainment',
      description: 'Apple credit',
    });
    const { service } = buildService(mapping);

    await expect(service.submitForApproval(1, { portalUserId: 10, email: 'maker@mmtp.test', role: 'admin' }))
      .rejects
      .toMatchObject({ statusCode: 422, code: 'CATALOG_MAPPING_INCOMPLETE' });
  });

  test('maker cannot approve their own submitted mapping', async () => {
    const mapping = new FakeMapping({
      id: 2,
      reviewStatus: 'pending_approval',
      publishStatus: 'unpublished',
      canonicalName: 'Apple Credit',
      canonicalBrand: 'Apple',
      category: 'entertainment',
      description: 'Apple App Store credit',
      makerUserId: '10',
    });
    const { service } = buildService(mapping);

    await expect(service.approve(2, { portalUserId: 10, email: 'maker@mmtp.test', role: 'admin' }))
      .rejects
      .toMatchObject({ statusCode: 403, code: 'MAKER_CHECKER_VIOLATION' });
  });

  test('checker approval publishes mapping and writes audit event', async () => {
    const mapping = new FakeMapping({
      id: 3,
      reviewStatus: 'pending_approval',
      publishStatus: 'unpublished',
      canonicalName: 'Shoprite Voucher',
      canonicalBrand: 'Shoprite',
      category: 'shopping',
      description: 'Shoprite retail voucher',
      makerUserId: '10',
    });
    const { service, audits } = buildService(mapping);

    const result = await service.approve(3, { portalUserId: 20, email: 'checker@mmtp.test', role: 'manager' });

    expect(result.reviewStatus).toBe('approved');
    expect(result.publishStatus).toBe('published');
    expect(result.checkerUserId).toBe('20');
    expect(audits).toHaveLength(1);
    expect(audits[0]).toMatchObject({
      action: 'approved',
      actorEmail: 'checker@mmtp.test',
      fromStatus: 'pending_approval',
      toStatus: 'approved',
      fromPublishStatus: 'unpublished',
      toPublishStatus: 'published',
    });
  });

  test('published mapping lookup only requests approved and published voucher rows', async () => {
    const mapping = new FakeMapping({
      id: 4,
      reviewStatus: 'approved',
      publishStatus: 'published',
      canonicalName: 'Nando\'s Gift Card',
      canonicalBrand: 'Nando\'s',
      category: 'food',
      description: 'Nando\'s gift card',
    });
    const { service } = buildService(mapping);
    service.ProductCatalogMapping.findAll.mockResolvedValue([mapping]);

    const result = await service.getPublishedMappings({ productType: 'voucher' });

    expect(service.ProductCatalogMapping.findAll).toHaveBeenCalledWith({
      where: {
        productType: 'voucher',
        reviewStatus: 'approved',
        publishStatus: 'published',
      },
      order: [['canonicalName', 'ASC']],
    });
    expect(result).toEqual([expect.objectContaining({ canonicalBrand: 'Nando\'s' })]);
  });
});
