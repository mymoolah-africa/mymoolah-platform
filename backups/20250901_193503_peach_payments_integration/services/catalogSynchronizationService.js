'use strict';

const { Product, ProductBrand, Supplier, sequelize } = require('../models');
const { Op } = require('sequelize');
const supplierPricingService = require('./supplierPricingService');
const notificationService = require('./notificationService');

class CatalogSynchronizationService {
  constructor() {
    this.isRunning = false;
    this.dailySweepInterval = null;
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
   * Stop the catalog synchronization service
   */
  stop() {
    if (!this.isRunning) {
      console.log('🔄 Catalog synchronization service not running');
      return;
    }

    console.log('🛑 Stopping catalog synchronization service...');
    this.isRunning = false;

    if (this.dailySweepInterval) {
      clearInterval(this.dailySweepInterval);
      this.dailySweepInterval = null;
    }

    if (this.frequentUpdateInterval) {
      clearInterval(this.frequentUpdateInterval);
      this.frequentUpdateInterval = null;
    }

    console.log('✅ Catalog synchronization service stopped');
  }

  /**
   * Schedule daily sweep at 02:00 local time
   */
  scheduleDailySweep() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 02:00 local time

    const timeUntilSweep = tomorrow.getTime() - now.getTime();

    // Schedule the first sweep
    setTimeout(() => {
      this.performDailySweep();
      // Then schedule it to run every 24 hours
      this.dailySweepInterval = setInterval(() => {
        this.performDailySweep();
      }, 24 * 60 * 60 * 1000); // 24 hours
    }, timeUntilSweep);

    console.log(`📅 Daily catalog sweep scheduled for ${tomorrow.toLocaleString()}`);
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
   * Sweep Flash catalog for new products, specials, and decommissioned products
   */
  async sweepFlashCatalog(supplier) {
    // This would integrate with Flash API to get current catalog
    // For now, simulate the process
    
    console.log(`🔄 Sweeping Flash catalog...`);
    
    // Simulate API call to Flash
    const flashCatalog = await this.fetchFlashCatalog();
    
    // Process new products
    for (const product of flashCatalog.newProducts) {
      await this.addOrUpdateProduct(supplier, product);
      this.syncStats.newProducts++;
    }

    // Process specials
    for (const special of flashCatalog.specials) {
      await this.updateProductSpecial(supplier, special);
      this.syncStats.updatedProducts++;
    }

    // Process decommissioned products
    for (const decommissioned of flashCatalog.decommissioned) {
      await this.decommissionProduct(supplier, decommissioned);
      this.syncStats.decommissionedProducts++;
    }
  }

  /**
   * Update Flash pricing
   */
  async updateFlashPricing(supplier) {
    // This would integrate with Flash API to get current pricing
    console.log(`💰 Updating Flash pricing...`);
    
    // Simulate API call to Flash
    const flashPricing = await this.fetchFlashPricing();
    
    // Update product pricing
    for (const pricing of flashPricing) {
      await this.updateProductPricing(supplier, pricing);
    }
  }

  /**
   * Sweep MobileMart catalog
   */
  async sweepMobileMartCatalog(supplier) {
    console.log(`🔄 Sweeping MobileMart catalog...`);
    
    // Similar implementation for MobileMart
    // This would integrate with MobileMart API
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

  // Mock methods for demonstration (replace with actual API calls)
  async fetchFlashCatalog() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      newProducts: [],
      specials: [],
      decommissioned: []
    };
  }

  async fetchFlashPricing() {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return [];
  }
}

module.exports = CatalogSynchronizationService;



