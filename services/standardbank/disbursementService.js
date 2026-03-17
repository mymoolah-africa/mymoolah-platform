'use strict';

/**
 * Disbursement Service — SBSA H2H Wage/Salary Disbursement
 *
 * Core business logic for the disbursement feature:
 *   createRun()     — Maker creates a new disbursement run
 *   submitForApproval() — Maker submits run to checker
 *   approveRun()    — Checker approves (triggers file build + SFTP upload)
 *   rejectRun()     — Checker rejects (returns to draft)
 *   cancelRun()     — Maker cancels before approval
 *   processPain002Response() — SFTP poller calls this with parsed Pain.002 data
 *   resubmitFailed() — Maker creates a new run for failed payments
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const db = require('../../models');
const { buildPain001Bulk } = require('./pain001BulkBuilder');
const crypto = require('crypto');

const logger = {
  info:  (...a) => console.log('[DisbursementService]', ...a),
  warn:  (...a) => console.warn('[DisbursementService]', ...a),
  error: (...a) => console.error('[DisbursementService]', ...a),
};

/**
 * Generate a sequential run reference.
 * Format: PAYROLL-YYYY-MM-NNNNN
 */
async function generateRunReference(payPeriod) {
  const prefix = `PAYROLL-${payPeriod || new Date().toISOString().slice(0, 7)}`;
  const count = await db.DisbursementRun.count({
    where: db.Sequelize.where(
      db.Sequelize.fn('LEFT', db.Sequelize.col('run_reference'), prefix.length),
      prefix
    ),
  });
  return `${prefix}-${String(count + 1).padStart(5, '0')}`;
}

/**
 * Generate a unique End-to-End ID for a payment line.
 * Format: E2E-{runRef truncated}-{seq}
 */
function generateEndToEndId(runReference, seq) {
  const base = `E2E-${runReference.replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}`;
  return `${base}-${String(seq).padStart(4, '0')}`.substring(0, 35);
}

/**
 * Create a new disbursement run (maker step).
 *
 * @param {Object} params
 * @param {number} params.clientId       - Portal user / client ID
 * @param {number} params.makerUserId    - Portal user ID (maker)
 * @param {string} [params.rail]         - 'eft' | 'rtc' (default: 'eft')
 * @param {string} [params.payPeriod]    - e.g. '2026-03'
 * @param {Array}  params.beneficiaries  - [{name, accountNumber, branchCode, bankName, amount, reference, employeeRef}]
 * @param {Object} [params.notificationChannels] - {webhook, email, sftp}
 * @returns {Promise<{ success: boolean, run: Object, payments: Object[] }>}
 */
async function createRun(params) {
  const {
    clientId,
    makerUserId,
    rail = 'eft',
    payPeriod,
    beneficiaries,
    notificationChannels,
  } = params;

  if (!beneficiaries || beneficiaries.length === 0) {
    throw new Error('At least one beneficiary is required');
  }
  if (beneficiaries.length > 10000) {
    throw new Error('Maximum 10,000 beneficiaries per run');
  }

  const totalAmount = beneficiaries.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  if (totalAmount <= 0) throw new Error('Total amount must be greater than zero');

  const runReference = await generateRunReference(payPeriod);

  const dbTx = await db.sequelize.transaction();
  try {
    const run = await db.DisbursementRun.create({
      client_id:    clientId,
      run_reference: runReference,
      rail,
      pay_period:   payPeriod || new Date().toISOString().slice(0, 7),
      total_amount: totalAmount.toFixed(2),
      total_count:  beneficiaries.length,
      pending_count: beneficiaries.length,
      status:        'draft',
      maker_user_id: makerUserId,
      notification_channels: notificationChannels || null,
    }, { transaction: dbTx });

    const paymentRecords = beneficiaries.map((b, i) => ({
      run_id:           run.id,
      employee_ref:     b.employeeRef || null,
      beneficiary_name: b.name,
      account_number:   b.accountNumber,
      branch_code:      b.branchCode,
      bank_name:        b.bankName || null,
      amount:           parseFloat(b.amount).toFixed(2),
      reference:        (b.reference || `${runReference}`).substring(0, 35),
      end_to_end_id:    generateEndToEndId(runReference, i + 1),
      status:           'pending',
    }));

    const payments = await db.DisbursementPayment.bulkCreate(paymentRecords, { transaction: dbTx });
    await dbTx.commit();

    logger.info(`Run created: ${runReference} | ${beneficiaries.length} payments | ZAR ${totalAmount.toFixed(2)}`);
    return { success: true, run, payments };
  } catch (err) {
    await dbTx.rollback();
    throw err;
  }
}

/**
 * Submit a run for checker approval.
 * Validates the maker cannot approve their own run.
 *
 * @param {number} runId
 * @param {number} makerUserId
 */
