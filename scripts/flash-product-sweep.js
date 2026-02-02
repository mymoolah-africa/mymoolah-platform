#!/usr/bin/env node

/**
 * Flash Product Sweep Script
 * 
 * Authenticates with Flash API and fetches all available products
 * Generates comprehensive product catalog with pricing and commission details
 * 
 * Usage:
 *   node scripts/flash-product-sweep.js
 * 
 * @author MyMoolah Development Team
 * @version 1.0.0
 */

require('dotenv').config();
const FlashAuthService = require('../services/flashAuthService');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  header: (msg) => console.log(`\n${colors.bright}${colors.cyan}${msg}${colors.reset}`),
  data: (msg) => console.log(`   ${msg}`),
};

class FlashProductSweeper {
  constructor() {
    this.flashService = new FlashAuthService();
    this.accountNumber = process.env.FLASH_ACCOUNT_NUMBER || '6884-5973-6661-1279';
    this.products = {
      all: [],
      byCategory: {},
      summary: {
        total: 0,
        categories: {},
      },
    };
  }

  /**
   * Run the product sweep
   */
  async sweep() {
    try {
      log.header('🔍 FLASH PRODUCT SWEEP - STARTING');
      log.info(`Account Number: ${this.accountNumber}`);
      log.info(`API URL: ${this.flashService.apiUrl}`);
      console.log();

      // Step 1: Authenticate
      await this.authenticate();

      // Step 2: Fetch products
      await this.fetchProducts();

      // Step 3: Categorize products
      this.categorizeProducts();

      // Step 4: Generate report
      this.generateReport();

      // Step 5: Save to file
      await this.saveToFile();

      log.header('🎉 FLASH PRODUCT SWEEP - COMPLETE');

    } catch (error) {
      log.error(`Product sweep failed: ${error.message}`);
      console.error(error);
      process.exit(1);
    }
  }

  /**
   * Authenticate with Flash API
   */
  async authenticate() {
    log.header('🔐 AUTHENTICATING WITH FLASH API');
    
    try {
      const health = await this.flashService.healthCheck();
      
      if (health.authenticated) {
        log.success('Authentication successful');
        log.data(`Token expiry: ${new Date(this.flashService.tokenExpiry).toLocaleString()}`);
      } else {
        throw new Error('Authentication failed - no valid token');
      }
    } catch (error) {
      log.error(`Authentication failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fetch all products from Flash API
   */
  async fetchProducts() {
    log.header('📦 FETCHING FLASH PRODUCTS');
    
    try {
      const response = await this.flashService.makeAuthenticatedRequest(
        'GET',
        `/accounts/${this.accountNumber}/products`
      );

      this.products.all = response.products || response || [];
      this.products.summary.total = this.products.all.length;

      log.success(`Fetched ${this.products.summary.total} products from Flash API`);
      
      if (this.products.summary.total === 0) {
        log.warning('No products found! This might indicate an API issue or empty catalog.');
      }

    } catch (error) {
      log.error(`Failed to fetch products: ${error.message}`);
      throw error;
    }
  }

  /**
   * Categorize products by type
   */
  categorizeProducts() {
    log.header('📊 CATEGORIZING PRODUCTS');

    const categories = {
      '1voucher': [],
      'gift_vouchers': [],
      'cash_out': [],
      'cellular': [],
      'prepaid_utilities': [],
      'eezi_vouchers': [],
      'bill_payment': [],
      'flash_tokens': [],
      'other': [],
    };

    this.products.all.forEach((product) => {
      const productCode = product.productCode || product.code || '';
      const productName = (product.productName || product.name || '').toLowerCase();
      const category = (product.category || product.type || '').toLowerCase();

      // Categorize based on product characteristics
      if (productName.includes('1voucher') || category.includes('1voucher')) {
        categories['1voucher'].push(product);
      } else if (productName.includes('gift') || productName.includes('voucher')) {
        categories['gift_vouchers'].push(product);
      } else if (productName.includes('cash out') || productName.includes('eezi cash')) {
        categories['cash_out'].push(product);
      } else if (productName.includes('airtime') || productName.includes('data') || category.includes('cellular')) {
        categories['cellular'].push(product);
      } else if (productName.includes('electricity') || productName.includes('prepaid') || category.includes('utility')) {
        categories['prepaid_utilities'].push(product);
      } else if (productName.includes('eezi') || productName.includes('voucher')) {
        categories['eezi_vouchers'].push(product);
      } else if (productName.includes('bill') || productName.includes('payment')) {
        categories['bill_payment'].push(product);
      } else if (productName.includes('flash token')) {
        categories['flash_tokens'].push(product);
      } else {
        categories['other'].push(product);
      }
    });

    this.products.byCategory = categories;

    // Update summary
    Object.keys(categories).forEach((cat) => {
      const count = categories[cat].length;
      if (count > 0) {
        this.products.summary.categories[cat] = count;
      }
    });

    log.success('Products categorized successfully');
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    log.header('📋 FLASH PRODUCT CATALOG REPORT');
    console.log();

    // Summary
    log.info(`Total Products: ${this.products.summary.total}`);
    console.log();

    // By Category
    log.header('📦 PRODUCTS BY CATEGORY');
    Object.entries(this.products.summary.categories).forEach(([category, count]) => {
      const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      log.data(`├── ${categoryName}: ${count} products`);
    });
    console.log();

    // Detailed breakdown
    Object.entries(this.products.byCategory).forEach(([category, products]) => {
      if (products.length === 0) return;

      const categoryName = category.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
      log.header(`📦 ${categoryName} (${products.length} products)`);

      products.slice(0, 10).forEach((product, index) => {
        const name = product.productName || product.name || 'Unknown';
        const code = product.productCode || product.code || 'N/A';
        const price = product.price || product.amount || 'Variable';
        const commission = product.commission || product.commissionRate || 'N/A';

        log.data(`${index + 1}. ${name}`);
        log.data(`   Code: ${code} | Price: ${price} | Commission: ${commission}`);
      });

      if (products.length > 10) {
        log.data(`   ... and ${products.length - 10} more`);
      }
      console.log();
    });

    // Sample products (first 5 for detailed inspection)
    if (this.products.all.length > 0) {
      log.header('🔍 SAMPLE PRODUCTS (Detailed)');
      this.products.all.slice(0, 5).forEach((product, index) => {
        log.data(`\nProduct ${index + 1}:`);
        log.data(JSON.stringify(product, null, 2));
      });
      console.log();
    }
  }

  /**
   * Save results to file
   */
  async saveToFile() {
    const fs = require('fs').promises;
    const path = require('path');

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `flash-products-${timestamp}.json`;
    const filepath = path.join(__dirname, '..', 'integrations', 'flash', filename);

    try {
      await fs.writeFile(
        filepath,
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            accountNumber: this.accountNumber,
            summary: this.products.summary,
            byCategory: this.products.byCategory,
            allProducts: this.products.all,
          },
          null,
          2
        )
      );

      log.success(`Results saved to: ${filename}`);
      log.data(`Full path: ${filepath}`);
    } catch (error) {
      log.warning(`Could not save to file: ${error.message}`);
    }
  }
}

// Run the sweep
(async () => {
  const sweeper = new FlashProductSweeper();
  await sweeper.sweep();
})();
