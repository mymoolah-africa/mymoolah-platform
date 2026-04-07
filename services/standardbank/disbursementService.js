'use strict';

/**
 * Disbursement Service — SBSA H2H Multi-Rail Disbursement
 *
 * Core business logic for the disbursement feature:
 *   createRun()     — Maker creates a new disbursement run
 *   submitForApproval() — Maker submits run to checker
 *   approveRun()    — Checker approves (triggers fee debit + file build + SFTP upload)
 *   rejectRun()     — Checker rejects (returns to draft)
 *   cancelRun()     — Maker cancels before approval
 *   processPain002Response() — SFTP poller calls this with parsed Pain.002 data
 *   resubmitFailed() — Maker creates a new run for failed payments
 *   classifyBeneficiaryRail() — Determines payment rail per beneficiary
 *
 * Supported rails:
 *   eft     — Standard EFT via Pain.001 → SBSA SFTP
 *   payshap — PayShap RPP (future phase — creates run but logs warning on approve)
 *   wallet  — MyMoolah wallet top-up via EFT to MM's treasury account with MSISDN as reference
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const db = require('../../models');
const { buildPain001Bulk, generatePain001Filename } = require('./pain001BulkBuilder');
const crypto = require('crypto');

const logger = {
  info:  (...a) => console.log('[DisbursementService]', ...a),
  warn:  (...a) => console.warn('[DisbursementService]', ...a),
  error: (...a) => console.error('[DisbursementService]', ...a),
};

const VALID_RAILS = ['eft', 'payshap', 'wallet'];

const SA_MSISDN_RE = /^0[678]\d{8}$/;

/**
 * Generate a sequential run reference.
 * Format: DISB-YYYY-MM-NNNNN
 */
