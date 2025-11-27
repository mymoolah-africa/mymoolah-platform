// Early startup logging for Cloud Run debugging (use stderr for immediate output)
process.stderr.write('🚀 Starting MyMoolah Backend Server...\n');
process.stderr.write(`📋 Node version: ${process.version}\n`);
process.stderr.write(`📋 Working directory: ${process.cwd()}\n`);
process.stderr.write(`📋 Environment: ${process.env.NODE_ENV || 'development'}\n`);
process.stderr.write(`📋 PORT: ${process.env.PORT || 'not set'}\n`);
process.stderr.write(`📋 User: ${process.getuid ? process.getuid() : 'unknown'}\n`);
try {
  const fs = require('fs');
  const files = fs.readdirSync('/app').slice(0, 5).join(', ');
  process.stderr.write(`📋 Files in /app: ${files}\n`);
} catch (e) {
  process.stderr.write(`📋 Error reading /app: ${e.message}\n`);
}
console.log('🚀 Starting MyMoolah Backend Server...');
console.log('📋 Node version:', process.version);
console.log('📋 Working directory:', process.cwd());
console.log('📋 Environment:', process.env.NODE_ENV || 'development');
console.log('📋 PORT:', process.env.PORT || 'not set');

// Load environment variables and security configuration
console.log('📋 Loading environment variables...');
require('dotenv').config();
console.log('✅ Environment variables loaded');

console.log('📋 Loading security configuration...');
const securityConfig = require('./config/security');
console.log('✅ Security configuration loaded');

console.log('📋 Loading TLS configuration...');
const tlsConfig = require('./config/tls');
console.log('✅ TLS configuration loaded');

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
const app = express();

// Trust proxy for Cloud Run behind load balancer (banking-grade: trust only first proxy)
// Cloud Run has exactly 1 proxy hop (Google Cloud Load Balancer)
// Setting to 1 (not true) is secure and passes express-rate-limit validation
// This tells Express: "Trust the first proxy (Google Load Balancer), but treat the next IP as the actual client"
app.set('trust proxy', 1);

const {
  rateLimiters,
  securityHeaders,
  inputValidation,
  handleValidationErrors,
  requestLogger,
  securityMonitor,
  corsConfig
} = require('./middleware/securityMiddleware');
const { secureLogging, secureErrorLogging } = require('./middleware/secureLogging');

// Get configuration from security config
const config = securityConfig.getConfig();
// Cloud Run sets PORT automatically, fallback to config.port or 8080 (Cloud Run default)
const port = process.env.PORT || config.port || 8080;

// Import core routes
const authRoutes = require('./routes/auth.js');
const walletRoutes = require('./routes/wallets.js');
const transactionRoutes = require('./routes/transactionRoutes.js');
const userRoutes = require('./routes/users.js');
const kycRoutes = require('./routes/kyc.js');
const supportRoutes = require('./routes/support.js');
const feedbackRoutes = require('./routes/feedbackRoutes.js');
const googleReviewRoutes = require('./routes/googleReviewRoutes.js');
const notificationRoutes = require('./routes/notifications.js');
const voucherRoutes = require('./routes/vouchers.js');
const voucherTypeRoutes = require('./routes/voucherTypes.js');
// Peach Payments integration routes
const peachRoutes = require('./routes/peach.js');
// VAS routes removed - functionality handled by airtime routes
const merchantRoutes = require('./routes/merchants.js');
const serviceProviderRoutes = require('./routes/serviceproviders.js');
const easyPayRoutes = require('./routes/easypay.js'); // <-- ADD THIS
const dtMercuryRoutes = require('./routes/dtmercury.js');
const ledgerRoutes = require('./routes/ledger.js');
const settingsRoutes = require('./routes/settings.js');
const supplierComparisonRoutes = require('./routes/supplierComparison.js');
const qrPaymentRoutes = require('./routes/qrpayments.js');
const requestRoutes = require('./routes/requests.js');
const requestScheduler = require('./services/requestScheduler');
const CatalogSynchronizationService = require('./services/catalogSynchronizationService');
const sweepRoutes = require('./routes/sweep.js');

