'use strict';

/**
 * @module notificationEngine
 * @description Per-client configurable event notification engine for the
 * disbursement product.
 *
 * Clients can subscribe to specific event types and receive notifications via
 * webhook (HMAC-SHA256 signed), email (SendGrid), or both. Preferences are
 * stored in `disbursement_notification_preferences`.
 *
 * Notification delivery is fire-and-forget — failures are logged but never
 * block the calling process.
 */

const crypto = require('crypto');
const { Storage } = require('@google-cloud/storage');
const db = require('../../models');

const LOG_PREFIX = '[NotificationEngine]';
const WEBHOOK_TIMEOUT_MS = 10_000;
const MAX_WEBHOOK_ATTEMPTS = 3;
const BACKOFF_BASE_MS = 1_000;
const SFTP_BUCKET = process.env.SFTP_BUCKET_NAME || 'mymoolah-sftp-inbound';

const SFTP_CSV_COLUMNS = [
  'employee_ref',
  'beneficiary_name',
  'account_number',
  'branch_code',
  'amount',
  'status',
  'rejection_code',
  'rejection_reason',
];

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

const EVENT_TYPES = Object.freeze({
  RUN_SUBMITTED: 'run_submitted',
  RUN_APPROVED: 'run_approved',
  RUN_COMPLETED: 'run_completed',
  RUN_FAILED: 'run_failed',
  PAYMENT_REJECTED: 'payment_rejected',
  FLOAT_LOW: 'float_low',
  FLOAT_CREDITED: 'float_credited',
  KYB_STATUS_CHANGE: 'kyb_status_change',
});

const VALID_EVENT_TYPES = new Set(Object.values(EVENT_TYPES));

// ---------------------------------------------------------------------------
// Database client resolution
// ---------------------------------------------------------------------------

function getClient() {
  return {
    query: async (sql, bind = []) => {
      const rows = await db.sequelize.query(sql, {
        bind,
        type: db.Sequelize.QueryTypes.SELECT,
      });
      return { rows };
    },
    release: () => {},
  };
}

// ---------------------------------------------------------------------------
// Input validation helpers
// ---------------------------------------------------------------------------

function validateClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') {
    throw new Error(`${LOG_PREFIX} clientId must be a non-empty string`);
  }
}

function validateEventType(eventType) {
  if (!VALID_EVENT_TYPES.has(eventType)) {
    throw new Error(`${LOG_PREFIX} Invalid event type: ${eventType}`);
  }
}

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

const EMAIL_TEMPLATES = {
  [EVENT_TYPES.RUN_COMPLETED]: (d) => ({
    subject: `Disbursement Run ${d.runReference} Completed`,
    body: `Disbursement Run ${d.runReference} completed. ${d.successCount} payments successful, ${d.failedCount} failed. Total: R${d.totalAmount}.`,
  }),
  [EVENT_TYPES.RUN_FAILED]: (d) => ({
    subject: `Disbursement Run ${d.runReference} Failed`,
    body: `Disbursement Run ${d.runReference} failed. Please check the portal for details.`,
  }),
  [EVENT_TYPES.RUN_SUBMITTED]: (d) => ({
    subject: `Disbursement Run ${d.runReference} Submitted`,
    body: `Disbursement Run ${d.runReference} has been submitted for processing.`,
  }),
  [EVENT_TYPES.RUN_APPROVED]: (d) => ({
    subject: `Disbursement Run ${d.runReference} Approved`,
    body: `Disbursement Run ${d.runReference} has been approved and is queued for execution.`,
  }),
  [EVENT_TYPES.PAYMENT_REJECTED]: (d) => ({
    subject: `Payment Rejected — Run ${d.runReference}`,
    body: `Payment ${d.endToEndId} in run ${d.runReference} was rejected. Reason: ${d.rejectionReason}. Code: ${d.rejectionCode}.`,
  }),
  [EVENT_TYPES.FLOAT_LOW]: (d) => ({
    subject: 'Low Float Balance Alert',
    body: `Your float balance is R${d.currentBalance}. Please top up to continue disbursements.`,
  }),
  [EVENT_TYPES.FLOAT_CREDITED]: (d) => ({
    subject: 'Float Credited',
    body: `R${d.amount} deposited to your float. New balance: R${d.newBalance}. Reference: ${d.reference}.`,
  }),
  [EVENT_TYPES.KYB_STATUS_CHANGE]: (d) => ({
    subject: `KYB Status Update — ${d.status}`,
    body: `Your KYB verification status has changed to "${d.status}".`,
  }),
};

