const express = require('express');
const router = express.Router();
const databasePerformanceMonitor = require('../services/databasePerformanceMonitor');
const cachingService = require('../services/cachingService');
const { sequelize } = require('../models');

/**
 * @route GET /api/v1/monitoring/health
 * @desc Get comprehensive system health status
 * @access Private
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await databasePerformanceMonitor.getHealthStatus();
    const metrics = databasePerformanceMonitor.getMetrics();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      health: healthStatus,
      metrics: metrics,
      recommendations: databasePerformanceMonitor.getRecommendations()
    });
  } catch (error) {
    console.error('❌ Health check failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/performance
 * @desc Get detailed performance metrics
 * @access Private
 */
router.get('/performance', async (req, res) => {
  try {
    const metrics = databasePerformanceMonitor.getMetrics();
    const avgQueryTime = databasePerformanceMonitor.calculateAverageQueryTime();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      performance: {
        averageQueryTime: avgQueryTime,
        totalQueries: metrics.totalQueries,
        slowQueries: metrics.slowQueries,
        connectionPool: metrics.connectionPool,
        alerts: metrics.alerts
      }
    });
  } catch (error) {
    console.error('❌ Performance metrics failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Performance metrics failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/alerts
 * @desc Get current system alerts
 * @access Private
 */
router.get('/alerts', async (req, res) => {
  try {
    const metrics = databasePerformanceMonitor.getMetrics();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      alerts: metrics.alerts,
      alertCount: metrics.alerts.length
    });
  } catch (error) {
    console.error('❌ Alerts retrieval failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Alerts retrieval failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/database
 * @desc Get database-specific metrics
 * @access Private
 */
router.get('/database', async (req, res) => {
  try {
    // Get database connection info
    const connectionConfig = sequelize.config;
    const poolStats = await sequelize.connectionManager.pool;
    
    // Get table sizes
    const tableSizes = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });

    // Get index usage stats
    const indexStats = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        idx_scan,
        idx_tup_read,
        idx_tup_fetch
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC
      LIMIT 20
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      database: {
        connection: {
          host: connectionConfig.host,
          port: connectionConfig.port,
          database: connectionConfig.database,
          dialect: connectionConfig.dialect
        },
        pool: {
          total: poolStats.size,
          idle: poolStats.idle,
          waiting: poolStats.waiting
        },
        tables: tableSizes,
        indexes: indexStats
      }
    });
  } catch (error) {
    console.error('❌ Database metrics failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Database metrics failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/partitions
 * @desc Get partition usage statistics
 * @access Private
 */
router.get('/partitions', async (req, res) => {
  try {
    // Get partition usage stats
    const partitionStats = await sequelize.query(`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE tablename LIKE '%_2025_%' OR tablename LIKE '%_archive_%'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `, { type: sequelize.QueryTypes.SELECT });

    // Get archive table stats
    const archiveStats = await sequelize.query(`
      SELECT 
        'transactions_archive_warm' as table_name,
        COUNT(*) as record_count
      FROM transactions_archive_warm
      UNION ALL
      SELECT 
        'transactions_archive_cold' as table_name,
        COUNT(*) as record_count
      FROM transactions_archive_cold
      UNION ALL
      SELECT 
        'vas_transactions_archive_warm' as table_name,
        COUNT(*) as record_count
      FROM vas_transactions_archive_warm
      UNION ALL
      SELECT 
        'vas_transactions_archive_cold' as table_name,
        COUNT(*) as record_count
      FROM vas_transactions_archive_cold
    `, { type: sequelize.QueryTypes.SELECT });

    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      partitions: {
        partitionStats: partitionStats,
        archiveStats: archiveStats
      }
    });
  } catch (error) {
    console.error('❌ Partition metrics failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Partition metrics failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/cache
 * @desc Get cache performance metrics
 * @access Private
 */
router.get('/cache', async (req, res) => {
  try {
    const cacheStats = cachingService.getStats();
    const cacheHealth = await cachingService.healthCheck();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      cache: {
        health: cacheHealth,
        stats: cacheStats
      }
    });
  } catch (error) {
    console.error('❌ Cache metrics failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Cache metrics failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/v1/monitoring/cache/clear
 * @desc Clear all cache data
 * @access Private
 */
router.post('/cache/clear', async (req, res) => {
  try {
    const result = await cachingService.clear();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      message: 'Cache cleared successfully',
      result: result
    });
  } catch (error) {
    console.error('❌ Cache clear failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Cache clear failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/v1/monitoring/summary
 * @desc Get comprehensive monitoring summary
 * @access Private
 */
router.get('/summary', async (req, res) => {
  try {
    const healthStatus = await databasePerformanceMonitor.getHealthStatus();
    const metrics = databasePerformanceMonitor.getMetrics();
    const avgQueryTime = databasePerformanceMonitor.calculateAverageQueryTime();
    const cacheStats = cachingService.getStats();
    const cacheHealth = await cachingService.healthCheck();
    
    // Get system uptime
    const uptime = process.uptime();
    const uptimeFormatted = `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${Math.floor(uptime % 60)}s`;
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    res.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      summary: {
        system: {
          uptime: uptimeFormatted,
          uptimeSeconds: uptime,
          memory: {
            rss: `${Math.round(memoryUsage.rss / 1024 / 1024)} MB`,
            heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)} MB`
          }
        },
        database: {
          status: healthStatus.database,
          averageQueryTime: avgQueryTime,
          totalQueries: metrics.totalQueries,
          slowQueries: metrics.slowQueries,
          connectionPool: metrics.connectionPool
        },
        cache: {
          health: cacheHealth,
          stats: cacheStats
        },
        alerts: {
          count: metrics.alerts.length,
          critical: metrics.alerts.filter(a => a.severity === 'critical').length,
          warning: metrics.alerts.filter(a => a.severity === 'warning').length,
          info: metrics.alerts.filter(a => a.severity === 'info').length
        },
        recommendations: databasePerformanceMonitor.getRecommendations()
      }
    });
  } catch (error) {
    console.error('❌ Monitoring summary failed:', error);
    res.status(500).json({
      status: 'error',
      message: 'Monitoring summary failed',
      error: error.message
    });
  }
});

module.exports = router;
