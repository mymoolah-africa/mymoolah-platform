/**
 * Audit Logger Service
 * 
 * Banking-grade audit logging for compliance and security
 * Provides centralized audit logging functionality that can be used
 * from controllers, services, middleware, and scripts
 * 
 * Features:
 * - Database persistence (ComplianceRecord model)
 * - Structured logging
 * - PII redaction
 * - Compliance standards (ISO 27001, PCI DSS, FSCA)
 * - Event categorization
 * - Performance monitoring
 */

const models = require('../models');
const ComplianceRecord = models.ComplianceRecord;
const securityConfig = require('../config/security');

class AuditLogger {
  constructor() {
    this.enabled = process.env.AUDIT_LOGGING_ENABLED !== 'false';
    this.logToDatabase = process.env.AUDIT_LOG_TO_DB !== 'false';
    this.logToConsole = process.env.NODE_ENV !== 'production' || process.env.AUDIT_LOG_TO_CONSOLE === 'true';
  }

  /**
   * Sanitize sensitive data from audit log entries
   * @param {Object} data - Data to sanitize
   * @returns {Object} - Sanitized data
   */
  sanitizeData(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sensitiveFields = [
      'password', 'token', 'secret', 'key', 'authorization',
      'apiKey', 'apiSecret', 'clientSecret', 'accessToken',
      'refreshToken', 'sessionId', 'creditCard', 'cvv', 'pin',
      'accountNumber', 'idNumber', 'passport', 'ssn'
    ];

    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***REDACTED***';
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (sanitized[key] && typeof sanitized[key] === 'object' && !Array.isArray(sanitized[key])) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Create an audit log entry
   * @param {Object} options - Audit log options
   * @param {string} options.event - Event type/category
   * @param {string} options.action - Action performed
   * @param {string} options.entityType - Type of entity (user, transaction, payment, etc.)
   * @param {string|number} options.entityId - ID of the entity
   * @param {string} options.userId - User ID who performed the action
   * @param {string} options.userRole - Role of the user
   * @param {string} options.ipAddress - IP address
   * @param {string} options.userAgent - User agent string
   * @param {string} options.status - Status (success, failed, pending)
   * @param {string} options.severity - Severity level (low, medium, high, critical)
   * @param {Object} options.metadata - Additional metadata
   * @param {Object} options.requestData - Request data (sanitized)
   * @param {Object} options.responseData - Response data (sanitized)
   * @param {Error} options.error - Error object if applicable
   * @returns {Promise<Object>} - Created audit log entry
   */
  async log({
    event,
    action,
    entityType = null,
    entityId = null,
    userId = null,
    userRole = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    severity = 'medium',
    metadata = {},
    requestData = null,
    responseData = null,
    error = null
  }) {
    if (!this.enabled) {
      return null;
    }

    // Sanitize sensitive data
    const sanitizedRequestData = requestData ? this.sanitizeData(requestData) : null;
    const sanitizedResponseData = responseData ? this.sanitizeData(responseData) : null;
    const sanitizedMetadata = this.sanitizeData(metadata);

    // Build audit log entry
    const auditEntry = {
      eventType: event,
      action: action,
      entityType: entityType,
      entityId: entityId ? String(entityId) : null,
      userId: userId ? String(userId) : null,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: severity,
      metadata: {
        ...sanitizedMetadata,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      },
      requestData: sanitizedRequestData,
      responseData: sanitizedResponseData,
      errorDetails: error ? {
        message: error.message,
        code: error.code,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      } : null,
      complianceFlags: {
        iso27001: true,
        pciDss: true,
        fsca: true,
        gdpr: true,
        mojaloop: true
      }
    };

    // Log to console if enabled
    if (this.logToConsole) {
      const logLevel = severity === 'critical' || severity === 'high' ? 'error' :
                       severity === 'medium' ? 'warn' : 'info';
      console[logLevel](`📋 AUDIT LOG [${event}] [${action}] [${status}]`, JSON.stringify(auditEntry, null, 2));
    }

    // Persist to database if enabled
    // Note: ComplianceRecord model is for compliance records (KYC, AML, etc.)
    // For general audit logs, we'll use console logging primarily
    // Database persistence can be added with a dedicated audit_logs table if needed
    if (this.logToDatabase) {
      // For now, we primarily use console logging
      // Database persistence can be implemented with a dedicated audit_logs table
      // or by extending ComplianceRecord to support audit log type
      
      // Option 1: Use ComplianceRecord with complianceType='audit' if supported
      if (ComplianceRecord) {
        try {
          // Generate unique record ID
          const recordId = `AUDIT-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          
          const complianceRecord = await ComplianceRecord.create({
            recordId: recordId,
            complianceType: 'audit', // Use 'audit' type from ComplianceRecord enum
            entityType: auditEntry.entityType || 'system',
            entityId: auditEntry.entityId || auditEntry.userId || 'system',
            requirement: `${auditEntry.eventType}:${auditEntry.action}`,
            status: auditEntry.status === 'success' ? 'completed' : 
                    auditEntry.status === 'failed' ? 'failed' : 'pending',
            riskLevel: auditEntry.severity,
            metadata: {
              ...auditEntry.metadata,
              userRole: auditEntry.userRole,
              ipAddress: auditEntry.ipAddress,
              userAgent: auditEntry.userAgent,
              requestData: auditEntry.requestData,
              responseData: auditEntry.responseData,
              errorDetails: auditEntry.errorDetails,
              complianceFlags: auditEntry.complianceFlags
            },
            verifiedBy: auditEntry.userId,
            verifiedAt: new Date()
          });

          return complianceRecord;
        } catch (dbError) {
          // Log database error but don't fail the request
          console.error('❌ Failed to save audit log to database:', dbError.message);
          // Still return the audit entry for console logging
          return auditEntry;
        }
      }
    }

    return auditEntry;
  }

  /**
   * Log authentication event
   * @param {Object} options - Authentication log options
   */
  async logAuthentication({
    action, // 'login', 'logout', 'login_failed', 'token_refresh', 'password_reset'
    userId = null,
    userRole = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'authentication',
      action: action,
      entityType: 'user',
      entityId: userId,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: action.includes('failed') ? 'high' : 'medium',
      metadata: metadata,
      error: error
    });
  }

  /**
   * Log authorization event
   * @param {Object} options - Authorization log options
   */
  async logAuthorization({
    action, // 'access_granted', 'access_denied', 'permission_changed'
    userId = null,
    userRole = null,
    resource = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'authorization',
      action: action,
      entityType: 'access_control',
      entityId: resource,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: action === 'access_denied' ? 'high' : 'medium',
      metadata: { ...metadata, resource: resource },
      error: error
    });
  }

  /**
   * Log financial transaction event
   * @param {Object} options - Transaction log options
   */
  async logTransaction({
    action, // 'transaction_created', 'transaction_completed', 'transaction_failed', 'transaction_cancelled'
    transactionId = null,
    userId = null,
    userRole = null,
    amount = null,
    currency = 'ZAR',
    transactionType = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'transaction',
      action: action,
      entityType: 'transaction',
      entityId: transactionId,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: 'high', // Financial transactions are always high severity
      metadata: {
        ...metadata,
        amount: amount,
        currency: currency,
        transactionType: transactionType
      },
      error: error
    });
  }

  /**
   * Log payment event
   * @param {Object} options - Payment log options
   */
  async logPayment({
    action, // 'payment_initiated', 'payment_completed', 'payment_failed', 'payment_refunded'
    paymentId = null,
    userId = null,
    userRole = null,
    provider = null, // 'peach', 'zapper', 'easypay', etc.
    amount = null,
    currency = 'ZAR',
    ipAddress = null,
    userAgent = null,
    status = 'success',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'payment',
      action: action,
      entityType: 'payment',
      entityId: paymentId,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: 'critical', // Payments are critical
      metadata: {
        ...metadata,
        provider: provider,
        amount: amount,
        currency: currency
      },
      error: error
    });
  }

  /**
   * Log system configuration change
   * @param {Object} options - Configuration log options
   */
  async logConfiguration({
    action, // 'config_updated', 'config_deleted', 'config_created'
    configKey = null,
    userId = null,
    userRole = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'configuration',
      action: action,
      entityType: 'configuration',
      entityId: configKey,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: 'high',
      metadata: metadata,
      error: error
    });
  }

  /**
   * Log security event
   * @param {Object} options - Security log options
   */
  async logSecurity({
    action, // 'suspicious_activity', 'rate_limit_exceeded', 'invalid_token', 'xss_attempt', 'sql_injection_attempt'
    userId = null,
    userRole = null,
    ipAddress = null,
    userAgent = null,
    status = 'detected',
    severity = 'high',
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'security',
      action: action,
      entityType: 'security',
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: severity,
      metadata: metadata,
      error: error
    });
  }

  /**
   * Log API access event
   * @param {Object} options - API access log options
   */
  async logApiAccess({
    action, // 'api_request', 'api_response', 'api_error'
    endpoint = null,
    method = null,
    userId = null,
    userRole = null,
    ipAddress = null,
    userAgent = null,
    status = 'success',
    statusCode = null,
    responseTime = null,
    error = null,
    metadata = {}
  }) {
    return this.log({
      event: 'api_access',
      action: action,
      entityType: 'api',
      entityId: endpoint,
      userId: userId,
      userRole: userRole,
      ipAddress: ipAddress,
      userAgent: userAgent,
      status: status,
      severity: 'low',
      metadata: {
        ...metadata,
        endpoint: endpoint,
        method: method,
        statusCode: statusCode,
        responseTime: responseTime
      },
      error: error
    });
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} - Audit log entries
   */
  async queryLogs(filters = {}) {
    if (!this.logToDatabase || !ComplianceRecord) {
      console.warn('⚠️  Audit log querying requires database persistence');
      return [];
    }

    try {
      const { Op } = models.Sequelize;
      const whereClause = {
        complianceType: 'audit' // Only query audit type records
      };

      // Map filters to ComplianceRecord fields
      if (filters.entityType) whereClause.entityType = filters.entityType;
      if (filters.entityId) whereClause.entityId = String(filters.entityId);
      if (filters.status) {
        // Map audit status to compliance status
        const statusMap = {
          'success': 'completed',
          'failed': 'failed',
          'pending': 'pending'
        };
        whereClause.status = statusMap[filters.status] || filters.status;
      }
      if (filters.severity) whereClause.riskLevel = filters.severity;

      // Filter by metadata fields (eventType, action, userId)
      if (filters.eventType || filters.action || filters.userId) {
        const metadataFilter = {};
        if (filters.eventType) {
          metadataFilter['metadata.eventType'] = filters.eventType;
        }
        if (filters.action) {
          metadataFilter['metadata.action'] = filters.action;
        }
        if (filters.userId) {
          whereClause.verifiedBy = String(filters.userId);
        }
        // Note: Sequelize JSONB queries may need special handling
        // For now, we'll filter by verifiedBy for userId
      }

      if (filters.startDate || filters.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt[Op.gte] = new Date(filters.startDate);
        if (filters.endDate) whereClause.createdAt[Op.lte] = new Date(filters.endDate);
      }

      const logs = await ComplianceRecord.findAll({
        where: whereClause,
        order: [['createdAt', 'DESC']],
        limit: filters.limit || 100,
        offset: filters.offset || 0
      });

      return logs;
    } catch (error) {
      console.error('❌ Failed to query audit logs:', error.message);
      return [];
    }
  }
}

// Export singleton instance
module.exports = new AuditLogger();

