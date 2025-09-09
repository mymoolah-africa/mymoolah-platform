/**
 * TLS Configuration for MyMoolah Treasury Platform
 * 
 * This configuration implements TLS 1.3 with banking-grade security settings
 * compliant with Mojaloop FSPIOP standards and ISO 27001 requirements.
 * 
 * @author MyMoolah Development Team
 * @version 2.3.0
 * @date August 30, 2025
 */

const fs = require('fs');
const path = require('path');

class TLSConfig {
  constructor() {
    this.validateEnvironment();
    this.setupTLSDefaults();
  }

  /**
   * Validate TLS-related environment variables
   */
  validateEnvironment() {
    const requiredVars = [
      'NODE_ENV',
      'TLS_ENABLED'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ Missing required TLS environment variables:', missingVars);
      console.error('Please check your .env file or environment configuration');
      process.exit(1);
    }

    // Validate TLS enabled setting
    if (process.env.TLS_ENABLED && !['true', 'false'].includes(process.env.TLS_ENABLED)) {
      console.error('❌ TLS_ENABLED must be either "true" or "false"');
      process.exit(1);
    }
  }

  /**
   * Setup TLS 1.3 configuration with banking-grade security
   */
  setupTLSDefaults() {
    // TLS 1.3 Configuration for Mojaloop Compliance
    this.tlsConfig = {
      // Enforce TLS 1.3 only (Mojaloop requirement)
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      
      // Strong cipher suites for banking-grade security
      ciphers: [
        'TLS_AES_256_GCM_SHA384',        // AES-256-GCM with SHA-384
        'TLS_CHACHA20_POLY1305_SHA256',  // ChaCha20-Poly1305 with SHA-256
        'TLS_AES_128_GCM_SHA256'         // AES-128-GCM with SHA-256 (fallback)
      ].join(':'),
      
      // Security settings
      honorCipherOrder: true,            // Respect server cipher order
      requestCert: false,                // Don't request client certificates
      rejectUnauthorized: true,          // Reject unauthorized certificates
      
      // Perfect Forward Secrecy
      ecdhCurve: 'prime256v1',          // Use P-256 curve for ECDHE
      
      // Session management
      sessionTimeout: 300,               // 5 minutes session timeout
      sessionCache: true,                // Enable session caching
      
      // OCSP Stapling
      ocspStapling: true,               // Enable OCSP stapling for performance
      
      // Certificate transparency
      enableCertTransparency: true,     // Enable certificate transparency
      
      // Security headers for TLS
      securityHeaders: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
      }
    };

    // Production-specific TLS settings
    if (process.env.NODE_ENV === 'production') {
      this.tlsConfig.production = {
        // Stricter settings for production
        sessionTimeout: 180,             // 3 minutes in production
        maxConnections: 1000,            // Limit concurrent connections
        enableCompression: false,        // Disable compression (CRIME protection)
        
        // Certificate requirements
        requireValidCert: true,          // Require valid certificates
        checkRevocation: true,           // Check certificate revocation
        enablePinning: true,             // Enable certificate pinning
        
        // Rate limiting for TLS connections
        connectionRateLimit: {
          windowMs: 15 * 60 * 1000,     // 15 minutes
          max: 100                       // Max 100 connections per window
        }
      };
    }

