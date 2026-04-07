'use strict';

jest.mock('../../scripts/db-connection-helper', () => ({
  getUATClient: jest.fn(),
  getStagingClient: jest.fn(),
  getProductionClient: jest.fn(),
}));

const { getUATClient, getStagingClient, getProductionClient } = require('../../scripts/db-connection-helper');
const { calculateSingleFee, getActiveFeeConfig, calculateFees } = require('../../services/disbursement/feeEngine');

function mockDbClient(queryResults = []) {
  let callIndex = 0;
  const client = {
    query: jest.fn(async () => {
      const result = queryResults[callIndex] || { rows: [] };
      callIndex++;
      return result;
    }),
    release: jest.fn(),
  };
  getUATClient.mockResolvedValue(client);
  getStagingClient.mockResolvedValue(client);
  getProductionClient.mockResolvedValue(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  delete process.env.MM_DEPLOYMENT_ENV;
  delete process.env.NODE_ENV;
});

// ─── calculateSingleFee ─────────────────────────────────────────────────────

describe('calculateSingleFee', () => {
  it('returns the flat fee regardless of amount', () => {
    const config = { fee_type: 'flat', flat_fee_cents: 500 };
    const result = calculateSingleFee(100000, config);
    expect(result).toEqual({
      feeCents: 500,
      feeType: 'flat',
      flatComponent: 500,
      percentageComponent: 0,
    });
  });

  it('returns the same flat fee for a zero amount', () => {
    const config = { fee_type: 'flat', flat_fee_cents: 350 };
    const result = calculateSingleFee(0, config);
    expect(result.feeCents).toBe(350);
  });

  it('calculates percentage fee correctly (integer cents)', () => {
    const config = { fee_type: 'percentage', percentage_fee: 0.01 };
    const result = calculateSingleFee(100000, config);
    expect(result.feeCents).toBe(1000);
    expect(result.flatComponent).toBe(0);
    expect(result.percentageComponent).toBe(1000);
  });

  it('clamps percentage fee to min_fee_cents', () => {
    const config = { fee_type: 'percentage', percentage_fee: 0.001, min_fee_cents: 500 };
    const result = calculateSingleFee(10000, config);
    expect(result.feeCents).toBe(500);
  });

  it('clamps percentage fee to max_fee_cents', () => {
    const config = { fee_type: 'percentage', percentage_fee: 0.10, max_fee_cents: 2000 };
    const result = calculateSingleFee(500000, config);
    expect(result.feeCents).toBe(2000);
  });

  it('ignores min/max when they are zero', () => {
    const config = { fee_type: 'percentage', percentage_fee: 0.05, min_fee_cents: 0, max_fee_cents: 0 };
    const result = calculateSingleFee(200000, config);
    expect(result.feeCents).toBe(10000);
  });

  it('calculates flat_plus_percentage correctly', () => {
    const config = { fee_type: 'flat_plus_percentage', flat_fee_cents: 300, percentage_fee: 0.01 };
    const result = calculateSingleFee(100000, config);
    expect(result.flatComponent).toBe(300);
    expect(result.percentageComponent).toBe(1000);
    expect(result.feeCents).toBe(1300);
  });

  it('clamps flat_plus_percentage to min_fee_cents', () => {
    const config = {
      fee_type: 'flat_plus_percentage',
      flat_fee_cents: 10,
      percentage_fee: 0.001,
      min_fee_cents: 500,
    };
    const result = calculateSingleFee(1000, config);
    expect(result.feeCents).toBe(500);
  });

  it('clamps flat_plus_percentage to max_fee_cents', () => {
    const config = {
      fee_type: 'flat_plus_percentage',
      flat_fee_cents: 5000,
      percentage_fee: 0.10,
      max_fee_cents: 7000,
    };
    const result = calculateSingleFee(500000, config);
    expect(result.feeCents).toBe(7000);
  });

  it('throws for unknown fee_type', () => {
    expect(() => calculateSingleFee(1000, { fee_type: 'volume_discount' })).toThrow('Unknown fee_type');
  });

  it('throws for negative amountCents', () => {
    expect(() => calculateSingleFee(-100, { fee_type: 'flat', flat_fee_cents: 0 })).toThrow('non-negative integer');
  });

  it('throws for non-integer amountCents', () => {
    expect(() => calculateSingleFee(99.5, { fee_type: 'flat', flat_fee_cents: 0 })).toThrow('non-negative integer');
  });

  it('throws when feeConfig is null', () => {
    expect(() => calculateSingleFee(1000, null)).toThrow('feeConfig is required');
  });

  it('throws when feeConfig has no fee_type', () => {
    expect(() => calculateSingleFee(1000, { flat_fee_cents: 100 })).toThrow('fee_type');
  });

  it('rounds percentage to nearest cent', () => {
    const config = { fee_type: 'percentage', percentage_fee: 0.015 };
    const result = calculateSingleFee(333, config);
    expect(result.percentageComponent).toBe(Math.round(333 * 0.015));
    expect(Number.isInteger(result.feeCents)).toBe(true);
  });
});

// ─── getActiveFeeConfig ─────────────────────────────────────────────────────

