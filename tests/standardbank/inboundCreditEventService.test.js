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
});
