'use strict';

/**
 * Unit tests for disbursementService.approveRun Pain.001 upload path.
 *
 * Focus: the integration between disbursementService and sbsaSftpClientService.
 * Mocks the sbsaSftpClientService module, the db models, fee engine, client float
 * service, and notification engine so we can assert the upload call surface
 * without hitting the database or GCS.
 *
 * Tests cover the fix for the historical bug where disbursementService tried to
 * instantiate sbsaSftpClientService as a class and silently swallowed SFTP
 * errors by writing to /tmp.
 */

// ── Module mocks (must be set BEFORE requiring the service under test) ──────

jest.mock('../../services/standardbank/sbsaSftpClientService', () => ({
  uploadPain001File: jest.fn(),
  uploadFile: jest.fn(),
  getOutboxPath: jest.fn(() => 'standardbank/uat/outbox/'),
  listOutboxFiles: jest.fn(),
}));

jest.mock('../../services/standardbank/pain001BulkBuilder', () => ({
  buildPain001Bulk: jest.fn(),
  generatePain001Filename: jest.fn(),
}));

jest.mock('../../services/disbursement/feeEngine', () => ({
  calculateFees: jest.fn(),
}));

jest.mock('../../services/disbursement/clientFloatService', () => ({
  checkSufficientFloat: jest.fn(),
  debitFloat: jest.fn(),
  creditFloat: jest.fn(),
}));

jest.mock('../../services/disbursement/notificationEngine', () => ({
  notify: jest.fn().mockResolvedValue(undefined),
  EVENT_TYPES: { RUN_APPROVED: 'RUN_APPROVED', RUN_FAILED: 'RUN_FAILED' },
}));

jest.mock('../../models', () => {
  const txn = { commit: jest.fn().mockResolvedValue(undefined), rollback: jest.fn().mockResolvedValue(undefined) };
  return {
    sequelize: { transaction: jest.fn().mockResolvedValue(txn) },
    Sequelize: { where: jest.fn(), col: jest.fn(), fn: jest.fn() },
    DisbursementRun: { findByPk: jest.fn() },
    DisbursementPayment: {},
    DisbursementClient: { findByPk: jest.fn() },
  };
});

// ── Requires (after jest.mock) ──────────────────────────────────────────────

const db = require('../../models');
const sbsaSftp = require('../../services/standardbank/sbsaSftpClientService');
const { buildPain001Bulk, generatePain001Filename } = require('../../services/standardbank/pain001BulkBuilder');
const { calculateFees } = require('../../services/disbursement/feeEngine');
const { checkSufficientFloat, debitFloat } = require('../../services/disbursement/clientFloatService');
const { approveRun } = require('../../services/standardbank/disbursementService');

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildMockRun(overrides = {}) {
  const payments = overrides.payments || [
    {
      id: 1,
      end_to_end_id: 'E2E-TEST-0001',
      beneficiary_name: 'Jane Doe',
      account_number: '1234567890',
      branch_code: '051001',
      amount: '100.00',
      reference: 'SALARY-JAN',
      payment_rail: 'eft',
      fee_cents: 0,
      metadata: {},
      update: jest.fn().mockResolvedValue(undefined),
    },
  ];

  const run = {
    id: 42,
    run_reference: 'DISB-2026-04-00001',
    client_id: 7,
    rail: 'eft',
    maker_user_id: 100,
    status: 'pending_approval',
    total_amount: '100.00',
    total_count: 1,
    payments,
    metadata: {},
    update: jest.fn().mockResolvedValue(undefined),
    ...overrides.run,
  };
  return run;
}