// ---------------------------------------------------------------------------
// getClientPreferences
// ---------------------------------------------------------------------------

/**
 * Look up active notification preferences for a client + event type.
 * @param {string} clientId
 * @param {string} eventType
 * @returns {Promise<object|null>} channels JSONB config, or null if none/inactive.
 */
async function getClientPreferences(clientId, eventType) {
  validateClientId(clientId);
  validateEventType(eventType);

  const client = await getClient();
  try {
    const { rows } = await client.query(
      `SELECT channels
         FROM disbursement_notification_preferences
        WHERE client_id = $1
          AND event_type = $2
          AND is_active = true
        LIMIT 1`,
      [clientId, eventType],
    );
    return rows.length > 0 ? rows[0].channels : null;
  } finally {
    client.release();
  }
}

// ---------------------------------------------------------------------------
// buildEventPayload
// ---------------------------------------------------------------------------

/**
 * Build a standardized, self-describing event payload.
 * @param {string} eventType
 * @param {object} data  Event-specific fields.
 * @returns {object}
 */
function buildEventPayload(eventType, data) {
  validateEventType(eventType);
  if (!data || typeof data !== 'object') {
    throw new Error(`${LOG_PREFIX} data must be a non-null object`);
  }

  const base = {
    event: eventType,
    timestamp: new Date().toISOString(),
    idempotencyKey: crypto.randomUUID(),
  };

  switch (eventType) {
    case EVENT_TYPES.RUN_COMPLETED:
      base.data = {
        runReference: data.runReference,
        totalAmount: data.totalAmount,
        successCount: data.successCount,
        failedCount: data.failedCount,
        status: data.status,
      };
      break;

    case EVENT_TYPES.PAYMENT_REJECTED:
      base.data = {
        runReference: data.runReference,
        endToEndId: data.endToEndId,
        rejectionCode: data.rejectionCode,
        rejectionReason: data.rejectionReason,
      };
      break;

    case EVENT_TYPES.FLOAT_LOW:
      base.data = {
        clientId: data.clientId,
        currentBalance: data.currentBalance,
        threshold: data.threshold,
      };
      break;

    case EVENT_TYPES.FLOAT_CREDITED:
      base.data = {
        clientId: data.clientId,
        amount: data.amount,
        newBalance: data.newBalance,
        reference: data.reference,
      };
      break;

    default:
      base.data = { ...data };
  }

  return base;
}

// ---------------------------------------------------------------------------
// sendWebhook
// ---------------------------------------------------------------------------

/**
 * POST a signed JSON payload to a webhook URL with retry + exponential backoff.
 * @param {string} url
 * @param {string} secret   HMAC-SHA256 signing secret.
 * @param {object} payload  The event payload to deliver.
 * @returns {Promise<{success: boolean, statusCode: number, attempts: number}>}
 */
async function sendWebhook(url, secret, payload) {
  if (!url || typeof url !== 'string') {
    throw new Error(`${LOG_PREFIX} Webhook URL must be a non-empty string`);
  }
  if (!secret || typeof secret !== 'string') {
    throw new Error(`${LOG_PREFIX} Webhook secret must be a non-empty string`);
  }

  const body = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', secret).update(body).digest('hex');

  const headers = {
    'Content-Type': 'application/json',
    'X-MM-Signature': `sha256=${signature}`,
    'X-MM-Event': payload.event,
    'X-MM-Delivery': payload.idempotencyKey,
  };

  let lastStatusCode = 0;

  for (let attempt = 1; attempt <= MAX_WEBHOOK_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body,
        signal: controller.signal,
      });

      clearTimeout(timer);
      lastStatusCode = response.status;

      if (response.ok) {
        console.log(`${LOG_PREFIX} Webhook delivered — status=${lastStatusCode}, attempt=${attempt}`);
        return { success: true, statusCode: lastStatusCode, attempts: attempt };
      }

      console.warn(
        `${LOG_PREFIX} Webhook non-2xx — status=${lastStatusCode}, attempt=${attempt}/${MAX_WEBHOOK_ATTEMPTS}`,
      );
    } catch (err) {
      const reason = err.name === 'AbortError' ? 'timeout' : 'network_error';
      console.warn(
        `${LOG_PREFIX} Webhook ${reason} — attempt=${attempt}/${MAX_WEBHOOK_ATTEMPTS}`,
      );
    }

    if (attempt < MAX_WEBHOOK_ATTEMPTS) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  console.error(`${LOG_PREFIX} Webhook delivery failed after ${MAX_WEBHOOK_ATTEMPTS} attempts — status=${lastStatusCode}`);
  return { success: false, statusCode: lastStatusCode, attempts: MAX_WEBHOOK_ATTEMPTS };
}