async function submitForApproval(runId, makerUserId) {
  const run = await db.DisbursementRun.findByPk(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'draft') throw new Error(`Run must be in draft status to submit (current: ${run.status})`);
  if (run.maker_user_id !== makerUserId) throw new Error('Only the maker can submit a run for approval');

  await run.update({ status: 'pending_approval' });
  logger.info(`Run ${run.run_reference} submitted for approval`);
  return run;
}

/**
 * Checker approves a run.
 * Builds Pain.001 XML and uploads to SBSA SFTP outbox.
 * Checker MUST be a different user from the maker (4-eyes principle).
 *
 * @param {number} runId
 * @param {number} checkerUserId
 * @returns {Promise<{ success: boolean, run: Object, pain001Filename: string }>}
 */
async function approveRun(runId, checkerUserId) {
  const run = await db.DisbursementRun.findByPk(runId, {
    include: [{ model: db.DisbursementPayment, as: 'payments' }],
  });
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'pending_approval') throw new Error(`Run must be in pending_approval status (current: ${run.status})`);
  if (run.maker_user_id === checkerUserId) throw new Error('Checker cannot be the same person as the maker (4-eyes principle)');

  const paymentLines = run.payments.map((p) => ({
    endToEndId:      p.end_to_end_id,
    beneficiaryName: p.beneficiary_name,
    accountNumber:   p.account_number,
    branchCode:      p.branch_code,
    amount:          parseFloat(p.amount),
    reference:       p.reference,
  }));

  const { xml, msgId } = buildPain001Bulk({
    runReference: run.run_reference,
    rail:         run.rail,
    payments:     paymentLines,
  });

  const filename = `pain001-${run.run_reference}-${Date.now()}.xml`;

  // Upload to SBSA SFTP — if SbsaSftpClientService is available (SFTP H2H phase must be live)
  let gcsPath = null;
  try {
    const SbsaSftpClientService = require('./sbsaSftpClientService');
    const sftpService = new SbsaSftpClientService();
    await sftpService.connect();
    const outboxPath = process.env.SBSA_SFTP_OUTBOX_PATH || '/outbox/payments';
    await sftpService.uploadFile(Buffer.from(xml, 'utf8'), `${outboxPath}/${filename}`);
    await sftpService.disconnect();
    gcsPath = `sbsa-sftp/outbox/${filename}`;
    logger.info(`Pain.001 uploaded to SBSA SFTP: ${filename}`);
  } catch (sftpErr) {
    // In environments where SFTP H2H is not yet live, save locally and log
    logger.warn(`SFTP upload skipped (service not available): ${sftpErr.message}`);
    logger.info(`[MANUAL ACTION REQUIRED] Upload ${filename} to SBSA SFTP outbox manually`);
    // Still write the XML to a temp location so ops can upload manually if needed
    const os = require('os');
    const fs = require('fs');
    const tmpPath = `${os.tmpdir()}/${filename}`;
    fs.writeFileSync(tmpPath, xml, 'utf8');
    logger.info(`Pain.001 saved to ${tmpPath} for manual upload`);
  }

  await run.update({
    status:           'submitted',
    checker_user_id:  checkerUserId,
    submitted_at:     new Date(),
    pain001_filename: filename,
    pain001_gcs_path: gcsPath,
    metadata: { ...(run.metadata || {}), pain001_msg_id: msgId },
  });

  logger.info(`Run ${run.run_reference} approved and submitted`);
  return { success: true, run, pain001Filename: filename };
}

/**
 * Checker rejects a run (returns to draft for correction).
 *
 * @param {number} runId
 * @param {number} checkerUserId
 * @param {string} [reason]
 */
async function rejectRun(runId, checkerUserId, reason) {
  const run = await db.DisbursementRun.findByPk(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'pending_approval') throw new Error('Only pending_approval runs can be rejected');
  if (run.maker_user_id === checkerUserId) throw new Error('Checker cannot be the same person as the maker');

  await run.update({
    status:    'draft',
    metadata:  { ...(run.metadata || {}), rejection_reason: reason, rejected_by: checkerUserId, rejected_at: new Date().toISOString() },
  });
  logger.info(`Run ${run.run_reference} rejected by checker ${checkerUserId}`);
  return run;
}

/**
 * Process a parsed Pain.002 response.
 * Updates payment statuses and recalculates run counts.
 * Called by the SFTP inbox poller.
 *
 * @param {Object} pain002Data - Output of parsePain002()
 * @returns {Promise<{ run: Object, updated: number, failed: number, accepted: number }>}
 */
