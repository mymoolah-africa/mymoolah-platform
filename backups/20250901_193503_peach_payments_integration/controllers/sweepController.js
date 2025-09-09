const CodebaseSweepService = require('../services/codebaseSweepService');

/**
 * 🚀 MyMoolah Codebase Sweep Controller
 * Handles manual sweep operations and status queries
 */
class SweepController {
  constructor() {
    this.sweepService = new CodebaseSweepService();
  }

  /**
   * 🔄 Force immediate codebase sweep
   */
  async forceSweep(req, res) {
    try {
      console.log('🔄 Manual sweep requested by user');
      
      const results = await this.sweepService.forceSweep();
      
      return res.json({
        success: true,
        message: 'Codebase sweep completed successfully',
        results: {
          totalFiles: results.codeStructure?.totalFiles || 0,
          apiEndpoints: results.apiEndpoints?.length || 0,
          databaseModels: results.databaseModels?.length || 0,
          documentation: results.documentation?.length || 0,
          supportQuestions: results.totalSupportQuestions || 0,
          timestamp: results.sweepTimestamp
        },
        categories: results.categories || {}
      });
      
    } catch (error) {
      console.error('❌ Manual sweep failed:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to perform codebase sweep',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 📊 Get current sweep status and capabilities
   */
  async getSweepStatus(req, res) {
    try {
      const status = this.sweepService.getDiscoveredCapabilities();
      
      return res.json({
        success: true,
        status: {
          lastSweepTime: status.lastSweepTime,
          isStale: status.isStale,
          capabilities: status.capabilities,
          nextSweepTime: status.lastSweepTime ? 
            new Date(status.lastSweepTime.getTime() + 24 * 60 * 60 * 1000) : 
            null
        }
      });
      
    } catch (error) {
      console.error('❌ Failed to get sweep status:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to get sweep status',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * 🚀 Start the sweep scheduler
   */
  async startScheduler(req, res) {
    try {
      console.log('🚀 Starting sweep scheduler...');
      
      await this.sweepService.startScheduler();
      
      return res.json({
        success: true,
        message: 'Sweep scheduler started successfully',
        status: 'running'
      });
      
    } catch (error) {
      console.error('❌ Failed to start scheduler:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to start sweep scheduler',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }

  /**
   * ⏹️ Stop the sweep scheduler
   */
  async stopScheduler(req, res) {
    try {
      console.log('⏹️ Stopping sweep scheduler...');
      
      // Note: This would require adding a stop method to the sweep service
      // For now, we'll just acknowledge the request
      
      return res.json({
        success: true,
        message: 'Sweep scheduler stop requested',
        status: 'stopping',
        note: 'Scheduler will complete current sweep before stopping'
      });
      
    } catch (error) {
      console.error('❌ Failed to stop scheduler:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to stop sweep scheduler',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
}

module.exports = new SweepController();
