'use strict';

/**
 * Unit tests for disbursementService.processPain002Response.
 *
 * These tests verify the 2026-04-23 additions to the SBSA H2H Pain.002
 * response-handling rules (ahead of the PROD Penny test):
 *
 *   - INTAUD with GrpSts RJCT is TERMINAL (SBSA does not emit FINAUD after it).
 *   - UNPAID is AUTHORITATIVE over any prior FINAUD on a per-transaction basis;
 *     the pre-UNPAID status must be preserved in payment.metadata.pre_unpaid_status.
 *   - NACK (file-level rejection) marks all pending payments in the run rejected.
 *   - ACK is informational only — no DB writes.
 */

jest.mock('../../services/standardbank/pain001BulkBuilder', () => ({
  buildPain001Bulk: jest.fn(),
  generatePain001Filename: jest.fn(),
  mapRejectionCode: (code) => ({
    reason: code ? `Rejection code ${code}` : 'Unknown',
    permanent: false,
  }),
  REJECTION_MESSAGES: {},
}));

jest.mock('../../services/disbursement/feeEngine', () => ({
  calculateFees: jest.fn(),
}));

jest.mock('../../services/disbursement/clientFloatService', () => ({
  checkSufficientFloat: jest.fn(),
  debitFloat: jest.fn(),
  creditFloat: jest.fn(),
}));

jest.mock('../../services/standardbank/disbursementNotificationService', () => ({
  notifyRunResult: jest.fn().mockResolvedValue(undefined),
  notifyRunRejected: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../services/disbursement/notificationEngine', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
  EVENT_TYPES: {
    RUN_APPROVED: 'RUN_APPROVED', RUN_FAILED: 'RUN_FAILED',
    RUN_COMPLETED: 'RUN_COMPLETED', RUN_PARTIAL: 'RUN_PARTIAL',
  },
}));

// ── db mock ─────────────────────────────────────────────────────────────────
// Variables referenced inside jest.mock factories must be prefixed with `mock`
// to satisfy Jest's hoisting-safety check.
const mockTxnStub = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined),
};

jest.mock('../../models', () => {
  const sequelize = {
    transaction: jest.fn().mockResolvedValue(mockTxnStub),
    where: (...a) => ({ __where: a }),
    json:  (...a) => ({ __json: a }),
    literal: (s) => ({ __literal: s }),
  };
  return {
    sequelize,
    Sequelize: { where: sequelize.where, literal: sequelize.literal, fn: jest.fn(), col: jest.fn() },
    DisbursementRun: { findOne: jest.fn(), findByPk: jest.fn() },
    DisbursementPayment: { findOne: jest.fn(), count: jest.fn(), update: jest.fn() },
    DisbursementClient: { findByPk: jest.fn() },
  };
});

const db = require('../../models');
const { processPain002Response } = require('../../services/standardbank/disbursementService');

// ── Helpers ─────────────────────────────────────────────────────────────────
function buildRun() {
  return {
    id: 42,
    run_reference: 'PROD-PENNY-TEST',
    status: 'processing',
    update: jest.fn().mockResolvedValue(undefined),
  };
}

