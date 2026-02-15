/**
 * Float Balance Monitoring Service
 * 
 * Scheduled service that monitors supplier float account balances and sends
 * email notifications to suppliers when balances fall below thresholds.
 * 
 * Features:
 * - Scheduled balance checks (configurable interval)
 * - Email notifications to suppliers when balance < minimumBalance
 * - Warning notifications when balance approaches minimum
 * - Critical alerts when balance is critically low
 * - Banking-grade compliance with audit trail
 * 
 * @module services/floatBalanceMonitoringService
 */

'use strict';

const { SupplierFloat } = require('../models');
const nodemailer = require('nodemailer');
const cron = require('node-cron');

class FloatBalanceMonitoringService {
  constructor() {
    this.isRunning = false;
    this.checkInterval = null;
    this.lastCheckTime = null;
    this.notificationHistory = new Map(); // Track sent notifications to prevent spam
    
    // Email transporter configuration
    this.transporter = null;
    this.smtpConfigured = false;
    this.smtpAuthFailed = false; // Set true when send fails with auth error - skip future attempts
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.gmail.com',
          port: process.env.SMTP_PORT || 587,
          secure: false,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
          }
        });
        this.smtpConfigured = true;
        console.log('[FloatBalanceMonitoring] Email notifications configured');
      } catch (error) {
        console.warn('[FloatBalanceMonitoring] Failed to configure email transporter:', error.message);
      }
    } else {
      console.warn('[FloatBalanceMonitoring] SMTP not configured - email notifications disabled');
      console.warn('  Set SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT to enable');
    }
    
    // Configuration
    this.checkIntervalMinutes = parseInt(process.env.FLOAT_BALANCE_CHECK_INTERVAL_MINUTES || '60', 10); // Default: hourly
    this.warningThresholdPercent = parseFloat(process.env.FLOAT_BALANCE_WARNING_THRESHOLD || '0.15', 10); // 15% above minimum
    this.criticalThresholdPercent = parseFloat(process.env.FLOAT_BALANCE_CRITICAL_THRESHOLD || '0.05', 10); // 5% above minimum
    this.notificationCooldownHours = parseInt(process.env.FLOAT_BALANCE_NOTIFICATION_COOLDOWN_HOURS || '24', 10); // Prevent spam
  }

  /**
   * Start the monitoring service
   * @param {string} schedule - Cron schedule (default: every hour)
   */
  start(schedule = null) {
    if (this.isRunning) {
      console.warn('[FloatBalanceMonitoring] Service is already running');
      return;
    }

    // Use provided schedule or default to hourly
    // For intervals > 59 minutes, use hourly schedule (0 * * * *)
    let cronSchedule;
    if (schedule) {
      cronSchedule = schedule;
    } else if (this.checkIntervalMinutes >= 60) {
      // For hourly or longer, use hourly schedule
      const hours = Math.floor(this.checkIntervalMinutes / 60);
      if (hours === 1) {
        cronSchedule = '0 * * * *'; // Every hour at minute 0
      } else {
        cronSchedule = `0 */${hours} * * *`; // Every N hours
      }
    } else {
      // For intervals < 60 minutes, use minute-based schedule
      cronSchedule = `*/${this.checkIntervalMinutes} * * * *`;
    }
    
    console.log(`[FloatBalanceMonitoring] Starting service with schedule: ${cronSchedule}`);
    console.log(`[FloatBalanceMonitoring] Check interval: ${this.checkIntervalMinutes} minutes`);
    console.log(`[FloatBalanceMonitoring] Warning threshold: ${(this.warningThresholdPercent * 100).toFixed(0)}% above minimum`);
    console.log(`[FloatBalanceMonitoring] Critical threshold: ${(this.criticalThresholdPercent * 100).toFixed(0)}% above minimum`);
    console.log(`[FloatBalanceMonitoring] Notification cooldown: ${this.notificationCooldownHours} hours`);

    this.checkInterval = cron.schedule(cronSchedule, async () => {
      await this.checkAllFloatBalances();
    }, {
      scheduled: true,
      timezone: 'Africa/Johannesburg'
    });

    this.isRunning = true;
    console.log('[FloatBalanceMonitoring] ✅ Service started successfully');
    
    // Run initial check
    this.checkAllFloatBalances();
  }

  /**
   * Stop the monitoring service
   */
  stop() {
    if (this.checkInterval) {
      this.checkInterval.stop();
      this.checkInterval = null;
    }
    this.isRunning = false;
    console.log('[FloatBalanceMonitoring] Service stopped');
  }

  /**
   * Check all supplier float account balances
   */
  async checkAllFloatBalances() {
    try {
      this.lastCheckTime = new Date();
      console.log(`[FloatBalanceMonitoring] Checking float balances at ${this.lastCheckTime.toISOString()}`);

      const floatAccounts = await SupplierFloat.findAll({
        where: {
          isActive: true,
          status: 'active'
        }
      });

      if (floatAccounts.length === 0) {
        console.log('[FloatBalanceMonitoring] No active float accounts found');
        return;
      }

      console.log(`[FloatBalanceMonitoring] Checking ${floatAccounts.length} active float account(s)`);

      for (const floatAccount of floatAccounts) {
        await this.checkFloatBalance(floatAccount);
      }

      console.log('[FloatBalanceMonitoring] ✅ Balance check completed');
    } catch (error) {
      console.error('[FloatBalanceMonitoring] ❌ Error checking float balances:', error);
    }
  }

  /**
   * Check a single float account balance and send notifications if needed
   * @param {Object} floatAccount - SupplierFloat instance
   */
  async checkFloatBalance(floatAccount) {
    try {
      const currentBalance = parseFloat(floatAccount.currentBalance || 0);
      const minimumBalance = parseFloat(floatAccount.minimumBalance || 0);
      const maximumBalance = floatAccount.maximumBalance ? parseFloat(floatAccount.maximumBalance) : null;

      // Skip if no minimum balance threshold set
      if (minimumBalance === 0) {
        return;
      }

      // Calculate thresholds
      const warningThreshold = minimumBalance * (1 + this.warningThresholdPercent);
      const criticalThreshold = minimumBalance * (1 + this.criticalThresholdPercent);

      // Determine alert level
      let alertLevel = null;
      if (currentBalance < minimumBalance) {
        alertLevel = 'critical'; // Below minimum
      } else if (currentBalance < criticalThreshold) {
        alertLevel = 'critical'; // Critically low (within 5% of minimum)
      } else if (currentBalance < warningThreshold) {
        alertLevel = 'warning'; // Warning (within 15% of minimum)
      }

      // Check if we should send notification (cooldown period)
      if (alertLevel) {
        const notificationKey = `${floatAccount.supplierId}_${alertLevel}`;
        const lastNotification = this.notificationHistory.get(notificationKey);
        
        if (lastNotification) {
          const hoursSinceLastNotification = (Date.now() - lastNotification) / (1000 * 60 * 60);
          if (hoursSinceLastNotification < this.notificationCooldownHours) {
            console.log(`[FloatBalanceMonitoring] Skipping notification for ${floatAccount.supplierName} (cooldown: ${(this.notificationCooldownHours - hoursSinceLastNotification).toFixed(1)}h remaining)`);
            return;
          }
        }

        // Send notification
        await this.sendBalanceAlert(floatAccount, alertLevel, {
          currentBalance,
          minimumBalance,
          maximumBalance,
          warningThreshold,
          criticalThreshold
        });

        // Update notification history
        this.notificationHistory.set(notificationKey, Date.now());
      } else {
        // Balance is healthy - clear any previous notifications from history
        // (allows new notifications if balance drops again)
        const keysToRemove = [];
        for (const [key] of this.notificationHistory) {
          if (key.startsWith(`${floatAccount.supplierId}_`)) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => this.notificationHistory.delete(key));
      }
    } catch (error) {
      console.error(`[FloatBalanceMonitoring] Error checking ${floatAccount.supplierName}:`, error);
    }
  }

  /**
   * Send balance alert email to supplier
   * @param {Object} floatAccount - SupplierFloat instance
   * @param {string} alertLevel - 'warning' or 'critical'
   * @param {Object} balanceInfo - Balance information
   */
  async sendBalanceAlert(floatAccount, alertLevel, balanceInfo) {
    if (!this.smtpConfigured) {
      console.warn(`[FloatBalanceMonitoring] Cannot send alert - SMTP not configured`);
      return { success: false, message: 'SMTP not configured' };
    }
    if (this.smtpAuthFailed) {
      return { success: false, message: 'SMTP auth failed previously - skipping email' };
    }

    try {
      // Get supplier email from metadata or use default
      const supplierEmail = floatAccount.metadata?.contactEmail || 
                          floatAccount.metadata?.alertEmail ||
                          process.env.SUPPLIER_ALERT_EMAIL || 
                          'finance@mymoolah.africa';

      // Build email content
      const subject = this.buildSubject(floatAccount, alertLevel, balanceInfo);
      const html = this.buildHtmlContent(floatAccount, alertLevel, balanceInfo);

      console.log(`[FloatBalanceMonitoring] Sending ${alertLevel} alert to ${supplierEmail} for ${floatAccount.supplierName}`);

      const info = await this.transporter.sendMail({
        from: `"MyMoolah Treasury Platform" <${process.env.SMTP_USER}>`,
        to: supplierEmail,
        cc: process.env.FLOAT_ALERT_CC_EMAIL || null, // Optional CC to finance team
        subject,
        html
      });

      console.log(`[FloatBalanceMonitoring] ✅ Alert sent successfully (Message ID: ${info.messageId})`);

      return {
        success: true,
        messageId: info.messageId,
        recipient: supplierEmail,
        alertLevel
      };
    } catch (error) {
      const isAuthError = error.code === 'EAUTH' ||
        error.responseCode === 535 ||
        /Username and Password not accepted|BadCredentials|Invalid login/i.test(String(error.message || ''));
      if (isAuthError) {
        this.smtpAuthFailed = true;
        this.smtpConfigured = false;
        console.warn(`[FloatBalanceMonitoring] SMTP credentials invalid - email notifications disabled for this session. Check SMTP_USER/SMTP_PASS (use Gmail App Password if using Gmail).`);
      } else {
        console.error(`[FloatBalanceMonitoring] ❌ Failed to send alert:`, error);
      }
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Build email subject
   */
  buildSubject(floatAccount, alertLevel, balanceInfo) {
    const prefix = alertLevel === 'critical' ? '🚨 CRITICAL' : '⚠️ WARNING';
    const balance = balanceInfo.currentBalance.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });
    return `${prefix}: ${floatAccount.supplierName} Float Balance Low - R${balance}`;
  }

  /**
   * Build HTML email content
   */
  buildHtmlContent(floatAccount, alertLevel, balanceInfo) {
    const isCritical = alertLevel === 'critical';
    const color = isCritical ? '#dc3545' : '#ffc107';
    const currentBalance = balanceInfo.currentBalance;
    const minimumBalance = balanceInfo.minimumBalance;
    const balancePercent = ((currentBalance / minimumBalance) * 100).toFixed(1);
    const shortfall = Math.max(0, minimumBalance - currentBalance);
    const shortfallFormatted = shortfall.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      useGrouping: true
    });

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
    .content { background: #f8f9fa; padding: 20px; border: 1px solid #dee2e6; }
    .summary { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid ${color}; }
    .metric { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
    .metric:last-child { border-bottom: none; }
    .label { font-weight: bold; }
    .value { color: #495057; }
    .critical { color: #dc3545; font-weight: bold; }
    .warning { color: #ffc107; font-weight: bold; }
    .footer { background: #343a40; color: white; padding: 15px; text-align: center; border-radius: 0 0 5px 5px; font-size: 0.9em; }
    .alert { background: #fff3cd; border-left: 4px solid ${color}; padding: 15px; margin: 10px 0; }
    .action { background: #e7f3ff; border-left: 4px solid #0066cc; padding: 15px; margin: 10px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2>${isCritical ? '🚨 CRITICAL' : '⚠️ WARNING'}: Float Balance Alert</h2>
      <p><strong>${floatAccount.supplierName}</strong></p>
    </div>
    
    <div class="content">
      <div class="summary">
        <h3>Account Information</h3>
        <div class="metric">
          <span class="label">Account Number:</span>
          <span class="value">${floatAccount.floatAccountNumber}</span>
        </div>
        <div class="metric">
          <span class="label">Account Name:</span>
          <span class="value">${floatAccount.floatAccountName}</span>
        </div>
        <div class="metric">
          <span class="label">Supplier ID:</span>
          <span class="value">${floatAccount.supplierId}</span>
        </div>
      </div>
      
      <div class="summary">
        <h3>Balance Status</h3>
        <div class="metric">
          <span class="label">Current Balance:</span>
          <span class="value ${isCritical ? 'critical' : 'warning'}">R${currentBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</span>
        </div>
        <div class="metric">
          <span class="label">Minimum Balance:</span>
          <span class="value">R${minimumBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</span>
        </div>
        ${shortfall > 0 ? `
        <div class="metric">
          <span class="label">Shortfall:</span>
          <span class="value critical">R${shortfallFormatted}</span>
        </div>
        ` : ''}
        <div class="metric">
          <span class="label">Balance vs Minimum:</span>
          <span class="value ${isCritical ? 'critical' : 'warning'}">${balancePercent}%</span>
        </div>
        ${balanceInfo.maximumBalance ? `
        <div class="metric">
          <span class="label">Maximum Balance:</span>
          <span class="value">R${balanceInfo.maximumBalance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: true })}</span>
        </div>
        ` : ''}
      </div>
      
      ${isCritical ? `
      <div class="alert">
        <strong>🚨 CRITICAL ALERT:</strong> Your float account balance is below or critically close to the minimum threshold. Immediate action is required to top up your float account to ensure uninterrupted service.
      </div>
      ` : `
      <div class="alert">
        <strong>⚠️ WARNING:</strong> Your float account balance is approaching the minimum threshold. Please consider topping up your float account soon to avoid service interruptions.
      </div>
      `}
      
      <div class="action">
        <strong>📋 Required Action:</strong>
        <ul>
          <li>Review your current float account balance</li>
          <li>Initiate a top-up transaction to bring balance above minimum threshold</li>
          <li>Contact MyMoolah Finance Team if you need assistance: finance@mymoolah.africa</li>
        </ul>
      </div>
      
      <div class="summary">
        <h3>Account Details</h3>
        <div class="metric">
          <span class="label">Settlement Method:</span>
          <span class="value">${floatAccount.settlementMethod || 'N/A'}</span>
        </div>
        <div class="metric">
          <span class="label">Settlement Period:</span>
          <span class="value">${floatAccount.settlementPeriod || 'N/A'}</span>
        </div>
        <div class="metric">
          <span class="label">Ledger Account Code:</span>
          <span class="value">${floatAccount.ledgerAccountCode || 'N/A'}</span>
        </div>
      </div>
    </div>
    
    <div class="footer">
      <p>MyMoolah Treasury Platform - Automated Float Balance Monitoring</p>
      <p>This is an automated alert. For questions, contact: finance@mymoolah.africa</p>
      <p>Alert generated at: ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastCheckTime: this.lastCheckTime,
      checkIntervalMinutes: this.checkIntervalMinutes,
      smtpConfigured: this.smtpConfigured,
      smtpAuthFailed: this.smtpAuthFailed,
      notificationHistorySize: this.notificationHistory.size
    };
  }
}

module.exports = FloatBalanceMonitoringService;
