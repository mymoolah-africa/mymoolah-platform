'use strict';

/**
 * Unit tests for services/standardbank/pain002PollerService.
 *
 * Covers:
 *   - pollForPain002Files filter rules (processed/, failed/, dotfiles, pattern)
 *   - processFile happy path (download → parse → process → move to processed/)
 *   - processFile parse-error path (moves to failed/, adds to processedFiles set)
 *   - processFile processPain002Response failure (file stays in inbox for retry)
 *   - startPolling() respects SBSA_PAIN002_POLLER_ENABLED flag
 *   - stopPolling() clears the interval timer
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetFiles = jest.fn();
const mockBucket = jest.fn(() => ({ getFiles: mockGetFiles }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({ bucket: mockBucket })),
}));

const mockParsePain002 = jest.fn();
jest.mock('../../services/standardbank/pain002Parser', () => ({
  parsePain002: (...args) => mockParsePain002(...args),
}));

const mockProcessPain002Response = jest.fn();
jest.mock('../../services/standardbank/disbursementService', () => ({
  processPain002Response: (...args) => mockProcessPain002Response(...args),
}));

const mockNotifyRunResult = jest.fn();
jest.mock('../../services/standardbank/disbursementNotificationService', () => ({
  notifyRunResult: (...args) => mockNotifyRunResult(...args),
}));

jest.mock('../../models', () => ({
  DisbursementRun: { findByPk: jest.fn() },
}));

// ── Helpers ────────────────────────────────────────────────────────────────

function fakeGcsFile(name, overrides = {}) {
  return {
    name,
    download: jest.fn().mockResolvedValue([Buffer.from('<Document/>', 'utf-8')]),
    move: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function loadServiceFresh() {
  return require('../../services/standardbank/pain002PollerService');
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.SBSA_PAIN002_POLLER_ENABLED;
  delete process.env.STANDARDBANK_ENVIRONMENT;
  delete process.env.MM_DEPLOYMENT_ENV;
});

afterEach(() => {
  const svc = require('../../services/standardbank/pain002PollerService');
  svc.stopPolling();
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// ── Tests ──────────────────────────────────────────────────────────────────

describe('pain002PollerService.pollForPain002Files — filtering', () => {
  it('skips files in processed/ and failed/, dotfiles, and files without a recognised SBSA response name', async () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'uat';
    const prefix = 'standardbank/uat/inbox/payments/';
    mockGetFiles.mockResolvedValueOnce([[
      fakeGcsFile(`${prefix}pain002_good.xml`),
      fakeGcsFile(`${prefix}processed/2026_pain002_old.xml`),
      fakeGcsFile(`${prefix}failed/2026_pain002_bad.xml`),
      fakeGcsFile(`${prefix}.keep`),
      fakeGcsFile(`${prefix}BAS_ACK_somefile.xml`),
      fakeGcsFile(`${prefix}subfolder/`),
    ]]);

    mockParsePain002.mockReturnValue({
      msgId: 'M1', originalMsgId: 'O1', groupStatus: 'ACCP',
      responseType: null, addtlInf: null, payments: [],
    });
    mockProcessPain002Response.mockResolvedValue({ accepted: 0, failed: 0, run: null });

    const svc = loadServiceFresh();
    const result = await svc.pollForPain002Files();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockParsePain002).toHaveBeenCalledTimes(1);
  });

  it('accepts the full SBSA response family (ACK/NACK/INTAUD/FINAUD/UNP_DATA/VET_DATA) on TST and PRD', async () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'production';
    const prefix = 'standardbank/inbox/payments/';
    mockGetFiles.mockResolvedValueOnce([[
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_ACK_TST_20260417131408295_51885347.xml`),
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_NACK_TST_20260417161529293_51886487.xml`),
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_INTAUD_TST_20260417131420670_51885352.xml`),
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_FINAUD_PRD_20260424093532000_00000002.xml`),
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_UNP_DATA_PRD_20260424093905000_00000003.xml`),
      fakeGcsFile(`${prefix}MYMOOLAH_OWN11_VET_DATA_TST_20260417173710755_51886896.xml`),
      fakeGcsFile(`${prefix}unrelated_file.xml`),
    ]]);

    mockParsePain002.mockReturnValue({
      msgId: 'M', originalMsgId: 'O', groupStatus: 'ACCP',
      responseType: null, addtlInf: null, payments: [],
    });
    mockProcessPain002Response.mockResolvedValue({ accepted: 0, failed: 0, run: null });

    const svc = loadServiceFresh();
    const result = await svc.pollForPain002Files();

    expect(result.processed).toBe(6);
    expect(mockParsePain002).toHaveBeenCalledTimes(6);
  });
});

describe('pain002PollerService.processFile — responseType propagation', () => {
  it('passes the filename through to parsePain002 so the parser can classify responseType', async () => {
    const gcsFile = fakeGcsFile('standardbank/inbox/payments/MYMOOLAH_OWN11_FINAUD_PRD_20260424093532000_00000002.xml');

    mockParsePain002.mockReturnValue({
      msgId: 'M', originalMsgId: 'MM-PROD-PENNY-1', groupStatus: 'ACSP',
      responseType: 'FINAUD', addtlInf: null,
      payments: [{ endToEndId: 'PROD-PENNY-1-01', status: 'accepted', txStatus: 'ACSP' }],
    });
    mockProcessPain002Response.mockResolvedValue({ accepted: 1, failed: 0, run: null });

    const svc = loadServiceFresh();
    await svc.processFile(gcsFile);

    expect(mockParsePain002).toHaveBeenCalledWith(
      '<Document/>',
      { filename: 'MYMOOLAH_OWN11_FINAUD_PRD_20260424093532000_00000002.xml' }
    );
    expect(mockProcessPain002Response).toHaveBeenCalledTimes(1);
    const passed = mockProcessPain002Response.mock.calls[0][0];
    expect(passed.responseType).toBe('FINAUD');
  });
});

describe('pain002PollerService.processFile — happy path', () => {
  it('downloads, parses, calls processPain002Response, then moves file to processed/', async () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'uat';
    const gcsFile = fakeGcsFile('standardbank/uat/inbox/payments/pain002_good.xml');
    mockParsePain002.mockReturnValue({
      msgId: 'M1', originalMsgId: 'O1', groupStatus: 'ACCP',
      payments: [{ endToEndId: 'E1', status: 'ACSC' }],
    });
    mockProcessPain002Response.mockResolvedValue({ accepted: 1, failed: 0, run: null });

    const svc = loadServiceFresh();
    const result = await svc.processFile(gcsFile);

    expect(gcsFile.download).toHaveBeenCalledTimes(1);
    expect(mockParsePain002).toHaveBeenCalledWith('<Document/>', { filename: 'pain002_good.xml' });
    expect(mockProcessPain002Response).toHaveBeenCalledTimes(1);
    expect(gcsFile.move).toHaveBeenCalledTimes(1);
    expect(gcsFile.move.mock.calls[0][0]).toMatch(/processed\//);
    expect(result.skipped).toBe(false);
    expect(result.accepted).toBe(1);
  });
});

describe('pain002PollerService.processFile — parse failure', () => {
  it('moves the file to failed/ and records it in processedFiles set', async () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'staging';
    const gcsFile = fakeGcsFile('standardbank/staging/inbox/payments/pain002_bad.xml');
    mockParsePain002.mockImplementation(() => { throw new Error('invalid XML'); });

    const svc = loadServiceFresh();
    const result = await svc.processFile(gcsFile);

    expect(gcsFile.move).toHaveBeenCalledTimes(1);
    expect(gcsFile.move.mock.calls[0][0]).toMatch(/failed\//);
    expect(mockProcessPain002Response).not.toHaveBeenCalled();
    expect(result.movedTo).toBe('failed');
    expect(result.error).toMatch(/Parse failed/);
  });
});

describe('pain002PollerService.processFile — processPain002Response failure', () => {
  it('leaves the file in the inbox for retry when processPain002Response throws', async () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'uat';
    const gcsFile = fakeGcsFile('standardbank/uat/inbox/payments/pain002_retry.xml');
    mockParsePain002.mockReturnValue({
      msgId: 'M1', originalMsgId: 'O1', groupStatus: 'ACCP', payments: [],
    });
    mockProcessPain002Response.mockRejectedValue(new Error('DB constraint violation'));

    const svc = loadServiceFresh();
    await expect(svc.processFile(gcsFile)).rejects.toThrow('DB constraint violation');

    expect(gcsFile.move).not.toHaveBeenCalled();
  });
});

describe('pain002PollerService.startPolling / stopPolling', () => {
  it('returns false when SBSA_PAIN002_POLLER_ENABLED is not "true"', () => {
    process.env.SBSA_PAIN002_POLLER_ENABLED = 'false';
    const svc = loadServiceFresh();
    expect(svc.startPolling(1000)).toBe(false);
  });

  it('returns true and schedules an interval when enabled, stopPolling clears it', async () => {
    jest.useFakeTimers();
    process.env.SBSA_PAIN002_POLLER_ENABLED = 'true';
    mockGetFiles.mockResolvedValue([[]]);

    const svc = loadServiceFresh();
    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    const started = svc.startPolling(60_000);
    expect(started).toBe(true);
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);

    svc.stopPolling();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    jest.useRealTimers();
  });
});
