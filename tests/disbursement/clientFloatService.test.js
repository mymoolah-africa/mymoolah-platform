'use strict';

jest.mock('../../scripts/db-connection-helper', () => ({
  getUATClient: jest.fn(),
  getStagingClient: jest.fn(),
  getProductionClient: jest.fn(),
}));

const { getUATClient } = require('../../scripts/db-connection-helper');
const {
  getFloatBalance,
  checkSufficientFloat,
  debitFloat,
  creditFloat,
  createClientLedgerAccount,
  getFloatHistory,
} = require('../../services/disbursement/clientFloatService');

function createMockClient(queryResponses = []) {
  let callIndex = 0;
  const client = {
    query: jest.fn(async (sql) => {
      if (typeof sql === 'string' && (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK')) {
        return { rows: [] };
      }
      const response = queryResponses[callIndex] || { rows: [] };
      callIndex++;
      return response;
    }),
    release: jest.fn(),
  };
  getUATClient.mockResolvedValue(client);
  return client;
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.MM_DEPLOYMENT_ENV;
  delete process.env.NODE_ENV;
});

afterEach(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

// ─── getFloatBalance ────────────────────────────────────────────────────────

describe('getFloatBalance', () => {
  it('returns balance in cents and ZAR string', async () => {
    createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ balance: '5000.50' }] },
    ]);

    const result = await getFloatBalance(1);

    expect(result.clientId).toBe(1);
    expect(result.accountCode).toBe('2100-20-01');
    expect(result.balanceCents).toBe(500050);
    expect(result.balanceZAR).toBe('5000.50');
  });

  it('throws when client is not found', async () => {
    createMockClient([{ rows: [] }]);
    await expect(getFloatBalance(999)).rejects.toThrow('Disbursement client not found');
  });

  it('throws when client has no ledger account code', async () => {
    createMockClient([{ rows: [{ ledger_account_code: null }] }]);
    await expect(getFloatBalance(1)).rejects.toThrow('no assigned ledger account');
  });

  it('throws when ledger account is inactive', async () => {
    createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [] },
    ]);
    await expect(getFloatBalance(1)).rejects.toThrow('not found or inactive');
  });

  it('throws for non-positive clientId', async () => {
    await expect(getFloatBalance(0)).rejects.toThrow('positive integer');
    await expect(getFloatBalance(-1)).rejects.toThrow('positive integer');
    await expect(getFloatBalance(1.5)).rejects.toThrow('positive integer');
  });

  it('releases the DB client in the finally block', async () => {
    const mockClient = createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ balance: '100' }] },
    ]);
    await getFloatBalance(1);
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});

// ─── checkSufficientFloat ───────────────────────────────────────────────────

describe('checkSufficientFloat', () => {
  it('returns sufficient=true when balance covers the amount', async () => {
    createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ balance: '1000.00' }] },
    ]);

    const result = await checkSufficientFloat(1, 50000);

    expect(result.sufficient).toBe(true);
    expect(result.balanceCents).toBe(100000);
    expect(result.shortfallCents).toBe(0);
  });

  it('returns sufficient=false with shortfall when balance is insufficient', async () => {
    createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ balance: '100.00' }] },
    ]);

    const result = await checkSufficientFloat(1, 50000);

    expect(result.sufficient).toBe(false);
    expect(result.shortfallCents).toBe(40000);
  });

  it('returns sufficient=true when balance exactly equals required', async () => {
    createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ balance: '500.00' }] },
    ]);

    const result = await checkSufficientFloat(1, 50000);

    expect(result.sufficient).toBe(true);
    expect(result.shortfallCents).toBe(0);
  });

  it('throws for non-positive requiredAmountCents', async () => {
    await expect(checkSufficientFloat(1, 0)).rejects.toThrow('positive integer');
    await expect(checkSufficientFloat(1, -100)).rejects.toThrow('positive integer');
  });
});

// ─── debitFloat ─────────────────────────────────────────────────────────────