async function generateRunReference(payPeriod) {
  const prefix = `DISB-${payPeriod || new Date().toISOString().slice(0, 7)}`;
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
 * Classify the payment rail for a single beneficiary.
 *
 * @param {Object} beneficiary - Beneficiary record from the input array
 * @param {string} runRail     - The run-level rail ('eft' | 'payshap' | 'wallet')
 * @returns {'eft' | 'payshap' | 'wallet'}
 */
function classifyBeneficiaryRail(beneficiary, runRail) {
  if (runRail === 'wallet') return 'wallet';
  if (beneficiary.msisdn && !beneficiary.accountNumber) return 'wallet';
  if (runRail === 'payshap') return 'payshap';
  return 'eft';
}

/**
 * Validate a South African mobile number (0[6-8]XXXXXXXX).
 * @param {string} msisdn
 * @returns {boolean}
 */
function isValidSAMsisdn(msisdn) {
  return typeof msisdn === 'string' && SA_MSISDN_RE.test(msisdn);
}

/**
 * Create a new disbursement run (maker step).
 *
 * @param {Object} params
 * @param {number} params.clientId       - Disbursement client ID
 * @param {number} params.makerUserId    - Portal user ID (maker)
 * @param {string} [params.rail]         - 'eft' | 'payshap' | 'wallet' (default: 'eft')
 * @param {string} [params.payPeriod]    - e.g. '2026-03'
 * @param {Array}  params.beneficiaries  - [{name, accountNumber, branchCode, bankName, amount, reference, employeeRef, msisdn}]
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

  if (!VALID_RAILS.includes(rail)) {
    throw new Error(`Invalid rail: "${rail}". Must be one of: ${VALID_RAILS.join(', ')}`);
  }

  if (!beneficiaries || beneficiaries.length === 0) {
    throw new Error('At least one beneficiary is required');
  }
  if (beneficiaries.length > 10000) {
    throw new Error('Maximum 10,000 beneficiaries per run');
  }

  const totalAmount = beneficiaries.reduce((s, b) => s + parseFloat(b.amount || 0), 0);
  if (totalAmount <= 0) throw new Error('Total amount must be greater than zero');

  const mmTreasuryAccount = process.env.SBSA_DEBTOR_ACCOUNT;
  const mmTreasuryBranch  = process.env.SBSA_DEBTOR_BRANCH || '051001';

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

    const paymentRecords = beneficiaries.map((b, i) => {
      const paymentRail = classifyBeneficiaryRail(b, rail);

      if (paymentRail === 'wallet') {
        if (!b.msisdn) {
          throw new Error(`Beneficiary "${b.name}" (index ${i}): msisdn is required for wallet payments`);
        }
        if (!isValidSAMsisdn(b.msisdn)) {
          throw new Error(
            `Beneficiary "${b.name}" (index ${i}): invalid SA mobile number "${b.msisdn}". ` +
            'Must be 10 digits starting with 06, 07, or 08'
          );
        }
        if (!mmTreasuryAccount) {
          throw new Error('SBSA_DEBTOR_ACCOUNT env var is required for wallet disbursements');
        }
      }

      const isWallet = paymentRail === 'wallet';

      return {
        run_id:           run.id,
        employee_ref:     b.employeeRef || null,
        beneficiary_name: b.name,
        account_number:   isWallet ? mmTreasuryAccount : b.accountNumber,
        branch_code:      isWallet ? mmTreasuryBranch  : b.branchCode,
        bank_name:        isWallet ? 'Standard Bank'   : (b.bankName || null),
        amount:           parseFloat(b.amount).toFixed(2),
        reference:        isWallet
          ? b.msisdn.substring(0, 35)
          : (b.reference || `${runReference}`).substring(0, 35),
        end_to_end_id:    generateEndToEndId(runReference, i + 1),
        status:           'pending',
        payment_rail:     paymentRail,
        fee_cents:        0,
        metadata:         isWallet ? { msisdn: b.msisdn, walletDelivery: true } : null,
      };
    });

    const payments = await db.DisbursementPayment.bulkCreate(paymentRecords, { transaction: dbTx });
    await dbTx.commit();

    logger.info(`Run created: ${runReference} | rail=${rail} | ${beneficiaries.length} payments | ZAR ${totalAmount.toFixed(2)}`);
    return { success: true, run, payments };
  } catch (err) {
    await dbTx.rollback();
    throw err;
  }
}

/**
 * Submit a run for checker approval.
 * Validates the maker cannot approve their own run.
 * Verifies the client's KYB status is approved before allowing submission.
 *
 * @param {number} runId
 * @param {number} makerUserId
 */
async function submitForApproval(runId, makerUserId) {
  const run = await db.DisbursementRun.findByPk(runId);
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'draft') throw new Error(`Run must be in draft status to submit (current: ${run.status})`);
  if (run.maker_user_id !== makerUserId) throw new Error('Only the maker can submit a run for approval');

  const disbursementClient = await db.DisbursementClient.findByPk(run.client_id);
  if (!disbursementClient) {
    throw new Error(`Disbursement client ${run.client_id} not found`);
  }
  if (disbursementClient.kyb_status !== 'approved') {
    throw new Error(
      `Client KYB status must be "approved" to submit a run. Current status: "${disbursementClient.kyb_status}"`
    );
  }

  await run.update({ status: 'pending_approval' });
  logger.info(`Run ${run.run_reference} submitted for approval`);

  setImmediate(async () => {
    try {
      const { notify, EVENT_TYPES } = require('../disbursement/notificationEngine');
      await notify(run.client_id, EVENT_TYPES.RUN_SUBMITTED, {
        runId: run.id,
        runReference: run.run_reference,
        totalAmount: run.total_amount,
        totalCount: run.total_count,
        rail: run.rail,
      });
    } catch (notifyErr) {
      logger.warn('Notification failed (non-critical):', notifyErr.message);
    }
  });

  return run;
}

/**
 * Checker approves a run.
 * Calculates fees, validates float sufficiency, debits client float,
 * builds Pain.001 XML and uploads to SBSA SFTP outbox.
 * Checker MUST be a different user from the maker (4-eyes principle).
 *
 * For PayShap rails: run is approved but Pain.001 is not generated (future phase).
 *
 * @param {number} runId
 * @param {number} checkerUserId
 * @returns {Promise<{ success: boolean, run: Object, pain001Filename: string|null }>}
 */
