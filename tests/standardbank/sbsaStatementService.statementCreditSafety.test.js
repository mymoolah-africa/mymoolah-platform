jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({
    bucket: jest.fn().mockReturnValue({}),
  })),
}));

jest.mock('../../models', () => ({
  Sequelize: {
    Op: {
      or: Symbol.for('or'),
      iLike: Symbol.for('iLike'),
      in: Symbol.for('in'),
    },
  },
  Transaction: {
    findOne: jest.fn(),
  },
  DisbursementPayment: {
    findOne: jest.fn(),
  },
  SBSAStatementRun: {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../services/ledgerService', () => ({
  postJournalEntry: jest.fn(),
}));

const depositNotificationService = require('../../services/standardbankDepositNotificationService');
jest.mock('../../services/standardbankDepositNotificationService', () => ({
  processDepositNotification: jest.fn(),
}));

const sbsaStatementService = require('../../services/standardbank/sbsaStatementService');

describe('sbsaStatementService — statement credit safety', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('recognises real SBSA production FINSTMT and PROVSTMT filenames in the GCS inbox', async () => {
    const processSpy = jest
      .spyOn(sbsaStatementService, 'processFile')
      .mockResolvedValue({ skipped: false });
    sbsaStatementService.bucket = {
      getFiles: jest.fn().mockResolvedValue([[
        { name: 'standardbank/inbox/statements/MYMOOLAH_OWN11_FINSTMT_20260425061519710_242046957.txt' },
        { name: 'standardbank/inbox/statements/MYMOOLAH_OWN11_PROVSTMT_20260423060512901_241713565.txt' },
        { name: 'standardbank/inbox/statements/.keep' },
      ]]),
    };

    const result = await sbsaStatementService.pollAndProcess();

    expect(result).toMatchObject({ processed: 2, skipped: 0, failed: 0 });
    expect(processSpy).toHaveBeenCalledTimes(2);
    expect(processSpy.mock.calls.map(([file]) => file.name)).toEqual([
      'standardbank/inbox/statements/MYMOOLAH_OWN11_FINSTMT_20260425061519710_242046957.txt',
      'standardbank/inbox/statements/MYMOOLAH_OWN11_PROVSTMT_20260423060512901_241713565.txt',
    ]);
  });

  it('does not auto-credit non-DEP statement credits from realtime rails', async () => {
    const result = await sbsaStatementService._processCreditTransaction(
      {
        seq: 1,
        valueDate: '2026-04-23',
        entryDate: '2026-04-23',
        direction: 'credit',
        amountCents: 400000,
        amount: 4000,
        swiftTypeCode: 'TRF',
        clientReference: '0821234567',
        bankReference: 'NONREF',
        rawNarrative: '/PREF/ZA000377IB PAYMENT FROM',
      },
      { currency: 'ZAR', statementType: 'MT940', accountNumber: '272406481' },
      123
    );

    expect(result).toBe(true);
    expect(depositNotificationService.processDepositNotification).not.toHaveBeenCalled();
  });

  it('routes PayShap-looking TRF credits through the gated fallback path', async () => {
    depositNotificationService.processDepositNotification.mockResolvedValue({
      success: true,
      credited: 'wallet',
      inboundCreditEventId: 42,
    });

    const result = await sbsaStatementService._processCreditTransaction(
      {
        seq: 8,
        valueDate: '2026-04-28',
        entryDate: '2026-04-28',
        direction: 'credit',
        amountCents: 40000,
        amount: 400,
        swiftTypeCode: 'TRF',
        clientReference: 'Andre Botes: 0821234567',
        bankReference: 'PMTMMRPP1777209000674',
        rawNarrative: '/PREF/ZA002002RPP PAYSHAP PAYMENT FROM',
        statementOccurrence: 1,
      },
      { currency: 'ZAR', statementType: 'MT940', accountNumber: '272406481' },
      555
    );

    expect(result).toBe(false);
    expect(depositNotificationService.processDepositNotification).toHaveBeenCalledTimes(1);
    expect(depositNotificationService.processDepositNotification.mock.calls[0][0]).toMatchObject({
      referenceNumber: 'Andre Botes: 0821234567',
      amount: 400,
      currency: 'ZAR',
      source: 'h2h_statement_trf',
      inboundCreditEvent: {
        sourceType: 'h2h_statement_trf',
        statementRunId: 555,
        sourceReference: 'PMTMMRPP1777209000674',
      },
    });
  });

  it('routes SBSA MT942 PayShap TRF credits when narrative text is in narrativeLines only', async () => {
    depositNotificationService.processDepositNotification.mockResolvedValue({
      success: true,
      credited: 'wallet',
      inboundCreditEventId: 43,
    });

    const txn = {
      seq: 7,
      valueDate: '2026-04-30',
      entryDate: '2026-04-30',
      direction: 'credit',
      amountCents: 10000,
      amount: 100,
      swiftTypeCode: 'TRF',
      clientReference: '0825571055',
      bankReference: 'NONREF',
      rawNarrative: null,
      narrative: {
        structured: false,
        narrative: null,
        narrativeLines: ['/PREF/ZA001960PAYSHAP PAYMENT FROM'],
      },
      statementOccurrence: 1,
    };

    expect(sbsaStatementService._statementNarrativeText(txn)).toContain('PAYSHAP PAYMENT FROM');
    expect(sbsaStatementService._isPayShapStatementFallbackCandidate(txn)).toBe(true);

    const result = await sbsaStatementService._processCreditTransaction(
      txn,
      { currency: 'ZAR', statementType: 'MT942', accountNumber: '272406481' },
      777
    );

    expect(result).toBe(false);
    expect(depositNotificationService.processDepositNotification).toHaveBeenCalledTimes(1);
    expect(depositNotificationService.processDepositNotification.mock.calls[0][0]).toMatchObject({
      referenceNumber: '0825571055',
      amount: 100,
      currency: 'ZAR',
      source: 'h2h_statement_trf',
      inboundCreditEvent: {
        sourceType: 'h2h_statement_trf',
        statementRunId: 777,
        sourceReference: 'NONREF',
        metadata: {
          fallbackPolicy: 'rpp_payshap_trf_phase_1',
        },
      },
    });
  });

  it('keeps RTP-shaped TRF credits out of the phase-1 fallback', async () => {
    const result = await sbsaStatementService._processCreditTransaction(
      {
        seq: 9,
        valueDate: '2026-04-28',
        entryDate: '2026-04-28',
        direction: 'credit',
        amountCents: 10000,
        amount: 100,
        swiftTypeCode: 'TRF',
        clientReference: '0821234567',
        bankReference: 'RTPREF',
        rawNarrative: '/PREF/ZA002002RTP REQUEST TO PAY FROM',
      },
      { currency: 'ZAR', statementType: 'MT940', accountNumber: '272406481' },
      556
    );

    expect(result).toBe(true);
    expect(depositNotificationService.processDepositNotification).not.toHaveBeenCalled();
  });

  it('uses a stable idempotency key for the same DEP bank line across multiple statement runs and entry dates', async () => {
    depositNotificationService.processDepositNotification.mockResolvedValue({
      success: true,
      credited: 'wallet',
    });

    const txn = {
      seq: 4,
      valueDate: '2026-04-23',
      entryDate: '2026-04-16',
      direction: 'credit',
      amountCents: 1000,
      amount: 10,
      swiftTypeCode: 'DEP',
      clientReference: '0821234567',
      bankReference: 'NONREF',
      rawNarrative: '/PREF/ZA000379IB PAYMENT FROM',
      statementOccurrence: 1,
    };
    const statement = { currency: 'ZAR', statementType: 'MT942', accountNumber: '272406481' };

    await sbsaStatementService._processCreditTransaction(txn, statement, 111);
    await sbsaStatementService._processCreditTransaction({ ...txn, seq: 19, entryDate: '2026-04-14' }, statement, 222);

    const [firstCall, secondCall] = depositNotificationService.processDepositNotification.mock.calls;
    expect(firstCall[0].transactionId).toMatch(/^STMT-[a-f0-9]{32}$/);
    expect(secondCall[0].transactionId).toBe(firstCall[0].transactionId);
    expect(firstCall[0]).toMatchObject({
      referenceNumber: '0821234567',
      amount: 10,
      currency: 'ZAR',
      source: 'MT942_STATEMENT_RUN_111',
    });
  });

  it('keeps separate idempotency keys for repeated identical deposits in one statement', async () => {
    const statement = { currency: 'ZAR', statementType: 'MT942', accountNumber: '272406481' };
    const txn = {
      seq: 1,
      valueDate: '2026-04-23',
      entryDate: '2026-04-16',
      direction: 'credit',
      amountCents: 1000,
      amount: 10,
      swiftTypeCode: 'DEP',
      clientReference: '0821234567',
      bankReference: 'NONREF',
      rawNarrative: '/PREF/ZA000379IB PAYMENT FROM',
    };

    const first = sbsaStatementService._buildStatementTransactionId({ ...txn, statementOccurrence: 1 }, statement);
    const second = sbsaStatementService._buildStatementTransactionId({ ...txn, statementOccurrence: 2 }, statement);

    expect(first).not.toBe(second);
  });
});
