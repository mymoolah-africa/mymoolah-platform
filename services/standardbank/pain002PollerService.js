'use strict';

/**
 * Pain.002 Poller Service — SBSA H2H Disbursement Response Processing
 *
 * Polls GCS for Pain.002 (CustomerPaymentStatusReport) XML files from
 * Standard Bank, parses them, and updates disbursement payment statuses.
 *
 * Flow:
 *   1. Poll GCS  gs://mymoolah-sftp-inbound/standardbank/inbox/payments/
 *   2. Filter for *Pain002* or *pain002* filenames (skip processed/ and failed/)
 *   3. Download each file, parse via pain002Parser
 *   4. Delegate to disbursementService.processPain002Response()
 *   5. On success → move file to processed/ subfolder
 *   6. On parse failure → move file to failed/ subfolder
 *   7. On processPain002Response failure → leave file in inbox (retry next poll)
 *   8. If run reached terminal status → notify via disbursementNotificationService
 *
 * Idempotency: Processed filenames are tracked in-memory (Set) to avoid
 * reprocessing within the same process lifetime. Files are also moved out
 * of the inbox on success, preventing cross-restart duplicates.
 *
 * Environment isolation (set via STANDARDBANK_ENVIRONMENT or MM_DEPLOYMENT_ENV):
 *   UAT:        gs://mymoolah-sftp-inbound/standardbank/uat/inbox/payments/
 *   Staging:    gs://mymoolah-sftp-inbound/standardbank/staging/inbox/payments/
 *   Production: gs://mymoolah-sftp-inbound/standardbank/inbox/payments/
 *
 * Feature flag: SBSA_PAIN002_POLLER_ENABLED (default: false)
 *
 * @module services/standardbank/pain002PollerService
 */

const { Storage } = require('@google-cloud/storage');
const { parsePain002 } = require('./pain002Parser');
const { processPain002Response } = require('./disbursementService');
const { notifyRunResult } = require('./disbursementNotificationService');

const storage = new Storage();
const SFTP_BUCKET = process.env.SFTP_BUCKET_NAME || 'mymoolah-sftp-inbound';

const logger = {
  info:  (...a) => console.log('[Pain002Poller]', ...a),
  warn:  (...a) => console.warn('[Pain002Poller]', ...a),
  error: (...a) => console.error('[Pain002Poller]', ...a),
};

const SBSA_ENV = process.env.STANDARDBANK_ENVIRONMENT
  || process.env.MM_DEPLOYMENT_ENV
  || 'production';

const ENV_PREFIX = SBSA_ENV === 'production' ? '' : `${SBSA_ENV}/`;

const PAIN002_PATTERN = /pain002/i;
const DEFAULT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

const processedFiles = new Set();
let pollingTimer = null;

/**
 * Returns the GCS prefix for the Pain.002 inbox based on environment.
 *
 * @returns {string} GCS object prefix (no leading slash)
 */
function getInboxPath() {
  return `standardbank/${ENV_PREFIX}inbox/payments/`;
}

/**
 * Poll GCS for unprocessed Pain.002 files.
 *
 * Lists all files in the inbox prefix, filters for Pain002 pattern,
 * excludes files in processed/ or failed/ subfolders, and excludes
 * files already handled this process lifetime.
 *
 * @returns {Promise<{ processed: number, skipped: number, failed: number }>}
 */
async function pollForPain002Files() {
  const prefix = getInboxPath();
  logger.info('Polling for Pain.002 files', { prefix, bucket: SFTP_BUCKET });

  let files;
  try {
    const [listed] = await storage.bucket(SFTP_BUCKET).getFiles({ prefix });
    files = listed;
  } catch (err) {
    logger.error('Failed to list GCS files', { prefix, error: err.message });
    return { processed: 0, skipped: 0, failed: 0 };
  }

  const candidates = files.filter(f => {
    if (f.name.endsWith('/')) return false;

    const relativePath = f.name.slice(prefix.length);
    if (relativePath.startsWith('processed/') || relativePath.startsWith('failed/')) return false;

    const basename = f.name.split('/').pop();
    if (!basename || basename.startsWith('.')) return false;
    if (!PAIN002_PATTERN.test(basename)) return false;
    if (processedFiles.has(f.name)) {
      logger.info('Skipping already-processed file', { file: basename });
      return false;
    }

    return true;
  });

  if (candidates.length === 0) {
    logger.info('No new Pain.002 files found');
    return { processed: 0, skipped: 0, failed: 0 };
  }

  logger.info(`Found ${candidates.length} Pain.002 file(s) to process`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of candidates) {
    try {
      const result = await processFile(file);
      if (result.skipped) {
        skipped++;
      } else {
        processed++;
      }
    } catch (err) {
      failed++;
      const basename = file.name.split('/').pop();
      logger.error('Unhandled error processing Pain.002 file', {
        file: basename,
        gcsPath: file.name,
        error: err.message,
      });
    }
  }

  logger.info('Pain.002 poll complete', { processed, skipped, failed });
  return { processed, skipped, failed };
}

/**
 * Process a single Pain.002 GCS file.
 *
 * Steps:
 *   1. Download file content from GCS
 *   2. Parse XML via parsePain002()
 *   3. Delegate to disbursementService.processPain002Response()
 *   4. Move file to processed/ (or failed/ on parse error)
 *   5. Notify if run reached terminal status
 *
 * If parsing fails, the file is moved to failed/ and the error is logged.
 * If processPain002Response throws, the file stays in the inbox for retry.
 *
 * @param {Object} gcsFile - GCS File object from @google-cloud/storage
 * @returns {Promise<Object>} Processing result
 */