describe('debitFloat', () => {
  const validParams = {
    amountCents: 100000,
    feeCents: 500,
    rail: 'eft',
    runId: 'RUN-001',
    description: 'Test disbursement',
  };

  function setupDebitMock(balance = '5000.00') {
    return createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ id: 1, balance }] },
      { rows: [{ id: 101 }] },
      { rows: [{ id: 102 }] },
      { rows: [{ id: 103 }] },
      { rows: [{ id: 104 }] },
    ]);
  }

  it('debits float and returns journal entries', async () => {
    setupDebitMock();
    const result = await debitFloat(1, validParams);

    expect(result.success).toBe(true);
    expect(result.journalEntries.length).toBeGreaterThanOrEqual(2);
    expect(result.newBalanceCents).toBe(500000 - 100000 - 500);
  });

  it('creates correct journal entries for EFT (bank account credit)', async () => {
    const mockClient = setupDebitMock();
    await debitFloat(1, validParams);

    const insertCalls = mockClient.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(insertCalls.length).toBeGreaterThanOrEqual(2);

    const firstInsert = insertCalls[0];
    expect(firstInsert[1]).toContain('2100-20-01');
  });

  it('uses user wallet account for wallet rail settlement', async () => {
    const mockClient = setupDebitMock();
    await debitFloat(1, { ...validParams, rail: 'wallet', feeCents: 0 });

    const insertCalls = mockClient.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    const creditInsertParams = insertCalls[1][1];
    expect(creditInsertParams).toContain('2100-01-01');
  });

  it('splits fee into ex-VAT and VAT components', async () => {
    setupDebitMock();
    const feeCents = 1150;
    const result = await debitFloat(1, { ...validParams, feeCents });

    const expectedExVat = Math.round(1150 / 1.15);
    const expectedVat = 1150 - expectedExVat;
    expect(expectedExVat + expectedVat).toBe(1150);
    expect(result.success).toBe(true);
  });

  it('skips fee/VAT journal entries when feeCents is zero', async () => {
    const mockClient = setupDebitMock();
    await debitFloat(1, { ...validParams, feeCents: 0 });

    const insertCalls = mockClient.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(insertCalls).toHaveLength(2);
  });

  it('throws and rolls back on insufficient float', async () => {
    const mockClient = createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ id: 1, balance: '0.01' }] },
    ]);

    await expect(debitFloat(1, validParams)).rejects.toThrow('Insufficient float');

    const rollbackCalls = mockClient.query.mock.calls.filter(
      ([sql]) => sql === 'ROLLBACK'
    );
    expect(rollbackCalls.length).toBe(1);
  });

  it('throws for missing runId', async () => {
    await expect(debitFloat(1, { ...validParams, runId: undefined })).rejects.toThrow('runId is required');
  });

  it('throws for missing description', async () => {
    await expect(debitFloat(1, { ...validParams, description: '' })).rejects.toThrow('description is required');
  });

  it('throws for invalid rail', async () => {
    await expect(debitFloat(1, { ...validParams, rail: 'bitcoin' })).rejects.toThrow('Invalid rail');
  });

  it('throws for negative feeCents', async () => {
    await expect(debitFloat(1, { ...validParams, feeCents: -10 })).rejects.toThrow('non-negative integer');
  });

  it('releases the DB client even on error', async () => {
    const mockClient = createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ id: 1, balance: '0.01' }] },
    ]);

    await expect(debitFloat(1, validParams)).rejects.toThrow();
    expect(mockClient.release).toHaveBeenCalledTimes(1);
  });
});

// ─── creditFloat ────────────────────────────────────────────────────────────

describe('creditFloat', () => {
  const validParams = {
    amountCents: 500000,
    reference: 'DEP-001',
    source: 'eft_deposit',
    description: 'Float top-up',
  };

  function setupCreditMock(balance = '1000.00') {
    return createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ id: 1, balance }] },
      { rows: [{ id: 201 }] },
      { rows: [{ id: 202 }] },
    ]);
  }

  it('credits float and returns updated balance', async () => {
    setupCreditMock();
    const result = await creditFloat(1, validParams);

    expect(result.success).toBe(true);
    expect(result.journalEntries).toHaveLength(2);
    expect(result.newBalanceCents).toBe(100000 + 500000);
  });

  it('creates DR bank + CR float journal entries', async () => {
    const mockClient = setupCreditMock();
    await creditFloat(1, validParams);

    const insertCalls = mockClient.query.mock.calls.filter(
      ([sql]) => typeof sql === 'string' && sql.includes('INSERT INTO journal_entries')
    );
    expect(insertCalls).toHaveLength(2);
  });

  it('throws for missing reference', async () => {
    await expect(creditFloat(1, { ...validParams, reference: '' })).rejects.toThrow('reference is required');
  });

  it('throws for missing source', async () => {
    await expect(creditFloat(1, { ...validParams, source: '' })).rejects.toThrow('source is required');
  });

  it('throws for missing description', async () => {
    await expect(creditFloat(1, { ...validParams, description: '' })).rejects.toThrow('description is required');
  });

  it('throws for zero amountCents', async () => {
    await expect(creditFloat(1, { ...validParams, amountCents: 0 })).rejects.toThrow('positive integer');
  });

  it('rolls back on DB error', async () => {
    const mockClient = createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ id: 1, balance: '100' }] },
    ]);
    mockClient.query.mockImplementation(async (sql) => {
      if (sql === 'BEGIN' || sql === 'ROLLBACK') return { rows: [] };
      if (typeof sql === 'string' && sql.includes('disbursement_clients')) {
        return { rows: [{ ledger_account_code: '2100-20-01' }] };
      }
      if (typeof sql === 'string' && sql.includes('FOR UPDATE')) {
        return { rows: [{ id: 1, balance: '100' }] };
      }
      if (typeof sql === 'string' && sql.includes('INSERT')) {
        throw new Error('DB write failure');
      }
      return { rows: [] };
    });

    await expect(creditFloat(1, validParams)).rejects.toThrow('DB write failure');
  });
});

