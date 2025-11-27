/**
 * Security Middleware for MyMoolah
 * 
 * Implements banking-grade security measures including:
 * - Enhanced rate limiting
 * - DDoS protection
 * - Input validation and sanitization
 * - Security headers
 * - Request logging and monitoring
 */

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const hpp = require('hpp');
const xss = require('xss-clean');
const mongoSanitize = require('express-mongo-sanitize');
const { body, validationResult } = require('express-validator');

// Enhanced rate limiting configurations
const createRateLimit = (windowMs, max, message, keyGenerator = null) => {
  // Development environment gets more lenient rate limiting
  const isDevelopment = process.env.NODE_ENV === 'development';
  const adjustedMax = isDevelopment ? max * 5 : max;
  
  return rateLimit({
    windowMs,
    max: adjustedMax,
    message: {
      status: 'error',
      message: message || 'Too many requests, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    keyGenerator: keyGenerator || ((req) => {
      // Use X-Forwarded-For header when behind proxy (Cloud Run)
      // Trust proxy is set to 1 (trust first proxy only - Cloud Load Balancer)
      return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.connection.remoteAddress;
    }),
    // Disable trust proxy validation - we're using trust proxy: 1 (secure, only trusts Cloud Load Balancer)
    validate: {
      trustProxy: false
    },
    handler: (req, res) => {
      res.status(429).json({
        status: 'error',
        message: message || 'Too many requests, please try again later.',
        retryAfter: Math.ceil(windowMs / 1000),
        timestamp: new Date().toISOString()
      });
    },
    skip: (req) => {
      // Skip rate limiting for health checks
      return req.path === '/health' || req.path === '/api/v1/monitoring/health';
    }
  });
};

// Rate limiting configurations
const rateLimiters = {
  // General API rate limiting (development-friendly)
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    500, // 500 requests per 15 minutes (development-friendly)
    'Too many API requests, please try again later.'
  ),

  // Authentication rate limiting (development-friendly)
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    200, // 200 login attempts per 15 minutes (development-friendly)
    'Too many login attempts, please try again later.',
    (req) => `${req.ip}-auth`
  ),

  // Transaction rate limiting (very strict)
  transactions: createRateLimit(
    60 * 1000, // 1 minute
    10, // 10 transactions per minute
    'Too many transaction requests, please try again later.',
    (req) => `${req.ip}-transactions`
  ),

  // VAS rate limiting
  vas: createRateLimit(
    60 * 1000, // 1 minute
    20, // 20 VAS requests per minute
    'Too many VAS requests, please try again later.',
    (req) => `${req.ip}-vas`
  ),

  // Support rate limiting
  support: createRateLimit(
    5 * 60 * 1000, // 5 minutes
    10, // 10 support requests per 5 minutes
    'Too many support requests, please try again later.',
    (req) => `${req.ip}-support`
  ),

  // DDoS protection (very strict)
  ddos: createRateLimit(
    60 * 1000, // 1 minute
    50, // 50 requests per minute
    'DDoS protection triggered, please try again later.'
  )
};

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  frameguard: { action: 'deny' },
  xssFilter: true,
  hidePoweredBy: true
});

/**
 * Input validation middleware
 */
const inputValidation = {
  // User input validation
  user: [
    body('email').isEmail().normalizeEmail().withMessage('Invalid email address'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
    body('firstName').trim().isLength({ min: 2, max: 50 }).escape(),
    body('lastName').trim().isLength({ min: 2, max: 50 }).escape()
  ],

  // Transaction validation
  transaction: [
    body('amount').isFloat({ min: 0.01 }).withMessage('Invalid amount'),
    body('type').isIn(['transfer', 'deposit', 'withdrawal', 'payment']).withMessage('Invalid transaction type'),
    body('description').trim().isLength({ max: 255 }).escape(),
    body('recipientId').optional().isInt({ min: 1 }).withMessage('Invalid recipient ID')
  ],

  // VAS validation
  vas: [
    body('vasType').isIn(['airtime', 'data', 'electricity']).withMessage('Invalid VAS type'),
    body('amount').isInt({ min: 100, max: 50000 }).withMessage('Invalid VAS amount'),
    body('recipientNumber').isMobilePhone().withMessage('Invalid recipient number'),
    body('transactionType').isIn(['voucher', 'topup']).withMessage('Invalid transaction type')
  ],

  // KYC validation
  kyc: [
    body('documentType').isIn(['id', 'passport', 'drivers_license']).withMessage('Invalid document type'),
    body('documentNumber').trim().isLength({ min: 5, max: 50 }).escape(),
    body('expiryDate').isISO8601().withMessage('Invalid expiry date')
  ]
};

/**
 * Validation result handler
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value
      }))
    });
  }
  next();
};

/**
 * Request logging middleware
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  
  // Log request details
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  
  // Log request body for sensitive operations
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && 
      ['/api/v1/auth/login', '/api/v1/transactions', '/api/v1/vas'].includes(req.path)) {
    console.log(`Request Body: ${JSON.stringify(req.body, null, 2)}`);
  }
  
  // Override res.end to log response
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms`);
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

/**
 * IP whitelist middleware
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    const clientIP = req.ip || req.connection.remoteAddress;
    
    if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: IP not whitelisted',
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

/**
 * Request size limiting middleware
 */
const requestSizeLimit = (limit = '10mb') => {
  return (req, res, next) => {
    const contentLength = parseInt(req.headers['content-length'] || '0');
    const limitBytes = parseSize(limit);
    
    if (contentLength > limitBytes) {
      return res.status(413).json({
        status: 'error',
        message: 'Request entity too large',
        maxSize: limit,
        timestamp: new Date().toISOString()
      });
    }
    
    next();
  };
};

/**
 * Parse size string to bytes
 */
const parseSize = (size) => {
  const units = {
    'b': 1,
    'kb': 1024,
    'mb': 1024 * 1024,
    'gb': 1024 * 1024 * 1024
  };
  
  const match = size.toLowerCase().match(/^(\d+)([kmg]?b)$/);
  if (!match) return 1024 * 1024; // Default 1MB
  
  const [, value, unit] = match;
  return parseInt(value) * (units[unit] || 1);
};

/**
 * Security monitoring middleware
 */
const securityMonitor = (req, res, next) => {
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /union\s+select/i,
    /drop\s+table/i,
    /delete\s+from/i,
    /insert\s+into/i,
    /update\s+set/i
  ];
  
  const requestString = JSON.stringify(req.body) + JSON.stringify(req.query) + req.originalUrl;
  
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(requestString)) {
      console.warn(`🚨 Suspicious request detected: ${req.method} ${req.originalUrl} from ${req.ip}`);
      console.warn(`Pattern matched: ${pattern.source}`);
      
      // Log to security monitoring system (could be sent to external service)
      // securityLogger.log('suspicious_request', { req, pattern: pattern.source });
      
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request detected',
        timestamp: new Date().toISOString()
      });
    }
  }
  
  next();
};

/**
 * CORS configuration
 */
const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'http://192.168.3.198:3000',
      'http://192.168.3.198:3002',
      'https://mymoolah.com',
      'https://www.mymoolah.com'
    ];
    
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400 // 24 hours
};

module.exports = {
  rateLimiters,
  securityHeaders,
  inputValidation,
  handleValidationErrors,
  requestLogger,
  ipWhitelist,
  requestSizeLimit,
  securityMonitor,
  corsConfig
};