const sendMoneyRoutes = require('./routes/sendMoney.js');
const beneficiariesRoutes = require('./routes/beneficiaries.js');
const unifiedBeneficiariesRoutes = require('./routes/unifiedBeneficiaries.js');
const airtimeRoutes = require('./routes/airtime.js');
const overlayRoutes = require('./routes/overlayServices.js');
const productRoutes = require('./routes/products.js');
const catalogSyncRoutes = require('./routes/catalogSync.js');
const userFavoritesRoutes = require('./routes/userFavorites.js');

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

}

// Conditionally load MobileMart routes
let mobilemartRoutesLoaded = false;
let mobilemartRoutes;
if (validCredentials.mobilemart) {
  mobilemartRoutes = require('./routes/mobilemart.js');
  mobilemartRoutesLoaded = true;
  console.log('✅ MobileMart routes loaded');
} else {

}

// CORS must be applied BEFORE helmet to allow cross-origin requests
app.use(cors(config.corsConfig));

// Enhanced Security Middleware with TLS 1.3 Compliance
const isDevelopment = process.env.NODE_ENV === 'development';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.mymoolah.com", "https://*.flash.co.za", "https://*.mobilemart.co.za", "https://*.github.dev"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: []
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
  },
  referrerPolicy: {
    policy: 'strict-origin-when-cross-origin'
  },
  permissionsPolicy: {
    features: {
      geolocation: [],
      microphone: [],
      camera: [],
      payment: [],
      usb: [],
      magnetometer: [],
      gyroscope: []
    }
  },
  // Relax CORP policy in development to allow Codespaces CORS
  crossOriginEmbedderPolicy: isDevelopment ? false : {
    policy: 'require-corp'
  },
  crossOriginOpenerPolicy: {
    policy: 'same-origin'
  },
  // Relax CORP policy in development to allow Codespaces CORS
  crossOriginResourcePolicy: isDevelopment ? false : {
    policy: 'same-origin'
  }
}));

// Apply TLS Security Headers
tlsConfig.applyTLSHeaders(app);

// Apply additional security headers from config
Object.entries(config.securityHeaders).forEach(([header, value]) => {
  app.use((req, res, next) => {
    res.setHeader(header, value);
    next();
  });
});

// Add request logging middleware with TLS information
app.use((req, res, next) => {
  const tlsInfo = req.socket.getTLSVersion ? {
    tlsVersion: req.socket.getTLSVersion(),
    cipher: req.socket.getCipher ? req.socket.getCipher().name : 'N/A'
  } : { tlsVersion: 'HTTP', cipher: 'N/A' };
  
  console.log(`🌐 ${req.method} ${req.url} - ${new Date().toISOString()} - TLS: ${tlsInfo.tlsVersion} - Cipher: ${tlsInfo.cipher}`);
  next();
});

// Add a simple test route
app.get('/test', (req, res) => {
  console.log('🧪 Test route hit!');
  res.json({ 
    message: 'Test route working', 
    timestamp: new Date().toISOString(),
    tls: {
      enabled: process.env.TLS_ENABLED === 'true',
      version: req.socket.getTLSVersion ? req.socket.getTLSVersion() : 'HTTP',
      cipher: req.socket.getCipher ? req.socket.getCipher().name : 'N/A'
    }
  });
});

// Enhanced Rate Limiting Middleware
// With trust proxy: 1, Express correctly sets req.ip to the client IP (after the first proxy)
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
// With trust proxy: 1, Express correctly sets req.ip to the client IP
const limiter = rateLimit({
  windowMs: config.rateLimits.general.windowMs,
  max: config.rateLimits.general.max,
  message: config.rateLimits.general.message,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip, // Use req.ip directly - Express handles proxy correctly
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  // In development, and for CORS preflight, skip limiting to avoid false CORS failures during polling
  skip: (req) => req.method === 'OPTIONS' || (process.env.NODE_ENV && process.env.NODE_ENV !== 'production'),
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
// With trust proxy: 1, Express correctly sets req.ip to the client IP
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const authLimiter = rateLimit({
  windowMs: config.rateLimits.auth.windowMs,
  max: config.rateLimits.auth.max,
  message: config.rateLimits.auth.message,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip + '-auth',
  skip: (req) => req.method === 'OPTIONS' || (process.env.NODE_ENV && process.env.NODE_ENV !== 'production'),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: config.rateLimits.auth.message,
      retryAfter: Math.ceil(config.rateLimits.auth.windowMs / 1000)
    });
  }
});

