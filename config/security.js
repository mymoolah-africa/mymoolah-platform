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
      'DATABASE_PATH'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars);
      console.error('Please check your .env file or environment configuration');
      process.exit(1);
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
  }

  // Setup secure defaults and configurations
  setupSecureDefaults() {
    // Security headers configuration
    this.securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-ancestors 'none';",
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };

    // Rate limiting configuration
    this.rateLimits = {
      general: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 100 : 1000,
        message: 'Too many requests from this IP'
      },
      auth: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 5 : 50,
        message: 'Too many authentication attempts'
      },
      api: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: process.env.NODE_ENV === 'production' ? 200 : 2000,
        message: 'API rate limit exceeded'
      }
    };

    // CORS configuration
    this.corsConfig = {
      origin: this.getCorsOrigins(),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      maxAge: 86400 // 24 hours
    };

    // Database security
    this.databaseConfig = {
      path: process.env.DATABASE_PATH || './data/mymoolah.db',
      mode: process.env.NODE_ENV === 'production' ? 'readonly' : 'readwrite',
      timeout: 30000,
      verbose: process.env.NODE_ENV === 'development'
    };

    // JWT configuration
    this.jwtConfig = {
      secret: process.env.JWT_SECRET,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      issuer: 'mymoolah-api',
      audience: 'mymoolah-users'
    };

    // Logging configuration
    this.loggingConfig = {
      level: process.env.LOG_LEVEL || 'info',
      format: process.env.NODE_ENV === 'production' ? 'json' : 'simple',
      sensitiveFields: ['password', 'token', 'secret', 'key']
    };
  }

  // Get CORS origins based on environment
  getCorsOrigins() {
    if (process.env.NODE_ENV === 'production') {
      return process.env.ALLOWED_ORIGINS ? 
        process.env.ALLOWED_ORIGINS.split(',') : 
        ['https://mymoolah.com', 'https://www.mymoolah.com'];
    }
    return [
      'http://localhost:3000', 
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:3002',
      'http://192.168.3.160:3000',
      'http://192.168.3.160:3001',
      'http://192.168.3.160:3002',
      'http://192.168.3.176:3000',
      'http://192.168.3.176:3001',
      'http://192.168.3.176:3002',
      'http://192.168.3.179:3000',
      'http://192.168.3.179:3001',
      'http://192.168.3.179:3002'
    ];
  }

  // Generate secure random string
  generateSecureToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  // Hash sensitive data
  hashSensitiveData(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  // Validate API key format
  validateApiKey(apiKey) {
    return apiKey && apiKey.length >= 32 && /^[a-zA-Z0-9]+$/.test(apiKey);
  }

  // Sanitize sensitive data for logging
  sanitizeForLogging(data) {
    const sensitiveFields = this.loggingConfig.sensitiveFields;
    const sanitized = { ...data };
    
    sensitiveFields.forEach(field => {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    });
    
    return sanitized;
  }

  // Get configuration for current environment
  getConfig() {
    return {
      environment: process.env.NODE_ENV,
      port: process.env.PORT || 5050,
      securityHeaders: this.securityHeaders,
      rateLimits: this.rateLimits,
      corsConfig: this.corsConfig,
      databaseConfig: this.databaseConfig,
      jwtConfig: this.jwtConfig,
      loggingConfig: this.loggingConfig
    };
  }

  // Validate external service credentials
  validateExternalCredentials() {
    const credentials = {
      flash: {
        consumerKey: process.env.FLASH_CONSUMER_KEY,
        consumerSecret: process.env.FLASH_CONSUMER_SECRET
      },
      mobilemart: {
        clientId: process.env.MOBILEMART_CLIENT_ID,
        clientSecret: process.env.MOBILEMART_CLIENT_SECRET
      }
    };

    const validCredentials = {};
    
    Object.entries(credentials).forEach(([service, creds]) => {
      if (creds.consumerKey && creds.consumerSecret || creds.clientId && creds.clientSecret) {
        validCredentials[service] = true;
        console.log(`✅ ${service} credentials validated`);
      } else {
        console.warn(`⚠️  ${service} credentials not configured`);
      }
    });

    return validCredentials;
  }
}

// Create and export security configuration instance
const securityConfig = new SecurityConfig();

module.exports = securityConfig; 