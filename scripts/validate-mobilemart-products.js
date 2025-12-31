#!/usr/bin/env node
/**
 * Validate MobileMart Products - Commission Rates and Pricing Data
 * 
 * This script validates that all MobileMart products in the database have:
 * 1. Valid commission rates (not 0 or null)
 * 2. Correct pricing data (minAmount, maxAmount, predefinedAmounts)
 * 3. Valid supplierProductId matching UAT API
 * 4. Proper product structure for supplier comparison
 * 
 * Usage: node scripts/validate-mobilemart-products.js [--fix]
 */

require('dotenv').config();
const db = require('../models');
const { ProductVariant, Product, Supplier, sequelize } = db;
const MobileMartAuthService = require('../services/mobilemartAuthService');
const { getCommissionRatePct } = require('../services/supplierPricingService');

class MobileMartProductValidator {
  constructor() {
    this.fix = process.argv.includes('--fix');
    this.authService = new MobileMartAuthService();
    this.issues = {
      missingCommission: [],
      invalidCommission: [],
      missingPricing: [],
      invalidAmounts: [],
      missingSupplierProductId: [],
      apiMismatch: []
    };
    this.fixed = {
      commission: 0,
      pricing: 0,
      amounts: 0
    };
  }

  async run() {
    console.log('🔍 MobileMart Product Validation\n');
    console.log('='.repeat(80));
    if (this.fix) {
      console.log('🔧 FIX MODE - Will attempt to fix issues automatically\n');
    }
    console.log('='.repeat(80));
    
    try {
      // Test database connection
      await db.sequelize.authenticate();
      console.log('✅ Database connection established\n');
      
      // Get MobileMart supplier
      const supplier = await Supplier.findOne({ where: { code: 'MOBILEMART' } });
      if (!supplier) {
        throw new Error('MobileMart supplier not found in database');
      }
      console.log(`✅ MobileMart Supplier ID: ${supplier.id}\n`);
      
      // Get all MobileMart products
      const products = await ProductVariant.findAll({
        where: {
          supplierId: supplier.id,
          status: 'active'
        },
        include: [
          {
            model: Product,
            as: 'product',
            required: true
          }
        ],
        order: [['product', 'type', 'ASC'], ['supplierProductId', 'ASC']]
      });
      
      console.log(`📦 Found ${products.length} MobileMart products to validate\n`);
      
      // Validate each product
      for (const product of products) {
        await this.validateProduct(product, supplier);
      }
      
      // Print validation results
      this.printResults();
      
      // Attempt fixes if requested
      if (this.fix && this.hasIssues()) {
        console.log('\n🔧 Attempting to fix issues...\n');
        await this.fixIssues(supplier);
        this.printFixResults();
      }
      
    } catch (error) {
      console.error('\n❌ Error:', error.message);
      console.error(error.stack);
      process.exit(1);
    } finally {
      await db.sequelize.close();
    }
  }

  async validateProduct(productVariant, supplier) {
    const pv = productVariant.toJSON ? productVariant.toJSON() : productVariant;
    const issues = [];
    
    // 1. Check commission rate
    if (pv.commission === null || pv.commission === undefined || pv.commission === 0) {
      issues.push('missingCommission');
      this.issues.missingCommission.push({
        id: pv.id,
        supplierProductId: pv.supplierProductId,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType,
        currentCommission: pv.commission
      });
    } else if (typeof pv.commission !== 'number' || pv.commission < 0 || pv.commission > 100) {
      issues.push('invalidCommission');
      this.issues.invalidCommission.push({
        id: pv.id,
        supplierProductId: pv.supplierProductId,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType,
        currentCommission: pv.commission
      });
    }
    
    // 2. Check pricing structure
    if (!pv.pricing || typeof pv.pricing !== 'object') {
      issues.push('missingPricing');
      this.issues.missingPricing.push({
        id: pv.id,
        supplierProductId: pv.supplierProductId,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType
      });
    } else {
      // Check if pricing has commission rate
      if (!pv.pricing.defaultCommissionRate && (!pv.pricing.commissionTiers || pv.pricing.commissionTiers.length === 0)) {
        issues.push('missingPricing');
        this.issues.missingPricing.push({
          id: pv.id,
          supplierProductId: pv.supplierProductId,
          productName: pv.product?.name || 'Unknown',
          vasType: pv.vasType,
          pricing: pv.pricing
        });
      }
    }
    
    // 3. Check amount constraints
    if (pv.minAmount === null || pv.minAmount === undefined || pv.minAmount < 0) {
      issues.push('invalidAmounts');
      this.issues.invalidAmounts.push({
        id: pv.id,
        supplierProductId: pv.supplierProductId,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType,
        minAmount: pv.minAmount,
        maxAmount: pv.maxAmount
      });
    }
    if (pv.maxAmount === null || pv.maxAmount === undefined || pv.maxAmount < pv.minAmount) {
      issues.push('invalidAmounts');
      this.issues.invalidAmounts.push({
        id: pv.id,
        supplierProductId: pv.supplierProductId,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType,
        minAmount: pv.minAmount,
        maxAmount: pv.maxAmount
      });
    }
    
    // 4. Check supplierProductId
    if (!pv.supplierProductId || pv.supplierProductId.trim() === '') {
      issues.push('missingSupplierProductId');
      this.issues.missingSupplierProductId.push({
        id: pv.id,
        productName: pv.product?.name || 'Unknown',
        vasType: pv.vasType
      });
    }
    
    // 5. Validate against UAT API (if available)
    if (pv.supplierProductId) {
      try {
        const apiProduct = await this.validateAgainstAPI(pv.supplierProductId, pv.vasType);
        if (!apiProduct) {
          issues.push('apiMismatch');
          this.issues.apiMismatch.push({
            id: pv.id,
            supplierProductId: pv.supplierProductId,
            productName: pv.product?.name || 'Unknown',
            vasType: pv.vasType,
            reason: 'Product not found in UAT API'
          });
        }
      } catch (error) {
        // API validation is optional, don't fail on API errors
        console.warn(`   ⚠️  Could not validate ${pv.supplierProductId} against API: ${error.message}`);
      }
    }
    
    if (issues.length > 0) {
      console.log(`   ❌ ${pv.supplierProductId || pv.id}: ${pv.product?.name || 'Unknown'} - Issues: ${issues.join(', ')}`);
    }
  }

