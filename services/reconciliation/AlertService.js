/**
 * Alert Service for Reconciliation
 * 
 * Sends real-time alerts for reconciliation events:
 * - Email notifications to finance team
 * - Critical discrepancy escalations
 * - File processing failures
 * - SLA breaches
 * 
 * @module services/reconciliation/AlertService
 */

'use strict';

// Simple logger using console (matches other services in the project)
const logger = {
  info: (...args) => console.log('[AlertService]', ...args),
  error: (...args) => console.error('[AlertService]', ...args),
  warn: (...args) => console.warn('[AlertService]', ...args),
  debug: (...args) => console.log('[AlertService]', ...args)
};
const nodemailer = require('nodemailer');
const path = require('path');

class AlertService {
  constructor() {
    // Configure email transporter
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  /**
   * Send reconciliation alert
   * 
   * @param {Object} reconRun - Reconciliation run
   * @param {Object} supplierConfig - Supplier configuration
   * @param {Object} options - Alert options
   */
  async sendReconAlert(reconRun, supplierConfig, options = {}) {
    try {
      const severity = options.severity || 'medium';
      const recipients = supplierConfig.alert_email || ['finance@mymoolah.africa'];
      
      logger.info('[AlertService] Sending reconciliation alert', {
        run_id: reconRun.run_id,
        supplier: supplierConfig.supplier_name,
        severity,
        recipients
      });
      
      // Build email content
      const subject = this.buildSubject(reconRun, supplierConfig, severity);
      const html = this.buildHtmlContent(reconRun, supplierConfig, severity, options);
      
      // Prepare attachments (reports)
      const attachments = [];
      if (options.reports) {
        if (options.reports.excel) {
          attachments.push({
            filename: path.basename(options.reports.excel),
            path: options.reports.excel
          });
        }
        if (options.reports.json) {
          attachments.push({
            filename: path.basename(options.reports.json),
            path: options.reports.json
          });
        }
      }
      
      // Send email
      const info = await this.transporter.sendMail({
        from: `"MyMoolah Reconciliation" <${process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        subject,
        html,
        attachments
      });
      
      logger.info('[AlertService] Alert sent successfully', {
        run_id: reconRun.run_id,
        message_id: info.messageId,
        recipients
      });
      
      return {
        success: true,
        message_id: info.messageId,
        recipients
      };
    } catch (error) {
      logger.error('[AlertService] Failed to send alert', {
        error: error.message,
        run_id: reconRun.run_id
      });
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Build email subject
   */
  buildSubject(reconRun, supplierConfig, severity) {
    const severityPrefix = {
      low: '✓',
      medium: '⚠',
      high: '⚠⚠',
      critical: '🚨'
    };
    
    const prefix = severityPrefix[severity] || '';
    const matchRate = reconRun.getMatchRate().toFixed(1);
    
    if (reconRun.status === 'failed') {
      return `${prefix} FAILED: ${supplierConfig.supplier_name} Reconciliation`;
    }
    
    if (severity === 'critical' || severity === 'high') {
      return `${prefix} ALERT: ${supplierConfig.supplier_name} Reconciliation - ${matchRate}% Match Rate`;
    }
    
    return `${prefix} ${supplierConfig.supplier_name} Reconciliation Complete - ${matchRate}% Match Rate`;
  }
  
  /**
   * Build HTML email content
   */
  buildHtmlContent(reconRun, supplierConfig, severity, options) {
    const matchRate = reconRun.getMatchRate().toFixed(2);
    const amountVariance = parseFloat(reconRun.amount_variance || 0);
    const commissionVariance = parseFloat(reconRun.commission_variance || 0);
    const passed = reconRun.isPassed(supplierConfig.critical_variance_threshold);
    
    const severityColor = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      critical: '#dc3545'
    };
    
    const color = severityColor[severity] || '#6c757d';
    const statusBadge = passed ? 
      '<span style="background: #28a745; color: white; padding: 5px 10px; border-radius: 3px;">PASSED</span>' :
      '<span style="background: #dc3545; color: white; padding: 5px 10px; border-radius: 3px;">FAILED</span>';
    
    return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
    .summary { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .metric:last-child { border-bottom: none; }
    .label { font-weight: bold; }
    .value { color: #495057; }
    .footer { background: #343a40; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 0.9em; }
    .alert { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>Reconciliation Report</h2>
      <p>${supplierConfig.supplier_name}</p>
    </div>
    
    <div class="content">
      <div class="summary">
        <h3>Summary ${statusBadge}</h3>
        <div class="metric">
          <span class="label">Run ID:</span>
          <span class="value">${reconRun.run_id}</span>
        </div>
        <div class="metric">
          <span class="label">File:</span>
          <span class="value">${reconRun.file_name}</span>
        </div>
        <div class="metric">
          <span class="label">Processing Time:</span>
          <span class="value">${(reconRun.processing_time_ms / 1000).toFixed(2)}s</span>
        </div>
      </div>
      
      <div class="summary">
        <h3>Matching Results</h3>
        <div class="metric">
          <span class="label">Total Transactions:</span>
          <span class="value">${reconRun.total_transactions}</span>
        </div>
        <div class="metric">
          <span class="label">Exact Matches:</span>
          <span class="value">${reconRun.matched_exact}</span>
        </div>
        <div class="metric">
          <span class="label">Fuzzy Matches:</span>
          <span class="value">${reconRun.matched_fuzzy}</span>
        </div>
        <div class="metric">
          <span class="label">Unmatched (MMTP):</span>
          <span class="value" style="color: ${reconRun.unmatched_mmtp > 0 ? '#dc3545' : '#28a745'};">${reconRun.unmatched_mmtp}</span>
        </div>
        <div class="metric">
          <span class="label">Unmatched (Supplier):</span>
          <span class="value" style="color: ${reconRun.unmatched_supplier > 0 ? '#dc3545' : '#28a745'};">${reconRun.unmatched_supplier}</span>
        </div>
        <div class="metric">
          <span class="label">Match Rate:</span>
          <span class="value" style="font-size: 1.2em; font-weight: bold; color: ${matchRate >= 99 ? '#28a745' : '#dc3545'};">${matchRate}%</span>
        </div>
      </div>
      
      <div class="summary">
        <h3>Financial Summary</h3>
        <div class="metric">
          <span class="label">Total Amount (MMTP):</span>
          <span class="value">R${parseFloat(reconRun.total_amount_mmtp).toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="label">Total Amount (Supplier):</span>
          <span class="value">R${parseFloat(reconRun.total_amount_supplier).toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="label">Amount Variance:</span>
          <span class="value" style="color: ${Math.abs(amountVariance) > 100 ? '#dc3545' : '#28a745'};">R${amountVariance.toFixed(2)}</span>
        </div>
        <div class="metric">
          <span class="label">Commission Variance:</span>
          <span class="value" style="color: ${Math.abs(commissionVariance) > 10 ? '#dc3545' : '#28a745'};">R${commissionVariance.toFixed(2)}</span>
        </div>
      </div>
      
      <div class="summary">
        <h3>Resolution Status</h3>
        <div class="metric">
          <span class="label">Auto Resolved:</span>
          <span class="value">${reconRun.auto_resolved}</span>
        </div>
        <div class="metric">
          <span class="label">Manual Review Required:</span>
          <span class="value" style="color: ${reconRun.manual_review_required > 0 ? '#ffc107' : '#28a745'};">${reconRun.manual_review_required}</span>
        </div>
      </div>
      
      ${!passed ? `
      <div class="alert">
        <strong>⚠ Action Required:</strong> This reconciliation did not pass acceptance criteria. Please review the attached detailed report and resolve outstanding discrepancies.
      </div>
      ` : ''}
      
      ${reconRun.manual_review_required > 0 ? `
      <div class="alert">
        <strong>ℹ Manual Review:</strong> ${reconRun.manual_review_required} transaction(s) require manual review. Please check the attached report for details.
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      <p>MyMoolah Transaction Platform - Automated Reconciliation System</p>
      <p>For questions, contact: finance@mymoolah.africa</p>
    </div>
  </div>
</body>
</html>
    `;
  }
  
  /**
   * Send SLA breach alert
   */
  async sendSLABreachAlert(supplierConfig) {
    try {
      const recipients = supplierConfig.alert_email || ['finance@mymoolah.africa'];
      
      logger.warn('[AlertService] Sending SLA breach alert', {
        supplier: supplierConfig.supplier_name,
        sla_hours: supplierConfig.sla_hours
      });
      
      const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: #dc3545; color: white; padding: 20px; border-radius: 5px;">
      <h2>🚨 SLA Breach Alert</h2>
      <p><strong>${supplierConfig.supplier_name}</strong></p>
    </div>
    <div style="background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; margin-top: 10px;">
      <p>No reconciliation file received from <strong>${supplierConfig.supplier_name}</strong> within the expected SLA of <strong>${supplierConfig.sla_hours} hours</strong>.</p>
      <p><strong>Last Successful Run:</strong> ${supplierConfig.last_successful_run_at || 'Never'}</p>
      <p><strong>Action Required:</strong> Please contact ${supplierConfig.supplier_name} to confirm file delivery status.</p>
    </div>
  </div>
</body>
</html>
      `;
      
      await this.transporter.sendMail({
        from: `"MyMoolah Reconciliation" <${process.env.SMTP_USER}>`,
        to: recipients.join(', '),
        subject: `🚨 SLA BREACH: ${supplierConfig.supplier_name} Reconciliation File Missing`,
        html
      });
      
      logger.info('[AlertService] SLA breach alert sent', {
        supplier: supplierConfig.supplier_name
      });
    } catch (error) {
      logger.error('[AlertService] Failed to send SLA breach alert', {
        error: error.message,
        supplier: supplierConfig.supplier_name
      });
    }
  }
}

module.exports = AlertService;
