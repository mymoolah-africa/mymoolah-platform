'use strict';

const { Product, ProductBrand, Supplier, ProductVariant, sequelize } = require('../models');
const { Op } = require('sequelize');
const supplierPricingService = require('./supplierPricingService');
const notificationService = require('./notificationService');
const MobileMartAuthService = require('./mobilemartAuthService');
const FlashAuthService = require('./flashAuthService');

class CatalogSynchronizationService {
  constructor() {
    this.isRunning = false;
    this.dailySweepCron = null; // node-cron task for daily sweep
    this.frequentUpdateInterval = null;
    this.lastSweepTime = null;
    this.lastUpdateTime = null;
    this.syncStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      decommissionedProducts: 0,
      errors: 0
    };
  }

  /**
   * Start the catalog synchronization service
   */
  start() {
    if (this.isRunning) {
      console.log('🔄 Catalog synchronization service already running');
      return;
    }

    console.log('🚀 Starting catalog synchronization service...');
    this.isRunning = true;

    // Schedule daily sweep at 02:00 local time
    this.scheduleDailySweep();
    
    // Start frequent updates every 10 minutes
    this.startFrequentUpdates();

    console.log('✅ Catalog synchronization service started');
  }

  /**
   * Start only the daily synchronization (02:00), without frequent updates.
   * Useful for staging/dev where frequent updates are shadowed until prod.
   */
  startDailyOnly() {
    if (this.isRunning) {
      console.log('🔄 Catalog synchronization service already running');
      return;
    }
    console.log('🚀 Starting catalog synchronization service (daily only)…');
    this.isRunning = true;
    this.scheduleDailySweep();
    console.log('✅ Catalog synchronization service (daily only) started');
  }

  /**
   * Stop the catalog synchronization service
   */
  stop() {
    if (!this.isRunning) {
      console.log('🔄 Catalog synchronization service not running');
      return;
    }

    console.log('🛑 Stopping catalog synchronization service...');
    this.isRunning = false;

    if (this.dailySweepCron) {
      this.dailySweepCron.stop();
      this.dailySweepCron = null;
    }

    if (this.frequentUpdateInterval) {
      clearInterval(this.frequentUpdateInterval);
      this.frequentUpdateInterval = null;
    }

    console.log('✅ Catalog synchronization service stopped');
  }

  /**
   * Schedule daily sweep at 02:00 SAST (Africa/Johannesburg timezone)
   * Uses node-cron for proper timezone handling, consistent with other scheduled tasks
   */
  scheduleDailySweep() {
    const cron = require('node-cron');
    
    // Schedule daily sweep at 2:00 AM SAST (Africa/Johannesburg)
    // Cron format: minute hour day month weekday
    // '0 2 * * *' = Every day at 2:00 AM
    this.dailySweepCron = cron.schedule('0 2 * * *', async () => {
      console.log('🔄 Running scheduled daily catalog sweep...');
      try {
        await this.performDailySweep();
      } catch (error) {
        console.error('❌ Scheduled catalog sweep error:', error.message);
      }
    }, {
      timezone: 'Africa/Johannesburg',
      scheduled: true
    });

    // Calculate next run time for logging
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0);
    
    // Convert to SAST for display (Africa/Johannesburg is UTC+2)
    const sastTime = new Date(tomorrow.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    
    console.log(`📅 Daily catalog sweep scheduled for 2:00 AM SAST (Africa/Johannesburg)`);
    console.log(`   Next run: ${sastTime.toLocaleString('en-US', { timeZone: 'Africa/Johannesburg', timeZoneName: 'short' })}`);
  }

  /**
   * Start frequent updates every 10 minutes
   */
  startFrequentUpdates() {
    // Run immediately
    this.performFrequentUpdate();
    
    // Then schedule every 10 minutes
    this.frequentUpdateInterval = setInterval(() => {
      this.performFrequentUpdate();
    }, 10 * 60 * 1000); // 10 minutes

    console.log('⏰ Frequent catalog updates scheduled every 10 minutes');
  }

  /**
   * Perform daily comprehensive sweep of all suppliers
   */
  async performDailySweep() {
    if (!this.isRunning) return;

    console.log('🔄 Starting daily catalog sweep...');
    const startTime = Date.now();

    try {
      this.resetSyncStats();

      // Get all active suppliers
      const suppliers = await Supplier.findAll({
        where: { isActive: true }
      });

      console.log(`📦 Sweeping ${suppliers.length} suppliers...`);

      for (const supplier of suppliers) {
        await this.sweepSupplierCatalog(supplier);
      }

      // Update catalog cache
      await this.updateCatalogCache();

      // Refresh pre-computed best-offers table (banking-grade: one product per denomination, highest commission)
      try {
        const { refreshBestOffers } = require('../scripts/refresh-vas-best-offers');
        const result = await refreshBestOffers();
        console.log(`📊 vas_best_offers refreshed: ${result.rowsAffected} rows`);
      } catch (boErr) {
        console.warn('⚠️ vas_best_offers refresh skipped:', boErr.message);
      }

      // Log sweep results
      const duration = Date.now() - startTime;
      console.log(`✅ Daily catalog sweep completed in ${duration}ms`);
      console.log(`📊 Sweep Results:`, this.syncStats);

      // Send notification to admin if there are significant changes
      if (this.syncStats.newProducts > 0 || this.syncStats.decommissionedProducts > 0) {
        await this.notifyAdminOfChanges();
      }

      this.lastSweepTime = new Date();

    } catch (error) {
      console.error('❌ Daily catalog sweep failed:', error);
      this.syncStats.errors++;
      
      // Send error notification to admin
      await this.notifyAdminOfError('Daily catalog sweep failed', error);
    }
  }

  /**
   * Perform frequent update of pricing and availability
   */
  async performFrequentUpdate() {
    if (!this.isRunning) return;

    console.log('🔄 Performing frequent catalog update...');
    const startTime = Date.now();

    try {
      // Get all active suppliers
      const suppliers = await Supplier.findAll({
        where: { isActive: true }
      });

      for (const supplier of suppliers) {
        await this.updateSupplierPricing(supplier);
      }

      // Update catalog cache
      await this.updateCatalogCache();

      const duration = Date.now() - startTime;
      console.log(`✅ Frequent catalog update completed in ${duration}ms`);

      this.lastUpdateTime = new Date();

    } catch (error) {
      console.error('❌ Frequent catalog update failed:', error);
      
      // Send error notification to admin
      await this.notifyAdminOfError('Frequent catalog update failed', error);
    }
  }

  /**
   * Sweep a specific supplier's catalog
   */
  async sweepSupplierCatalog(supplier) {
    console.log(`🔄 Sweeping catalog for supplier: ${supplier.name} (${supplier.code})`);

    try {
      switch (supplier.code) {
        case 'FLASH':
          await this.sweepFlashCatalog(supplier);
          break;
        case 'MOBILEMART':
          await this.sweepMobileMartCatalog(supplier);
          break;
        // Add other suppliers here
        default:
          console.log(`⚠️ No sweep implementation for supplier: ${supplier.code}`);
      }
    } catch (error) {
      console.error(`❌ Failed to sweep catalog for ${supplier.name}:`, error);
      this.syncStats.errors++;
    }
  }

  /**
   * Update pricing for a specific supplier
   */
  async updateSupplierPricing(supplier) {
    console.log(`💰 Updating pricing for supplier: ${supplier.name} (${supplier.code})`);

    try {
      switch (supplier.code) {
        case 'FLASH':
          await this.updateFlashPricing(supplier);
          break;
        case 'MOBILEMART':
          await this.updateMobileMartPricing(supplier);
          break;
        // Add other suppliers here
        default:
          console.log(`⚠️ No pricing update implementation for supplier: ${supplier.code}`);
      }
    } catch (error) {
      console.error(`❌ Failed to update pricing for ${supplier.name}:`, error);
    }
  }

  /**
   * Sweep Flash catalog — fetches live product list from Flash Partner API v4
   * and upserts into products + product_variants tables.
   * Mirrors sweepMobileMartCatalog() in structure.
   */
  async sweepFlashCatalog(supplier) {
    console.log(`🔄 Sweeping Flash catalog...`);

    const isLive = process.env.FLASH_LIVE_INTEGRATION === 'true';
    if (!isLive) {
      console.log('⚠️  Flash catalog sweep skipped — FLASH_LIVE_INTEGRATION is not "true"');
      return;
    }

    const accountNumber = process.env.FLASH_ACCOUNT_NUMBER;
    if (!accountNumber) {
      console.error('❌ Flash catalog sweep skipped — FLASH_ACCOUNT_NUMBER not set');
      this.syncStats.errors++;
      return;
    }

    try {
      const authService = new FlashAuthService();
      const health = await authService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`Flash API unhealthy: ${health.error}`);
      }

      const response = await authService.makeAuthenticatedRequest(
        'GET',
        `/accounts/${accountNumber}/products?includeInstructions=false`
      );
      const rawProducts = response.products || response || [];
      console.log(`    Found ${rawProducts.length} products from Flash API`);

      for (const raw of rawProducts) {
        try {
          await this.syncFlashProduct(raw, supplier);
        } catch (productErr) {
          const name = raw.productName || raw.name || raw.productCode || 'Unknown';
          console.error(`    ❌ Failed to sync Flash product "${name}":`, productErr.message);
          this.syncStats.errors++;
        }
      }

      console.log(`✅ Flash catalog sweep complete`);
    } catch (error) {
      console.error(`❌ Flash catalog sweep failed:`, error.message);
      this.syncStats.errors++;
      throw error;
    }
  }

  /**
   * Map Flash productGroup string to our vasType enum value.
   * Based on actual Flash aggregation/4.0 API productGroup values:
   *   "Cellular", "Eezi Vouchers" → airtime
   *   "Prepaid Utilities"         → electricity
   *   "Flash Pay"                 → bill_payment
   *   "Gift Vouchers", "1Voucher", "Flash Token" → voucher
   */
  mapFlashCategory(productGroup) {
    if (!productGroup) return 'airtime';
    const g = productGroup.toLowerCase();
    if (g.includes('prepaid util') || g.includes('electricity') || g.includes('utility')) return 'electricity';
    if (g === 'cellular')           return 'airtime';
    if (g.includes('flash pay'))    return 'bill_payment';
    if (g.includes('voucher') || g.includes('gift') || g.includes('flash token')) return 'voucher';
    if (g.includes('eezi'))         return 'airtime';
    if (g.includes('data'))         return 'data';
    return 'airtime';
  }

  /**
   * Sync a single Flash product (raw API object) to the database.
   * Field names match actual Flash aggregation/4.0 API response:
   *   productCode, productName, minimumAmount, maximumAmount,
   *   status ("Active" string), vendor, productGroup, barcode, billerCode
   */
  async syncFlashProduct(raw, supplier) {
    const productCode = String(raw.productCode || raw.id || '');
    if (!productCode) return;

    const productName = raw.productName || raw.name || 'Flash Product';
    const productGroup = raw.productGroup || raw.category || raw.type || 'Gift Vouchers';
    const vasType     = this.mapFlashCategory(productGroup);
    // Flash API uses "vendor" field (not provider/network/brand)
    const provider    = raw.vendor || raw.provider || raw.contentCreator || productName;
    // Flash API returns status as the string "Active" (not boolean)
    const isActive    = raw.status === 'Active' || raw.isActive === true;

    // Flash API uses minimumAmount / maximumAmount (amounts in cents)
    const minAmount = raw.minimumAmount || raw.minAmount || 500;
    const maxAmount = raw.maximumAmount || raw.maxAmount || 100000;
    // Fixed denomination: when min === max the product has exactly one price point
    const isFixed = minAmount === maxAmount;
    const denominations = isFixed ? [minAmount] : [];
    const priceType = isFixed ? 'fixed' : 'variable';

    const txType = (vasType === 'bill_payment' || vasType === 'electricity')
      ? 'direct'
      : (vasType === 'voucher' || denominations.length > 0 ? 'voucher' : 'topup');

    const tx = await sequelize.transaction();
    try {
      const brandCategory = vasType === 'voucher' ? 'entertainment' : 'utilities';
      const [brand] = await ProductBrand.findOrCreate({
        where: { name: provider },
        defaults: { name: provider, category: brandCategory, isActive: true, metadata: { source: 'flash' } },
        transaction: tx,
      });

      const [baseProduct, productCreated] = await Product.findOrCreate({
        where: { supplierId: supplier.id, supplierProductId: productCode },
        defaults: {
          supplierId: supplier.id, brandId: brand.id, name: productName,
          type: vasType, supplierProductId: productCode,
          status: isActive ? 'active' : 'inactive',
          denominations: denominations.length > 0 ? denominations : [],
          isFeatured: false, sortOrder: 0,
          metadata: { source: 'flash', synced: true, synced_from: 'catalog_sync_service' },
        },
        transaction: tx,
      });

      if (!productCreated) {
        await baseProduct.update({
          name: productName, type: vasType, brandId: brand.id,
          status: isActive ? 'active' : 'inactive',
          denominations: denominations.length > 0 ? denominations : baseProduct.denominations,
        }, { transaction: tx });
      }

      const variantData = {
        productId: baseProduct.id, supplierId: supplier.id, supplierProductId: productCode,
        vasType, transactionType: txType, networkType: 'local', provider,
        priceType, minAmount, maxAmount,
        predefinedAmounts: denominations.length > 0 ? denominations : null,
        commission: 2.50, fixedFee: 0,
        isPromotional: false, promotionalDiscount: null,
        denominations: denominations.length > 0 ? denominations : [],
        pricing: { defaultCommissionRate: 2.50, fixedAmount: denominations.length > 0 },
        constraints: { minAmount, maxAmount },
        status: isActive ? 'active' : 'inactive',
        priority: 1, isPreferred: true, sortOrder: 0,
        lastSyncedAt: new Date(),
        metadata: {
          flash_product_code:  productCode,
          flash_product_name:  productName,
          flash_product_group: productGroup,
          flash_vendor:        provider,
          flash_biller_code:   raw.billerCode || undefined,
          flash_barcode:       raw.barcode || undefined,
          synced_at:           new Date().toISOString(),
          synced_from:         'catalog_sync_service',
        },
      };

      const [variant, variantCreated] = await ProductVariant.findOrCreate({
        where: { productId: baseProduct.id, supplierId: supplier.id, supplierProductId: productCode },
        defaults: variantData,
        transaction: tx,
      });

      if (!variantCreated) {
        await variant.update(variantData, { transaction: tx });
        this.syncStats.updatedProducts++;
      } else {
        this.syncStats.newProducts++;
      }

      this.syncStats.totalProducts++;
      await tx.commit();
    } catch (error) {
      await tx.rollback();
      throw error;
    }
  }

  /**
   * Update Flash pricing — re-syncs commission/fee fields from live API.
   * Currently delegates to a full catalog sweep since Flash v4 does not expose
   * a dedicated pricing endpoint separate from the product list.
   */
  async updateFlashPricing(supplier) {
    console.log(`💰 Updating Flash pricing (via catalog sweep)...`);
    await this.sweepFlashCatalog(supplier);
  }

  /**
   * Sweep MobileMart catalog
   */
  async sweepMobileMartCatalog(supplier) {
    console.log(`🔄 Sweeping MobileMart catalog...`);
    
    try {
      const authService = new MobileMartAuthService();
      const VAS_TYPES = ['airtime', 'data', 'utility', 'voucher', 'bill-payment'];
      
      // Test authentication
      const health = await authService.healthCheck();
      if (health.status !== 'healthy') {
        throw new Error(`MobileMart API unhealthy: ${health.error}`);
      }
      
      for (const vasType of VAS_TYPES) {
        await this.syncMobileMartVasType(vasType, supplier, authService);
      }
      
      console.log(`✅ MobileMart catalog sweep complete`);
    } catch (error) {
      console.error(`❌ MobileMart catalog sweep failed:`, error.message);
      this.syncStats.errors++;
      throw error;
    }
  }

  /**
   * Normalize product type to match PostgreSQL enum
   */
  normalizeProductType(vasType) {
    const t = (vasType || '').toLowerCase();
    if (t === 'bill-payment' || t === 'billpayment') return 'bill_payment';
    if (t === 'prepaidutility' || t === 'utility' || t === 'prepaid-utility') return 'electricity';
    return t; // airtime, data, voucher, etc.
  }

  /**
   * Get brand category based on VAS type
   */
  getBrandCategory(vasType) {
    const t = (vasType || '').toLowerCase();
    if (t === 'voucher') return 'entertainment';
    if (['airtime', 'data', 'electricity', 'bill_payment', 'utility'].includes(t)) return 'utilities';
    return 'other';
  }

  /**
   * Normalize VAS type for MobileMart API
   */
  normalizeVasType(vasType) {
    const mapping = {
      'airtime': 'airtime',
      'data': 'data',
      'utility': 'utility',
      'electricity': 'utility',
      'voucher': 'voucher',
      'bill-payment': 'bill-payment',
      'billpayment': 'bill-payment'
    };
    return mapping[vasType] || vasType;
  }

  /**
   * Determine transaction type based on VAS type
   */
  getTransactionType(vasType, product) {
    const mapping = {
      'airtime': product.pinned ? 'voucher' : 'topup',
      'data': product.pinned ? 'voucher' : 'topup',
      'utility': 'direct',
      'electricity': 'direct',
      'voucher': 'voucher',
      'bill-payment': 'direct',
      'bill_payment': 'direct'
    };
    return mapping[vasType] || 'topup';
  }

  /**
   * Map MobileMart product to ProductVariant data
   */
  mapMobileMartToProductVariant(mmProduct, vasType, supplierId, productId) {
    const isBillPayment = vasType === 'bill_payment';
    const hasFixedAmount = !!mmProduct.fixedAmount && !isBillPayment;
    const baseAmountCents = typeof mmProduct.amount === 'number' ? Math.round(mmProduct.amount * 100) : null;
    
    const computedMinCents = mmProduct.minimumAmount ? Math.round(mmProduct.minimumAmount * 100) : null;
    const computedMaxCents = mmProduct.maximumAmount ? Math.round(mmProduct.maximumAmount * 100) : null;
    
    const minAmount = hasFixedAmount && typeof baseAmountCents === 'number'
      ? baseAmountCents
      : (computedMinCents != null ? computedMinCents : 500);
    
    const maxAmount = hasFixedAmount && typeof baseAmountCents === 'number'
      ? baseAmountCents
      : (computedMaxCents != null ? computedMaxCents : 100000);
    
    const denominations = hasFixedAmount && typeof baseAmountCents === 'number'
      ? [baseAmountCents]
      : [];
    
    return {
      productId: productId,
      supplierId: supplierId,
      supplierProductId: mmProduct.merchantProductId,
      
      // VAS fields
      vasType: vasType,
      transactionType: this.getTransactionType(vasType, mmProduct),
      networkType: 'local',
      provider: mmProduct.contentCreator || mmProduct.provider || 'Unknown',
      
      // Amount constraints
      minAmount: minAmount,
      maxAmount: maxAmount,
      predefinedAmounts: hasFixedAmount && typeof baseAmountCents === 'number' ? [baseAmountCents] : null,
      
      // Commission and fees (MobileMart typically 2-3%)
      commission: 2.5, // Default commission
      fixedFee: 0,
      
      // Promotional
      isPromotional: mmProduct.isPromotional || false,
      promotionalDiscount: mmProduct.promotionalDiscount || null,
      
      // Priority and status
      priority: 2, // MobileMart is secondary supplier
      status: mmProduct.isActive !== false ? 'active' : 'inactive',
      
      // Denominations
      denominations: denominations,
      
      // Pricing structure
      pricing: {
        defaultCommissionRate: 2.5,
        fixedAmount: mmProduct.fixedAmount,
        amount: mmProduct.amount
      },
      
      // Constraints
      constraints: {
        minAmount: mmProduct.minimumAmount ? mmProduct.minimumAmount * 100 : null,
        maxAmount: mmProduct.maximumAmount ? mmProduct.maximumAmount * 100 : null,
        pinned: mmProduct.pinned
      },
      
      // Metadata
      metadata: {
        mobilemart_merchant_product_id: mmProduct.merchantProductId,
        mobilemart_product_name: mmProduct.productName || mmProduct.name || 'Unknown',
        mobilemart_content_creator: mmProduct.contentCreator,
        mobilemart_pinned: mmProduct.pinned,
        mobilemart_fixed_amount: mmProduct.fixedAmount,
        synced_at: new Date().toISOString(),
        synced_from: 'catalog_sync_service'
      },
      
      // Tracking
      lastSyncedAt: new Date(),
      sortOrder: mmProduct.pinned ? 1 : 2,
      isPreferred: mmProduct.pinned
    };
  }

  /**
   * Sync products for a specific VAS type from MobileMart
   */
  async syncMobileMartVasType(vasType, supplier, authService) {
    try {
      console.log(`  📱 Syncing ${vasType} products...`);
      
      // Fetch products from MobileMart API
      const normalizedVasType = this.normalizeVasType(vasType);
      const response = await authService.makeAuthenticatedRequest(
        'GET',
        `/${normalizedVasType}/products`
      );
      
      const allProducts = response.products || response || [];
      console.log(`    Found ${allProducts.length} ${vasType} products from MobileMart API`);
      
      // LAUNCH STRATEGY: Filter products based on pinned/pinless requirement
      // - Airtime/Data: Only sync PINLESS products (pinned === false)
      // - Utility/Electricity/Vouchers/Bill-payment: Sync ALL products (both pinned and pinless)
      let products = allProducts;
      if (vasType === 'airtime' || vasType === 'data') {
        products = allProducts.filter(p => p.pinned === false);
        console.log(`    🎯 Filtered to ${products.length} PINLESS products (${allProducts.length - products.length} pinned skipped)`);
      }
      // Note: Utility, Vouchers, and Bill-payment include all products (no filtering)
      
      // Sync each product
      for (const mmProduct of products) {
        try {
          await this.syncMobileMartProduct(mmProduct, vasType, supplier);
        } catch (error) {
          const productName = mmProduct.productName || mmProduct.name || mmProduct.contentCreator || mmProduct.merchantProductId || 'Unknown';
          console.error(`    ❌ Failed to sync ${productName}:`, error.message);
          this.syncStats.errors++;
        }
      }
      
      console.log(`  ✅ ${vasType} products synced`);
    } catch (error) {
      console.error(`  ❌ Failed to fetch ${vasType} products:`, error.message);
      this.syncStats.errors++;
      throw error;
    }
  }

  /**
   * Sync a single MobileMart product to database
   */
  async syncMobileMartProduct(mmProduct, vasType, supplier) {
    const transaction = await sequelize.transaction();
    
    try {
      // Normalize the product type for DB enum
      const normalizedType = this.normalizeProductType(vasType);
      
      // Get product name with fallbacks (handle missing productName)
      const productName = mmProduct.productName || mmProduct.name || mmProduct.contentCreator || `MobileMart ${vasType} Product`;
      
      // Create or find brand
      const brandName = mmProduct.contentCreator || productName || 'MobileMart';
      const brandCategory = this.getBrandCategory(normalizedType);
      const [brand] = await ProductBrand.findOrCreate({
        where: { name: brandName },
        defaults: {
          name: brandName,
          category: brandCategory,
          isActive: true,
          metadata: { source: 'mobilemart' }
        },
        transaction
      });
      
      // Create or get base product
      const [product, productCreated] = await Product.findOrCreate({
        where: {
          supplierId: supplier.id,
          name: productName,
          type: normalizedType
        },
        defaults: {
          supplierId: supplier.id,
          brandId: brand.id,
          name: productName,
          type: normalizedType,
          supplierProductId: mmProduct.merchantProductId,
          status: 'active',
          denominations: mmProduct.fixedAmount ? [mmProduct.amount * 100] : [],
          isFeatured: false,
          sortOrder: 0,
          metadata: {
            source: 'mobilemart',
            synced: true,
            synced_from: 'catalog_sync_service'
          }
        },
        transaction
      });
      
      // Ensure existing products have required fields
      const updateFields = {};
      if (!product.supplierId) updateFields.supplierId = supplier.id;
      if (!product.brandId) updateFields.brandId = brand.id;
      if (!product.supplierProductId) updateFields.supplierProductId = mmProduct.merchantProductId;
      if (product.type !== normalizedType) updateFields.type = normalizedType;
      if (Object.keys(updateFields).length > 0) {
        await product.update(updateFields, { transaction });
      }
      
      // Map to ProductVariant
      const variantData = this.mapMobileMartToProductVariant(mmProduct, normalizedType, supplier.id, product.id);
      
      // Create or update ProductVariant
      const [productVariant, variantCreated] = await ProductVariant.findOrCreate({
        where: {
          productId: product.id,
          supplierId: supplier.id,
          supplierProductId: mmProduct.merchantProductId
        },
        defaults: variantData,
        transaction
      });
      
      if (!variantCreated) {
        await productVariant.update(variantData, { transaction });
        this.syncStats.updatedProducts++;
      } else {
        this.syncStats.newProducts++;
      }
      
      this.syncStats.totalProducts++;
      
      await transaction.commit();
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update MobileMart pricing
   */
  async updateMobileMartPricing(supplier) {
    console.log(`💰 Updating MobileMart pricing...`);
    
    // Similar implementation for MobileMart
    // This would integrate with MobileMart API
  }

  /**
   * Add or update a product in the catalog
   */
  async addOrUpdateProduct(supplier, productData) {
    const transaction = await sequelize.transaction();
    
    try {
      // Check if product exists
      let product = await Product.findOne({
        where: {
          supplierId: supplier.id,
          supplierProductId: productData.supplierProductId
        },
        transaction
      });

      if (product) {
        // Update existing product
        await product.update({
          name: productData.name,
          denominations: JSON.stringify(productData.denominations),
          constraints: JSON.stringify(productData.constraints),
          metadata: JSON.stringify(productData.metadata),
          status: productData.status || 'active'
        }, { transaction });
        
        console.log(`✅ Updated product: ${productData.name}`);
      } else {
        // Create new product
        product = await Product.create({
          supplierId: supplier.id,
          brandId: productData.brandId,
          name: productData.name,
          type: productData.type,
          supplierProductId: productData.supplierProductId,
          denominations: JSON.stringify(productData.denominations),
          constraints: JSON.stringify(productData.constraints),
          metadata: JSON.stringify(productData.metadata),
          status: productData.status || 'active',
          isFeatured: productData.isFeatured || false,
          sortOrder: productData.sortOrder || 0
        }, { transaction });
        
        console.log(`✅ Added new product: ${productData.name}`);
      }

      await transaction.commit();
      return product;

    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Update product special pricing
   */
  async updateProductSpecial(supplier, specialData) {
    const product = await Product.findOne({
      where: {
        supplierId: supplier.id,
        supplierProductId: specialData.supplierProductId
      }
    });

    if (product) {
      const metadata = JSON.parse(product.metadata || '{}');
      metadata.special = specialData;
      
      await product.update({
        metadata: JSON.stringify(metadata)
      });
      
      console.log(`✅ Updated special for product: ${product.name}`);
    }
  }

  /**
   * Decommission a product
   */
  async decommissionProduct(supplier, productData) {
    const product = await Product.findOne({
      where: {
        supplierId: supplier.id,
        supplierProductId: productData.supplierProductId
      }
    });

    if (product) {
      await product.update({
        status: 'discontinued'
      });
      
      console.log(`✅ Decommissioned product: ${product.name}`);
    }
  }

  /**
   * Update product pricing
   */
  async updateProductPricing(supplier, pricingData) {
    const product = await Product.findOne({
      where: {
        supplierId: supplier.id,
        supplierProductId: pricingData.supplierProductId
      }
    });

    if (product) {
      await product.update({
        denominations: JSON.stringify(pricingData.denominations)
      });
      
      console.log(`✅ Updated pricing for product: ${product.name}`);
    }
  }

  /**
   * Update catalog cache
   */
  async updateCatalogCache() {
    console.log('🔄 Updating catalog cache...');
    
    // This would update Redis cache with latest catalog data
    // For now, just log the action
    console.log('✅ Catalog cache updated');
  }

  /**
   * Reset synchronization statistics
   */
  resetSyncStats() {
    this.syncStats = {
      totalProducts: 0,
      newProducts: 0,
      updatedProducts: 0,
      decommissionedProducts: 0,
      errors: 0
    };
  }

  /**
   * Notify admin of significant changes
   */
  async notifyAdminOfChanges() {
    try {
      // Find admin users
      const adminUsers = await require('../models').User.findAll({
        where: { role: 'admin' }
      });

      for (const admin of adminUsers) {
        await notificationService.createNotification(
          admin.id,
          'catalog_changes',
          'Catalog Updates',
          `Catalog sweep completed: ${this.syncStats.newProducts} new, ${this.syncStats.updatedProducts} updated, ${this.syncStats.decommissionedProducts} decommissioned`,
          {
            payload: this.syncStats,
            freezeUntilViewed: false
          }
        );
      }
    } catch (error) {
      console.error('Failed to notify admin of catalog changes:', error);
    }
  }

  /**
   * Notify admin of errors
   */
  async notifyAdminOfError(title, error) {
    try {
      const adminUsers = await require('../models').User.findAll({
        where: { role: 'admin' }
      });

      for (const admin of adminUsers) {
        await notificationService.createNotification(
          admin.id,
          'catalog_error',
          title,
          `Catalog synchronization error: ${error.message}`,
          {
            payload: { error: error.message, stack: error.stack },
            freezeUntilViewed: true
          }
        );
      }
    } catch (notifyError) {
      console.error('Failed to notify admin of error:', notifyError);
    }
  }

  /**
   * Get service status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      lastSweepTime: this.lastSweepTime,
      lastUpdateTime: this.lastUpdateTime,
      syncStats: this.syncStats
    };
  }

  /**
   * Manual trigger for daily sweep
   */
  async triggerDailySweep() {
    console.log('🔄 Manual daily sweep triggered');
    await this.performDailySweep();
  }

  /**
   * Manual trigger for frequent update
   */
  async triggerFrequentUpdate() {
    console.log('🔄 Manual frequent update triggered');
    await this.performFrequentUpdate();
  }

}

module.exports = CatalogSynchronizationService;