  async validateAgainstAPI(supplierProductId, vasType) {
    try {
      // Normalize VAS type for API
      const normalizedVasType = this.normalizeVasType(vasType);
      const response = await this.authService.makeAuthenticatedRequest(
        'GET',
        `/${normalizedVasType}/products`
      );
      
      const products = response.products || response || [];
      return products.find(p => p.merchantProductId === supplierProductId);
    } catch (error) {
      // Return null if API check fails (optional validation)
      return null;
    }
  }

  normalizeVasType(vasType) {
    const mapping = {
      'airtime': 'airtime',
      'data': 'data',
      'utility': 'utility',
      'electricity': 'utility',
      'voucher': 'voucher',
      'bill_payment': 'bill-payment',
      'bill-payment': 'bill-payment'
    };
    return mapping[vasType] || vasType;
  }

  async fixIssues(supplier) {
    // Fix missing commission rates
    for (const issue of this.issues.missingCommission) {
      try {
        // Try to get commission from supplier_commission_tiers
        const commissionRate = await getCommissionRatePct('MOBILEMART', issue.vasType, issue.id, 'month');
        
        const product = await ProductVariant.findByPk(issue.id);
        const currentPricing = product.pricing || {};
        
        if (commissionRate > 0) {
          await ProductVariant.update(
            { 
              commission: commissionRate,
              pricing: {
                ...currentPricing,
                defaultCommissionRate: commissionRate
              }
            },
            { where: { id: issue.id } }
          );
          this.fixed.commission++;
          console.log(`   ✅ Fixed commission for ${issue.supplierProductId}: ${commissionRate}%`);
        } else {
          // Use default 2.5% if no tier found
          await ProductVariant.update(
            { 
              commission: 2.5,
              pricing: {
                ...currentPricing,
                defaultCommissionRate: 2.5
              }
            },
            { where: { id: issue.id } }
          );
          this.fixed.commission++;
          console.log(`   ✅ Fixed commission for ${issue.supplierProductId}: 2.5% (default)`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to fix commission for ${issue.supplierProductId}:`, error.message);
      }
    }
    
    // Fix invalid commission rates
    for (const issue of this.issues.invalidCommission) {
      try {
        const product = await ProductVariant.findByPk(issue.id);
        const currentPricing = product.pricing || {};
        
        // Reset to default 2.5%
        await ProductVariant.update(
          { 
            commission: 2.5,
            pricing: {
              ...currentPricing,
              defaultCommissionRate: 2.5
            }
          },
          { where: { id: issue.id } }
        );
        this.fixed.commission++;
        console.log(`   ✅ Fixed invalid commission for ${issue.supplierProductId}: 2.5% (default)`);
      } catch (error) {
        console.error(`   ❌ Failed to fix invalid commission for ${issue.supplierProductId}:`, error.message);
      }
    }
    
    // Fix missing pricing structure
    for (const issue of this.issues.missingPricing) {
      try {
        const product = await ProductVariant.findByPk(issue.id);
        const currentCommission = product.commission || 2.5;
        
        await ProductVariant.update(
          {
            pricing: {
              defaultCommissionRate: currentCommission,
              commissionTiers: [],
              fees: {}
            }
          },
          { where: { id: issue.id } }
        );
        this.fixed.pricing++;
        console.log(`   ✅ Fixed pricing structure for ${issue.supplierProductId}`);
      } catch (error) {
        console.error(`   ❌ Failed to fix pricing for ${issue.supplierProductId}:`, error.message);
      }
    }
    
    // Fix invalid amounts
    for (const issue of this.issues.invalidAmounts) {
      try {
        const product = await ProductVariant.findByPk(issue.id);
        const updates = {};
        
        if (issue.minAmount === null || issue.minAmount === undefined || issue.minAmount < 0) {
          updates.minAmount = 500; // Default R5
        }
        if (issue.maxAmount === null || issue.maxAmount === undefined || issue.maxAmount < issue.minAmount) {
          updates.maxAmount = Math.max(100000, updates.minAmount || issue.minAmount || 500); // Default R1000
        }
        
        if (Object.keys(updates).length > 0) {
          await ProductVariant.update(updates, { where: { id: issue.id } });
          this.fixed.amounts++;
          console.log(`   ✅ Fixed amounts for ${issue.supplierProductId}: min=${updates.minAmount || issue.minAmount}, max=${updates.maxAmount || issue.maxAmount}`);
        }
      } catch (error) {
        console.error(`   ❌ Failed to fix amounts for ${issue.supplierProductId}:`, error.message);
      }
    }
  }

  hasIssues() {
    return Object.values(this.issues).some(issueList => issueList.length > 0);
  }

  printResults() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(80));
    
    const totalIssues = Object.values(this.issues).reduce((sum, list) => sum + list.length, 0);
    
    if (totalIssues === 0) {
      console.log('✅ All products are valid! No issues found.\n');
      return;
    }
    
    console.log(`\n❌ Found ${totalIssues} issues:\n`);
    
    if (this.issues.missingCommission.length > 0) {
      console.log(`   🔴 Missing Commission: ${this.issues.missingCommission.length}`);
      this.issues.missingCommission.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.supplierProductId}: ${issue.productName} (${issue.vasType})`);
      });
      if (this.issues.missingCommission.length > 5) {
        console.log(`      ... and ${this.issues.missingCommission.length - 5} more`);
      }
    }
    
    if (this.issues.invalidCommission.length > 0) {
      console.log(`\n   🔴 Invalid Commission: ${this.issues.invalidCommission.length}`);
      this.issues.invalidCommission.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.supplierProductId}: ${issue.productName} (commission: ${issue.currentCommission})`);
      });
      if (this.issues.invalidCommission.length > 5) {
        console.log(`      ... and ${this.issues.invalidCommission.length - 5} more`);
      }
    }
    
    if (this.issues.missingPricing.length > 0) {
      console.log(`\n   🔴 Missing Pricing: ${this.issues.missingPricing.length}`);
      this.issues.missingPricing.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.supplierProductId}: ${issue.productName}`);
      });
      if (this.issues.missingPricing.length > 5) {
        console.log(`      ... and ${this.issues.missingPricing.length - 5} more`);
      }
    }
    
    if (this.issues.invalidAmounts.length > 0) {
      console.log(`\n   🔴 Invalid Amounts: ${this.issues.invalidAmounts.length}`);
      this.issues.invalidAmounts.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.supplierProductId}: ${issue.productName} (min: ${issue.minAmount}, max: ${issue.maxAmount})`);
      });
      if (this.issues.invalidAmounts.length > 5) {
        console.log(`      ... and ${this.issues.invalidAmounts.length - 5} more`);
      }
    }
    
    if (this.issues.missingSupplierProductId.length > 0) {
      console.log(`\n   🔴 Missing Supplier Product ID: ${this.issues.missingSupplierProductId.length}`);
      this.issues.missingSupplierProductId.slice(0, 5).forEach(issue => {
        console.log(`      - ID ${issue.id}: ${issue.productName}`);
      });
      if (this.issues.missingSupplierProductId.length > 5) {
        console.log(`      ... and ${this.issues.missingSupplierProductId.length - 5} more`);
      }
    }
    
    if (this.issues.apiMismatch.length > 0) {
      console.log(`\n   ⚠️  API Mismatch: ${this.issues.apiMismatch.length}`);
      this.issues.apiMismatch.slice(0, 5).forEach(issue => {
        console.log(`      - ${issue.supplierProductId}: ${issue.productName} (${issue.reason})`);
      });
      if (this.issues.apiMismatch.length > 5) {
        console.log(`      ... and ${this.issues.apiMismatch.length - 5} more`);
      }
    }
    
    console.log('\n' + '='.repeat(80));
    if (!this.fix) {
      console.log('💡 Tip: Run with --fix flag to automatically fix issues');
    }
    console.log('='.repeat(80) + '\n');
  }

  printFixResults() {
    console.log('\n' + '='.repeat(80));
    console.log('🔧 FIX RESULTS');
    console.log('='.repeat(80));
    console.log(`   ✅ Fixed commissions: ${this.fixed.commission}`);
    console.log(`   ✅ Fixed pricing: ${this.fixed.pricing}`);
    console.log(`   ✅ Fixed amounts: ${this.fixed.amounts}`);
    console.log('='.repeat(80) + '\n');
  }
}

// Run if called directly
if (require.main === module) {
  const validator = new MobileMartProductValidator();
  validator.run().catch(console.error);
}

module.exports = MobileMartProductValidator;