// Financial transaction rate limiting
// With trust proxy: 1, Express correctly sets req.ip to the client IP
// Disable express-rate-limit's trust proxy validation (Express returns true even when set to 1)
const financialLimiter = rateLimit({
  windowMs: config.rateLimits.financial.windowMs,
  max: config.rateLimits.financial.max,
  message: config.rateLimits.financial.message,
  standardHeaders: true,
  legacyHeaders: false,
  validate: {
    trustProxy: false // Disable validation - we handle proxy correctly with trust proxy: 1
  },
  keyGenerator: (req) => req.ip + '-financial',
  skip: (req) => req.method === 'OPTIONS' || (process.env.NODE_ENV && process.env.NODE_ENV !== 'production'),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: config.rateLimits.financial.message,
      retryAfter: Math.ceil(config.rateLimits.financial.windowMs / 1000)
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

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security monitoring middleware
app.use(securityMonitor);

// Request logging middleware
app.use(requestLogger);

// Apply authentication rate limiting to auth routes
app.use('/api/v1/auth', authLimiter);

// Apply financial rate limiting to transaction routes
app.use('/api/v1/transactions', financialLimiter);
app.use('/api/v1/wallets', financialLimiter);
app.use('/api/v1/airtime', financialLimiter);

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/wallets', walletRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/kyc', kycRoutes);
app.use('/api/v1/support', supportRoutes);
app.use('/api/v1/feedback', feedbackRoutes);
app.use('/api/v1/google-reviews', googleReviewRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/vouchers', voucherRoutes);
app.use('/api/v1/voucher-types', voucherTypeRoutes);
app.use('/api/v1/merchants', merchantRoutes);
app.use('/api/v1/service-providers', serviceProviderRoutes);
app.use('/api/v1/easypay', easyPayRoutes);
app.use('/api/v1/dtmercury', dtMercuryRoutes);
app.use('/api/v1/ledger', ledgerRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/suppliers', supplierComparisonRoutes);
app.use('/api/v1/qr', qrPaymentRoutes);
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/sweep', sweepRoutes);
app.use('/api/v1/send-money', sendMoneyRoutes);
app.use('/api/v1/beneficiaries', beneficiariesRoutes);
app.use('/api/v1/unified-beneficiaries', unifiedBeneficiariesRoutes);
app.use('/api/v1/airtime', airtimeRoutes);
app.use('/api/v1/overlay', overlayRoutes);
app.use('/api/v1/products', productRoutes);
app.use('/api/v1/catalog-sync', catalogSyncRoutes);
app.use('/api/v1/user-favorites', userFavoritesRoutes);

// Conditionally load Flash routes
if (flashRoutesLoaded) {
  app.use('/api/v1/flash', flashRoutes);
}

// Conditionally load MobileMart routes
if (mobilemartRoutesLoaded) {
  app.use('/api/v1/mobilemart', mobilemartRoutes);
}

// Conditionally load Peach routes
const isPeachArchived = process.env.PEACH_INTEGRATION_ARCHIVED === 'true';
if (!isPeachArchived && validCredentials.peach) {
  app.use('/api/v1/peach', peachRoutes);
} else if (isPeachArchived) {
  console.log('📦 Peach Payments integration ARCHIVED - routes disabled');
  // Provide archived status endpoint
  app.get('/api/v1/peach/status', (req, res) => {
    res.json({
      status: 'archived',
      reason: 'Integration temporarily canceled due to PayShap provider competition',
      archivedDate: '2025-11-26',
      reactivationProcedure: 'See docs/archive/PEACH_ARCHIVAL_RECORD.md'
    });
  });
}

// Health check endpoint with TLS information
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    tls: {
      enabled: process.env.TLS_ENABLED === 'true',
      version: req.socket.getTLSVersion ? req.socket.getTLSVersion() : 'HTTP',
      cipher: req.socket.getCipher ? req.socket.getCipher().name : 'N/A'
    },
    services: {
      flash: flashRoutesLoaded,
      mobilemart: mobilemartRoutesLoaded,
      peach: process.env.PEACH_INTEGRATION_ARCHIVED === 'true' ? 'archived' : validCredentials.peach
    },
    uptime: process.uptime(),
    memory: process.memoryUsage()
  };
  
  res.status(200).json(health);
});