describe('getActiveFeeConfig', () => {
  it('returns hardcoded zero-fee config for wallet rail (no DB call)', async () => {
    const result = await getActiveFeeConfig(1, 'wallet');
    expect(result.fee_type).toBe('flat');
    expect(result.flat_fee_cents).toBe(0);
    expect(result.percentage_fee).toBe(0);
    expect(result.client_id).toBe(1);
    expect(getUATClient).not.toHaveBeenCalled();
  });

  it('queries DB and returns config for EFT rail', async () => {
    const feeRow = {
      id: 42, client_id: 5, rail: 'eft', fee_type: 'flat',
      flat_fee_cents: 750, percentage_fee: 0, min_fee_cents: 0, max_fee_cents: 0,
    };
    mockDbClient([{ rows: [feeRow] }]);

    const result = await getActiveFeeConfig(5, 'eft');
    expect(result).toEqual(feeRow);
  });

  it('returns null when no active config exists', async () => {
    mockDbClient([{ rows: [] }]);
    const result = await getActiveFeeConfig(99, 'payshap');
    expect(result).toBeNull();
  });

  it('releases DB client after query', async () => {
    const client = mockDbClient([{ rows: [] }]);
    await getActiveFeeConfig(1, 'eft');
    expect(client.release).toHaveBeenCalledTimes(1);
  });

  it('throws for invalid clientId (zero)', async () => {
    await expect(getActiveFeeConfig(0, 'eft')).rejects.toThrow('positive integer');
  });

  it('throws for invalid clientId (string)', async () => {
    await expect(getActiveFeeConfig('abc', 'eft')).rejects.toThrow('positive integer');
  });

  it('throws for invalid rail', async () => {
    await expect(getActiveFeeConfig(1, 'swift')).rejects.toThrow('rail must be one of');
  });

  it('uses production client when MM_DEPLOYMENT_ENV=production', async () => {
    process.env.MM_DEPLOYMENT_ENV = 'production';
    const feeRow = { id: 1, fee_type: 'flat', flat_fee_cents: 100 };
    mockDbClient([{ rows: [feeRow] }]);

    await getActiveFeeConfig(1, 'eft');
    expect(getProductionClient).toHaveBeenCalled();
    expect(getUATClient).not.toHaveBeenCalled();
  });
});

// ─── calculateFees (batch) ──────────────────────────────────────────────────

describe('calculateFees', () => {
  it('calculates batch fees for flat config', async () => {
    const feeRow = {
      id: 1, client_id: 1, rail: 'eft', fee_type: 'flat',
      flat_fee_cents: 500, percentage_fee: 0, min_fee_cents: 0, max_fee_cents: 0,
    };
    mockDbClient([{ rows: [feeRow] }]);

    const payments = [{ amount: 1000 }, { amount: 2000 }, { amount: 500 }];
    const result = await calculateFees(1, 'eft', payments);

    expect(result.fees).toHaveLength(3);
    expect(result.fees[0].feeCents).toBe(500);
    expect(result.fees[1].feeCents).toBe(500);
    expect(result.fees[2].feeCents).toBe(500);
    expect(result.totalFeeCents).toBe(1500);
    expect(result.totalAmountCents).toBe(350000);
    expect(result.grandTotalCents).toBe(351500);
  });

  it('calculates batch fees for percentage config', async () => {
    const feeRow = {
      id: 2, client_id: 1, rail: 'payshap', fee_type: 'percentage',
      flat_fee_cents: 0, percentage_fee: 0.01, min_fee_cents: 0, max_fee_cents: 0,
    };
    mockDbClient([{ rows: [feeRow] }]);

    const payments = [{ amount: 100 }];
    const result = await calculateFees(1, 'payshap', payments);

    expect(result.fees[0].amountCents).toBe(10000);
    expect(result.fees[0].feeCents).toBe(100);
  });

  it('wallet rail has zero fees for all payments', async () => {
    const payments = [{ amount: 5000 }, { amount: 10000 }];
    const result = await calculateFees(1, 'wallet', payments);

    expect(result.totalFeeCents).toBe(0);
    expect(result.grandTotalCents).toBe(result.totalAmountCents);
    expect(getUATClient).not.toHaveBeenCalled();
  });

  it('converts ZAR amounts to cents correctly', async () => {
    const feeRow = {
      id: 1, fee_type: 'flat', flat_fee_cents: 0,
    };
    mockDbClient([{ rows: [feeRow] }]);

    const payments = [{ amount: 150.75 }];
    const result = await calculateFees(1, 'eft', payments);

    expect(result.fees[0].amountCents).toBe(15075);
  });

  it('throws when no active fee config exists', async () => {
    mockDbClient([{ rows: [] }]);
    await expect(calculateFees(1, 'eft', [{ amount: 100 }])).rejects.toThrow('No active fee configuration');
  });

  it('throws for empty payments array', async () => {
    await expect(calculateFees(1, 'eft', [])).rejects.toThrow('non-empty array');
  });

  it('throws for non-array payments', async () => {
    await expect(calculateFees(1, 'eft', 'not-an-array')).rejects.toThrow('non-empty array');
  });

  it('throws for payment with negative amount', async () => {
    await expect(calculateFees(1, 'eft', [{ amount: -50 }])).rejects.toThrow('non-negative number');
  });

  it('throws for payment without amount property', async () => {
    await expect(calculateFees(1, 'eft', [{ name: 'Alice' }])).rejects.toThrow('non-negative number');
  });
});