// ---------------------------------------------------------------------------
// sendEmail
// ---------------------------------------------------------------------------

/**
 * Send an email notification via SendGrid.
 * Falls back to a console log placeholder when the SDK is unavailable.
 * @param {string[]} recipients
 * @param {string}   subject
 * @param {string}   body
 * @returns {Promise<{success: boolean, messageId: string}>}
 */
async function sendEmail(recipients, subject, body) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error(`${LOG_PREFIX} recipients must be a non-empty array`);
  }
  if (!subject || typeof subject !== 'string') {
    throw new Error(`${LOG_PREFIX} subject must be a non-empty string`);
  }
  if (!body || typeof body !== 'string') {
    throw new Error(`${LOG_PREFIX} body must be a non-empty string`);
  }

  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'notifications@mymoolah.africa';
  const recipientCount = recipients.length;

  let sgMail;
  try {
    sgMail = require('@sendgrid/mail');
  } catch {
    // SDK not installed — log placeholder
  }

  if (sgMail && process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);

    const msg = {
      to: recipients,
      from: fromEmail,
      subject,
      text: body,
    };

    try {
      const [response] = await sgMail.send(msg);
      const messageId = (response && response.headers && response.headers['x-message-id']) || crypto.randomUUID();
      console.log(`${LOG_PREFIX} Email sent — recipients=${recipientCount}, messageId=${messageId}`);
      return { success: true, messageId };
    } catch (err) {
      console.error(`${LOG_PREFIX} Email send failed — recipients=${recipientCount}, error=${err.message}`);
      return { success: false, messageId: '' };
    }
  }

  const placeholderId = crypto.randomUUID();
  console.log(`${LOG_PREFIX} Email (placeholder) — recipients=${recipientCount}, subject="${subject}", id=${placeholderId}`);
  return { success: true, messageId: placeholderId };
}

// ---------------------------------------------------------------------------
// buildResultsCsv
// ---------------------------------------------------------------------------

/**
 * Build a RFC 4180–compliant CSV string from an array of payment objects.
 * @param {object[]} payments
 * @returns {string}
 */
