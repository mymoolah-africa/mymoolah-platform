'use strict';

/**
 * Unit tests for services/standardbank/sbsaSftpClientService.
 *
 * Covers the critical Pain.001 outbound upload path:
 *   - Input validation (filename pattern, xmlContent type)
 *   - Local /tmp fallback when SBSA_SFTP_UPLOAD_ENABLED=false
 *   - GCS upload path when enabled
 *   - Retry with exponential backoff
 *   - Retry exhaustion surfaces a structured error
 *   - getOutboxPath() environment-scoped prefix
 *
 * All @google-cloud/storage interactions are mocked — no real GCS calls made.
 */

const path = require('path');
const fs = require('fs');

// ── GCS mock (must be set before requiring the service). Variables must be
// prefixed with `mock` so Jest allows them inside the jest.mock factory.

const mockSave = jest.fn();
const mockGetFiles = jest.fn();
const mockBucketFile = jest.fn(() => ({ save: mockSave }));
const mockBucket = jest.fn(() => ({
  file: mockBucketFile,
  getFiles: mockGetFiles,
}));

jest.mock('@google-cloud/storage', () => {
  return {
    Storage: jest.fn().mockImplementation(() => ({
      bucket: mockBucket,
    })),
  };
});

// ── Fake timers to make exponential backoff instant ────────────────────────

beforeEach(() => {
  jest.resetModules();
  jest.clearAllMocks();
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  delete process.env.SBSA_SFTP_UPLOAD_ENABLED;
  delete process.env.STANDARDBANK_ENVIRONMENT;
  delete process.env.MM_DEPLOYMENT_ENV;
  delete process.env.SFTP_BUCKET_NAME;
});

afterEach(() => {
  console.log.mockRestore();
  console.warn.mockRestore();
  console.error.mockRestore();
});

// ── Helpers ────────────────────────────────────────────────────────────────

function loadServiceFresh() {
  return require('../../services/standardbank/sbsaSftpClientService');
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('sbsaSftpClientService.uploadPain001File — validation', () => {
  it('rejects a filename that does not start with MYMOOLAH_OWN11_', async () => {
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'false';
    const svc = loadServiceFresh();
    await expect(svc.uploadPain001File('<xml/>', 'NOT_MYMOOLAH_file.xml'))
      .rejects.toThrow(/does not match SBSA convention/);
  });

  it('rejects when xmlContent is missing or not a string', async () => {
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'false';
    const svc = loadServiceFresh();
    await expect(svc.uploadPain001File('', 'MYMOOLAH_OWN11_foo.xml'))
      .rejects.toThrow(/xmlContent is required/);
    await expect(svc.uploadPain001File(null, 'MYMOOLAH_OWN11_foo.xml'))
      .rejects.toThrow(/xmlContent is required/);
    await expect(svc.uploadPain001File(123, 'MYMOOLAH_OWN11_foo.xml'))
      .rejects.toThrow(/xmlContent is required/);
  });
});

describe('sbsaSftpClientService.uploadPain001File — /tmp mode (SBSA_SFTP_UPLOAD_ENABLED=false)', () => {
  it('writes to /tmp/sbsa-outbox and returns {gcsPath: null, localPath: "/tmp/..."}', async () => {
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'false';
    const svc = loadServiceFresh();
    const filename = 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417000000000.xml';
    const xml = '<?xml version="1.0"?><Document/>';

    const result = await svc.uploadPain001File(xml, filename);

    expect(result.success).toBe(true);
    expect(result.gcsPath).toBeNull();
    expect(result.localPath).toBe(path.join('/tmp', 'sbsa-outbox', filename));
    expect(fs.existsSync(result.localPath)).toBe(true);
    expect(fs.readFileSync(result.localPath, 'utf-8')).toBe(xml);
    expect(mockSave).not.toHaveBeenCalled();

    // Cleanup
    try { fs.unlinkSync(result.localPath); } catch (_) {}
  });
});

describe('sbsaSftpClientService.uploadPain001File — GCS mode', () => {
  it('uploads to the env-scoped outbox prefix with application/xml content type', async () => {
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'true';
    process.env.STANDARDBANK_ENVIRONMENT = 'uat';
    mockSave.mockResolvedValueOnce(undefined);
    const svc = loadServiceFresh();

    const filename = 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417000000000.xml';
    const xml = '<?xml version="1.0"?><Document/>';
    const result = await svc.uploadPain001File(xml, filename);

    expect(result.success).toBe(true);
    expect(result.gcsPath).toBe(`standardbank/uat/outbox/${filename}`);
    expect(result.localPath).toBeNull();
    expect(mockBucketFile).toHaveBeenCalledWith(`standardbank/uat/outbox/${filename}`);
    expect(mockSave).toHaveBeenCalledTimes(1);
    const [, saveOpts] = mockSave.mock.calls[0];
    expect(saveOpts).toEqual(expect.objectContaining({
      contentType: 'application/xml',
      resumable: false,
    }));
  });

  it('retries with exponential backoff on transient failures, succeeds on the third attempt', async () => {
    jest.useFakeTimers();
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'true';
    process.env.STANDARDBANK_ENVIRONMENT = 'production';

    mockSave
      .mockRejectedValueOnce(new Error('ECONNRESET 1'))
      .mockRejectedValueOnce(new Error('ECONNRESET 2'))
      .mockResolvedValueOnce(undefined);

    const svc = loadServiceFresh();
    const filename = 'MYMOOLAH_OWN11_Pain001v3_ZAR_PRD_20260417000000000.xml';
    const promise = svc.uploadPain001File('<xml/>', filename);

    // Drain the backoff sleeps (1s + 2s = 3s total)
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    const result = await promise;
    expect(result.success).toBe(true);
    expect(result.gcsPath).toBe(`standardbank/outbox/${filename}`); // prod has no env prefix
    expect(mockSave).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });

  it('throws a structured error after 3 consecutive GCS failures', async () => {
    jest.useFakeTimers();
    process.env.SBSA_SFTP_UPLOAD_ENABLED = 'true';
    process.env.STANDARDBANK_ENVIRONMENT = 'staging';

    mockSave
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'));

    const svc = loadServiceFresh();
    const filename = 'MYMOOLAH_OWN11_Pain001v3_ZAR_TST_20260417000000000.xml';
    const promise = svc.uploadPain001File('<xml/>', filename);

    const expectation = expect(promise).rejects.toThrow(
      /GCS upload failed after 3 attempts.*fail 3/
    );

    // Drain the two retry sleeps before the final rejection
    await jest.advanceTimersByTimeAsync(1000);
    await jest.advanceTimersByTimeAsync(2000);

    await expectation;
    expect(mockSave).toHaveBeenCalledTimes(3);

    jest.useRealTimers();
  });
});

describe('sbsaSftpClientService.getOutboxPath', () => {
  it('returns env-prefixed path for uat', () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'uat';
    const svc = loadServiceFresh();
    expect(svc.getOutboxPath()).toBe('standardbank/uat/outbox/');
  });

  it('returns env-prefixed path for staging', () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'staging';
    const svc = loadServiceFresh();
    expect(svc.getOutboxPath()).toBe('standardbank/staging/outbox/');
  });

  it('returns un-prefixed path for production', () => {
    process.env.STANDARDBANK_ENVIRONMENT = 'production';
    const svc = loadServiceFresh();
    expect(svc.getOutboxPath()).toBe('standardbank/outbox/');
  });
});
