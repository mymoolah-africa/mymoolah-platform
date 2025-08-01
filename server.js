// Load environment variables and security configuration
require('dotenv').config();
const securityConfig = require('./config/security');

// Process error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
});
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  process.exit();
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const { secureLogging, secureErrorLogging } = require('./middleware/secureLogging');
const app = express();

// Get configuration from security config
const config = securityConfig.getConfig();
const port = config.port || 3001; // Changed fallback port to 3001

// Import core routes
const authRoutes = require('./routes/auth.js');
const walletRoutes = require('./routes/wallets.js');
const transactionRoutes = require('./routes/transactionRoutes.js');
const userRoutes = require('./routes/users.js');
const kycRoutes = require('./routes/kyc.js');
const supportRoutes = require('./routes/support.js');
const notificationRoutes = require('./routes/notifications.js');
const voucherRoutes = require('./routes/vouchers.js');
const voucherTypeRoutes = require('./routes/voucherTypes.js');
const vasRoutes = require('./routes/vas.js');
const merchantRoutes = require('./routes/merchants.js');
const serviceProviderRoutes = require('./routes/serviceproviders.js');
const easyPayRoutes = require('./routes/easypay.js'); // <-- ADD THIS
const easyPayVoucherRoutes = require('./routes/easypayVouchers');
const sendMoneyRoutes = require('./routes/sendMoney.js');

// Validate external service credentials
const validCredentials = securityConfig.validateExternalCredentials();

// Conditionally load Flash routes
let flashRoutesLoaded = false;
let flashRoutes;
if (validCredentials.flash) {
  flashRoutes = require('./routes/flash.js');
  flashRoutesLoaded = true;
  console.log('✅ Flash routes loaded');
} else {
  console.warn('⚠️  Flash credentials not set. Flash API endpoints will be unavailable.');
}

// Conditionally load MobileMart routes
let mobilemartRoutesLoaded = false;
let mobilemartRoutes;
if (validCredentials.mobilemart) {
  mobilemartRoutes = require('./routes/mobilemart.js');
  mobilemartRoutesLoaded = true;
  console.log('✅ MobileMart routes loaded');
} else {
  console.warn('⚠️  MobileMart credentials not set. MobileMart API endpoints will be unavailable.');
}

// Import problematic routes (commented out as requested)
// const easyPayRoutes = require('./routes/easypay.js');
// const mercuryRoutes = require('./routes/mercury.js');
// const easyPayVoucherRoutes = require('./routes/easypayVouchers.js');

// Security Middleware
app.use(helmet({
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
      frameSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  xssFilter: true,
  frameguard: {
    action: 'deny'
  }
}));

// Apply additional security headers
Object.entries(config.securityHeaders).forEach(([header, value]) => {
  app.use((req, res, next) => {
    res.setHeader(header, value);
    next();
  });
});

// Rate Limiting Middleware
const limiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: config.rateLimits.general.message,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: config.rateLimits.general.message,
      retryAfter: Math.ceil(config.rateLimits.general.windowMs / 1000)
    });
  }
});

// Apply rate limiting to all routes
app.use(limiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: config.rateLimits.auth.message,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: config.rateLimits.auth.message,
      retryAfter: Math.ceil(config.rateLimits.auth.windowMs / 1000)
    });
  }
});

// Input Validation Middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
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

// Validation Schemas
const validateEmail = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  validateRequest
];

const validatePhone = [
  body('phone')
    .matches(/^\+?[1-9]\d{1,14}$/)
    .withMessage('Please provide a valid phone number'),
  validateRequest
];

const validateAmount = [
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be a positive number greater than 0'),
  validateRequest
];

const validateUserId = [
  body('userId')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer'),
  validateRequest
];

const validateString = (fieldName, minLength = 1, maxLength = 255) => [
  body(fieldName)
    .isLength({ min: minLength, max: maxLength })
    .trim()
    .escape()
    .withMessage(`${fieldName} must be between ${minLength} and ${maxLength} characters`),
  validateRequest
];

