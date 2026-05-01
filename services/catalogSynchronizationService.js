'use strict';

const { Product, ProductBrand, Supplier, ProductVariant, sequelize } = require('../models');
const { Op } = require('sequelize');
const notificationService = require('./notificationService');
const ProductCatalogService = require('./productCatalogService');
const commissionConfig = require('../config/supplier-commissions.json');
const ProductCatalogGovernanceService = require('./productCatalogGovernanceService');

const _catalogServiceInstance = new ProductCatalogService();
const _catalogGovernanceService = new ProductCatalogGovernanceService();
const MobileMartAuthService = require('./mobilemartAuthService');
const FlashAuthService = require('./flashAuthService');

class CatalogSynchronizationService {
  constructor() {
    this.isRunning = false;
    this.dailySweepCron = null; // node-cron task for daily sweep
    this.cacheRefreshCron = null; // node-cron task for 6-hourly cache refresh
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
    this.seenProductIds = {};
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

    // Schedule 6-hourly cache refresh (mark-featured + best-offers only, no API sweep)
    this.scheduleCacheRefresh();
    
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
    this.scheduleCacheRefresh();
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

    if (this.cacheRefreshCron) {
      this.cacheRefreshCron.stop();
      this.cacheRefreshCron = null;
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
   * Schedule 6-hourly materialized view refresh (00:00, 06:00, 12:00, 18:00 SAST).
   * No API sweep — refreshes v_best_offers from current product_variants data.
   */
  scheduleCacheRefresh() {
    const cron = require('node-cron');

    this.cacheRefreshCron = cron.schedule('0 */6 * * *', async () => {
      console.log('🔄 Running 6-hourly v_best_offers refresh...');
      const start = Date.now();
      try {
        await _catalogServiceInstance.refreshView();
        console.log(`✅ 6-hourly view refresh completed in ${Date.now() - start}ms`);
      } catch (error) {
        console.error('❌ 6-hourly view refresh failed:', error.message);
      }
    }, {
      timezone: 'Africa/Johannesburg',
      scheduled: true
    });

    console.log('📅 6-hourly v_best_offers refresh scheduled: 0 */6 * * * (SAST)');
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

      // Refresh materialized view (replaces old mark-featured + best-offers pipeline)
      try {
        await _catalogServiceInstance.refreshView();
        console.log('📊 v_best_offers materialized view refreshed');
      } catch (viewErr) {
        console.warn('⚠️ v_best_offers refresh skipped:', viewErr.message);
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
          return;
      }

      // Deactivate products the API no longer returns
      await this.deactivateStaleProducts(supplier);
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

      const supplierKey = `FLASH`;
      if (!this.seenProductIds[supplierKey]) this.seenProductIds[supplierKey] = new Set();

      for (const raw of rawProducts) {
        try {
          await this.syncFlashProduct(raw, supplier);
          const pid = (raw.productCode || raw.code || '').toString();
          if (pid) this.seenProductIds[supplierKey].add(pid);
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
  mapFlashCategory(productGroup, productName = '') {
    if (!productGroup) return 'airtime';
    const g = productGroup.toLowerCase();
    const n = (productName || '').toLowerCase();
    if (g.includes('prepaid util') || g.includes('electricity') || g.includes('utility')) return 'electricity';
    if (g === 'cellular')           return 'airtime';
    if (g.includes('flash pay'))    return 'bill_payment';
    // eezi must be checked BEFORE the generic 'voucher' check because Flash
    // names this group "Eezi Vouchers" — it is airtime, not a gift voucher.
    if (g.includes('eezi'))         return 'airtime';
    // Global PIN = international PIN-based top-ups (not pinless airtime, not gift vouchers)
    // Use dedicated type so they don't appear in the airtime or voucher overlays
    if (n.includes('global pin'))   return 'international_pin';
    if (g.includes('voucher') || g.includes('gift') || g.includes('flash token') || g.includes('1voucher')) return 'voucher';
    if (g.includes('data'))         return 'data';
    return 'airtime';
  }

  /**
   * Resolve Flash contractual commission for a product.
   * Returns { commission, fixedFee, commissionType, pricingRate }.
   */
  getFlashContractualCommission(vasType, provider, productName) {
    return this.getContractualCommission('FLASH', vasType, provider, productName);
  }

  getMobileMartContractualCommission(vasType, provider, productName) {
    return this.getContractualCommission('MOBILEMART', vasType, provider, productName);
  }

  /**
   * Unified commission lookup driven by config/supplier-commissions.json.
   * Replaces the two 50-100 line hardcoded methods with a single config-driven resolver.
   */
  getContractualCommission(supplierCode, vasType, provider, productName) {
    const config = commissionConfig[supplierCode];
    if (!config) return { commission: 2.50, fixedFee: 0, commissionType: 'percentage', pricingRate: 2.50 };

    const p = (provider || '').toLowerCase();
    const n = (productName || '').toLowerCase();

    // 1. Check fixed-fee overrides first (e.g., DStv, municipality, flash token)
    const fixedOverrides = config.fixed_fee_overrides || {};
    for (const [key, val] of Object.entries(fixedOverrides)) {
      if (p.includes(key) || n.includes(key)) {
        return { commission: val.commission || 0, fixedFee: val.fixedFee || 0, commissionType: 'fixed_amount', pricingRate: 0 };
      }
    }

    // 2. Resolve VAS type config
    const vtNorm = vasType === 'gaming' || vasType === 'streaming' ? 'voucher' : vasType;
    const vtConfig = config[vtNorm];
    if (!vtConfig) return { commission: 2.50, fixedFee: 0, commissionType: 'percentage', pricingRate: 2.50 };

    // 3. Check product-name overrides (substring match on provider or productName)
    const prodOverrides = vtConfig.product_overrides || {};
    for (const [key, rate] of Object.entries(prodOverrides)) {
      if (p.includes(key) || n.includes(key)) {
        return { commission: rate, fixedFee: 0, commissionType: 'percentage', pricingRate: rate };
      }
    }

    // 4. Check provider-name overrides (e.g., Vodacom 4.50%, Telkom 3.50%)
    const provOverrides = vtConfig.provider_overrides || {};
    const pk = p.replace(/\s*(municipality|local|metro|metropolitan)\s*/gi, ' ').trim();
    for (const [key, rate] of Object.entries(provOverrides)) {
      if (pk.includes(key) || p.includes(key)) {
        return { commission: rate, fixedFee: 0, commissionType: 'percentage', pricingRate: rate };
      }
    }

    // 5. Fixed-fee default (e.g., MobileMart bill_payment R1.90 fixed)
    if (vtConfig.default_fixed_fee) {
      return { commission: vtConfig.default || 0, fixedFee: vtConfig.default_fixed_fee, commissionType: 'fixed_amount', pricingRate: 0 };
    }

    // 6. Percentage default
    const rate = vtConfig.default || 2.50;
    return { commission: rate, fixedFee: 0, commissionType: 'percentage', pricingRate: rate };
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
    const vasType     = this.mapFlashCategory(productGroup, productName);
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

      const commInfo = this.getFlashContractualCommission(vasType, provider, productName);

      const variantData = {
        productId: baseProduct.id, supplierId: supplier.id, supplierProductId: productCode,
        vasType, transactionType: txType, networkType: 'local', provider,
        priceType, minAmount, maxAmount,
        predefinedAmounts: denominations.length > 0 ? denominations : null,
        commission: commInfo.commission, fixedFee: commInfo.fixedFee,
        commissionType: commInfo.commissionType,
        isPromotional: false, promotionalDiscount: null,
        denominations: denominations.length > 0 ? denominations : [],
        pricing: { defaultCommissionRate: commInfo.pricingRate, fixedAmount: denominations.length > 0 },
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
        where: { productId: baseProduct.id, supplierId: supplier.id },
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
      await this.queueGovernanceMapping(variant.id);
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
   * Deactivate product_variants that exist in the DB but were NOT returned
   * by the supplier's API during this sync run.
   *
   * Safety: requires 2 consecutive missed sweeps before deactivating. A single
   * partial API response will NOT deactivate products — it only increments
   * metadata.missedSweepCount. Products returned by the next sweep have their
   * counter reset to 0 automatically (via the upsert in syncFlashProduct /
   * syncMobileMartProduct which overwrites metadata.missedSweepCount).
   */
  async deactivateStaleProducts(supplier) {
    const REQUIRED_MISSES = 2;
    const supplierKey = supplier.code;
    const seenSet = this.seenProductIds[supplierKey];

    if (!seenSet || seenSet.size === 0) {
      console.log(`  ⚠️  No ${supplierKey} products synced — skipping stale cleanup to avoid false deactivation.`);
      return;
    }

    const seenIds = [...seenSet];

    try {
      // Find active variants NOT in the current sweep
      const staleVariants = await ProductVariant.findAll({
        where: {
          supplierId: supplier.id,
          status: 'active',
          supplierProductId: {
            [Op.and]: [
              { [Op.ne]: null },
              { [Op.ne]: '' },
              { [Op.notIn]: seenIds }
            ]
          }
        },
        include: [{ model: Product, as: 'product', attributes: ['name'] }]
      });

      if (staleVariants.length === 0) {
        console.log(`  ✅ No stale ${supplierKey} products — catalog is up to date.`);
        return;
      }

      // Reset missedSweepCount on products that WERE returned
      await ProductVariant.update(
        { metadata: sequelize.literal(`jsonb_set(COALESCE(metadata, '{}')::jsonb, '{missedSweepCount}', '0')`) },
        {
          where: {
            supplierId: supplier.id,
            status: 'active',
            supplierProductId: { [Op.in]: seenIds }
          }
        }
      );

      // Increment missedSweepCount on stale variants
      const toWarn = [];
      const toDeactivate = [];

      for (const v of staleVariants) {
        const meta = v.metadata || {};
        const missCount = (parseInt(meta.missedSweepCount, 10) || 0) + 1;

        if (missCount >= REQUIRED_MISSES) {
          toDeactivate.push(v);
        } else {
          toWarn.push(v);
        }

        await v.update({
          metadata: { ...meta, missedSweepCount: missCount, lastMissedAt: new Date().toISOString() }
        });
      }

      if (toWarn.length > 0) {
        console.log(`  ⚠️  ${toWarn.length} ${supplierKey} variant(s) missed 1 sweep (will deactivate after ${REQUIRED_MISSES}):`);
        for (const v of toWarn) {
          console.log(`     - [${v.vasType}] ${v.product?.name || 'Unknown'} (${v.supplierProductId})`);
        }
      }

      if (toDeactivate.length === 0) {
        console.log(`  ✅ No ${supplierKey} products reached ${REQUIRED_MISSES} consecutive misses — none deactivated.`);
        return;
      }

      console.log(`  🗑️  ${toDeactivate.length} ${supplierKey} variant(s) missed ${REQUIRED_MISSES}+ sweeps — deactivating:`);
      for (const v of toDeactivate) {
        console.log(`     - [${v.vasType}] ${v.product?.name || 'Unknown'} (${v.supplierProductId})`);
      }

      const deactivateIds = toDeactivate.map(v => v.id);
      await ProductVariant.update(
        { status: 'inactive', updatedAt: new Date() },
        { where: { id: { [Op.in]: deactivateIds } } }
      );

      // Deactivate parent products with no remaining active variants from this supplier
      const orphanedProducts = await Product.findAll({
        where: {
          supplierId: supplier.id,
          status: 'active',
          id: { [Op.notIn]: sequelize.literal(
            `(SELECT DISTINCT "productId" FROM product_variants WHERE "supplierId" = ${supplier.id} AND status = 'active')`
          )}
        }
      });

      if (orphanedProducts.length > 0) {
        await Product.update(
          { status: 'inactive', updatedAt: new Date() },
          { where: { id: { [Op.in]: orphanedProducts.map(p => p.id) } } }
        );
      }

      this.syncStats.decommissionedProducts += toDeactivate.length;
      console.log(`  ✅ Deactivated ${toDeactivate.length} variant(s) and ${orphanedProducts.length} parent product(s) for ${supplierKey}. ${toWarn.length} warned (1st miss).`);
    } catch (error) {
      console.error(`  ❌ Stale product cleanup failed for ${supplierKey}:`, error.message);
      this.syncStats.errors++;
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
    const provider = mmProduct.contentCreator || mmProduct.provider || 'Unknown';
    const productName = mmProduct.productName || mmProduct.name || '';
    const commInfo = this.getMobileMartContractualCommission(vasType, provider, productName);

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
      provider: provider,
      
      // Amount constraints
      minAmount: minAmount,
      maxAmount: maxAmount,
      predefinedAmounts: hasFixedAmount && typeof baseAmountCents === 'number' ? [baseAmountCents] : null,
      
      commission: commInfo.commission,
      fixedFee: commInfo.fixedFee,
      commissionType: commInfo.commissionType,
      
      // Promotional
      isPromotional: mmProduct.isPromotional || false,
      promotionalDiscount: mmProduct.promotionalDiscount || null,
      
      // Priority and status
      priority: 2, // MobileMart is secondary supplier
      status: mmProduct.isActive !== false ? 'active' : 'inactive',
      
      // Price type (variable vs fixed) — needed for best-offers airtime filtering
      priceType: hasFixedAmount ? 'fixed' : 'variable',

      // Denominations
      denominations: denominations,
      
      // Pricing structure
      pricing: {
        defaultCommissionRate: commInfo.pricingRate,
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
      
      // Track seen IDs per supplier for stale cleanup
      const supplierKey = `MOBILEMART`;
      if (!this.seenProductIds[supplierKey]) this.seenProductIds[supplierKey] = new Set();

      // Sync each product
      for (const mmProduct of products) {
        try {
          await this.syncMobileMartProduct(mmProduct, vasType, supplier);
          const pid = (mmProduct.merchantProductId || '').toString();
          if (pid) this.seenProductIds[supplierKey].add(pid);
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
      
      // Create or update ProductVariant (match on unique constraint fields)
      const [productVariant, variantCreated] = await ProductVariant.findOrCreate({
        where: {
          productId: product.id,
          supplierId: supplier.id,
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
      await this.queueGovernanceMapping(productVariant.id);
      
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
   * Refresh the v_best_offers materialized view after catalog changes.
   */
  async updateCatalogCache() {
    await _catalogServiceInstance.refreshView();
  }

  async queueGovernanceMapping(variantId) {
    try {
      const variant = await ProductVariant.findByPk(variantId, {
        include: [
          { model: Product, as: 'product' },
          { model: Supplier, as: 'supplier' },
        ],
      });
      if (!variant) return;
      await _catalogGovernanceService.ensureMappingForVariant(variant, {
        id: 'catalog-sync',
        email: 'system@mymoolah.internal',
        role: 'system',
      });
    } catch (error) {
      // Governance must never block raw supplier sync; unmapped SKUs remain hidden until reviewed.
      console.warn(`⚠️ Catalog governance queue skipped for variant ${variantId}: ${error.message}`);
    }
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
    this.seenProductIds = {};
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