// TLS Configuration endpoint (for monitoring)
app.get('/api/v1/tls/config', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      success: true,
      data: tlsConfig.getConfigSummary()
    });
  } else {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'TLS configuration endpoint not available in production'
      }
    });
  }
});

// Security configuration endpoint (for monitoring)
app.get('/api/v1/security/config', (req, res) => {
  if (process.env.NODE_ENV !== 'production') {
    res.json({
      success: true,
      data: securityConfig.getSecuritySummary()
    });
  } else {
    res.status(403).json({
      success: false,
      error: {
        code: 'ACCESS_DENIED',
        message: 'Security configuration endpoint not available in production'
      }
    });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err);
  
  // Handle express-rate-limit ValidationError (trust proxy validation)
  if (err.name === 'ValidationError' && err.message && err.message.includes('trust proxy')) {
    return res.status(400).json({
      success: false,
      error: 'Configuration error',
      message: 'Rate limiter configuration issue detected',
      timestamp: new Date().toISOString()
    });
  }
  
  // Log error with TLS information
  const tlsInfo = req.socket.getTLSVersion ? {
    tlsVersion: req.socket.getTLSVersion(),
    cipher: req.socket.getCipher ? req.socket.getCipher().name : 'N/A'
  } : { tlsVersion: 'HTTP', cipher: 'N/A' };
  
  secureErrorLogging(err, {
    url: req.url,
    method: req.method,
    ip: req.ip,
    tls: tlsInfo
  });

  res.status(500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server with TLS configuration
const startServer = () => {
  try {
    if (process.env.TLS_ENABLED === 'true') {
      // Start HTTPS server with TLS 1.3
      const certificatePath = process.env.SSL_CERT_PATH || './certs/certificate.pem';
      const keyPath = process.env.SSL_KEY_PATH || './certs/private-key.pem';
      
      const httpsServer = tlsConfig.createHTTPSServer(app, certificatePath, keyPath);
      
      // Cloud Run requires listening on 0.0.0.0 (all interfaces)
      const host = process.env.HOST || '0.0.0.0';
      httpsServer.listen(port, host, () => {
        console.log(`🚀 MyMoolah Treasury Platform HTTPS Server running on ${host}:${port}`);
        console.log(`🔒 TLS 1.3 Enabled: ${tlsConfig.getConfigSummary().version.min}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(`📊 Security Headers: ${tlsConfig.getConfigSummary().securityHeaders.length} configured`);
        
        // Log TLS configuration summary
        const tlsSummary = tlsConfig.getConfigSummary();
        console.log(`🔐 TLS Configuration:`);
        console.log(`   - Version: ${tlsSummary.version.min} - ${tlsSummary.version.max}`);
        console.log(`   - Ciphers: ${tlsSummary.ciphers.length} configured`);
        console.log(`   - Security Headers: ${tlsSummary.securityHeaders.length} active`);
      });
      
      return httpsServer;
    } else {
      // Start HTTP server (development only)
      // Cloud Run requires listening on 0.0.0.0 (all interfaces)
      const host = process.env.HOST || '0.0.0.0';
      const httpServer = app.listen(port, host, () => {
        console.log(`🚀 MyMoolah Treasury Platform HTTP Server running on ${host}:${port}`);
        console.log(`⚠️  TLS Disabled - Not recommended for production`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
        console.log(`📊 Security Headers: ${Object.keys(config.securityHeaders).length} configured`);
      });
      
      return httpServer;
    }
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
    process.exit(1);
  }
};

// Start the server
const server = startServer();

// Ensure process doesn't exit if server fails to start
if (!server) {
  console.error('❌ Failed to start server - server object is null');
  process.exit(1);
}

// Keep process alive
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Don't exit - log and continue
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit - log and continue
});

// Start background services after server initialization
const CodebaseSweepService = require('./services/codebaseSweepService');
const databasePerformanceMonitor = require('./services/databasePerformanceMonitor');

// Initialize and start background services
const initializeBackgroundServices = async () => {
  try {
    console.log('🔄 Starting background services...');
    
    // Start Codebase Sweep Service
    console.log('🔄 Checking Codebase Sweep Service...');
    if (process.env.OPENAI_API_KEY && process.env.ENABLE_CODEBASE_SWEEP !== 'false') {
      console.log('🔄 Initializing Codebase Sweep Service...');
      const codebaseSweepService = new CodebaseSweepService();
      console.log('🔄 Starting Codebase Sweep Service scheduler...');
      await codebaseSweepService.startScheduler();
      console.log('✅ Codebase Sweep Service started');
    } else {
      if (!process.env.OPENAI_API_KEY) {
        console.log('⚠️  Codebase Sweep Service skipped - OPENAI_API_KEY not configured');
      } else {
        console.log('⚠️  Codebase Sweep Service disabled - ENABLE_CODEBASE_SWEEP=false (disabled for development)');
      }
    }
    
    console.log('🔄 Codebase Sweep Service section completed, moving to Database Monitor...');
    
    // Start Database Performance Monitor
    console.log('🔄 Attempting to start Database Performance Monitor...');
    await databasePerformanceMonitor.startMonitoring();
    console.log('✅ Database Performance Monitor started');
    
    // Start Voucher Expiration Handler (runs every hour to auto-refund expired vouchers)
    try {
      const { startExpirationHandler } = require('./controllers/voucherController');
      startExpirationHandler();
      console.log('✅ Voucher expiration handler started (runs every hour)');
    } catch (error) {
      console.error('❌ Failed to start voucher expiration handler:', error.message);
    }
    
    // Start Monthly Tier Review (runs 1st of each month at 2 AM)
    try {
      const cron = require('node-cron');
      const userTierService = require('./services/userTierService');
      
      // Schedule monthly tier review: 1st of every month at 2:00 AM SAST
      cron.schedule('0 2 1 * *', async () => {
        console.log('🔄 Running scheduled monthly tier review...');
        try {
          const results = await userTierService.processMonthlyTierReview();
          if (results.success) {
            console.log(`✅ Monthly tier review complete: ${results.promoted} promoted, ${results.demoted} demoted, ${results.unchanged} unchanged`);
          } else {
            console.error('❌ Monthly tier review failed:', results.error);
          }
        } catch (error) {
          console.error('❌ Monthly tier review error:', error.message);
        }
      }, {
        timezone: 'Africa/Johannesburg'
      });
      
      console.log('✅ Monthly tier review scheduler started (1st of month at 2:00 AM SAST)');
    } catch (error) {
      console.error('❌ Failed to start monthly tier review:', error.message);
    }
    
    // Start Catalog Synchronization (daily only at 02:00; shadow 10-minute updates until prod)
    try {
      const catalogSyncService = new CatalogSynchronizationService();
      if (process.env.ENABLE_CATALOG_SYNC !== 'false') {
        catalogSyncService.startDailyOnly();
      } else {
        console.log('⚠️  Catalog synchronization disabled via ENABLE_CATALOG_SYNC=false');
      }
    } catch (catalogErr) {
      console.error('❌ Failed to start Catalog Synchronization Service:', catalogErr.message);
    }
    
    console.log('🎉 All background services started successfully');
  } catch (error) {
    console.error('❌ Error starting background services:', error.message);
    console.error('❌ Full error details:', error);
    console.error('❌ Error stack:', error.stack);
  }
};

// Start background services (non-blocking - don't fail server startup if services fail)
initializeBackgroundServices().catch((error) => {
  console.error('⚠️  Background services initialization failed (server will continue):', error.message);
  // Don't exit - server should still run even if background services fail
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  
  // Stop background services
  try {
    if (databasePerformanceMonitor && databasePerformanceMonitor.stopMonitoring) {
      databasePerformanceMonitor.stopMonitoring();
      console.log('✅ Database Performance Monitor stopped');
    }
  } catch (error) {
    console.error('⚠️  Error stopping background services:', error.message);
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app;