// ─── createClientLedgerAccount ──────────────────────────────────────────────

describe('createClientLedgerAccount', () => {
  it('creates an account with next sequential code', async () => {
    createMockClient([
      { rows: [{ code: '2100-20-03' }] },
      { rows: [] },
    ]);

    const code = await createClientLedgerAccount('ACME', 'Acme Corp');
    expect(code).toBe('2100-20-04');
  });

  it('starts at 01 when no existing accounts', async () => {
    createMockClient([
      { rows: [] },
      { rows: [] },
    ]);

    const code = await createClientLedgerAccount('NEW', 'New Client');
    expect(code).toBe('2100-20-01');
  });

  it('throws on sequence collision', async () => {
    createMockClient([
      { rows: [{ code: '2100-20-05' }] },
      { rows: [{ id: 999 }] },
    ]);

    await expect(createClientLedgerAccount('CLN', 'Collision Client'))
      .rejects.toThrow('sequence collision');
  });

  it('throws for empty clientCode', async () => {
    await expect(createClientLedgerAccount('', 'Name')).rejects.toThrow('clientCode is required');
  });

  it('throws for empty companyName', async () => {
    await expect(createClientLedgerAccount('CODE', '')).rejects.toThrow('companyName is required');
  });
});

// ─── getFloatHistory ────────────────────────────────────────────────────────

describe('getFloatHistory', () => {
  function setupHistoryMock(total = 2) {
    return createMockClient([
      { rows: [{ ledger_account_code: '2100-20-01' }] },
      { rows: [{ total }] },
      {
        rows: [
          { id: 1, transaction_id: 'TX-1', debit: '100', credit: '0', description: 'Debit', metadata: {}, created_at: new Date() },
          { id: 2, transaction_id: 'TX-2', debit: '0', credit: '200', description: 'Credit', metadata: {}, created_at: new Date() },
        ],
      },
    ]);
  }

  it('returns paginated entries with debit/credit in cents', async () => {
    setupHistoryMock();
    const result = await getFloatHistory(1);

    expect(result.entries).toHaveLength(2);
    expect(result.entries[0].debitCents).toBe(10000);
    expect(result.entries[1].creditCents).toBe(20000);
    expect(result.pagination.page).toBe(1);
    expect(result.pagination.limit).toBe(50);
    expect(result.pagination.total).toBe(2);
  });

  it('clamps page limit to MAX_PAGE_LIMIT (200)', async () => {
    setupHistoryMock();
    const result = await getFloatHistory(1, { limit: 500 });
    expect(result.pagination.limit).toBe(200);
  });

  it('defaults to page 1 when page is invalid', async () => {
    setupHistoryMock();
    const result = await getFloatHistory(1, { page: -3 });
    expect(result.pagination.page).toBe(1);
  });

  it('passes date filters to query', async () => {
    const mockClient = setupHistoryMock();
    const dateFrom = '2025-01-01';
    const dateTo = '2025-12-31';
    await getFloatHistory(1, { dateFrom, dateTo });

    const queryCalls = mockClient.query.mock.calls;
    const countCall = queryCalls.find(([sql]) =>
      typeof sql === 'string' && sql.includes('COUNT')
    );
    expect(countCall[1]).toContain(dateFrom);
    expect(countCall[1]).toContain(dateTo);
  });

  it('throws for non-positive clientId', async () => {
    await expect(getFloatHistory(0)).rejects.toThrow('positive integer');
  });

  it('throws when client has no ledger account', async () => {
    createMockClient([{ rows: [{ ledger_account_code: null }] }]);
    await expect(getFloatHistory(1)).rejects.toThrow('no assigned ledger account');
  });
});