async function approveRun(runId, checkerUserId) {
  const run = await db.DisbursementRun.findByPk(runId, {
    include: [{ model: db.DisbursementPayment, as: 'payments' }],
  });
  if (!run) throw new Error(`Run ${runId} not found`);
  if (run.status !== 'pending_approval') throw new Error(`Run must be in pending_approval status (current: ${run.status})`);
  if (run.maker_user_id === checkerUserId) throw new Error('Checker cannot be the same person as the maker (4-eyes principle)');

  // ── Fee calculation ──────────────────────────────────────────────────────
  const { calculateFees } = require('../disbursement/feeEngine');

  const paymentAmounts = run.payments.map((p) => ({ amount: parseFloat(p.amount) }));
  const feeResult = await calculateFees(run.client_id, run.rail, paymentAmounts);

  // Persist per-payment fee_cents
  const feeDbTx = await db.sequelize.transaction();
  try {
    for (let i = 0; i < run.payments.length; i++) {
      const feeCents = feeResult.fees[i].feeCents;
      await run.payments[i].update({ fee_cents: feeCents }, { transaction: feeDbTx });
    }
    await feeDbTx.commit();
  } catch (feeUpdateErr) {
    await feeDbTx.rollback();
    throw new Error(`Failed to persist payment fees: ${feeUpdateErr.message}`);
  }

  // ── Float sufficiency check + debit ──────────────────────────────────────
  const { checkSufficientFloat, debitFloat } = require('../disbursement/clientFloatService');

  const floatCheck = await checkSufficientFloat(run.client_id, feeResult.grandTotalCents);
  if (!floatCheck.sufficient) {
    throw new Error(
      `Insufficient float: available ZAR ${(floatCheck.balanceCents / 100).toFixed(2)}, ` +
      `required ZAR ${(feeResult.grandTotalCents / 100).toFixed(2)} ` +
      `(shortfall ZAR ${(floatCheck.shortfallCents / 100).toFixed(2)})`
    );
  }

  await debitFloat(run.client_id, {
    amountCents: feeResult.totalAmountCents,
    feeCents:    feeResult.totalFeeCents,
    rail:        run.rail,
    runId:       run.id,
    description: `Disbursement run ${run.run_reference}`,
  });

  logger.info(
    `Float debited for run ${run.run_reference}: ` +
    `amount=${feeResult.totalAmountCents}c fees=${feeResult.totalFeeCents}c grand=${feeResult.grandTotalCents}c`
  );

  // ── Determine which rails need Pain.001 vs other processing ──────────────
  const hasPayshapPayments = run.payments.some(
    (p) => (p.payment_rail || run.rail) === 'payshap'
  );

  if (hasPayshapPayments) {
    // TODO: PayShap disbursements will use the RPP API in a future phase.
    // For now the run is approved and float debited, but PayShap payments
    // are not transmitted. They will remain in 'pending' status until the
    // PayShap integration is implemented.
    logger.warn(
      `Run ${run.run_reference} contains PayShap payments — PayShap RPP processing ` +
      'is not yet implemented. These payments will remain pending.'
    );
  }

  // Payments routed through EFT/wallet both use Pain.001 (wallet goes to MM treasury account)
  const eftEligiblePayments = run.payments.filter(
    (p) => (p.payment_rail || run.rail) !== 'payshap'
  );

  let filename = null;
  let gcsPath  = null;
  let msgId    = null;

  if (eftEligiblePayments.length > 0) {
    const paymentLines = eftEligiblePayments.map((p) => ({
      endToEndId:      p.end_to_end_id,
      beneficiaryName: p.beneficiary_name,
      accountNumber:   p.account_number,
      branchCode:      p.branch_code,
      amount:          parseFloat(p.amount),
      reference:       p.reference,
    }));

    const pain001Result = buildPain001Bulk({
      runReference: run.run_reference,
      rail:         run.rail === 'wallet' ? 'eft' : run.rail,
      payments:     paymentLines,
    });

    msgId    = pain001Result.msgId;
    filename = generatePain001Filename();

    try {
      const SbsaSftpClientService = require('./sbsaSftpClientService');
      const sftpService = new SbsaSftpClientService();
      await sftpService.connect();
      const outboxPath = process.env.SBSA_SFTP_OUTBOX_PATH || '/outbox/payments';
      await sftpService.uploadFile(Buffer.from(pain001Result.xml, 'utf8'), `${outboxPath}/${filename}`);
      await sftpService.disconnect();
      gcsPath = `sbsa-sftp/outbox/${filename}`;
      logger.info(`Pain.001 uploaded to SBSA SFTP: ${filename}`);
    } catch (sftpErr) {
      logger.warn(`SFTP upload skipped (service not available): ${sftpErr.message}`);
      logger.info(`[MANUAL ACTION REQUIRED] Upload ${filename} to SBSA SFTP outbox manually`);
      const os = require('os');
      const fs = require('fs');
      const tmpPath = `${os.tmpdir()}/${filename}`;
      fs.writeFileSync(tmpPath, pain001Result.xml, 'utf8');
      logger.info(`Pain.001 saved to ${tmpPath} for manual upload`);
    }
  }

  // ── Update run status ────────────────────────────────────────────────────
  await run.update({
    status:           'submitted',
    checker_user_id:  checkerUserId,
    submitted_at:     new Date(),
    pain001_filename: filename,
    pain001_gcs_path: gcsPath,
    metadata: {
      ...(run.metadata || {}),
      pain001_msg_id:    msgId,
      fee_total_cents:   feeResult.totalFeeCents,
      fee_amount_cents:  feeResult.totalAmountCents,
      fee_grand_cents:   feeResult.grandTotalCents,
      fee_config_id:     feeResult.feeConfig ? feeResult.feeConfig.id : null,
      payshap_pending:   hasPayshapPayments || undefined,
    },
  });

  logger.info(`Run ${run.run_reference} approved and submitted`);

  setImmediate(async () => {
    try {
      const { notify, EVENT_TYPES } = require('../disbursement/notificationEngine');
      await notify(run.client_id, EVENT_TYPES.RUN_APPROVED, {
        runId: run.id,
        runReference: run.run_reference,
        totalAmount: run.total_amount,
        totalCount: run.total_count,
        pain001Filename: filename,
        checkerUserId,
      });
    } catch (notifyErr) {
      logger.warn('Notification failed (non-critical):', notifyErr.message);
    }
  });

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

  setImmediate(async () => {
    try {
      const { notify, EVENT_TYPES } = require('../disbursement/notificationEngine');
      await notify(run.client_id, EVENT_TYPES.RUN_FAILED, {
        runId: run.id,
        runReference: run.run_reference,
        reason: reason || 'Rejected by checker',
        checkerUserId,
      });
    } catch (notifyErr) {
      logger.warn('Notification failed (non-critical):', notifyErr.message);
    }
  });

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
    const isWalletPayment = p.payment_rail === 'wallet' ||
      (p.metadata && p.metadata.walletDelivery);

    const entry = {
      employeeRef:    p.employee_ref,
      name:           p.beneficiary_name,
      accountNumber:  fix.correctedAccountNumber || p.account_number,
      branchCode:     fix.correctedBranchCode    || p.branch_code,
      bankName:       p.bank_name,
      amount:         parseFloat(p.amount),
      reference:      p.reference,
      _retryOf:       p.id,
    };

    if (isWalletPayment && p.metadata && p.metadata.msisdn) {
      entry.msisdn = p.metadata.msisdn;
    }

    return entry;
  });

  const result = await createRun({
    clientId:   originalRun.client_id,
    makerUserId,
    rail:       originalRun.rail,
    payPeriod:  originalRun.pay_period,
    beneficiaries,
    notificationChannels: originalRun.notification_channels,
  });

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
  classifyBeneficiaryRail,
};
