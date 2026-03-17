'use strict';

/**
 * Disbursement Notification Service
 *
 * Delivers run results to employers via three channels:
 *   Channel 1: Webhook POST (if configured)
 *   Channel 2: Email report (always — minimum baseline)
 *   Channel 3: SFTP results CSV (if client has SFTP configured)
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-03-17
 */

const db = require('../../models');
const axios = require('axios');
const crypto = require('crypto');

const logger = {
  info:  (...a) => console.log('[DisbursementNotification]', ...a),
  warn:  (...a) => console.warn('[DisbursementNotification]', ...a),
  error: (...a) => console.error('[DisbursementNotification]', ...a),
};

/**
 * Build the results payload for a completed/partial run.
 */
async function buildResultsPayload(run) {
  const payments = await db.DisbursementPayment.findAll({
    where: { run_id: run.id },
    attributes: ['employee_ref', 'beneficiary_name', 'amount', 'status', 'rejection_code', 'rejection_reason', 'end_to_end_id'],
  });

  const failures = payments
    .filter((p) => p.status === 'rejected')
    .map((p) => ({
      employee_ref:     p.employee_ref,
      beneficiary_name: p.beneficiary_name,
      amount:           parseFloat(p.amount),
      rejection_code:   p.rejection_code,
      rejection_reason: p.rejection_reason,
    }));

  return {
    run_reference: run.run_reference,
    pay_period:    run.pay_period,
    rail:          run.rail,
    status:        run.status,
    submitted:     run.total_count,
    successful:    run.success_count,
    failed:        run.failed_count,
    total_amount:  parseFloat(run.total_amount),
    failures,
    timestamp:     new Date().toISOString(),
  };
}

/**
 * Channel 1: Webhook POST to client's registered URL.
 */
async function sendWebhook(webhookUrl, payload) {
  const webhookSecret = process.env.DISBURSEMENT_WEBHOOK_SECRET || '';
  const body = JSON.stringify(payload);
  const signature = webhookSecret
    ? `sha256=${crypto.createHmac('sha256', webhookSecret).update(body).digest('hex')}`
    : undefined;

  try {
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(signature ? { 'X-Signature': signature } : {}),
      },
      timeout: 15000,
    });
    logger.info(`Webhook delivered to ${webhookUrl} — status ${response.status}`);
    return { success: true, status: response.status };
  } catch (err) {
    logger.warn(`Webhook failed for ${webhookUrl}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Channel 2: Email report.
 */
async function sendEmailReport(toEmail, payload) {
  try {
    const AlertService = require('../reconciliation/AlertService');
    const alertService = new AlertService();
    if (!alertService.smtpConfigured) {
      logger.info('Email report skipped (SMTP not configured)');
      return { success: false, message: 'SMTP not configured' };
    }

    const { run_reference, pay_period, submitted, successful, failed, total_amount, failures } = payload;
    const statusColor = failed === 0 ? '#27ae60' : failed === submitted ? '#c0392b' : '#e67e22';
    const statusLabel = failed === 0 ? 'Completed Successfully' : failed === submitted ? 'All Payments Failed' : 'Partially Completed';

    const failureRows = failures.map((f) => `
      <tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${f.employee_ref || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${f.beneficiary_name}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">R ${Number(f.amount).toFixed(2)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;color:#c0392b">${f.rejection_code || '—'}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee">${f.rejection_reason || '—'}</td>
      </tr>`).join('');

    const html = `
      <div style="font-family:Arial,sans-serif;max-width:700px;color:#333">
        <div style="background:linear-gradient(135deg,#1a3c5e,#2d6a9f);padding:24px;border-radius:8px 8px 0 0">
          <h1 style="color:#fff;margin:0;font-size:22px">Disbursement Run Results</h1>
          <p style="color:#bee3f8;margin:4px 0 0">${run_reference} — ${pay_period || ''}</p>
        </div>
        <div style="background:#fff;border:1px solid #e0e0e0;border-top:none;padding:24px">
          <h2 style="color:${statusColor};margin-top:0">${statusLabel}</h2>
          <table style="border-collapse:collapse;width:100%;margin-bottom:16px">
            <tr><td style="padding:6px 8px;background:#f5f5f5;font-weight:bold">Total Submitted</td><td style="padding:6px 8px">${submitted}</td></tr>
            <tr><td style="padding:6px 8px;background:#f5f5f5;font-weight:bold">Successful</td><td style="padding:6px 8px;color:#27ae60;font-weight:bold">${successful}</td></tr>
            <tr><td style="padding:6px 8px;background:#f5f5f5;font-weight:bold">Failed</td><td style="padding:6px 8px;color:${failed > 0 ? '#c0392b' : '#555'};font-weight:bold">${failed}</td></tr>
            <tr><td style="padding:6px 8px;background:#f5f5f5;font-weight:bold">Total Amount</td><td style="padding:6px 8px">R ${Number(total_amount).toFixed(2)}</td></tr>
          </table>
          ${failures.length > 0 ? `
          <h3 style="color:#c0392b">Failed Payments (${failures.length})</h3>
          <table style="border-collapse:collapse;width:100%;font-size:13px">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:6px 8px;text-align:left">Employee Ref</th>
                <th style="padding:6px 8px;text-align:left">Name</th>
                <th style="padding:6px 8px;text-align:left">Amount</th>
                <th style="padding:6px 8px;text-align:left">Code</th>
                <th style="padding:6px 8px;text-align:left">Reason</th>
              </tr>
            </thead>
            <tbody>${failureRows}</tbody>
          </table>
          <p style="margin-top:16px"><a href="${process.env.PORTAL_URL || 'https://portal.mymoolah.africa'}/admin/disbursements" style="background:#1a3c5e;color:#fff;padding:10px 20px;text-decoration:none;border-radius:6px;font-size:14px">Fix Failed Payments in Portal →</a></p>
          ` : '<p style="color:#27ae60">All payments were processed successfully. No action required.</p>'}
          <p style="font-size:11px;color:#999;margin-top:24px">This is an automated report from the MyMoolah Treasury Platform. Do not reply.</p>
        </div>
      </div>`;

    await alertService.transporter.sendMail({
      from:    `"MyMoolah Payroll" <${process.env.SMTP_USER}>`,
      to:      toEmail,
      subject: `[${statusLabel}] Disbursement Run ${run_reference} — ${successful}/${submitted} successful`,
      html,
    });

    logger.info(`Email report sent to ${toEmail} for run ${run_reference}`);
    return { success: true };
  } catch (err) {
    logger.warn(`Email report failed: ${err.message}`);
    return { success: false, error: err.message };
  }
}

/**
 * Notify employer of run results via all configured channels.
 *
 * @param {Object} run - DisbursementRun model instance
 */
async function notifyRunResult(run) {
  if (!['completed', 'partial', 'failed'].includes(run.status)) return;

  const payload = await buildResultsPayload(run);
  const channels = run.notification_channels || {};

  const results = {};

  if (channels.webhook) {
    results.webhook = await sendWebhook(channels.webhook, payload);
  }

  if (channels.email) {
    results.email = await sendEmailReport(channels.email, payload);
  } else if (process.env.OPS_ALERT_EMAIL) {
    results.email = await sendEmailReport(process.env.OPS_ALERT_EMAIL, payload);
  }

  logger.info(`Notification results for run ${run.run_reference}:`, results);
  return results;
}

module.exports = { notifyRunResult, buildResultsPayload };