async function processFile(gcsFile) {
  const basename = gcsFile.name.split('/').pop();

  if (processedFiles.has(gcsFile.name)) {
    return { skipped: true, filename: basename, reason: 'already_processed' };
  }

  logger.info('Processing Pain.002 file', { file: basename, gcsPath: gcsFile.name });

  // Step 1: Download
  let xmlContent;
  try {
    const [content] = await gcsFile.download();
    xmlContent = content.toString('utf-8');
  } catch (err) {
    logger.error('Failed to download file from GCS', { file: basename, error: err.message });
    throw err;
  }

  // Step 2: Parse
  let pain002Data;
  try {
    pain002Data = parsePain002(xmlContent);
  } catch (parseErr) {
    logger.error('Pain.002 parse failed — moving to failed/', {
      file: basename,
      error: parseErr.message,
    });
    await moveFile(gcsFile, 'failed');
    processedFiles.add(gcsFile.name);
    return {
      skipped: false,
      filename: basename,
      error: `Parse failed: ${parseErr.message}`,
      movedTo: 'failed',
    };
  }

  logger.info('Pain.002 parsed successfully', {
    file: basename,
    msgId: pain002Data.msgId,
    originalMsgId: pain002Data.originalMsgId,
    groupStatus: pain002Data.groupStatus,
    paymentCount: pain002Data.payments.length,
  });

  // Step 3: Update disbursement statuses (do NOT catch — leave in inbox for retry)
  const result = await processPain002Response(pain002Data);

  // Step 4: Move to processed/
  await moveFile(gcsFile, 'processed');
  processedFiles.add(gcsFile.name);

  logger.info('Pain.002 file processed successfully', {
    file: basename,
    msgId: pain002Data.msgId,
    originalMsgId: pain002Data.originalMsgId,
    groupStatus: pain002Data.groupStatus,
    paymentCount: pain002Data.payments.length,
    accepted: result.accepted,
    failed: result.failed,
    runReference: result.run?.run_reference || null,
  });

  // Step 5: Notify if run reached terminal status
  if (result.run && ['completed', 'partial', 'failed'].includes(result.run.status)) {
    try {
      const db = require('../../models');
      const refreshedRun = await db.DisbursementRun.findByPk(result.run.id);
      if (refreshedRun) {
        await notifyRunResult(refreshedRun);
      }
    } catch (notifyErr) {
      logger.warn('Notification after Pain.002 processing failed (non-critical)', {
        file: basename,
        error: notifyErr.message,
      });
    }
  }

  return {
    skipped: false,
    filename: basename,
    msgId: pain002Data.msgId,
    originalMsgId: pain002Data.originalMsgId,
    groupStatus: pain002Data.groupStatus,
    paymentCount: pain002Data.payments.length,
    accepted: result.accepted,
    failed: result.failed,
  };
}

/**
 * Move a GCS file to a subfolder (processed/ or failed/) within the inbox path.
 *
 * @param {Object} gcsFile - GCS File object
 * @param {'processed'|'failed'} destination
 */
async function moveFile(gcsFile, destination) {
  const prefix = getInboxPath();
  const basename = gcsFile.name.split('/').pop();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const targetPath = `${prefix}${destination}/${timestamp}_${basename}`;

  try {
    await gcsFile.move(targetPath);
    logger.info('File moved', { from: gcsFile.name, to: targetPath });
  } catch (err) {
    logger.warn('Failed to move file', {
      from: gcsFile.name,
      to: targetPath,
      error: err.message,
    });
  }
}

/**
 * Start polling for Pain.002 files at the given interval.
 * Respects the SBSA_PAIN002_POLLER_ENABLED feature flag (default: disabled).
 *
 * @param {number} [intervalMs=300000] - Polling interval in milliseconds (default 5 min)
 * @returns {boolean} true if polling started, false if disabled by feature flag
 */
function startPolling(intervalMs = DEFAULT_POLL_INTERVAL_MS) {
  const enabled = (process.env.SBSA_PAIN002_POLLER_ENABLED || 'false').toLowerCase() === 'true';

  if (!enabled) {
    logger.info('Pain.002 poller disabled (SBSA_PAIN002_POLLER_ENABLED != true)');
    return false;
  }

  if (pollingTimer) {
    logger.warn('Pain.002 poller already running — stopping previous timer');
    stopPolling();
  }

  logger.info('Starting Pain.002 poller', {
    intervalMs,
    environment: SBSA_ENV,
    inboxPath: getInboxPath(),
    bucket: SFTP_BUCKET,
  });

  pollForPain002Files().catch(err => {
    logger.error('Initial Pain.002 poll failed', { error: err.message });
  });

  pollingTimer = setInterval(() => {
    pollForPain002Files().catch(err => {
      logger.error('Scheduled Pain.002 poll failed', { error: err.message });
    });
  }, intervalMs);

  return true;
}

/**
 * Stop the Pain.002 polling timer.
 */
function stopPolling() {
  if (pollingTimer) {
    clearInterval(pollingTimer);
    pollingTimer = null;
    logger.info('Pain.002 poller stopped');
  }
}

module.exports = {
  pollForPain002Files,
  processFile,
  getInboxPath,
  startPolling,
  stopPolling,
};
