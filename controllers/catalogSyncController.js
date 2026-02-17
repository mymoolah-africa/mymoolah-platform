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
        error: 'Failed to get catalog synchronization status'
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
        error: 'Failed to trigger daily catalog sweep'
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
        error: 'Failed to trigger frequent catalog update'
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
        error: 'Failed to start catalog synchronization service'
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
        error: 'Failed to stop catalog synchronization service'
      });
    }
  }

  /**
   * Refresh vas_best_offers table (pre-computed best product per denomination)
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

      const { refreshBestOffers } = require('../scripts/refresh-vas-best-offers');
      const result = await refreshBestOffers();

      res.json({
        success: true,
        message: 'vas_best_offers refreshed successfully',
        data: {
          rowsAffected: result.rowsAffected,
          catalogVersion: result.catalogVersion,
          refreshedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error refreshing vas_best_offers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to refresh vas_best_offers',
        message: error.message
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
        error: 'Failed to get synchronization statistics'
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
        error: 'Catalog synchronization service health check failed'
      });
    }
  }
}

module.exports = CatalogSyncController;





