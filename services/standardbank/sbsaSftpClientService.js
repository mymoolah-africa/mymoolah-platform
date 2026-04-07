'use strict';

/**
 * SBSA SFTP Client Service — GCS-based Outbound File Upload
 *
 * Handles uploading Pain.001 disbursement files (and other outbound files) to
 * Standard Bank via the MyMoolah SFTP Gateway architecture:
 *
 *   Node.js  →  GCS (mymoolah-sftp-inbound/standardbank/outbox/)  →  SFTP Gateway VM  →  SBSA
 *
 * The SFTP Gateway VM (34.35.137.166:5022) syncs the GCS bucket to SBSA's
 * SFTP server. This service writes to GCS only — no SSH keys or direct SFTP
 * connections are required in the Node process.
 *
 * Environment isolation (set via STANDARDBANK_ENVIRONMENT or MM_DEPLOYMENT_ENV):
 *   UAT:        gs://mymoolah-sftp-inbound/standardbank/uat/outbox/
 *   Staging:    gs://mymoolah-sftp-inbound/standardbank/staging/outbox/
 *   Production: gs://mymoolah-sftp-inbound/standardbank/outbox/
 *
 * Feature flag:
 *   SBSA_SFTP_UPLOAD_ENABLED (default: false)
 *   When disabled, files are written to /tmp instead of GCS for safe local testing.
 *
 * @module services/standardbank/sbsaSftpClientService
 */

const fs = require('fs');
const path = require('path');
const { Storage } = require('@google-cloud/storage');

const storage = new Storage();

const logger = {
  info:  (...a) => console.log('[SbsaSftpClient]', ...a),
  warn:  (...a) => console.warn('[SbsaSftpClient]', ...a),
  error: (...a) => console.error('[SbsaSftpClient]', ...a),
};

// ── Configuration ──────────────────────────────────────────────────────────

const BUCKET_NAME = process.env.SFTP_BUCKET_NAME || 'mymoolah-sftp-inbound';

const SBSA_ENV = process.env.STANDARDBANK_ENVIRONMENT
  || process.env.MM_DEPLOYMENT_ENV
  || 'production';

const ENV_PREFIX = SBSA_ENV === 'production' ? '' : `${SBSA_ENV}/`;

const UPLOAD_ENABLED = (process.env.SBSA_SFTP_UPLOAD_ENABLED || 'false').toLowerCase() === 'true';

// SBSA Pain.001 filename convention: MYMOOLAH_OWN11_Pain001v3_...
const PAIN001_FILENAME_PATTERN = /^MYMOOLAH_OWN11_/i;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Sleep for the given milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns the GCS prefix for the outbox based on current environment.
 *
 * @returns {string} e.g. "standardbank/outbox/" or "standardbank/uat/outbox/"
 */
function getOutboxPath() {
  return `standardbank/${ENV_PREFIX}outbox/`;
}

// ── Core Upload (with retry) ───────────────────────────────────────────────

/**
 * Upload a buffer to GCS with exponential-backoff retry.
 *
 * @param {Buffer}  buffer     - File content
 * @param {string}  gcsPath    - Full GCS object path (no leading slash)
 * @param {string}  contentType
 * @returns {Promise<{gcsPath: string, bucket: string, size: number}>}
 */
async function uploadToGCS(buffer, gcsPath, contentType) {
  const bucket = storage.bucket(BUCKET_NAME);
  const file = bucket.file(gcsPath);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await file.save(buffer, {
        contentType,
        resumable: false,
        metadata: {
          cacheControl: 'no-cache',
        },
      });

      logger.info('GCS upload succeeded', {
        gcsPath,
        bucket: BUCKET_NAME,
        size: buffer.length,
        attempt,
      });

      return { gcsPath, bucket: BUCKET_NAME, size: buffer.length };
    } catch (err) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt - 1);

      if (attempt < MAX_RETRIES) {
        logger.warn('GCS upload failed, retrying', {
          gcsPath,
          attempt,
          maxRetries: MAX_RETRIES,
          nextRetryMs: delayMs,
          error: err.message,
        });
        await sleep(delayMs);
      } else {
        logger.error('GCS upload exhausted all retries', {
          gcsPath,
          attempts: MAX_RETRIES,
          error: err.message,
        });
        throw new Error(
          `GCS upload failed after ${MAX_RETRIES} attempts for ${gcsPath}: ${err.message}`
        );
      }
    }
  }
}

/**
 * Write a buffer to a local temp file (used when SBSA_SFTP_UPLOAD_ENABLED is false).
 *
 * @param {Buffer} buffer
 * @param {string} filename
 * @returns {{localPath: string, size: number}}
 */
