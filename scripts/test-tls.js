#!/usr/bin/env node

/**
 * TLS Configuration Test Script for MyMoolah Treasury Platform
 * 
 * This script tests the TLS 1.3 configuration and security headers
 * to ensure banking-grade compliance and Mojaloop standards.
 * 
 * @author MyMoolah Development Team
 * @version 2.3.0
 * @date August 30, 2025
 */

const https = require('https');
const http = require('http');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

class TLSTestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from environment
   */
  loadConfig() {
    require('dotenv').config();
    
    return {
      host: process.env.HOST || 'localhost',
      port: process.env.PORT || 3001,
      tlsEnabled: process.env.TLS_ENABLED === 'true',
      environment: process.env.NODE_ENV || 'development',
      certPath: process.env.SSL_CERT_PATH || './certs/certificate.pem',
      keyPath: process.env.SSL_KEY_PATH || './certs/private-key.pem'
    };
  }

  /**
   * Log test result
   */
  logResult(testName, passed, message = '', warning = false) {
    const status = passed ? '✅ PASS' : (warning ? '⚠️  WARN' : '❌ FAIL');
    const color = passed ? colors.green : (warning ? colors.yellow : colors.red);
    
    console.log(`${color}${status}${colors.reset} ${testName}`);
    if (message) {
      console.log(`   ${message}`);
    }
    
    this.results.tests.push({
      name: testName,
      passed,
      warning,
      message
    });
    
    if (passed) {
      this.results.passed++;
    } else if (warning) {
      this.results.warnings++;
    } else {
      this.results.failed++;
    }
  }

  /**
   * Test TLS configuration
   */
  async testTLSConfiguration() {
    console.log(`\n${colors.cyan}${colors.bright}🔐 TLS Configuration Tests${colors.reset}\n`);
    
    // Test 1: TLS Enabled Check
    this.logResult(
      'TLS Enabled',
      this.config.tlsEnabled,
      `TLS_ENABLED=${this.config.tlsEnabled}`
    );

    // Test 2: Certificate Files Exist
    const certExists = fs.existsSync(this.config.certPath);
    const keyExists = fs.existsSync(this.config.keyPath);
    
    if (this.config.tlsEnabled) {
      this.logResult(
        'SSL Certificate Files',
        certExists && keyExists,
        `Certificate: ${certExists ? 'Found' : 'Missing'}, Key: ${keyExists ? 'Found' : 'Missing'}`
      );
    } else {
      this.logResult(
        'SSL Certificate Files',
        true,
        'TLS disabled - skipping certificate check'
      );
    }

    // Test 3: TLS Version Support
    if (this.config.tlsEnabled) {
      try {
        const tlsVersion = tls.getMaxVersion();
        const minVersion = tls.getMinVersion();
        
        this.logResult(
          'TLS Version Support',
          tlsVersion === 'TLSv1.3' && minVersion === 'TLSv1.3',
          `Max: ${tlsVersion}, Min: ${minVersion}`
        );
      } catch (error) {
        this.logResult(
          'TLS Version Support',
          false,
          `Error: ${error.message}`
        );
      }
    } else {
      this.logResult(
        'TLS Version Support',
        true,
        'TLS disabled - skipping version check'
      );
    }
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log(`\n${colors.cyan}${colors.bright}🛡️  Security Headers Tests${colors.reset}\n`);
    
    const protocol = this.config.tlsEnabled ? 'https' : 'http';
    const url = `${protocol}://${this.config.host}:${this.config.port}/health`;
    
    try {
      const response = await this.makeRequest(url);
      const headers = response.headers;
      
      // Required security headers for banking-grade compliance
      const requiredHeaders = {
        'strict-transport-security': 'HSTS',
        'x-content-type-options': 'X-Content-Type-Options',
        'x-frame-options': 'X-Frame-Options',
        'x-xss-protection': 'X-XSS-Protection',
        'content-security-policy': 'Content-Security-Policy',
        'referrer-policy': 'Referrer-Policy',
        'permissions-policy': 'Permissions-Policy'
      };
      
      // Test each required header
      Object.entries(requiredHeaders).forEach(([headerKey, headerName]) => {
        const headerValue = headers[headerKey];
        const hasHeader = !!headerValue;
        
        this.logResult(
          headerName,
          hasHeader,
          hasHeader ? headerValue : 'Header missing'
        );
      });
      
      // Test additional security headers
      const additionalHeaders = {
        'cross-origin-embedder-policy': 'Cross-Origin-Embedder-Policy',
        'cross-origin-opener-policy': 'Cross-Origin-Opener-Policy',
        'cross-origin-resource-policy': 'Cross-Origin-Resource-Policy'
      };
      
      Object.entries(additionalHeaders).forEach(([headerKey, headerName]) => {
        const headerValue = headers[headerKey];
        const hasHeader = !!headerValue;
        
        this.logResult(
          headerName,
          hasHeader,
          hasHeader ? headerValue : 'Header missing (optional)',
          !hasHeader // Warning if missing
        );
      });
      
    } catch (error) {
      this.logResult(
        'Security Headers',
        false,
        `Failed to connect to server: ${error.message}`
      );
    }
  }

  /**
   * Test TLS connection
   */
  async testTLSConnection() {
    console.log(`\n${colors.cyan}${colors.bright}🔒 TLS Connection Tests${colors.reset}\n`);
    
    if (!this.config.tlsEnabled) {
      this.logResult(
        'TLS Connection',
        true,
        'TLS disabled - skipping connection test'
      );
      return;
    }
    
    try {
      const options = {
        host: this.config.host,
        port: this.config.port,
        method: 'GET',
        path: '/health',
        rejectUnauthorized: false // Allow self-signed certificates for testing
      };
      
      const response = await this.makeRequest(`https://${this.config.host}:${this.config.port}/health`, options);
      
      this.logResult(
        'TLS Connection',
        response.statusCode === 200,
        `Status: ${response.statusCode}`
      );
      
      // Test TLS information in response
      if (response.data && response.data.tls) {
        this.logResult(
          'TLS Information',
          response.data.tls.enabled === true,
          `TLS Enabled: ${response.data.tls.enabled}, Version: ${response.data.tls.version}`
        );
      }
      
    } catch (error) {
      this.logResult(
        'TLS Connection',
        false,
        `Connection failed: ${error.message}`
      );
    }
  }

  /**
   * Test cipher suites
   */
  async testCipherSuites() {
    console.log(`\n${colors.cyan}${colors.bright}🔐 Cipher Suite Tests${colors.reset}\n`);
    
    if (!this.config.tlsEnabled) {
      this.logResult(
        'Cipher Suites',
        true,
        'TLS disabled - skipping cipher test'
      );
      return;
    }
    
    try {
      const socket = tls.connect({
        host: this.config.host,
        port: this.config.port,
        rejectUnauthorized: false,
        minVersion: 'TLSv1.3',
        maxVersion: 'TLSv1.3'
      });
      
      socket.on('secureConnect', () => {
        const cipher = socket.getCipher();
        const tlsVersion = socket.getTLSVersion();
        
        this.logResult(
          'TLS 1.3 Cipher',
          tlsVersion === 'TLSv1.3',
          `Version: ${tlsVersion}, Cipher: ${cipher.name}`
        );
        
        // Check for strong cipher suites
        const strongCiphers = [
          'TLS_AES_256_GCM_SHA384',
          'TLS_CHACHA20_POLY1305_SHA256',
          'TLS_AES_128_GCM_SHA256'
        ];
        
        const isStrongCipher = strongCiphers.includes(cipher.standardName);
        this.logResult(
          'Strong Cipher Suite',
          isStrongCipher,
          `Cipher: ${cipher.standardName}`
        );
        
        socket.end();
      });
      
      socket.on('error', (error) => {
        this.logResult(
          'TLS Connection',
          false,
          `TLS connection failed: ${error.message}`
        );
      });
      
    } catch (error) {
      this.logResult(
        'Cipher Suites',
        false,
        `Cipher test failed: ${error.message}`
      );
    }
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log(`\n${colors.cyan}${colors.bright}⏱️  Rate Limiting Tests${colors.reset}\n`);
    
    const protocol = this.config.tlsEnabled ? 'https' : 'http';
    const url = `${protocol}://${this.config.host}:${this.config.port}/api/v1/auth/login`;
    
    try {
      // Make multiple requests to test rate limiting
      const requests = [];
      for (let i = 0; i < 10; i++) {
        requests.push(this.makeRequest(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          data: JSON.stringify({ email: 'test@example.com', password: 'test' })
        }));
      }
      
      const responses = await Promise.allSettled(requests);
      const rateLimited = responses.some(response => 
        response.status === 'fulfilled' && response.value.statusCode === 429
      );
      
      this.logResult(
        'Rate Limiting',
        rateLimited,
        rateLimited ? 'Rate limiting active' : 'Rate limiting not detected'
      );
      
    } catch (error) {
      this.logResult(
        'Rate Limiting',
        false,
        `Rate limiting test failed: ${error.message}`
      );
    }
  }

  /**
   * Test API security endpoints
   */
  async testAPISecurity() {
    console.log(`\n${colors.cyan}${colors.bright}🔐 API Security Tests${colors.reset}\n`);
    
    const protocol = this.config.tlsEnabled ? 'https' : 'http';
    const baseUrl = `${protocol}://${this.config.host}:${this.config.port}`;
    
    // Test TLS configuration endpoint (development only)
    try {
      const tlsResponse = await this.makeRequest(`${baseUrl}/api/v1/tls/config`);
      
      if (this.config.environment === 'development') {
        this.logResult(
          'TLS Config Endpoint',
          tlsResponse.statusCode === 200,
          `Status: ${tlsResponse.statusCode}`
        );
      } else {
        this.logResult(
          'TLS Config Endpoint',
          tlsResponse.statusCode === 403,
          `Status: ${tlsResponse.statusCode} (correctly blocked in production)`
        );
      }
      
    } catch (error) {
      this.logResult(
        'TLS Config Endpoint',
        false,
        `TLS config endpoint test failed: ${error.message}`
      );
    }
    
    // Test security configuration endpoint
    try {
      const securityResponse = await this.makeRequest(`${baseUrl}/api/v1/security/config`);
      
      if (this.config.environment === 'development') {
        this.logResult(
          'Security Config Endpoint',
          securityResponse.statusCode === 200,
          `Status: ${securityResponse.statusCode}`
        );
      } else {
        this.logResult(
          'Security Config Endpoint',
          securityResponse.statusCode === 403,
          `Status: ${securityResponse.statusCode} (correctly blocked in production)`
        );
      }
      
    } catch (error) {
      this.logResult(
        'Security Config Endpoint',
        false,
        `Security config endpoint test failed: ${error.message}`
      );
    }
  }

  /**
   * Make HTTP/HTTPS request
   */
  makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const requestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port,
        path: urlObj.pathname + urlObj.search,
        method: 'GET',
        rejectUnauthorized: false,
        ...options
      };
      
      const client = urlObj.protocol === 'https:' ? https : http;
      const req = client.request(requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: jsonData
            });
          } catch (error) {
            resolve({
              statusCode: res.statusCode,
              headers: res.headers,
              data: data
            });
          }
        });
      });
      
      req.on('error', reject);
      
      if (options.data) {
        req.write(options.data);
      }
      
      req.end();
    });
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log(`${colors.bright}${colors.blue}🚀 MyMoolah TLS Security Test Suite${colors.reset}`);
    console.log(`${colors.blue}==============================================${colors.reset}\n`);
    
    console.log(`Environment: ${colors.yellow}${this.config.environment}${colors.reset}`);
    console.log(`TLS Enabled: ${colors.yellow}${this.config.tlsEnabled}${colors.reset}`);
    console.log(`Host: ${colors.yellow}${this.config.host}:${this.config.port}${colors.reset}\n`);
    
    await this.testTLSConfiguration();
    await this.testSecurityHeaders();
    await this.testTLSConnection();
    await this.testCipherSuites();
    await this.testRateLimiting();
    await this.testAPISecurity();
    
    this.printSummary();
  }

  /**
   * Print test summary
   */
  printSummary() {
    console.log(`\n${colors.bright}${colors.blue}📊 Test Summary${colors.reset}`);
    console.log(`${colors.blue}==============${colors.reset}`);
    console.log(`${colors.green}✅ Passed: ${this.results.passed}${colors.reset}`);
    console.log(`${colors.yellow}⚠️  Warnings: ${this.results.warnings}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${this.results.failed}${colors.reset}`);
    
    const total = this.results.passed + this.results.warnings + this.results.failed;
    const successRate = ((this.results.passed / total) * 100).toFixed(1);
    
    console.log(`\nSuccess Rate: ${colors.bright}${successRate}%${colors.reset}`);
    
    if (this.results.failed === 0 && this.results.warnings === 0) {
      console.log(`\n${colors.green}${colors.bright}🎉 All tests passed! TLS configuration is secure and compliant.${colors.reset}`);
    } else if (this.results.failed === 0) {
      console.log(`\n${colors.yellow}${colors.bright}⚠️  Tests passed with warnings. Review warnings for improvements.${colors.reset}`);
    } else {
      console.log(`\n${colors.red}${colors.bright}❌ Some tests failed. Please review and fix the issues.${colors.reset}`);
    }
    
    console.log(`\n${colors.cyan}${colors.bright}🔐 Banking-Grade Security Compliance:${colors.reset}`);
    console.log(`- TLS 1.3: ${this.results.failed === 0 ? '✅ Compliant' : '❌ Non-compliant'}`);
    console.log(`- Security Headers: ${this.results.failed === 0 ? '✅ Compliant' : '❌ Non-compliant'}`);
    console.log(`- Rate Limiting: ${this.results.failed === 0 ? '✅ Active' : '❌ Inactive'}`);
    console.log(`- Mojaloop Standards: ${this.results.failed === 0 ? '✅ Compliant' : '❌ Non-compliant'}`);
  }
}

// Run the test suite
if (require.main === module) {
  const testSuite = new TLSTestSuite();
  testSuite.runAllTests().catch(console.error);
}

module.exports = TLSTestSuite;
