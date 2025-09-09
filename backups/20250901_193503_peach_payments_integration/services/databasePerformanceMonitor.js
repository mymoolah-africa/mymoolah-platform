/**
 * Database Performance Monitor
 * 
 * Banking-grade database monitoring for millions of transactions
 * Tracks performance, health, and provides alerts for critical issues
 */

const { sequelize } = require('../models');
const dbConfig = require('../config/database-performance');

class DatabasePerformanceMonitor {
  constructor() {
    this.metrics = {
      queryPerformance: [],
      connectionPool: {},
      slowQueries: [],
      errors: [],
      healthChecks: []
    };
    
    this.alerts = [];
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring() {
    if (this.isMonitoring) {
      console.log('⚠️ Database monitoring already running');
      return;
    }

    console.log('🔄 Starting database performance monitoring...');
    this.isMonitoring = true;

    // Start connection pool monitoring
    this.startConnectionPoolMonitoring();
    
    // Start health checks
    this.startHealthChecks();
    
    // Start query performance tracking
    this.startQueryPerformanceTracking();

    console.log('✅ Database performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring() {
    if (!this.isMonitoring) {
      console.log('⚠️ Database monitoring not running');
      return;
    }

    console.log('🔄 Stopping database performance monitoring...');
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('✅ Database performance monitoring stopped');
  }

  /**
   * Monitor connection pool health
   */
  startConnectionPoolMonitoring() {
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      try {
        const pool = sequelize.connectionManager.pool;
        if (!pool) {
          console.log('⚠️ Connection pool not available');
          return;
        }

        const poolStats = {
          total: pool.size,
          idle: pool.idle,
          active: pool.using.length,
          waiting: pool.waiting,
          utilization: pool.using.length / pool.size,
          timestamp: new Date().toISOString()
        };

        this.metrics.connectionPool = poolStats;

        // Check for alerts
        this.checkConnectionPoolAlerts(poolStats);

        // Log pool stats every 5 minutes
        if (new Date().getMinutes() % 5 === 0) {
          console.log('📊 Connection Pool Stats:', poolStats);
        }

      } catch (error) {
        console.error('❌ Connection pool monitoring error:', error);
        this.addAlert('CONNECTION_POOL_ERROR', error.message);
      }
    }, dbConfig.monitoring.poolMonitoring.interval);

    this.monitoringInterval = interval;
  }

  /**
   * Start health checks
   */
  startHealthChecks() {
    const interval = setInterval(async () => {
      if (!this.isMonitoring) {
        clearInterval(interval);
        return;
      }

      try {
        const healthResults = await this.runHealthChecks();
        this.metrics.healthChecks.push({
          timestamp: new Date().toISOString(),
          results: healthResults
        });

        // Keep only last 100 health checks
        if (this.metrics.healthChecks.length > 100) {
          this.metrics.healthChecks = this.metrics.healthChecks.slice(-100);
        }

        console.log('🏥 Database Health Check:', healthResults);

      } catch (error) {
        console.error('❌ Health check error:', error);
        this.addAlert('HEALTH_CHECK_ERROR', error.message);
      }
    }, dbConfig.monitoring.healthChecks.interval);
  }

  /**
   * Run database health checks
   */
  async runHealthChecks() {
    const results = {};

    for (const query of dbConfig.monitoring.healthChecks.queries) {
      try {
        const startTime = Date.now();
        const [result] = await sequelize.query(query);
        const duration = Date.now() - startTime;

        results[query] = {
          success: true,
          count: result[0]?.count || 0,
          duration: duration
        };

        // Check for slow queries
        if (duration > dbConfig.monitoring.slowQueryThreshold) {
          this.addAlert('SLOW_HEALTH_CHECK', `Query took ${duration}ms: ${query}`);
        }

      } catch (error) {
        results[query] = {
          success: false,
          error: error.message,
          duration: 0
        };
        this.addAlert('HEALTH_CHECK_FAILED', `Query failed: ${query} - ${error.message}`);
      }
    }

    return results;
  }

  /**
   * Start query performance tracking
   */
  startQueryPerformanceTracking() {
    // Override Sequelize logging to track query performance
    const originalLogging = sequelize.options.logging;
    
    sequelize.options.logging = (sql, timing) => {
      if (originalLogging) {
        originalLogging(sql, timing);
      }

      // Track query performance
      this.trackQueryPerformance(sql, timing);
    };
  }

  /**
   * Track individual query performance
   */
  trackQueryPerformance(sql, timing) {
    const queryInfo = {
      sql: sql.substring(0, 200) + (sql.length > 200 ? '...' : ''), // Truncate for logging
      duration: timing,
      timestamp: new Date().toISOString()
    };

    this.metrics.queryPerformance.push(queryInfo);

    // Keep only last 1000 queries
    if (this.metrics.queryPerformance.length > 1000) {
      this.metrics.queryPerformance = this.metrics.queryPerformance.slice(-1000);
    }

    // Check for slow queries
    if (timing > dbConfig.monitoring.slowQueryThreshold) {
      this.metrics.slowQueries.push(queryInfo);
      
      if (timing > dbConfig.monitoring.verySlowQueryThreshold) {
        this.addAlert('VERY_SLOW_QUERY', `Query took ${timing}ms: ${queryInfo.sql}`);
      } else {
        this.addAlert('SLOW_QUERY', `Query took ${timing}ms: ${queryInfo.sql}`);
      }
    }
  }

