'use strict';

/**
 * Unit tests for services/reconciliation/SFTPWatcherService.
 *
 * Covers:
 *   - start() triggers an initial checkForNewFiles() and schedules an interval
 *   - checkForNewFiles skips files already in the in-memory processedFiles set
 *   - checkForNewFiles skips files whose md5Hash is already in ReconRun.file_hash
 *   - processFile moves successful runs to processed/<supplier>/
 *   - processFile moves failed runs to failed/<supplier>/
 *   - stop() clears the interval timer
 *
 * All GCS and DB interactions are mocked — no real I/O.
 */

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetFiles = jest.fn();
const mockBucket = jest.fn(() => ({ getFiles: mockGetFiles }));

jest.mock('@google-cloud/storage', () => ({
  Storage: jest.fn().mockImplementation(() => ({ bucket: mockBucket })),
}));

const mockReconcile = jest.fn();
jest.mock('../../services/reconciliation/ReconciliationOrchestrator', () => {
  return jest.fn().mockImplementation(() => ({ reconcile: mockReconcile }));
});

jest.mock('../../models', () => ({
  ReconSupplierConfig: { findAll: jest.fn() },
  ReconRun: { findOne: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));

jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      unlink: jest.fn().mockResolvedValue(undefined),
    },
  };
});

const db = require('../../models');
const SFTPWatcherService = require('../../services/reconciliation/SFTPWatcherService');

// ── Helpers ────────────────────────────────────────────────────────────────

function fakeSupplier(overrides = {}) {
  return {
    id: 1,
    supplier_code: 'MOBILEMART',
    supplier_name: 'MobileMart',
    file_name_pattern: 'recon_YYYYMMDD.csv',
    is_active: true,
    ingestion_method: 'sftp',
    ...overrides,
  };
}

function fakeGcsFile(name, md5 = 'md5-abc', overrides = {}) {
  return {
    name,
    metadata: { size: 100 },
    getMetadata: jest.fn().mockResolvedValue([{ md5Hash: md5 }]),
    download: jest.fn().mockResolvedValue(undefined),
    move: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

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

// ── Tests ──────────────────────────────────────────────────────────────────

describe('SFTPWatcherService.start / stop', () => {
  it('runs an initial checkForNewFiles and schedules a recurring interval, then stop() clears it', async () => {
    jest.useFakeTimers();
    db.ReconSupplierConfig.findAll.mockResolvedValue([]);
    mockGetFiles.mockResolvedValue([[]]);

    const watcher = new SFTPWatcherService();
    const checkSpy = jest.spyOn(watcher, 'checkForNewFiles');

    const setIntervalSpy = jest.spyOn(global, 'setInterval');
    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    await watcher.start({ pollIntervalSeconds: 30 });

    // Initial check + interval scheduled
    expect(checkSpy).toHaveBeenCalled();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    expect(setIntervalSpy.mock.calls[0][1]).toBe(30_000);

    watcher.stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
    jest.useRealTimers();
  });
});

describe('SFTPWatcherService.checkForNewFiles — dedup', () => {
  it('skips files whose md5Hash is already in processedFiles (in-memory)', async () => {
    const supplier = fakeSupplier();
    db.ReconSupplierConfig.findAll.mockResolvedValue([supplier]);
    const file = fakeGcsFile('mobilemart/recon_20260417.csv', 'hash-seen');
    mockGetFiles.mockResolvedValue([[file]]);

    const watcher = new SFTPWatcherService();
    watcher.processedFiles.add('hash-seen');
    const processSpy = jest.spyOn(watcher, 'processFile').mockResolvedValue(undefined);

    await watcher.checkForNewFiles();

    expect(processSpy).not.toHaveBeenCalled();
  });

  it('skips files whose md5Hash is already persisted as ReconRun.file_hash', async () => {
    const supplier = fakeSupplier();
    db.ReconSupplierConfig.findAll.mockResolvedValue([supplier]);
    const file = fakeGcsFile('mobilemart/recon_20260417.csv', 'hash-db');
    mockGetFiles.mockResolvedValue([[file]]);
    db.ReconRun.findOne.mockResolvedValue({ id: 99, file_hash: 'hash-db' });

    const watcher = new SFTPWatcherService();
    const processSpy = jest.spyOn(watcher, 'processFile').mockResolvedValue(undefined);

    await watcher.checkForNewFiles();

    expect(processSpy).not.toHaveBeenCalled();
    expect(watcher.processedFiles.has('hash-db')).toBe(true);
  });

  it('calls processFile for a new unique file and adds its hash to processedFiles', async () => {
    const supplier = fakeSupplier();
    db.ReconSupplierConfig.findAll.mockResolvedValue([supplier]);
    const file = fakeGcsFile('mobilemart/recon_20260417.csv', 'hash-new');
    mockGetFiles.mockResolvedValue([[file]]);
    db.ReconRun.findOne.mockResolvedValue(null);

    const watcher = new SFTPWatcherService();
    const processSpy = jest.spyOn(watcher, 'processFile').mockResolvedValue(undefined);

    await watcher.checkForNewFiles();

    expect(processSpy).toHaveBeenCalledTimes(1);
    expect(processSpy).toHaveBeenCalledWith(file, supplier);
    expect(watcher.processedFiles.has('hash-new')).toBe(true);
  });
});

describe('SFTPWatcherService.processFile — orchestrator outcomes', () => {
  it('moves the file to processed/<supplier>/ on success', async () => {
    const supplier = fakeSupplier();
    const file = fakeGcsFile('mobilemart/recon_20260417.csv');
    mockReconcile.mockResolvedValue({ success: true, run_id: 42, match_rate: 0.95 });

    const watcher = new SFTPWatcherService();
    await watcher.processFile(file, supplier);

    expect(mockReconcile).toHaveBeenCalledTimes(1);
    expect(file.move).toHaveBeenCalledTimes(1);
    expect(file.move.mock.calls[0][0]).toBe('processed/mobilemart/recon_20260417.csv');
  });

  it('moves the file to failed/<supplier>/ when orchestrator returns success=false', async () => {
    const supplier = fakeSupplier();
    const file = fakeGcsFile('mobilemart/recon_20260417.csv');
    mockReconcile.mockResolvedValue({ success: false, run_id: 42 });

    const watcher = new SFTPWatcherService();
    await watcher.processFile(file, supplier);

    expect(file.move).toHaveBeenCalledTimes(1);
    expect(file.move.mock.calls[0][0]).toBe('failed/mobilemart/recon_20260417.csv');
  });
});
