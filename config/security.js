const crypto = require('crypto');

// Environment validation and security configuration
class SecurityConfig {
  constructor() {
    this.validateEnvironment();
    this.setupSecureDefaults();
  }

  // Validate required environment variables
  validateEnvironment() {
    const requiredVars = [
      'NODE_ENV',
      'PORT',
      'JWT_SECRET',
      'TLS_ENABLED'
    ];

    // Optional supplier integration variables (only required when live integrations are enabled)
    const supplierIntegrationVars = [
      'FLASH_CONSUMER_KEY',
      'FLASH_CONSUMER_SECRET',
      'MOBILEMART_CLIENT_ID',
      'MOBILEMART_CLIENT_SECRET'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      console.error('Please check your .env file or environment configuration');
      process.exit(1);
    }

    // Check supplier integration status
    const hasLiveIntegrations = process.env.SUPPLIER_LIVE_INTEGRATIONS === 'true';
    if (hasLiveIntegrations) {
      const missingSupplierVars = supplierIntegrationVars.filter(varName => !process.env[varName]);
      if (missingSupplierVars.length > 0) {
        console.warn('⚠️  Live supplier integrations enabled but missing credentials:', missingSupplierVars);
        console.warn('Some supplier services may not function correctly');
      }
    } else {
      console.log('ℹ️  Security Config: Operating with database product catalogs (non-live supplier integrations)');
    }

    // Validate JWT secret strength
    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
      console.error('❌ JWT_SECRET must be at least 32 characters long');
      process.exit(1);
    }

    // Validate NODE_ENV
    const validEnvs = ['development', 'production', 'test'];
    if (!validEnvs.includes(process.env.NODE_ENV)) {
      console.error('❌ NODE_ENV must be one of:', validEnvs);
      process.exit(1);
    }