async function processPain002Response(pain002Data) {
  const { originalMsgId, payments } = pain002Data;
  if (!payments || payments.length === 0) {
    logger.warn('Pain.002 had no payment statuses to process');
    return { run: null, updated: 0, failed: 0, accepted: 0 };
  }

  // Find the run by its Pain.001 msgId stored in metadata
  const run = await db.DisbursementRun.findOne({
    where: db.sequelize.where(
      db.sequelize.json('metadata.pain001_msg_id'),
      originalMsgId
    ),
  });

  if (!run) {
    logger.warn(`Pain.002: no run found for Pain.001 msgId ${originalMsgId}`);
    return { run: null, updated: 0, failed: 0, accepted: 0 };
  }

  let accepted = 0;
  let failed   = 0;

  const dbTx = await db.sequelize.transaction();
  try {
    for (const p of payments) {
      const payment = await db.DisbursementPayment.findOne({
        where: { run_id: run.id, end_to_end_id: p.endToEndId },
        transaction: dbTx,
        lock: true,
      });
      if (!payment) {
        logger.warn(`Pain.002: no payment found for endToEndId ${p.endToEndId}`);
        continue;
      }
      await payment.update({
        status:           p.status,
        rejection_code:   p.rejectionCode,
        rejection_reason: p.rejectionReason,
        processed_at:     new Date(),
      }, { transaction: dbTx });

      if (p.status === 'accepted') accepted++;
      else failed++;
    }

    const pending  = await db.DisbursementPayment.count({ where: { run_id: run.id, status: 'pending' }, transaction: dbTx });
    const newStatus = failed > 0 && pending === 0 ? (accepted > 0 ? 'partial' : 'failed')
                    : pending === 0 ? 'completed'
                    : 'processing';

    await run.update({
      success_count: db.sequelize.literal(`success_count + ${accepted}`),
      failed_count:  db.sequelize.literal(`failed_count + ${failed}`),
      pending_count: pending,
      status:        newStatus,
      completed_at:  pending === 0 ? new Date() : null,
    }, { transaction: dbTx });

    await dbTx.commit();
    logger.info(`Pain.002 processed: Run ${run.run_reference} — ${accepted} accepted, ${failed} failed, ${pending} still pending`);

    // Fire notification after transaction is committed
    setImmediate(async () => {
      try {
        const { notifyRunResult } = require('./disbursementNotificationService');
        const refreshedRun = await db.DisbursementRun.findByPk(run.id);
        await notifyRunResult(refreshedRun);
      } catch (notifyErr) {
        logger.warn('Notification failed (non-critical):', notifyErr.message);
      }
    });

    return { run, updated: accepted + failed, failed, accepted };
  } catch (err) {
    await dbTx.rollback();
    throw err;
  }
}

/**
 * Create a resubmission run for failed payments.
 * Original run's failed payments get a new run, linked via retry_of.
 *
 * @param {number} originalRunId
 * @param {number} makerUserId
 * @param {Array<{ paymentId: number, correctedAccountNumber?: string, correctedBranchCode?: string }>} corrections
 */
async function resubmitFailed(originalRunId, makerUserId, corrections) {
  const originalRun = await db.DisbursementRun.findByPk(originalRunId, {
    include: [{ model: db.DisbursementPayment, as: 'payments', where: { status: 'rejected' } }],
  });
  if (!originalRun) throw new Error(`Run ${originalRunId} not found`);
  if (!originalRun.payments || originalRun.payments.length === 0) throw new Error('No failed payments to resubmit');

  const correctionMap = {};
  for (const c of (corrections || [])) {
    correctionMap[c.paymentId] = c;
  }

  const beneficiaries = originalRun.payments.map((p) => {
    const fix = correctionMap[p.id] || {};
    return {
      employeeRef:    p.employee_ref,
      name:           p.beneficiary_name,
      accountNumber:  fix.correctedAccountNumber || p.account_number,
      branchCode:     fix.correctedBranchCode    || p.branch_code,
      bankName:       p.bank_name,
      amount:         parseFloat(p.amount),
      reference:      p.reference,
      _retryOf:       p.id,
    };
  });

  const result = await createRun({
    clientId:   originalRun.client_id,
    makerUserId,
    rail:       originalRun.rail,
    payPeriod:  originalRun.pay_period,
    beneficiaries,
    notificationChannels: originalRun.notification_channels,
  });

  // Link retry payments back to originals
  const newPayments = result.payments;
  for (let i = 0; i < newPayments.length; i++) {
    const retryOfId = beneficiaries[i]._retryOf;
    if (retryOfId) {
      await newPayments[i].update({ retry_of: retryOfId });
    }
  }

  logger.info(`Resubmission run created: ${result.run.run_reference} | ${beneficiaries.length} payments`);
  return result;
}

module.exports = {
  createRun,
  submitForApproval,
  approveRun,
  rejectRun,
  processPain002Response,
  resubmitFailed,
};
