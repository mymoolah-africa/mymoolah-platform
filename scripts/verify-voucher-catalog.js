#!/usr/bin/env node
/**
 * Verify Voucher Catalog - MyMoolah Platform
 * 
 * Verifies that the product catalog has:
 * 1. MobileMart UAT vouchers (from API sync)
 * 2. Flash dummy vouchers (non-live integration)
 * 3. Products have proper structure (supplierId, brandId, status)
 * 4. Variants have correct denominations and pricing
 * 5. Comparison service can find best deals
 * 
 * Usage:
 *   cd /workspaces/mymoolah-platform (or local)
 *   node scripts/verify-voucher-catalog.js
 * 
 * @date 2026-01-03
 */

// Set DATABASE_URL from db-connection-helper before loading models
const { getUATDatabaseURL, closeAll } = require('./db-connection-helper');

// Set DATABASE_URL for Sequelize models
process.env.DATABASE_URL = getUATDatabaseURL();

const db = require('../models');
const { Product, ProductVariant, ProductBrand, Supplier } = db;
const { Op } = require('sequelize');
const SupplierComparisonService = require('../services/supplierComparisonService');

async function verifyCatalog() {
  console.log('🔍 Verifying Voucher Catalog...\n');
  console.log('='.repeat(60));

  try {
    // 1. Check Suppliers
    console.log('\n📋 1. Checking Suppliers...');
    const suppliers = await Supplier.findAll({
      where: {
        code: { [Op.in]: ['MOBILEMART', 'FLASH'] },
        isActive: true
      }
    });

    console.log(`   Found ${suppliers.length} active suppliers:`);
    suppliers.forEach(s => {
      console.log(`   - ${s.code} (ID: ${s.id}): ${s.name}`);
    });

    if (suppliers.length < 2) {
      console.warn('   ⚠️  Expected both MobileMart and Flash suppliers');
    }

    // 2. Check Products (voucher type)
    console.log('\n📦 2. Checking Products (type: voucher)...');
    const products = await Product.findAll({
      where: {
        type: 'voucher',
        status: 'active'
      },
      include: [
        { model: Supplier, as: 'supplier', required: true },
        { model: ProductBrand, as: 'brand', required: false }
      ],
      order: [['supplierId', 'ASC'], ['name', 'ASC']]
    });

    console.log(`   Found ${products.length} active voucher products:`);
    
    const bySupplier = {};
    products.forEach(p => {
      const supplierCode = p.supplier?.code || 'UNKNOWN';
      if (!bySupplier[supplierCode]) {
        bySupplier[supplierCode] = [];
      }
      bySupplier[supplierCode].push(p);
    });

    for (const [code, prods] of Object.entries(bySupplier)) {
      console.log(`   ${code}: ${prods.length} products`);
      prods.slice(0, 5).forEach(p => {
        console.log(`     - ${p.name} (ID: ${p.id}, Brand: ${p.brand?.name || 'N/A'})`);
      });
      if (prods.length > 5) {
        console.log(`     ... and ${prods.length - 5} more`);
      }
    }

    // Check for required fields
    const productsWithIssues = products.filter(p => {
      return !p.supplierId || !p.brandId || !p.name;
    });

    if (productsWithIssues.length > 0) {
      console.warn(`   ⚠️  ${productsWithIssues.length} products have missing required fields:`);
      productsWithIssues.forEach(p => {
        const issues = [];
        if (!p.supplierId) issues.push('supplierId');
        if (!p.brandId) issues.push('brandId');
        if (!p.name) issues.push('name');
        console.warn(`     - Product ID ${p.id}: missing ${issues.join(', ')}`);
      });
    }

    // 3. Check Product Variants
    console.log('\n🔢 3. Checking Product Variants...');
    const variants = await ProductVariant.findAll({
      where: {
        status: 'active'
      },
      include: [
        {
          model: Product,
          as: 'product',
          where: { type: 'voucher', status: 'active' },
          required: true,
          include: [
            { model: Supplier, as: 'supplier', required: true }
          ]
        }
      ],
      order: [['productId', 'ASC'], ['id', 'ASC']]
    });

    console.log(`   Found ${variants.length} active voucher variants:`);

    const variantsBySupplier = {};
    variants.forEach(v => {
      const supplierCode = v.product?.supplier?.code || 'UNKNOWN';
      if (!variantsBySupplier[supplierCode]) {
        variantsBySupplier[supplierCode] = [];
      }
      variantsBySupplier[supplierCode].push(v);
    });

    for (const [code, vars] of Object.entries(variantsBySupplier)) {
      console.log(`   ${code}: ${vars.length} variants`);
      
      // Check variants with denominations
      const withDenoms = vars.filter(v => {
        const denoms = v.predefinedAmounts || v.denominationOptions || v.denominations || [];
        return Array.isArray(denoms) && denoms.length > 0;
      });
      console.log(`     - ${withDenoms.length} variants have denominations defined`);
      
      // Check variants with pricing
      const withPricing = vars.filter(v => {
        return v.userPrice || v.supplierPrice || (v.minAmount && v.maxAmount);
      });
      console.log(`     - ${withPricing.length} variants have pricing defined`);
      
      // Show sample variant
      if (vars.length > 0) {
        const sample = vars[0];
        const denoms = sample.predefinedAmounts || sample.denominationOptions || sample.denominations || [];
        console.log(`     Sample: ${sample.product?.name || 'N/A'} (Variant ID: ${sample.id})`);
        console.log(`       Denominations: ${denoms.length > 0 ? denoms.slice(0, 5).join(', ') + (denoms.length > 5 ? '...' : '') : 'None'}`);
        console.log(`       Price range: ${sample.minAmount || 'N/A'} - ${sample.maxAmount || 'N/A'} cents`);
        console.log(`       Commission: ${sample.commission || 'N/A'}%`);
      }
    }

    // 4. Test Comparison Service
    console.log('\n🔄 4. Testing Comparison Service...');
    const comparisonService = new SupplierComparisonService();
    
    try {
      const comparison = await comparisonService.compareProducts('voucher');
      
      if (comparison && comparison.bestDeals) {
        console.log(`   ✅ Comparison service returned ${comparison.bestDeals.length} best deals`);
        
        // Check if deals have productId
        const withProductId = comparison.bestDeals.filter(d => d.productId);
        const withVariantId = comparison.bestDeals.filter(d => d.variantId || d.id);
        
        console.log(`   - ${withProductId.length} deals have productId (for purchase)`);
        console.log(`   - ${withVariantId.length} deals have variantId (for reference)`);
        
        if (withProductId.length < comparison.bestDeals.length) {
          console.warn(`   ⚠️  ${comparison.bestDeals.length - withProductId.length} deals missing productId`);
        }
        
        // Show sample deals
        console.log('\n   Sample best deals:');
        comparison.bestDeals.slice(0, 5).forEach((deal, idx) => {
          const productName = deal.productName || deal.name || deal.product?.name || 'N/A';
          const supplierCode = deal.supplierCode || deal.supplier?.code || deal.supplierCode || 'N/A';
          const commission = deal.commission !== null && deal.commission !== undefined ? `${deal.commission}%` : 'N/A';
          const price = deal.userPrice || deal.price || (deal.minAmount && deal.maxAmount ? `${deal.minAmount}-${deal.maxAmount}` : 'N/A');
          const denominations = deal.denominations || deal.predefinedAmounts || [];
          
          console.log(`   ${idx + 1}. ${productName}`);
          console.log(`      Supplier: ${supplierCode}`);
          console.log(`      Product ID: ${deal.productId || 'MISSING'}`);
          console.log(`      Variant ID: ${deal.variantId || deal.id || 'N/A'}`);
          console.log(`      Commission: ${commission}`);
          console.log(`      Price Range: ${price} cents`);
          if (denominations.length > 0) {
            console.log(`      Denominations: ${denominations.slice(0, 5).join(', ')}${denominations.length > 5 ? '...' : ''}`);
          }
        });
      } else {
        console.warn('   ⚠️  Comparison service returned no best deals');
      }
    } catch (error) {
      console.error('   ❌ Error testing comparison service:', error.message);
    }

    // 5. Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 VERIFICATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`✅ Suppliers: ${suppliers.length}/2 (MobileMart + Flash)`);
    console.log(`✅ Products: ${products.length} active voucher products`);
    console.log(`✅ Variants: ${variants.length} active voucher variants`);
    console.log(`✅ Products with issues: ${productsWithIssues.length}`);
    
    // Check if we have both suppliers' products
    const hasMobileMart = products.some(p => p.supplier?.code === 'MOBILEMART');
    const hasFlash = products.some(p => p.supplier?.code === 'FLASH');
    
    console.log(`\n📋 Supplier Coverage:`);
    console.log(`   ${hasMobileMart ? '✅' : '❌'} MobileMart: ${hasMobileMart ? 'Has products' : 'No products found'}`);
    console.log(`   ${hasFlash ? '✅' : '❌'} Flash: ${hasFlash ? 'Has products' : 'No products found'}`);
    
    if (!hasMobileMart) {
      console.warn('\n⚠️  MobileMart products not found. Run catalog sync:');
      console.warn('   POST /api/v1/admin/catalog/sync/mobilemart');
    }
    
    if (!hasFlash) {
      console.warn('\n⚠️  Flash products not found. Flash integration is non-live,');
      console.warn('   but dummy products should exist for testing.');
    }

    console.log('\n✅ Catalog verification complete!\n');

  } catch (error) {
    console.error('❌ Error verifying catalog:', error);
    throw error;
  } finally {
    await closeAll();
    await db.sequelize.close();
  }
}

// Run if called directly
if (require.main === module) {
  verifyCatalog()
    .then(() => {
      console.log('✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { verifyCatalog };

