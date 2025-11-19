/**
 * Audit Middleware
 * 
 * Express middleware for automatic audit logging of HTTP requests
 * Uses the auditLogger service for centralized audit logging
 * 
 * Usage:
 *   const { auditMiddleware } = require('./middleware/auditMiddleware');
 *   app.use('/api/v1', auditMiddleware);
 * 
 * Or for specific routes:
 *   router.post('/payments', auditMiddleware, paymentController.create);
 */

const auditLogger = require('../services/auditLogger');

/**
 * Main audit middleware
 * Automatically logs all HTTP requests with sanitized data
 */
const auditMiddleware = (req, res, next) => {
  // Skip audit logging for health checks and static assets
  if (req.path === '/health' || 
      req.path === '/api/v1/monitoring/health' ||
      req.path.startsWith('/static/') ||
      req.path.startsWith('/assets/')) {
    return next();
  }

  // Capture start time for response time calculation
  const startTime = Date.now();

  // Store original end method to capture response
  const originalEnd = res.end;
  const originalJson = res.json;

  // Override res.json to capture response data
  res.json = function(data) {
    res.responseData = data;
    return originalJson.call(this, data);
  };

  // Override res.end to log after response is sent
  res.end = function(chunk, encoding) {
    const responseTime = Date.now() - startTime;
    
    // Extract user information from request
    const userId = req.user?.id || req.portalUser?.id || null;
    const userRole = req.user?.role || req.portalUser?.role || null;
    
    // Determine event type based on route
    let eventType = 'api_access';
    let action = `${req.method.toLowerCase()}_${req.path.replace(/\//g, '_').replace(/^_/, '')}`;
    
    // Categorize by route patterns
    if (req.path.includes('/auth/') || req.path.includes('/login') || req.path.includes('/logout')) {
      eventType = 'authentication';
      action = req.path.includes('/login') ? 'login' : 
               req.path.includes('/logout') ? 'logout' : 'auth_request';
    } else if (req.path.includes('/transaction') || req.path.includes('/payment')) {
      eventType = req.path.includes('/payment') ? 'payment' : 'transaction';
      action = `${req.method.toLowerCase()}_${eventType}`;
    } else if (req.path.includes('/wallet') || req.path.includes('/balance')) {
      eventType = 'transaction';
      action = 'wallet_access';
    } else if (req.path.includes('/kyc') || req.path.includes('/verification')) {
      eventType = 'authorization';
      action = 'kyc_access';
    } else if (req.path.includes('/admin') || req.path.includes('/portal')) {
      eventType = 'authorization';
      action = 'admin_access';
    }

    // Determine status
    const status = res.statusCode >= 200 && res.statusCode < 300 ? 'success' :
                   res.statusCode >= 400 && res.statusCode < 500 ? 'failed' :
                   res.statusCode >= 500 ? 'error' : 'unknown';

    // Determine severity
    let severity = 'low';
    if (res.statusCode >= 500) {
      severity = 'high';
    } else if (res.statusCode >= 400) {
      severity = 'medium';
    } else if (req.path.includes('/payment') || req.path.includes('/transaction')) {
      severity = 'high';
    }

    // Log the request asynchronously (don't block response)
    setImmediate(() => {
      auditLogger.logApiAccess({
        action: action,
        endpoint: req.originalUrl || req.path,
        method: req.method,
        userId: userId,
        userRole: userRole,
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get('User-Agent'),
        status: status,
        statusCode: res.statusCode,
        responseTime: responseTime,
        metadata: {
          query: req.query,
          params: req.params
        },
        requestData: {
          method: req.method,
          path: req.path,
          headers: {
            'content-type': req.get('Content-Type'),
            'accept': req.get('Accept')
          }
        },
        responseData: res.responseData
      }).catch(err => {
        // Don't let audit logging errors affect the response
        console.error('❌ Audit logging error:', err.message);
      });
    });

    // Call original end method
    return originalEnd.call(this, chunk, encoding);
  };

  next();
};

/**
 * Audit middleware for specific actions
 * Use this for explicit audit logging of specific actions
 * 
 * @param {string} event - Event type (authentication, transaction, payment, etc.)
 * @param {string} action - Action name
 * @param {string} entityType - Type of entity
 * @returns {Function} Express middleware
 */
const auditAction = (event, action, entityType = null) => {
  return async (req, res, next) => {
    // Store audit context in request for use in controller
    req.auditContext = {
      event,
      action,
      entityType,
      log: async (options = {}) => {
        return auditLogger.log({
          event: event,
          action: action,
          entityType: entityType || options.entityType,
          entityId: options.entityId || req.params.id || req.body.id,
          userId: req.user?.id || req.portalUser?.id || null,
          userRole: req.user?.role || req.portalUser?.role || null,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('User-Agent'),
          status: options.status || 'success',
          severity: options.severity || 'medium',
          metadata: options.metadata || {},
          requestData: options.requestData || req.body,
          responseData: options.responseData,
          error: options.error
        });
      }
    };

    next();
  };
};

/**
 * Audit middleware for financial transactions
 * Automatically logs transaction-related requests with high severity
 */
const auditTransaction = auditAction('transaction', 'transaction_request', 'transaction');

/**
 * Audit middleware for payment operations
 * Automatically logs payment-related requests with critical severity
 */
const auditPayment = auditAction('payment', 'payment_request', 'payment');

/**
 * Audit middleware for authentication
 * Automatically logs authentication-related requests
 */
const auditAuthentication = auditAction('authentication', 'auth_request', 'user');

/**
 * Audit middleware for authorization
 * Automatically logs authorization-related requests
 */
const auditAuthorization = auditAction('authorization', 'authorization_check', 'access_control');

module.exports = {
  auditMiddleware,
  auditAction,
  auditTransaction,
  auditPayment,
  auditAuthentication,
  auditAuthorization
};

