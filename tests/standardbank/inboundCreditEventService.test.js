const makeTx = () => ({
  LOCK: { UPDATE: 'UPDATE' },
  commit: jest.fn(),
  rollback: jest.fn(),
});

const mockDb = {
  Sequelize: {
    Op: { in: Symbol.for('in') },
    Transaction: { LOCK: { UPDATE: 'UPDATE' } },
  },
  sequelize: {
    transaction: jest.fn(),
  },
  SBSAInboundCreditEvent: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  SBSAInboundCreditEventSource: {
    findOne: jest.fn(),
    create: jest.fn(),
  },
};

jest.mock('../../models', () => mockDb);

const inboundCreditEventService = require('../../services/standardbank/inboundCreditEventService');

describe('inboundCreditEventService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.sequelize.transaction.mockResolvedValue(makeTx());
  });

  it('normalizes references into one channel-neutral reconciliation key', () => {
    const a = inboundCreditEventService.buildReconciliationKey({
      referenceNumber: '082 123 4567',
      amount: 10,
      currency: 'ZAR',
    });
    const b = inboundCreditEventService.buildReconciliationKey({
      referenceNumber: '+27821234567',
      amount: '10.00',
      currency: 'zar',
    });

    expect(a.normalizedReference).toBe('+27821234567');
    expect(b.normalizedReference).toBe('+27821234567');
    expect(a.reconciliationKey).toBe(b.reconciliationKey);
  });

  it('claims a new PayShap inbound credit event and source', async () => {
    mockDb.SBSAInboundCreditEventSource.findOne.mockResolvedValue(null);
    mockDb.SBSAInboundCreditEvent.findOne.mockResolvedValue(null);
    mockDb.SBSAInboundCreditEvent.create.mockResolvedValue({ id: 11 });
    mockDb.SBSAInboundCreditEventSource.create.mockResolvedValue({ id: 12 });

    const result = await inboundCreditEventService.claimOrDuplicate({
      transactionId: 'PAYSHAP-IN-abc',
      referenceNumber: '0821234567',
      amount: 25,
      currency: 'ZAR',
      source: 'payshap_inbound',
      inboundCreditEvent: { sourceType: 'payshap_inbound' },
    });

    expect(result.action).toBe('process');
    expect(result.event.id).toBe(11);
    expect(mockDb.SBSAInboundCreditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        referenceNumber: '0821234567',
        normalizedReference: '+27821234567',
        amountCents: 2500,
        firstSource: 'payshap_inbound',
      }),
      expect.any(Object)
    );
    expect(mockDb.SBSAInboundCreditEventSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 11,
        sourceType: 'payshap_inbound',
        status: 'primary',
      }),
      expect.any(Object)
    );
  });

  it('suppresses a delayed source when the reconciliation key is already credited', async () => {
    const existing = { id: 21, status: 'credited' };
    mockDb.SBSAInboundCreditEventSource.findOne.mockResolvedValue(null);
    mockDb.SBSAInboundCreditEvent.findOne.mockResolvedValue(existing);
    mockDb.SBSAInboundCreditEventSource.create.mockResolvedValue({ id: 22 });

    const result = await inboundCreditEventService.claimOrDuplicate({
      transactionId: 'STMT-bank-line',
      referenceNumber: '0821234567',
      amount: 25,
      currency: 'ZAR',
      source: 'h2h_statement_trf',
      inboundCreditEvent: {
        sourceType: 'h2h_statement_trf',
        statementTransactionId: 'STMT-bank-line',
      },
    });

    expect(result.action).toBe('duplicate');
    expect(result.reason).toBe('reconciliation_key_claimed');
    expect(mockDb.SBSAInboundCreditEventSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 21,
        sourceType: 'h2h_statement_trf',
        status: 'duplicate',
      }),
      expect.any(Object)
    );
  });

  it('allows retrying a failed source only when no credit evidence exists', async () => {
    const failedEvent = {
      id: 31,
      status: 'failed',
      creditedWalletTransactionId: null,
      creditedStandardBankTransactionId: null,
      metadata: { error: 'previous processing bug' },
      update: jest.fn().mockResolvedValue(undefined),
    };
    mockDb.SBSAInboundCreditEventSource.findOne.mockResolvedValue({ eventId: 31 });
    mockDb.SBSAInboundCreditEvent.findByPk.mockResolvedValue(failedEvent);

    const result = await inboundCreditEventService.claimOrDuplicate({
      transactionId: 'STMT-bank-line',
      referenceNumber: '0821234567',
      amount: 25,
      currency: 'ZAR',
      source: 'h2h_statement_trf',
      inboundCreditEvent: {
        sourceType: 'h2h_statement_trf',
        statementTransactionId: 'STMT-bank-line',
      },
    });

    expect(result.action).toBe('process');
    expect(result.reason).toBe('failed_source_retry');
    expect(failedEvent.update).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'processing',
        metadata: expect.objectContaining({
          retryReason: 'failed_event_without_credit_evidence',
        }),
      }),
      expect.any(Object)
    );
  });

  it('does not retry a failed source when credit evidence exists', async () => {
    const failedButCreditedEvent = {
      id: 32,
      status: 'failed',
      creditedWalletTransactionId: 99,
      creditedStandardBankTransactionId: 88,
      metadata: { error: 'post-credit audit update failed' },
      update: jest.fn(),
    };
    mockDb.SBSAInboundCreditEventSource.findOne.mockResolvedValue({ eventId: 32 });
    mockDb.SBSAInboundCreditEvent.findByPk.mockResolvedValue(failedButCreditedEvent);

    const result = await inboundCreditEventService.claimOrDuplicate({
      transactionId: 'STMT-bank-line',
      referenceNumber: '0821234567',
      amount: 25,
      currency: 'ZAR',
      source: 'h2h_statement_trf',
      inboundCreditEvent: {
        sourceType: 'h2h_statement_trf',
        statementTransactionId: 'STMT-bank-line',
      },
    });

    expect(result.action).toBe('duplicate');
    expect(result.reason).toBe('source_replay');
    expect(failedButCreditedEvent.update).not.toHaveBeenCalled();
  });
});
