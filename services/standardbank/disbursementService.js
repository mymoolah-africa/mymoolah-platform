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
 *   eft     — Standard EFT via Pain.001 → SBSA SFTP (next-day settlement)
 *   payshap — PayShap RPP instant payment via existing standardbankRppService
 *   wallet  — Internal ledger transfer: debit client float, credit recipient wallet (no bank movement)
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
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
      }

      if (paymentRail === 'eft' || paymentRail === 'payshap') {
        if (!b.accountNumber) {
          throw new Error(`Beneficiary "${b.name}" (index ${i}): accountNumber is required for ${paymentRail} payments`);
        }
        if (!b.branchCode) {
          throw new Error(`Beneficiary "${b.name}" (index ${i}): branchCode is required for ${paymentRail} payments`);
        }
      }

      const isWallet = paymentRail === 'wallet';

      return {
        run_id:           run.id,
        employee_ref:     b.employeeRef || null,
        beneficiary_name: b.name,
        account_number:   isWallet ? null : b.accountNumber,
        branch_code:      isWallet ? null : b.branchCode,
        bank_name:        isWallet ? null : (b.bankName || null),
        amount:           parseFloat(b.amount).toFixed(2),
        reference:        (b.reference || `${runReference}`).substring(0, 35),
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
 * then processes each rail:
 *   - EFT: builds Pain.001 XML, uploads to SBSA SFTP outbox
 *   - PayShap: calls existing RPP service per payment (instant)
 *   - Wallet: internal ledger transfer, credits recipient wallet directly (no bank movement)
 *
 * Checker MUST be a different user from the maker (4-eyes principle).
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

  // ── Group payments by rail ───────────────────────────────────────────────
  const eftPayments     = run.payments.filter((p) => (p.payment_rail || run.rail) === 'eft');
  const payshapPayments = run.payments.filter((p) => (p.payment_rail || run.rail) === 'payshap');
  const walletPayments  = run.payments.filter((p) => (p.payment_rail || run.rail) === 'wallet');

  // ── Calculate per-rail totals for float debit ────────────────────────────
  function sumCentsForPayments(payments) {
    return payments.reduce((s, p) => {
      const idx = run.payments.indexOf(p);
      const fee = feeResult.fees[idx] ? feeResult.fees[idx].feeCents : 0;
      return {
        amountCents: s.amountCents + Math.round(parseFloat(p.amount) * 100),
        feeCents: s.feeCents + fee,
      };
    }, { amountCents: 0, feeCents: 0 });
  }

  const grandTotalCents = feeResult.grandTotalCents;

  // ── Float sufficiency check (total across all rails) ─────────────────────
  const { checkSufficientFloat, debitFloat } = require('../disbursement/clientFloatService');

  const floatCheck = await checkSufficientFloat(run.client_id, grandTotalCents);
  if (!floatCheck.sufficient) {
    throw new Error(
      `Insufficient float: available ZAR ${(floatCheck.balanceCents / 100).toFixed(2)}, ` +
      `required ZAR ${(grandTotalCents / 100).toFixed(2)} ` +
      `(shortfall ZAR ${(floatCheck.shortfallCents / 100).toFixed(2)})`
    );
  }

  // ── Debit float per rail group (different journal entries per rail) ───────
  if (eftPayments.length > 0) {
    const eftTotals = sumCentsForPayments(eftPayments);
    await debitFloat(run.client_id, {
      amountCents: eftTotals.amountCents,
      feeCents:    eftTotals.feeCents,
      rail:        'eft',
      runId:       run.id,
      description: `Disbursement run ${run.run_reference} (EFT)`,
    });
    logger.info(`Float debited for EFT: amount=${eftTotals.amountCents}c fees=${eftTotals.feeCents}c`);
  }

  if (payshapPayments.length > 0) {
    const payshapTotals = sumCentsForPayments(payshapPayments);
    await debitFloat(run.client_id, {
      amountCents: payshapTotals.amountCents,
      feeCents:    payshapTotals.feeCents,
      rail:        'payshap',
      runId:       run.id,
      description: `Disbursement run ${run.run_reference} (PayShap)`,
    });
    logger.info(`Float debited for PayShap: amount=${payshapTotals.amountCents}c fees=${payshapTotals.feeCents}c`);
  }

  if (walletPayments.length > 0) {
    const walletTotals = sumCentsForPayments(walletPayments);
    await debitFloat(run.client_id, {
      amountCents: walletTotals.amountCents,
      feeCents:    walletTotals.feeCents,
      rail:        'wallet',
      runId:       run.id,
      description: `Disbursement run ${run.run_reference} (Wallet)`,
    });
    logger.info(`Float debited for Wallet: amount=${walletTotals.amountCents}c fees=${walletTotals.feeCents}c`);
  }

  // ── RAIL 1: Process EFT payments via Pain.001 + SFTP ─────────────────────
  let filename = null;
  let gcsPath  = null;
  let msgId    = null;

  if (eftPayments.length > 0) {
    const paymentLines = eftPayments.map((p) => ({
      endToEndId:      p.end_to_end_id,
      beneficiaryName: p.beneficiary_name,
      accountNumber:   p.account_number,
      branchCode:      p.branch_code,
      amount:          parseFloat(p.amount),
      reference:       p.reference,
    }));

    const pain001Result = buildPain001Bulk({
      runReference: run.run_reference,
      rail:         'eft',
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

  // ── RAIL 2: Process PayShap payments via existing RPP service ─────────────
  let payshapAccepted = 0;
  let payshapFailed   = 0;

  if (payshapPayments.length > 0) {
    const { buildPain001 } = require('../../integrations/standardbank/builders/pain001Builder');
    const sbClient = require('../../integrations/standardbank/client');

    for (const payment of payshapPayments) {
      try {
        const merchantTxnId = `MM-DISB-RPP-${payment.end_to_end_id}`;
        const { pain001: rppXml } = buildPain001({
          merchantTransactionId: merchantTxnId,
          amount:                parseFloat(payment.amount),
          currency:              'ZAR',
          creditorAccountNumber: payment.account_number,
          creditorBankBranchCode: payment.branch_code,
          creditorName:          payment.beneficiary_name,
          remittanceInfo:        payment.reference || run.run_reference,
          statementNarrative:    payment.reference || run.run_reference,
        });

        const sbResponse = await sbClient.initiatePayment(rppXml);

        await payment.update({
          status:       'accepted',
          processed_at: new Date(),
          metadata:     {
            ...(payment.metadata || {}),
            payshapResponse: sbResponse,
            merchantTransactionId: merchantTxnId,
          },
        });
        payshapAccepted++;
        logger.info(`PayShap payment ${payment.end_to_end_id} sent: ${payment.beneficiary_name} ZAR ${payment.amount}`);
      } catch (rppErr) {
        await payment.update({
          status:           'rejected',
          rejection_reason: `PayShap RPP failed: ${rppErr.message}`,
          processed_at:     new Date(),
        });
        payshapFailed++;
        logger.error(`PayShap payment ${payment.end_to_end_id} failed: ${rppErr.message}`);
      }
    }
    logger.info(`PayShap processing: ${payshapAccepted} accepted, ${payshapFailed} failed`);
  }

  // ── RAIL 3: Process wallet payments — internal ledger transfer ────────────
  let walletAccepted = 0;
  let walletFailed   = 0;

  if (walletPayments.length > 0) {
    const disbursementClient = await db.DisbursementClient.findByPk(run.client_id);

    for (const payment of walletPayments) {
      const walletTxn = await db.sequelize.transaction();
      try {
        const msisdn = payment.metadata && payment.metadata.msisdn;
        if (!msisdn) {
          throw new Error('Missing MSISDN in payment metadata');
        }

        const recipientUser = await db.User.findOne({
          where: { phoneNumber: msisdn },
          transaction: walletTxn,
        });
        if (!recipientUser) {
          throw new Error(`No MyMoolah user found for ${msisdn}`);
        }

        const recipientWallet = await db.Wallet.findOne({
          where: { userId: recipientUser.id, status: 'active' },
          lock: db.Sequelize.Transaction.LOCK.UPDATE,
          transaction: walletTxn,
        });
        if (!recipientWallet) {
          throw new Error(`No active wallet for user ${msisdn}`);
        }

        await recipientWallet.credit(parseFloat(payment.amount), 'deposit', { transaction: walletTxn });

        const txnId = `TXN-DISB-${run.run_reference}-${payment.end_to_end_id}-${Date.now()}`;
        await db.Transaction.create({
          transactionId:    txnId,
          userId:           recipientUser.id,
          walletId:         recipientWallet.walletId,
          receiverWalletId: recipientWallet.walletId,
          amount:           parseFloat(payment.amount),
          type:             'deposit',
          status:           'completed',
          description:      `Disbursement from ${disbursementClient ? disbursementClient.company_name : 'Client'} (Ref: ${payment.reference || run.run_reference})`,
          fee:              0,
          currency:         'ZAR',
          metadata: {
            source:        'DISBURSEMENT_WALLET',
            runId:         run.id,
            runReference:  run.run_reference,
            clientId:      run.client_id,
            paymentId:     payment.id,
            employeeRef:   payment.employee_ref,
          },
        }, { transaction: walletTxn });

        await payment.update({
          status:       'accepted',
          processed_at: new Date(),
          metadata:     {
            ...(payment.metadata || {}),
            walletCredited:   true,
            recipientUserId:  recipientUser.id,
            recipientWalletId: recipientWallet.walletId,
            transactionId:    txnId,
          },
        }, { transaction: walletTxn });

        await walletTxn.commit();
        walletAccepted++;
        logger.info(`Wallet payment ${payment.end_to_end_id} credited: ${msisdn} ZAR ${payment.amount}`);
      } catch (walletErr) {
        await walletTxn.rollback();
        await payment.update({
          status:           'rejected',
          rejection_reason: `Wallet credit failed: ${walletErr.message}`,
          processed_at:     new Date(),
        });
        walletFailed++;
        logger.error(`Wallet payment ${payment.end_to_end_id} failed: ${walletErr.message}`);
      }
    }
    logger.info(`Wallet processing: ${walletAccepted} accepted, ${walletFailed} failed`);
  }

  // ── Update run status ────────────────────────────────────────────────────
  const totalProcessed   = payshapAccepted + payshapFailed + walletAccepted + walletFailed;
  const totalInstantFail = payshapFailed + walletFailed;
  const totalInstantOk   = payshapAccepted + walletAccepted;
  const eftPending       = eftPayments.length;

  let runStatus = 'submitted';
  if (eftPending === 0 && totalProcessed > 0) {
    runStatus = totalInstantFail > 0
      ? (totalInstantOk > 0 ? 'partial' : 'failed')
      : 'completed';
  }

  await run.update({
    status:           runStatus,
    checker_user_id:  checkerUserId,
    submitted_at:     new Date(),
    completed_at:     runStatus === 'completed' ? new Date() : null,
    success_count:    totalInstantOk,
    failed_count:     totalInstantFail,
    pending_count:    eftPending,
    pain001_filename: filename,
    pain001_gcs_path: gcsPath,
    metadata: {
      ...(run.metadata || {}),
      pain001_msg_id:     msgId,
      fee_total_cents:    feeResult.totalFeeCents,
      fee_amount_cents:   feeResult.totalAmountCents,
      fee_grand_cents:    feeResult.grandTotalCents,
      fee_config_id:      feeResult.feeConfig ? feeResult.feeConfig.id : null,
      eft_count:          eftPayments.length,
      payshap_count:      payshapPayments.length,
      payshap_accepted:   payshapAccepted,
      payshap_failed:     payshapFailed,
      wallet_count:       walletPayments.length,
      wallet_accepted:    walletAccepted,
      wallet_failed:      walletFailed,
    },
  });

  logger.info(
    `Run ${run.run_reference} approved: ` +
    `EFT=${eftPayments.length}(pending) PayShap=${payshapAccepted}ok/${payshapFailed}fail ` +
    `Wallet=${walletAccepted}ok/${walletFailed}fail → status=${runStatus}`
  );

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
        railSummary: {
          eft: eftPayments.length,
          payshap: { accepted: payshapAccepted, failed: payshapFailed },
          wallet: { accepted: walletAccepted, failed: walletFailed },
        },
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
      amount:         parseFloat(p.amount),
      reference:      p.reference,
      _retryOf:       p.id,
    };

    if (isWalletPayment) {
      if (p.metadata && p.metadata.msisdn) {
        entry.msisdn = p.metadata.msisdn;
      }
    } else {
      entry.accountNumber = fix.correctedAccountNumber || p.account_number;
      entry.branchCode    = fix.correctedBranchCode    || p.branch_code;
      entry.bankName      = p.bank_name;
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