  /**
   * Check connection pool alerts
   */
  checkConnectionPoolAlerts(poolStats) {
    const alerts = dbConfig.monitoring.poolMonitoring.alerts;

    // High utilization alert
    if (poolStats.utilization > alerts.highUtilization) {
      this.addAlert('HIGH_POOL_UTILIZATION', 
        `Connection pool utilization: ${(poolStats.utilization * 100).toFixed(1)}%`);
    }

    // Low available connections alert
    if (poolStats.idle < alerts.lowConnections) {
      this.addAlert('LOW_AVAILABLE_CONNECTIONS', 
        `Only ${poolStats.idle} connections available`);
    }
  }

  /**
   * Add alert
   */
  addAlert(type, message) {
    const alert = {
      type,
      message,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Log critical alerts
    if (alert.severity === 'CRITICAL') {
      console.error(`🚨 CRITICAL ALERT [${type}]: ${message}`);
    } else if (alert.severity === 'HIGH') {
      console.warn(`⚠️ HIGH ALERT [${type}]: ${message}`);
    } else {
      console.log(`ℹ️ INFO [${type}]: ${message}`);
    }
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type) {
    const criticalAlerts = ['CONNECTION_POOL_ERROR', 'VERY_SLOW_QUERY', 'HEALTH_CHECK_FAILED'];
    const highAlerts = ['HIGH_POOL_UTILIZATION', 'LOW_AVAILABLE_CONNECTIONS', 'SLOW_QUERY'];
    
    if (criticalAlerts.includes(type)) return 'CRITICAL';
    if (highAlerts.includes(type)) return 'HIGH';
    return 'INFO';
  }

  /**
   * Get performance metrics
   */
  getMetrics() {
    return {
      connectionPool: this.metrics.connectionPool,
      healthChecks: this.metrics.healthChecks.slice(-10), // Last 10 health checks
      slowQueries: this.metrics.slowQueries.slice(-20),   // Last 20 slow queries
      alerts: this.alerts.slice(-20),                     // Last 20 alerts
      queryPerformance: {
        total: this.metrics.queryPerformance.length,
        average: this.calculateAverageQueryTime(),
        slowQueries: this.metrics.slowQueries.length
      }
    };
  }

  /**
   * Calculate average query time
   */
  calculateAverageQueryTime() {
    if (this.metrics.queryPerformance.length === 0) return 0;
    
    const total = this.metrics.queryPerformance.reduce((sum, query) => sum + query.duration, 0);
    return Math.round(total / this.metrics.queryPerformance.length);
  }

  /**
   * Get database health status
   */
  async getHealthStatus() {
    try {
      // Test database connection
      await sequelize.authenticate();
      
      const metrics = this.getMetrics();
      const poolStats = metrics.connectionPool;
      
      // Determine overall health
      let status = 'healthy';
      let issues = [];

      if (poolStats.utilization > 0.8) {
        status = 'warning';
        issues.push('High connection pool utilization');
      }

      if (poolStats.idle < 2) {
        status = 'warning';
        issues.push('Low available connections');
      }

      if (metrics.alerts.some(alert => alert.severity === 'CRITICAL')) {
        status = 'critical';
        issues.push('Critical alerts detected');
      }

      return {
        status,
        timestamp: new Date().toISOString(),
        issues,
        metrics
      };

    } catch (error) {
      return {
        status: 'critical',
        timestamp: new Date().toISOString(),
        issues: ['Database connection failed'],
        error: error.message
      };
    }
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const recommendations = [];
    const metrics = this.getMetrics();

    // Connection pool recommendations
    if (metrics.connectionPool.utilization > 0.7) {
      recommendations.push({
        type: 'CONNECTION_POOL',
        priority: 'HIGH',
        message: 'Consider increasing connection pool size or optimizing queries',
        action: 'Increase pool.max in database configuration'
      });
    }

    // Slow query recommendations
    if (metrics.slowQueries.length > 10) {
      recommendations.push({
        type: 'QUERY_PERFORMANCE',
        priority: 'HIGH',
        message: 'Multiple slow queries detected. Review and optimize database queries',
        action: 'Add database indexes or optimize query patterns'
      });
    }

    // Index recommendations
    recommendations.push({
      type: 'SCHEMA_OPTIMIZATION',
      priority: 'MEDIUM',
      message: 'Ensure critical indexes are created for scale',
      action: 'Review and create recommended indexes from database-performance.js'
    });

    return recommendations;
  }
}

// Create singleton instance
const databasePerformanceMonitor = new DatabasePerformanceMonitor();

module.exports = databasePerformanceMonitor;