    // Validate TLS enabled setting
    if (process.env.TLS_ENABLED && !['true', 'false'].includes(process.env.TLS_ENABLED)) {
      console.error('❌ TLS_ENABLED must be either "true" or "false"');
      process.exit(1);
    }
  }

  // Setup secure defaults and configurations
  setupSecureDefaults() {
    // Enhanced Security Headers for Banking-Grade Compliance
    this.securityHeaders = {
      // Content Security Policy - Enhanced for financial applications
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://fonts.gstatic.com",
        "connect-src 'self' https://api.mymoolah.com https://*.flash.co.za https://*.mobilemart.co.za",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "upgrade-insecure-requests"
      ].join('; '),
      
      // HTTP Strict Transport Security - Enhanced for banking
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // X-Content-Type-Options
      'X-Content-Type-Options': 'nosniff',
      
      // X-Frame-Options
      'X-Frame-Options': 'DENY',
      
      // X-XSS-Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // Permissions Policy
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()',
      
      // Cross-Origin Embedder Policy
      'Cross-Origin-Embedder-Policy': 'require-corp',
      
      // Cross-Origin Opener Policy
      'Cross-Origin-Opener-Policy': 'same-origin',
      
      // Cross-Origin Resource Policy
      'Cross-Origin-Resource-Policy': 'same-origin',
      
      // Origin-Agent-Cluster
      'Origin-Agent-Cluster': '?1',
      
      // Clear-Site-Data header removed from default headers
      // (should only be sent on logout endpoints)
    };

    // Enhanced Rate Limiting Configuration for Banking Applications
    this.rateLimits = {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 100 : 1000,
        message: 'Too many requests from this IP',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 5 : 50,
        message: 'Too many authentication attempts',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: true,
        skipFailedRequests: false
      },
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 200 : 2000,
        message: 'API rate limit exceeded',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      },
      financial: {
        windowMs: 1 * 60 * 1000, // 1 minute
        max: process.env.NODE_ENV === 'production' ? 10 : 100,
        message: 'Too many financial transactions',
        standardHeaders: true,
        legacyHeaders: false,
        skipSuccessfulRequests: false,
        skipFailedRequests: false
      }
    };

    // Enhanced CORS configuration for banking applications
    const allowedOrigins = this.getCorsOrigins();
    const isDev = process.env.NODE_ENV !== 'production';
    const devLanFrontendRegex = /^http:\/\/192\.168\.[0-9]{1,3}\.[0-9]{1,3}:3000$/;
    // Allow Codespaces GitHub.dev domains in all environments (development and production)
    const codespacesRegex = /^https:\/\/.*\.github\.dev$/;

    this.corsConfig = {
      origin: (origin, callback) => {
        // Allow non-browser requests (no origin)
        if (!origin) {
          return callback(null, true);
        }

        // Check explicit allowed origins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Allow LAN IPs in development
        if (isDev && devLanFrontendRegex.test(origin)) {
          return callback(null, true);
        }

        // Allow Codespaces GitHub.dev domains (supports both development and production testing environments)
        if (codespacesRegex.test(origin)) {
          return callback(null, true);
        }

        // In development, log rejected origins for debugging
        if (isDev) {
          console.log(`⚠️  CORS: Origin "${origin}" not allowed. Allowed origins:`, allowedOrigins);
        }

        return callback(new Error(`CORS: Origin "${origin}" not allowed by CORS policy`), false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: [
        'Content-Type', 
        'Authorization', 
        'X-Requested-With',
        'X-API-Key',
        'X-Client-Version',
        'X-Device-ID'
      ],
      exposedHeaders: [
        'X-Rate-Limit-Remaining',
        'X-Rate-Limit-Reset',
        'X-Request-ID'
      ],
      maxAge: 86400, // 24 hours
      preflightContinue: false,
      optionsSuccessStatus: 204
    };

    // Enhanced Database security configuration
    this.databaseConfig = {
      mode: process.env.NODE_ENV === 'production' ? 'readonly' : 'readwrite',
      timeout: 30000,
      maxConnections: process.env.NODE_ENV === 'production' ? 20 : 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: true,
        ca: process.env.DB_SSL_CA,
        cert: process.env.DB_SSL_CERT,
        key: process.env.DB_SSL_KEY
      } : false
    };

    // Enhanced JWT configuration
    this.jwtConfig = {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.NODE_ENV === 'production' ? '1h' : '24h',
      refreshExpiresIn: '7d',
      issuer: 'mymoolah-treasury-platform',
      audience: 'mymoolah-users',
      algorithm: 'HS512', // Enhanced from HS256 for better security
      clockTolerance: 30, // 30 seconds tolerance for clock skew
      maxAge: process.env.NODE_ENV === 'production' ? 3600 : 86400 // 1 hour in production, 24 hours in development
    };

    // Enhanced encryption configuration
    this.encryptionConfig = {
      algorithm: 'aes-256-gcm',
      keyLength: 32,
      ivLength: 16,
      saltLength: 64,
      iterations: process.env.NODE_ENV === 'production' ? 100000 : 10000,
      digest: 'sha512'
    };

    // Enhanced session configuration
    this.sessionConfig = {
      secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
      },
      name: 'mymoolah.sid'
    };

    // Enhanced logging configuration
    this.loggingConfig = {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug',
      format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
      timestamp: true,
      sensitiveFields: ['password', 'token', 'secret', 'key', 'authorization'],
      maskPatterns: [
        { pattern: /password["\s]*[:=]["\s]*["']?[^"'\s]+["']?/gi, replacement: 'password: "***"' },
        { pattern: /token["\s]*[:=]["\s]*["']?[^"'\s]+["']?/gi, replacement: 'token: "***"' },
        { pattern: /secret["\s]*[:=]["\s]*["']?[^"'\s]+["']?/gi, replacement: 'secret: "***"' }
      ]
    };

    // Enhanced monitoring configuration
    this.monitoringConfig = {
      enabled: process.env.NODE_ENV === 'production',
      metrics: {
        responseTime: true,
        errorRate: true,
        throughput: true,
        memoryUsage: true,
        cpuUsage: true
      },
      alerts: {
        errorThreshold: 0.05, // 5% error rate
        responseTimeThreshold: 2000, // 2 seconds
        memoryThreshold: 0.9 // 90% memory usage
      }
    };
  }

  // Get CORS origins based on environment
  getCorsOrigins() {
    const origins = process.env.CORS_ORIGINS ? 
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) : 
      [];

    // Add default origins based on environment
    if (process.env.NODE_ENV === 'development') {
      origins.push(
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001'
      );
    }

    if (process.env.NODE_ENV === 'production') {
      origins.push(
        'https://mymoolah.com',
        'https://www.mymoolah.com',
        'https://app.mymoolah.com'
      );
    }

    return origins;
  }

  // Validate external service credentials
  validateExternalCredentials() {
    const credentials = {
      flash: false,
      mobilemart: false,
      dtmercury: false,
      peach: false
    };

    // Check Flash credentials
    if (process.env.FLASH_API_KEY && process.env.FLASH_API_ENDPOINT) {
      credentials.flash = true;
    }

    // Check MobileMart credentials
    if (process.env.MOBILEMART_CLIENT_ID && process.env.MOBILEMART_CLIENT_SECRET) {
      credentials.mobilemart = true;
    }

    // Check dtMercury credentials
    if (process.env.DTMERCURY_API_KEY && process.env.DTMERCURY_API_ENDPOINT) {
      credentials.dtmercury = true;
    }

    // Check Peach Payments credentials
    if (process.env.PEACH_CLIENT_ID && process.env.PEACH_CLIENT_SECRET && process.env.PEACH_MERCHANT_ID && process.env.PEACH_ENTITY_ID_PSH) {
      credentials.peach = true;
    }

    return credentials;
  }

  // Get configuration object
  getConfig() {
    return {
      port: process.env.PORT || 3001,
      nodeEnv: process.env.NODE_ENV,
      tlsEnabled: process.env.TLS_ENABLED === 'true',
      securityHeaders: this.securityHeaders,
      rateLimits: this.rateLimits,
      corsConfig: this.corsConfig,
      databaseConfig: this.databaseConfig,
      jwtConfig: this.jwtConfig,
      encryptionConfig: this.encryptionConfig,
      sessionConfig: this.sessionConfig,
      loggingConfig: this.loggingConfig,
      monitoringConfig: this.monitoringConfig
    };
  }

  // Validate security configuration
  validateSecurityConfig() {
    const errors = [];

    // Check JWT configuration
    if (!this.jwtConfig.secret || this.jwtConfig.secret.length < 32) {
      errors.push('JWT secret must be at least 32 characters long');
    }

    // Check security headers
    const requiredHeaders = [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Content-Security-Policy'
    ];

    const missingHeaders = requiredHeaders.filter(header => 
      !this.securityHeaders[header]
    );

    if (missingHeaders.length > 0) {
      errors.push(`Missing required security headers: ${missingHeaders.join(', ')}`);
    }

    // Check rate limiting configuration
    if (!this.rateLimits.general || !this.rateLimits.auth) {
      errors.push('Rate limiting configuration is incomplete');
    }

    // Check CORS configuration
    if (!this.corsConfig.origin || !this.corsConfig.methods) {
      errors.push('CORS configuration is incomplete');
    }

    if (errors.length > 0) {
      console.error('❌ Security Configuration Validation Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }

    console.log('✅ Security Configuration Validation Passed');
    return true;
  }

  // Get security configuration summary
  getSecuritySummary() {
    return {
      environment: process.env.NODE_ENV,
      tlsEnabled: process.env.TLS_ENABLED === 'true',
      securityHeaders: Object.keys(this.securityHeaders).length,
      rateLimits: Object.keys(this.rateLimits).length,
      corsOrigins: this.getCorsOrigins().length,
      externalCredentials: this.validateExternalCredentials(),
      jwtAlgorithm: this.jwtConfig.algorithm,
      encryptionAlgorithm: this.encryptionConfig.algorithm
    };
  }
}

// Create and export security configuration instance
const securityConfig = new SecurityConfig();

// Validate configuration on startup
securityConfig.validateSecurityConfig();

module.exports = securityConfig; 