// Basic Middleware
app.use(cors(config.corsConfig));
app.use(express.json());
app.use(secureLogging);

// Core API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/send-money', sendMoneyRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/voucher-types', voucherTypeRoutes);
app.use('/api/v1/vas', vasRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/service-providers', serviceProviderRoutes);
app.use('/api/v1/easypay-vouchers', easyPayVoucherRoutes);
app.use('/billpayment/v1', easyPayRoutes);
if (flashRoutesLoaded) {
  app.use('/api/v1/flash', flashRoutes);
}
if (mobilemartRoutesLoaded) {
  app.use('/api/v1/mobilemart', mobilemartRoutes);
}

// Commented out problematic routes as requested
// app.use('/billpayment/v1', easyPayRoutes);
// app.use('/api/v1/mercury', mercuryRoutes);
// app.use('/api/v1/easypay-vouchers', easyPayVoucherRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'MyMoolah Wallet API',
    version: '1.0.0'
  });
});

// Test endpoint
app.get('/test', (req, res) => {
  res.json({
    message: 'MyMoolah Wallet API is running!',
    endpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      sendMoney: '/api/v1/send-money',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'MyMoolah Wallet API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      sendMoney: '/api/v1/send-money',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Debug endpoint
app.post('/debug', (req, res) => {
  console.log("Debug endpoint hit", req.body);
  res.json({ 
    message: "Debug route works!",
    receivedData: req.body
  });
});

// Error handling middleware
app.use(secureErrorLogging);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    availableEndpoints: {
      auth: '/api/v1/auth',
      wallets: '/api/v1/wallets',
      transactions: '/api/v1/transactions',
      users: '/api/v1/users',
      kyc: '/api/v1/kyc',
      support: '/api/v1/support',
      notifications: '/api/v1/notifications',
      vouchers: '/api/v1/vouchers',
      voucherTypes: '/api/v1/voucher-types',
      vas: '/api/v1/vas',
      merchants: '/api/v1/merchants',
      serviceProviders: '/api/v1/service-providers',
      ...(flashRoutesLoaded ? { flash: '/api/v1/flash' } : {}),
      ...(mobilemartRoutesLoaded ? { mobilemart: '/api/v1/mobilemart' } : {}),
      health: '/health',
      test: '/test'
    }
  });
});

// Start server
if (require.main === module) {
  console.log("Starting server...");
  app.listen(port, () => {
    console.log(`🚀 MyMoolah Wallet API server running on port ${port}`);
    console.log(`📡 API Base URL: http://localhost:${port}/api/v1`);
    console.log(`🔗 Health Check: http://localhost:${port}/health`);
    console.log(`🧪 Test Endpoint: http://localhost:${port}/test`);
    console.log(`📋 Available endpoints:`);
    console.log(`   - Auth: /api/v1/auth`);
    console.log(`   - Wallets: /api/v1/wallets`);
    console.log(`   - Transactions: /api/v1/transactions`);
    console.log(`   - Users: /api/v1/users`);
    console.log(`   - KYC: /api/v1/kyc`);
    console.log(`   - Support: /api/v1/support`);
    console.log(`   - Notifications: /api/v1/notifications`);
    console.log(`   - Vouchers: /api/v1/vouchers`);
    console.log(`   - Voucher Types: /api/v1/voucher-types`);
    console.log(`   - VAS: /api/v1/vas`);
    console.log(`   - Merchants: /api/v1/merchants`);
    console.log(`   - Service Providers: /api/v1/service-providers`);
    if (flashRoutesLoaded) {
      console.log(`   - Flash: /api/v1/flash`);
    }
    if (mobilemartRoutesLoaded) {
      console.log(`   - MobileMart: /api/v1/mobilemart`);
    }
  });
}

module.exports = app; // Export the app for testing