function writeToTempFile(buffer, filename) {
  const tmpDir = path.join('/tmp', 'sbsa-outbox');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const localPath = path.join(tmpDir, filename);
  fs.writeFileSync(localPath, buffer);

  logger.info('Wrote to temp file (upload disabled)', {
    localPath,
    size: buffer.length,
  });

  return { localPath, size: buffer.length };
}

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Upload a Pain.001 XML string to the GCS outbox for SFTP Gateway delivery.
 *
 * Validates the filename against SBSA naming convention before upload.
 * When SBSA_SFTP_UPLOAD_ENABLED is false, writes to /tmp instead.
 *
 * @param {string} xmlContent - Complete Pain.001 XML document
 * @param {string} filename   - Must start with "MYMOOLAH_OWN11_"
 * @returns {Promise<{success: boolean, gcsPath: string|null, localPath: string|null, filename: string, uploadedAt: string}>}
 */
async function uploadPain001File(xmlContent, filename) {
  if (!xmlContent || typeof xmlContent !== 'string') {
    throw new Error('xmlContent is required and must be a non-empty string');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename is required and must be a non-empty string');
  }
  if (!PAIN001_FILENAME_PATTERN.test(filename)) {
    throw new Error(
      `Filename "${filename}" does not match SBSA convention (must start with "MYMOOLAH_OWN11_")`
    );
  }

  const buffer = Buffer.from(xmlContent, 'utf-8');
  const gcsPath = `${getOutboxPath()}${filename}`;

  logger.info('Uploading Pain.001 file', {
    filename,
    gcsPath,
    size: buffer.length,
    uploadEnabled: UPLOAD_ENABLED,
    environment: SBSA_ENV,
  });

  if (!UPLOAD_ENABLED) {
    const temp = writeToTempFile(buffer, filename);
    return {
      success: true,
      gcsPath: null,
      localPath: temp.localPath,
      filename,
      uploadedAt: new Date().toISOString(),
    };
  }

  const result = await uploadToGCS(buffer, gcsPath, 'application/xml');

  return {
    success: true,
    gcsPath: result.gcsPath,
    localPath: null,
    filename,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * Generic file upload to a subfolder within the outbox.
 *
 * @param {Buffer} buffer    - File content as a Buffer
 * @param {string} filename  - Target filename
 * @param {string} [subfolder] - Optional subfolder within outbox (e.g. "receipts")
 * @returns {Promise<{success: boolean, gcsPath: string|null, localPath: string|null, filename: string, uploadedAt: string}>}
 */
async function uploadFile(buffer, filename, subfolder) {
  if (!Buffer.isBuffer(buffer)) {
    throw new Error('buffer must be a Buffer instance');
  }
  if (!filename || typeof filename !== 'string') {
    throw new Error('filename is required and must be a non-empty string');
  }

  const outbox = getOutboxPath();
  const prefix = subfolder ? `${outbox}${subfolder}/` : outbox;
  const gcsPath = `${prefix}${filename}`;

  logger.info('Uploading file to outbox', {
    filename,
    gcsPath,
    subfolder: subfolder || null,
    size: buffer.length,
    uploadEnabled: UPLOAD_ENABLED,
    environment: SBSA_ENV,
  });

  if (!UPLOAD_ENABLED) {
    const subDir = subfolder || '';
    const tempFilename = subDir ? `${subDir}_${filename}` : filename;
    const temp = writeToTempFile(buffer, tempFilename);
    return {
      success: true,
      gcsPath: null,
      localPath: temp.localPath,
      filename,
      uploadedAt: new Date().toISOString(),
    };
  }

  await uploadToGCS(buffer, gcsPath, 'application/octet-stream');

  return {
    success: true,
    gcsPath,
    localPath: null,
    filename,
    uploadedAt: new Date().toISOString(),
  };
}

/**
 * List files currently in the outbox (for debugging/monitoring).
 *
 * @returns {Promise<Array<{name: string, size: string, updated: string}>>}
 */
async function listOutboxFiles() {
  const prefix = getOutboxPath();

  logger.info('Listing outbox files', {
    bucket: BUCKET_NAME,
    prefix,
    environment: SBSA_ENV,
  });

  const bucket = storage.bucket(BUCKET_NAME);
  const [files] = await bucket.getFiles({ prefix });

  const fileList = files.map((f) => ({
    name: f.name,
    size: f.metadata.size,
    updated: f.metadata.updated,
  }));

  logger.info('Outbox listing complete', { fileCount: fileList.length });

  return fileList;
}

// ── Exports ────────────────────────────────────────────────────────────────

module.exports = {
  uploadPain001File,
  uploadFile,
  getOutboxPath,
  listOutboxFiles,
};