    // Development-specific TLS settings
    if (process.env.NODE_ENV === 'development') {
      this.tlsConfig.development = {
        // Relaxed settings for development
        sessionTimeout: 600,             // 10 minutes in development
        maxConnections: 100,             // Lower limit for development
        enableCompression: true,         // Enable compression for development
        
        // Certificate requirements
        requireValidCert: false,         // Allow self-signed certificates
        checkRevocation: false,          // Skip revocation checks
        enablePinning: false,            // Disable pinning in development
        
        // Rate limiting for TLS connections
        connectionRateLimit: {
          windowMs: 15 * 60 * 1000,     // 15 minutes
          max: 1000                      // Higher limit for development
        }
      };
    }
  }

  /**
   * Get TLS configuration for HTTPS server
   */
  getTLSConfig() {
    const config = { ...this.tlsConfig };
    
    // Remove non-HTTPS options
    delete config.production;
    delete config.development;
    delete config.securityHeaders;
    
    return config;
  }

  /**
   * Get security headers configuration
   */
  getSecurityHeaders() {
    return this.tlsConfig.securityHeaders;
  }

  /**
   * Get production-specific settings
   */
  getProductionConfig() {
    return this.tlsConfig.production || {};
  }

  /**
   * Get development-specific settings
   */
  getDevelopmentConfig() {
    return this.tlsConfig.development || {};
  }

  /**
   * Validate TLS configuration
   */
  validateTLSConfig() {
    const errors = [];

    // Check TLS version
    if (this.tlsConfig.minVersion !== 'TLSv1.3') {
      errors.push('TLS minimum version must be TLSv1.3 for Mojaloop compliance');
    }

    if (this.tlsConfig.maxVersion !== 'TLSv1.3') {
      errors.push('TLS maximum version must be TLSv1.3 for Mojaloop compliance');
    }

    // Check cipher suites
    const requiredCiphers = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256'
    ];

    const configuredCiphers = this.tlsConfig.ciphers.split(':');
    const missingCiphers = requiredCiphers.filter(cipher => 
      !configuredCiphers.includes(cipher)
    );

    if (missingCiphers.length > 0) {
      errors.push(`Missing required cipher suites: ${missingCiphers.join(', ')}`);
    }

    // Check security headers
    const requiredHeaders = [
      'Strict-Transport-Security',
      'X-Content-Type-Options',
      'X-Frame-Options'
    ];

    const missingHeaders = requiredHeaders.filter(header => 
      !this.tlsConfig.securityHeaders[header]
    );

    if (missingHeaders.length > 0) {
      errors.push(`Missing required security headers: ${missingHeaders.join(', ')}`);
    }

    if (errors.length > 0) {
      console.error('❌ TLS Configuration Validation Errors:');
      errors.forEach(error => console.error(`  - ${error}`));
      return false;
    }

    console.log('✅ TLS Configuration Validation Passed');
    return true;
  }

  /**
   * Create HTTPS server with TLS configuration
   */
  createHTTPSServer(app, certificatePath, keyPath) {
    const https = require('https');
    const fs = require('fs');

    try {
      // Read certificate files
      const cert = fs.readFileSync(certificatePath);
      const key = fs.readFileSync(keyPath);

      // Create HTTPS server with TLS configuration
      const server = https.createServer({
        cert,
        key,
        ...this.getTLSConfig()
      }, app);

      // Add TLS monitoring
      server.on('secureConnection', (socket) => {
        const tlsVersion = socket.getTLSVersion();
        const cipher = socket.getCipher();
        
        console.log(`🔒 TLS Connection: ${tlsVersion} - ${cipher.name}`);
        
        // Log security metrics
        if (process.env.NODE_ENV === 'production') {
          console.log(`📊 TLS Metrics: Version=${tlsVersion}, Cipher=${cipher.name}, Protocol=${cipher.standardName}`);
        }
      });

      return server;
    } catch (error) {
      console.error('❌ Error creating HTTPS server:', error.message);
      throw error;
    }
  }

  /**
   * Apply TLS security headers to Express app
   */
  applyTLSHeaders(app) {
    const headers = this.getSecurityHeaders();
    
    Object.entries(headers).forEach(([header, value]) => {
      app.use((req, res, next) => {
        res.setHeader(header, value);
        next();
      });
    });

    // Enforce HTTPS for API calls in production
    if (process.env.NODE_ENV === 'production') {
      app.use('/api/v1', (req, res, next) => {
        if (req.headers['x-forwarded-proto'] !== 'https') {
          return res.status(403).json({
            success: false,
            error: {
              code: 'INSECURE_CONNECTION',
              message: 'HTTPS required for API access in production'
            }
          });
        }
        next();
      });
    }
  }

  /**
   * Get TLS configuration summary
   */
  getConfigSummary() {
    return {
      version: {
        min: this.tlsConfig.minVersion,
        max: this.tlsConfig.maxVersion
      },
      ciphers: this.tlsConfig.ciphers.split(':'),
      securityHeaders: Object.keys(this.tlsConfig.securityHeaders),
      environment: process.env.NODE_ENV,
      enabled: process.env.TLS_ENABLED === 'true'
    };
  }
}

// Create and export TLS configuration instance
const tlsConfig = new TLSConfig();

// Validate configuration on startup
if (process.env.TLS_ENABLED === 'true') {
  tlsConfig.validateTLSConfig();
}

module.exports = tlsConfig;