function primeSuccessfulDeps(run) {
  db.DisbursementRun.findByPk.mockResolvedValue(run);
  calculateFees.mockResolvedValue({
    fees: run.payments.map(() => ({ feeCents: 50 })),
    totalFeeCents: 50 * run.payments.length,
    totalAmountCents: run.payments.reduce((s, p) => s + Math.round(parseFloat(p.amount) * 100), 0),
    grandTotalCents: run.payments.reduce((s, p) => s + Math.round(parseFloat(p.amount) * 100), 0) + 50 * run.payments.length,
    feeConfig: { id: 1 },
  });
  checkSufficientFloat.mockResolvedValue({ sufficient: true, balanceCents: 10_000_000, shortfallCents: 0 });
  debitFloat.mockResolvedValue({ success: true });
  buildPain001Bulk.mockReturnValue({
    xml: '<?xml version="1.0"?><Document/>',
    msgId: 'MSG-TEST-0001',
  });
  generatePain001Filename.mockReturnValue('MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml');
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('disbursementService.approveRun — Pain.001 upload path', () => {
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

  it('calls uploadPain001File exactly once with (xml, filename) for an EFT run', async () => {
    const run = buildMockRun();
    primeSuccessfulDeps(run);
    sbsaSftp.uploadPain001File.mockResolvedValue({
      success: true,
      gcsPath: 'standardbank/uat/outbox/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml',
      localPath: null,
      filename: 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml',
      uploadedAt: new Date().toISOString(),
    });

    await approveRun(42, /* checkerUserId */ 200);

    expect(sbsaSftp.uploadPain001File).toHaveBeenCalledTimes(1);
    const [xmlArg, filenameArg] = sbsaSftp.uploadPain001File.mock.calls[0];
    expect(xmlArg).toContain('<?xml');
    expect(filenameArg).toMatch(/^MYMOOLAH_OWN11_/);
  });

  it('persists pain001_filename and pain001_gcs_path on the run after a successful upload', async () => {
    const run = buildMockRun();
    primeSuccessfulDeps(run);
    const fakeGcsPath = 'standardbank/uat/outbox/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml';
    sbsaSftp.uploadPain001File.mockResolvedValue({
      success: true,
      gcsPath: fakeGcsPath,
      localPath: null,
      filename: 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml',
      uploadedAt: new Date().toISOString(),
    });

    await approveRun(42, 200);

    expect(run.update).toHaveBeenCalled();
    const finalUpdateCall = run.update.mock.calls.find(
      (call) => call[0] && Object.prototype.hasOwnProperty.call(call[0], 'pain001_filename')
    );
    expect(finalUpdateCall).toBeDefined();
    expect(finalUpdateCall[0].pain001_filename).toMatch(/^MYMOOLAH_OWN11_/);
    expect(finalUpdateCall[0].pain001_gcs_path).toBe(fakeGcsPath);
  });

  it('throws SBSA_UPLOAD_FAILED when uploadPain001File rejects (no silent /tmp fallback)', async () => {
    const run = buildMockRun();
    primeSuccessfulDeps(run);
    sbsaSftp.uploadPain001File.mockRejectedValue(new Error('GCS upload failed after 3 attempts'));

    await expect(approveRun(42, 200)).rejects.toThrow(/SBSA_UPLOAD_FAILED/);

    // The run must NOT be silently marked submitted in this failure path.
    const finalUpdateCall = run.update.mock.calls.find(
      (call) => call[0] && Object.prototype.hasOwnProperty.call(call[0], 'pain001_filename')
    );
    expect(finalUpdateCall).toBeUndefined();
  });

  it('uses a filename that matches the SBSA MYMOOLAH_OWN11_ convention', async () => {
    const run = buildMockRun();
    primeSuccessfulDeps(run);
    sbsaSftp.uploadPain001File.mockResolvedValue({
      success: true,
      gcsPath: 'standardbank/uat/outbox/MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml',
      localPath: null,
      filename: 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260416120000000.xml',
      uploadedAt: new Date().toISOString(),
    });

    await approveRun(42, 200);

    const [, filenameArg] = sbsaSftp.uploadPain001File.mock.calls[0];
    expect(filenameArg).toMatch(/^MYMOOLAH_OWN11_Pain001v3_ZAR_[A-Z]{3}_\d{17}\.xml$/);
  });
});
