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
  it('skips files in processed/ and failed/, dotfiles, and files without pain002 in the name', async () => {
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
      msgId: 'M1', originalMsgId: 'O1', groupStatus: 'ACCP', payments: [],
    });
    mockProcessPain002Response.mockResolvedValue({ accepted: 0, failed: 0, run: null });

    const svc = loadServiceFresh();
    const result = await svc.pollForPain002Files();

    expect(result.processed).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockParsePain002).toHaveBeenCalledTimes(1);
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
    expect(mockParsePain002).toHaveBeenCalledWith('<Document/>');
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