function buildResultsCsv(payments) {
  const header = SFTP_CSV_COLUMNS.join(',');
  const rows = (payments || []).map((p) =>
    SFTP_CSV_COLUMNS.map((col) => {
      const val = p[col] != null ? String(p[col]) : '';
      if (val.includes(',') || val.includes('"') || val.includes('\n')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    }).join(','),
  );
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// sendSftpResults
// ---------------------------------------------------------------------------

/**
 * Upload a CSV of disbursement run results to GCS for SFTP delivery.
 *
 * @param {string}   gcsPathPrefix  e.g. "disbursement-results/CLIENT-CODE"
 * @param {string}   runReference   Unique run reference (used in filename).
 * @param {object[]} payments       Array of payment objects with CSV column keys.
 * @returns {Promise<{success: boolean, gcsPath: string, bucket: string, filename: string, rowCount: number}>}
 */
async function sendSftpResults(gcsPathPrefix, runReference, payments) {
  if (!gcsPathPrefix || typeof gcsPathPrefix !== 'string') {
    throw new Error(`${LOG_PREFIX} gcs_path_prefix must be a non-empty string`);
  }
  if (!runReference || typeof runReference !== 'string') {
    throw new Error(`${LOG_PREFIX} runReference must be a non-empty string`);
  }
  if (!Array.isArray(payments)) {
    throw new Error(`${LOG_PREFIX} payments must be an array`);
  }

  const csv = buildResultsCsv(payments);
  const filename = `${runReference}_results.csv`;
  const gcsPath = `${gcsPathPrefix.replace(/\/+$/, '')}/${filename}`;

  const gcsStorage = new Storage();
  const bucket = gcsStorage.bucket(SFTP_BUCKET);
  const file = bucket.file(gcsPath);

  await file.save(Buffer.from(csv, 'utf-8'), {
    contentType: 'text/csv',
    resumable: false,
    metadata: { cacheControl: 'no-cache' },
  });

  console.log(
    `${LOG_PREFIX} SFTP results uploaded — bucket=${SFTP_BUCKET}, path=${gcsPath}, rows=${payments.length}`,
  );

  return { success: true, gcsPath, bucket: SFTP_BUCKET, filename, rowCount: payments.length };
}

// ---------------------------------------------------------------------------
// notify — main orchestrator
// ---------------------------------------------------------------------------

/**
 * Look up a client's notification preferences for an event type and dispatch
 * to all configured channels in parallel.
 *
 * @param {string} clientId
 * @param {string} eventType  One of EVENT_TYPES values.
 * @param {object} data       Event-specific data (passed to buildEventPayload).
 * @returns {Promise<{eventType: string, channels: {webhook?: object, email?: object, sftp?: object}}>}
 */
async function notify(clientId, eventType, data) {
  validateClientId(clientId);
  validateEventType(eventType);

  const channels = await getClientPreferences(clientId, eventType);
  if (!channels) {
    console.log(`${LOG_PREFIX} No active preferences for client=${clientId}, event=${eventType} — skipping`);
    return { eventType, channels: {} };
  }

  const payload = buildEventPayload(eventType, data);
  const results = {};
  const dispatches = [];

  if (channels.webhook && channels.webhook.url && channels.webhook.secret) {
    dispatches.push(
      sendWebhook(channels.webhook.url, channels.webhook.secret, payload)
        .then((res) => { results.webhook = res; })
        .catch((err) => {
          console.error(`${LOG_PREFIX} Webhook dispatch error — event=${eventType}, error=${err.message}`);
          results.webhook = { success: false, statusCode: 0, attempts: 0 };
        }),
    );
  }

  if (channels.email && Array.isArray(channels.email.recipients) && channels.email.recipients.length > 0) {
    const template = EMAIL_TEMPLATES[eventType];
    const emailContent = template
      ? template(payload.data)
      : { subject: `MyMoolah Event: ${eventType}`, body: `Event ${eventType} occurred. Check the portal for details.` };

    dispatches.push(
      sendEmail(channels.email.recipients, emailContent.subject, emailContent.body)
        .then((res) => { results.email = res; })
        .catch((err) => {
          console.error(`${LOG_PREFIX} Email dispatch error — event=${eventType}, error=${err.message}`);
          results.email = { success: false, messageId: '' };
        }),
    );
  }

  if (channels.sftp && channels.sftp.gcs_path_prefix && data.runReference && Array.isArray(data.payments)) {
    dispatches.push(
      sendSftpResults(channels.sftp.gcs_path_prefix, data.runReference, data.payments)
        .then((res) => { results.sftp = res; })
        .catch((err) => {
          console.error(`${LOG_PREFIX} SFTP dispatch error — event=${eventType}, error=${err.message}`);
          results.sftp = { success: false, gcsPath: '', rowCount: 0 };
        }),
    );
  }

  await Promise.allSettled(dispatches);

  const channelSummary = Object.keys(results).map((ch) => `${ch}=${results[ch].success}`).join(', ');
  console.log(`${LOG_PREFIX} Notification complete — client=${clientId}, event=${eventType}, ${channelSummary || 'no channels dispatched'}`);

  return { eventType, channels: results };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  notify,
  getClientPreferences,
  sendWebhook,
  sendEmail,
  sendSftpResults,
  buildResultsCsv,
  EVENT_TYPES,
  buildEventPayload,
};