function buildPayment(overrides = {}) {
  return {
    id: overrides.id || 1,
    end_to_end_id: overrides.end_to_end_id || 'E2E-01',
    status: overrides.status || 'pending',
    metadata: overrides.metadata || {},
    update: jest.fn().mockImplementation(function (patch) {
      Object.assign(this, patch);
      return Promise.resolve(undefined);
    }),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe('processPain002Response — ACK', () => {
  it('returns informational-only without touching the DB', async () => {
    const result = await processPain002Response({
      responseType: 'ACK',
      originalMsgId: 'MM-PROD-PENNY-1',
      groupStatus: 'RCVD',
      payments: [],
    });

    expect(result).toMatchObject({ responseType: 'ACK', terminal: false, run: null });
    expect(db.DisbursementRun.findOne).not.toHaveBeenCalled();
    expect(db.sequelize.transaction).not.toHaveBeenCalled();
  });
});

describe('processPain002Response — NACK', () => {
  it('marks every pending payment in the run as rejected with the group AddtlInf', async () => {
    const run = buildRun();
    db.DisbursementRun.findOne.mockResolvedValue(run);
    db.DisbursementPayment.update.mockResolvedValue([3]);

    const result = await processPain002Response({
      responseType: 'NACK',
      originalMsgId: 'MM-PROD-PENNY-1',
      groupStatus: 'RJCT',
      addtlInf: 'Duplicate MsgId',
      payments: [],
    });

    expect(db.DisbursementPayment.update).toHaveBeenCalledTimes(1);
    const [patch, opts] = db.DisbursementPayment.update.mock.calls[0];
    expect(patch.status).toBe('rejected');
    expect(patch.rejection_code).toBe('NACK');
    expect(patch.rejection_reason).toBe('Duplicate MsgId');
    expect(opts.where).toEqual({ run_id: 42, status: 'pending' });

    expect(run.update).toHaveBeenCalledTimes(1);
    expect(run.update.mock.calls[0][0]).toMatchObject({
      pending_count: 0,
      status: 'failed',
    });
    expect(mockTxnStub.commit).toHaveBeenCalled();

    expect(result).toMatchObject({
      responseType: 'NACK',
      terminal: true,
      failed: 3,
      accepted: 0,
    });
  });
});

describe('processPain002Response — INTAUD RJCT is terminal', () => {
  it('applies the per-tx rejections and does not wait for FINAUD', async () => {
    const run = buildRun();
    db.DisbursementRun.findOne.mockResolvedValue(run);

    const p1 = buildPayment({ id: 1, end_to_end_id: 'E2E-01' });
    const p2 = buildPayment({ id: 2, end_to_end_id: 'E2E-02' });
    const p3 = buildPayment({ id: 3, end_to_end_id: 'E2E-03' });
    db.DisbursementPayment.findOne
      .mockResolvedValueOnce(p1)
      .mockResolvedValueOnce(p2)
      .mockResolvedValueOnce(p3);
    db.DisbursementPayment.count.mockResolvedValue(0);

    const result = await processPain002Response({
      responseType: 'INTAUD',
      originalMsgId: 'MM-OVERLIMIT-1',
      groupStatus: 'RJCT',
      addtlInf: 'RUN EXCEEDS LIMIT',
      payments: [
        { endToEndId: 'E2E-01', txStatus: 'RJCT', status: 'rejected', rejectionCode: '0009', rejectionReasonDetail: 'RUN EXCEEDS LIMIT' },
        { endToEndId: 'E2E-02', txStatus: 'RJCT', status: 'rejected', rejectionCode: '0009', rejectionReasonDetail: 'RUN EXCEEDS LIMIT' },
        { endToEndId: 'E2E-03', txStatus: 'RJCT', status: 'rejected', rejectionCode: '0009', rejectionReasonDetail: 'RUN EXCEEDS LIMIT' },
      ],
    });

    expect(p1.update).toHaveBeenCalled();
    expect(p2.update).toHaveBeenCalled();
    expect(p3.update).toHaveBeenCalled();
    expect(p1.update.mock.calls[0][0]).toMatchObject({
      status: 'rejected',
      rejection_code: '0009',
      rejection_reason: 'RUN EXCEEDS LIMIT',
    });

    expect(run.update).toHaveBeenCalledTimes(1);
    expect(run.update.mock.calls[0][0]).toMatchObject({
      pending_count: 0,
      status: 'failed',
    });

    expect(result).toMatchObject({
      responseType: 'INTAUD',
      terminal: true,
      accepted: 0,
      failed: 3,
    });
  });
});

describe('processPain002Response — INTAUD PART (interim; PDNG stays pending)', () => {
  it('rejects per-tx RJCT rows but leaves PDNG rows untouched until FINAUD', async () => {
    const run = buildRun();
    db.DisbursementRun.findOne.mockResolvedValue(run);

    const p1 = buildPayment({ id: 1, end_to_end_id: 'E2E-01' });
    const p2 = buildPayment({ id: 2, end_to_end_id: 'E2E-02' });
    db.DisbursementPayment.findOne
      .mockResolvedValueOnce(p1)
      .mockResolvedValueOnce(p2);
    db.DisbursementPayment.count.mockResolvedValue(1);

    await processPain002Response({
      responseType: 'INTAUD',
      originalMsgId: 'MM-MIXED-1',
      groupStatus: 'PART',
      payments: [
        { endToEndId: 'E2E-01', txStatus: 'PDNG', status: 'accepted' },
        { endToEndId: 'E2E-02', txStatus: 'RJCT', status: 'rejected', rejectionCode: '0003', rejectionReasonDetail: 'INVALID ACCOUNT NUMBER' },
      ],
    });

    // PDNG row should NOT be updated.
    expect(p1.update).not.toHaveBeenCalled();
    // RJCT row IS updated terminally.
    expect(p2.update).toHaveBeenCalledTimes(1);
    expect(p2.update.mock.calls[0][0]).toMatchObject({
      status: 'rejected',
      rejection_code: '0003',
      rejection_reason: 'INVALID ACCOUNT NUMBER',
    });

    // Run still has pending — status stays 'processing'.
    expect(run.update.mock.calls[0][0]).toMatchObject({
      pending_count: 1,
      status: 'processing',
    });
  });
});

describe('processPain002Response — UNPAID overrides FINAUD', () => {
  it('overrides a previously-accepted payment to rejected and preserves pre_unpaid_status in metadata', async () => {
    const run = buildRun();
    db.DisbursementRun.findOne.mockResolvedValue(run);

    const payment = buildPayment({
      id: 1,
      end_to_end_id: 'Tx-03',
      status: 'accepted',          // already marked accepted by prior FINAUD
      metadata: { rail: 'eft' },
    });
    db.DisbursementPayment.findOne.mockResolvedValueOnce(payment);
    db.DisbursementPayment.count.mockResolvedValue(0);

    const result = await processPain002Response({
      responseType: 'UNPAID',
      originalMsgId: 'MM-RM12',
      groupStatus: 'PART',
      payments: [
        {
          endToEndId: 'Tx-03',
          txStatus: 'ACWC',
          status: 'rejected',                  // parser already flipped ACWC→rejected under UNPAID
          rejectionCode: '14',
          rejectionReasonDetail: 'Unpaid Reason Code 14',
          unpaidReasonCode: '14',
        },
      ],
    });

    expect(payment.update).toHaveBeenCalledTimes(1);
    const patch = payment.update.mock.calls[0][0];
    expect(patch.status).toBe('rejected');
    expect(patch.rejection_code).toBe('14');
    expect(patch.rejection_reason).toBe('Unpaid Reason Code 14');
    expect(patch.metadata).toMatchObject({
      rail: 'eft',
      pre_unpaid_status: 'accepted',
      unpaid_reason_code: '14',
      unpaid_tx_status: 'ACWC',
    });
    expect(patch.metadata.unpaid_applied_at).toEqual(expect.any(String));

    expect(result).toMatchObject({
      responseType: 'UNPAID',
      failed: 1,
      accepted: 0,
    });
  });
});

describe('processPain002Response — FINAUD does not downgrade a UNPAID override', () => {
  it('skips any payment already overridden by UNPAID', async () => {
    const run = buildRun();
    db.DisbursementRun.findOne.mockResolvedValue(run);

    const alreadyUnpaid = buildPayment({
      id: 1,
      end_to_end_id: 'Tx-03',
      status: 'rejected',
      metadata: { pre_unpaid_status: 'accepted', unpaid_reason_code: '14' },
    });
    db.DisbursementPayment.findOne.mockResolvedValueOnce(alreadyUnpaid);
    db.DisbursementPayment.count.mockResolvedValue(0);

    await processPain002Response({
      responseType: 'FINAUD',
      originalMsgId: 'MM-RM12',
      groupStatus: 'ACSP',
      payments: [
        { endToEndId: 'Tx-03', txStatus: 'ACSP', status: 'accepted' },
      ],
    });

    expect(alreadyUnpaid.update).not.toHaveBeenCalled();
  });
});
