'use strict';

const CatalogSynchronizationService = require('../services/catalogSynchronizationService');

class CatalogSyncController {
  constructor() {
    this.catalogSyncService = new CatalogSynchronizationService();
  }

  /**
   * Get catalog synchronization service status
   */
  async getStatus(req, res) {
    try {
      const status = this.catalogSyncService.getStatus();
      
      res.json({
        success: true,
        data: {
          ...status,
          nextSweepTime: this.calculateNextSweepTime(),
          nextUpdateTime: this.calculateNextUpdateTime()
        }
      });
    } catch (error) {
      console.error('Error getting catalog sync status:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get catalog synchronization status',
        errorCode: 'CATALOG_STATUS_FAILED'
      });
    }
  }

  /**
   * Trigger manual daily sweep
   */
  async triggerDailySweep(req, res) {
    try {
      // Check if user has admin privileges
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      console.log(`🔄 Manual daily sweep triggered by admin user: ${req.user.id}`);
      
      // Trigger the sweep asynchronously
      this.catalogSyncService.triggerDailySweep()
        .then(() => {
          console.log('✅ Manual daily sweep completed successfully');
        })
        .catch((error) => {
          console.error('❌ Manual daily sweep failed:', error);
        });

      res.json({
        success: true,
        message: 'Daily catalog sweep triggered successfully',
        data: {
          triggeredAt: new Date().toISOString(),
          triggeredBy: req.user.id
        }
      });
    } catch (error) {
      console.error('Error triggering daily sweep:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger daily catalog sweep',
        errorCode: 'DAILY_SWEEP_TRIGGER_FAILED'
      });
    }
  }

  /**
   * Trigger manual frequent update
   */
  async triggerFrequentUpdate(req, res) {
    try {
      // Check if user has admin privileges
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      console.log(`🔄 Manual frequent update triggered by admin user: ${req.user.id}`);
      
      // Trigger the update asynchronously
      this.catalogSyncService.triggerFrequentUpdate()
        .then(() => {
          console.log('✅ Manual frequent update completed successfully');
        })
        .catch((error) => {
          console.error('❌ Manual frequent update failed:', error);
        });

      res.json({
        success: true,
        message: 'Frequent catalog update triggered successfully',
        data: {
          triggeredAt: new Date().toISOString(),
          triggeredBy: req.user.id
        }
      });
    } catch (error) {
      console.error('Error triggering frequent update:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to trigger frequent catalog update',
        errorCode: 'FREQUENT_UPDATE_TRIGGER_FAILED'
      });
    }
  }

  /**
   * Start catalog synchronization service
   */
  async startService(req, res) {
    try {
      // Check if user has admin privileges
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      this.catalogSyncService.start();

      res.json({
        success: true,
        message: 'Catalog synchronization service started successfully',
        data: {
          startedAt: new Date().toISOString(),
          startedBy: req.user.id
        }
      });
    } catch (error) {
      console.error('Error starting catalog sync service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start catalog synchronization service',
        errorCode: 'CATALOG_START_FAILED'
      });
    }
  }

  /**
   * Stop catalog synchronization service
   */
  async stopService(req, res) {
    try {
      // Check if user has admin privileges
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      this.catalogSyncService.stop();

      res.json({
        success: true,
        message: 'Catalog synchronization service stopped successfully',
        data: {
          stoppedAt: new Date().toISOString(),
          stoppedBy: req.user.id
        }
      });
    } catch (error) {
      console.error('Error stopping catalog sync service:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to stop catalog synchronization service',
        errorCode: 'CATALOG_STOP_FAILED'
      });
    }
  }

  /**
   * Refresh v_best_offers materialized view (commission-based supplier selection).
   * Also refreshes legacy vas_best_offers table for backward compatibility.
   * Run after manual catalog sync. Also runs automatically after daily sweep.
   */
  async refreshBestOffers(req, res) {
    try {
      if (req.user && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          error: 'Admin privileges required'
        });
      }

      const ProductCatalogService = require('../services/productCatalogService');
      const catalogService = new ProductCatalogService();

      await catalogService.refreshView();

      let legacyResult = null;
      try {
        const { refreshBestOffers } = require('../scripts/refresh-vas-best-offers');
        legacyResult = await refreshBestOffers();
      } catch (legacyErr) {
        console.warn('Legacy vas_best_offers refresh skipped:', legacyErr.message);
      }

      res.json({
        success: true,
        message: 'v_best_offers materialized view refreshed successfully',
        data: {
          viewRefreshed: true,
          legacyRefreshed: !!legacyResult,
          legacyRowsAffected: legacyResult?.rowsAffected || 0,
          refreshedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error refreshing best offers:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to refresh best offers view',
        errorCode: 'BEST_OFFERS_REFRESH_FAILED'
      });
    }
  }

  /**
   * Get synchronization statistics
   */
  async getSyncStats(req, res) {
    try {
      const status = this.catalogSyncService.getStatus();
      
      res.json({
        success: true,
        data: {
          syncStats: status.syncStats,
          lastSweepTime: status.lastSweepTime,
          lastUpdateTime: status.lastUpdateTime,
          isRunning: status.isRunning
        }
      });
    } catch (error) {
      console.error('Error getting sync stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get synchronization statistics',
        errorCode: 'SYNC_STATS_FAILED'
      });
    }
  }

  /**
   * Calculate next sweep time (02:00 local time)
   */
  calculateNextSweepTime() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(2, 0, 0, 0); // 02:00 local time
    
    return tomorrow.toISOString();
  }

  /**
   * Calculate next update time (every 10 minutes)
   */
  calculateNextUpdateTime() {
    const now = new Date();
    const nextUpdate = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes from now
    
    return nextUpdate.toISOString();
  }

  /**
   * Cloud Scheduler-triggered sweep — runs synchronously within the HTTP
   * request lifecycle so Cloud Run keeps the instance alive for the full
   * duration. Returns detailed results when complete.
   *
   * Auth: OIDC token verified by cloudSchedulerAuth middleware (not JWT).
   */
  async scheduledSweep(req, res) {
    const startTime = Date.now();
    const triggeredBy = req.schedulerAuth
      ? req.schedulerAuth.email
      : (req.user ? req.user.id : 'unknown');

    console.log(`🔄 Cloud Scheduler sweep triggered by: ${triggeredBy}`);

    try {
      const wasRunning = this.catalogSyncService.isRunning;
      if (!wasRunning) this.catalogSyncService.isRunning = true;

      await this.catalogSyncService.performDailySweep();

      if (!wasRunning) this.catalogSyncService.isRunning = false;

      const durationMs = Date.now() - startTime;
      const stats = this.catalogSyncService.getStatus();

      console.log(`✅ Cloud Scheduler sweep completed in ${durationMs}ms`);

      res.json({
        success: true,
        message: 'Catalog sweep completed',
        data: {
          durationMs,
          triggeredBy,
          completedAt: new Date().toISOString(),
          syncStats: stats.syncStats,
        },
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      console.error(`❌ Cloud Scheduler sweep failed after ${durationMs}ms:`, error.message);

      res.status(500).json({
        success: false,
        message: 'Catalog sweep failed',
        errorCode: 'CATALOG_SWEEP_FAILED',
        data: { durationMs, triggeredBy },
      });
    }
  }

  /**
   * Health check for catalog synchronization service
   */
  async healthCheck(req, res) {
    try {
      const status = this.catalogSyncService.getStatus();
      
      const health = {
        status: status.isRunning ? 'healthy' : 'stopped',
        timestamp: new Date().toISOString(),
        service: 'catalog-synchronization',
        lastSweepTime: status.lastSweepTime,
        lastUpdateTime: status.lastUpdateTime,
        syncStats: status.syncStats
      };

      res.json({
        success: true,
        data: health
      });
    } catch (error) {
      console.error('Error in catalog sync health check:', error);
      res.status(500).json({
        success: false,
        message: 'Catalog synchronization health check failed',
        errorCode: 'CATALOG_HEALTH_CHECK_FAILED'
      });
    }
  }
}

module.exports = CatalogSyncController;





