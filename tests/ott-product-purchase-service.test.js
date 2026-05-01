'use strict';

const mockPerformPayout = jest.fn();
const mockGetPaymentStatus = jest.fn();

jest.mock('../models', () => ({
  Order: {},
  Product: {},
  SupplierTransaction: {},
  User: {},
  Wallet: {},
  Transaction: {},
  sequelize: { transaction: jest.fn() },
}));

jest.mock('../services/ott/ottClient', () => ({
  OttClient: jest.fn().mockImplementation(() => ({
    performPayout: mockPerformPayout,
    getPaymentStatus: mockGetPaymentStatus,
  })),
  redact: jest.fn((value) => value),
}));

const ProductPurchaseService = require('../services/productPurchaseService');

describe('ProductPurchaseService OTT purchase support', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPerformPayout.mockResolvedValue({
      status: 200,
      data: {
        status: 100,
        message: 'Success',
        paymentReference: '118999',
        voucherdata: {
          voucherID: 123,
          saleID: 456,
          pin: '1234',
          serialNumber: '5514788701',
          amount: 10,
          instructions: 'Redeem at store',
        },
      },
    });
    mockGetPaymentStatus.mockResolvedValue({
      status: 200,
      data: {
        status: 100,
        message: 'Success',
        paymentReference: '119000',
        voucherdata: { pin: '5678', serialNumber: '5514788702', amount: 10 },
      },
    });
  });

  it('routes OTT products through PerformPayout and returns a voucher code', async () => {
    const service = new ProductPurchaseService();
    const product = {
      id: 370,
      name: 'PicknPay Voucher',
      type: 'voucher',
      supplierProductId: 'OTT-68',
      metadata: { providerCode: '68', providerName: 'PicknPay Voucher' },
      supplier: { code: 'OTT' },
    };
    const supplierTransaction = { id: 12, orderId: 34 };
    const user = {
      id: 1,
      firstName: 'Test',
      lastName: 'User',
      phoneNumber: '+27825571055',
      email: 'test@example.com',
      idType: 'south_african_id',
      idNumber: '8001015009087',
    };

    const result = await service.processWithSupplier(
      product,
      1000,
      { phone: '0825571055', name: 'Test User' },
      supplierTransaction,
      null,
      user
    );

    expect(result.success).toBe(true);
    expect(result.data).toEqual(expect.objectContaining({
      reference: '118999',
      voucherCode: '1234',
      ottFulfilled: true,
      ottProviderCode: '68',
      ottPaymentReference: '118999',
    }));
    expect(result.data.ottVoucher).toEqual(expect.objectContaining({
      maskedVoucherId: '123',
      maskedSaleId: '456',
      maskedSerialNumber: '•••• 8701',
    }));
    expect(mockPerformPayout).toHaveBeenCalledWith(expect.objectContaining({
      amount: '10.00',
      provider: { providerCode: '68', providerName: 'PicknPay Voucher' },
      recipient: expect.objectContaining({
        firstname: 'Test',
        surname: 'User',
        id_type: 'RSAID',
        id_number: '8001015009087',
      }),
    }));
  });

  it('resolves OTT provider code from supplierProductId when metadata is absent', () => {
    const service = new ProductPurchaseService();
    expect(service.resolveOttProviderCode({ supplierProductId: 'OTT-141', metadata: {} })).toBe('141');
  });

  it('polls OTT status when PerformPayout outcome is unknown', async () => {
    const service = new ProductPurchaseService();
    const timeout = new Error('timeout of 15000ms exceeded');
    timeout.statusCode = 502;
    timeout.responseData = {};
    mockPerformPayout.mockRejectedValue(timeout);

    const result = await service.processWithOtt(
      {
        id: 371,
        name: 'Shoprite Voucher',
        type: 'voucher',
        supplierProductId: 'OTT-69',
        metadata: { providerCode: '69', providerName: 'Shoprite Voucher' },
      },
      1000,
      { phone: '0825571055', name: 'Test User' },
      { id: 13, orderId: 35 },
      null,
      {
        firstName: 'Test',
        lastName: 'User',
        phoneNumber: '+27825571055',
        email: 'test@example.com',
        idType: 'south_african_id',
        idNumber: '8001015009087',
      }
    );

    expect(result.success).toBe(true);
    expect(result.data.reference).toBe('119000');
    expect(result.data.voucherCode).toBe('5678');
    expect(mockGetPaymentStatus).toHaveBeenCalledWith(expect.objectContaining({
      yourUniqueReference: expect.stringMatching(/^MM-OTT-VAS-/),
    }));
  });
});
