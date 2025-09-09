/**
 * Database Performance Configuration
 * 
 * Banking-grade database optimization for handling millions of transactions
 * Includes connection pooling, query optimization, and monitoring settings
 */

module.exports = {
  // ========================================
  // CONNECTION POOL OPTIMIZATION
  // ========================================
  pool: {
    // Production settings for millions of transactions
    max: 20,                    // Maximum connections in pool
    min: 5,                     // Minimum connections in pool
    acquire: 60000,             // Maximum time to acquire connection (60s)
    idle: 10000,                // Maximum time connection can be idle (10s)
    evict: 60000,               // Remove idle connections after 60s
    handleDisconnects: true,    // Handle disconnections gracefully
    validate: async (connection) => {
      // Validate connection is still alive
      try {
        await connection.query('SELECT 1');
        return true;
      } catch (error) {
        return false;
      }
    }
  },

  // ========================================
  // QUERY OPTIMIZATION
  // ========================================
  dialectOptions: {
    // PostgreSQL specific optimizations
    statement_timeout: 30000,   // 30 second query timeout
    idle_in_transaction_session_timeout: 30000, // 30 second idle timeout
    connect_timeout: 10000,     // 10 second connection timeout
    
    // Connection pooling optimizations
    max: 20,
    min: 5,
    acquire: 60000,
    idle: 10000,
    
    // SSL configuration (for production)
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },

  // ========================================
  // LOGGING & MONITORING
  // ========================================
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // Query performance monitoring
  benchmark: process.env.NODE_ENV === 'development',
  
  // ========================================
  // TRANSACTION OPTIMIZATION
  // ========================================
  transaction: {
    isolationLevel: 'READ_COMMITTED', // Balance between performance and consistency
    deferrable: false
  },

  // ========================================
  // SCHEMA OPTIMIZATION RECOMMENDATIONS
  // ========================================
  schemaOptimizations: {
    // Critical indexes needed for scale (to be created by DBA)
    requiredIndexes: [
      // Transactions table
      'CREATE INDEX CONCURRENTLY idx_transactions_user_created ON transactions("userId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY idx_transactions_wallet_created ON transactions("walletId", "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY idx_transactions_status_created ON transactions(status, "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY idx_transactions_type_created ON transactions(type, "createdAt" DESC)',
      'CREATE UNIQUE INDEX CONCURRENTLY idx_transactions_transaction_id ON transactions("transactionId")',
      
      // Wallets table
      'CREATE INDEX CONCURRENTLY idx_wallets_user_status ON wallets("userId", status)',
      'CREATE INDEX CONCURRENTLY idx_wallets_balance_active ON wallets(balance) WHERE status = \'active\'',
      
      // Users table
      'CREATE INDEX CONCURRENTLY idx_users_phone_number ON users("phoneNumber") WHERE "phoneNumber" IS NOT NULL',
      'CREATE INDEX CONCURRENTLY idx_users_account_number ON users("accountNumber") WHERE "accountNumber" IS NOT NULL',
      'CREATE INDEX CONCURRENTLY idx_users_kyc_status ON users("kycStatus", "kycVerifiedAt" DESC)',
      
      // KYC table
      'CREATE INDEX CONCURRENTLY idx_kyc_user_status ON kyc("userId", status)',
      'CREATE INDEX CONCURRENTLY idx_kyc_validation_status ON kyc("validationStatus", "createdAt" DESC)',
      
      // Vouchers table
      'CREATE INDEX CONCURRENTLY idx_vouchers_user_status_created ON vouchers("userId", status, "createdAt" DESC)',
      'CREATE INDEX CONCURRENTLY idx_vouchers_status_expires ON vouchers(status, "expiresAt")'
    ],

    // Partitioning strategy for millions of transactions
    partitioning: {
      transactions: {
        strategy: 'RANGE',
        column: 'createdAt',
        partitions: [
          'PARTITION transactions_2025_01 VALUES LESS THAN (\'2025-02-01\')',
          'PARTITION transactions_2025_02 VALUES LESS THAN (\'2025-03-01\')',
          'PARTITION transactions_2025_03 VALUES LESS THAN (\'2025-04-01\')',
          'PARTITION transactions_2025_04 VALUES LESS THAN (\'2025-05-01\')',
          'PARTITION transactions_2025_05 VALUES LESS THAN (\'2025-06-01\')',
          'PARTITION transactions_2025_06 VALUES LESS THAN (\'2025-07-01\')',
          'PARTITION transactions_2025_07 VALUES LESS THAN (\'2025-08-01\')',
          'PARTITION transactions_2025_08 VALUES LESS THAN (\'2025-09-01\')',
          'PARTITION transactions_2025_09 VALUES LESS THAN (\'2025-10-01\')',
          'PARTITION transactions_2025_10 VALUES LESS THAN (\'2025-11-01\')',
          'PARTITION transactions_2025_11 VALUES LESS THAN (\'2025-12-01\')',
          'PARTITION transactions_2025_12 VALUES LESS THAN (\'2026-01-01\')'
        ]
      }
    },

    // Data retention and archiving strategy
    retention: {
      transactions: {
        hot: '3 months',      // Keep in main table
        warm: '1 year',       // Move to archive table
        cold: '7 years',      // Move to cold storage
        delete: '10 years'    // Delete permanently
      },
      logs: {
        hot: '1 month',
        warm: '6 months',
        cold: '2 years',
        delete: '5 years'
      }
    }
  },

  // ========================================
  // PERFORMANCE MONITORING
  // ========================================
  monitoring: {
    // Query performance thresholds
    slowQueryThreshold: 1000,  // 1 second
    verySlowQueryThreshold: 5000, // 5 seconds
    
    // Connection pool monitoring
    poolMonitoring: {
      enabled: true,
      interval: 60000, // 1 minute
      alerts: {
        highUtilization: 0.8,  // 80%
        lowConnections: 2,     // Less than 2 available
        connectionErrors: 10   // More than 10 errors per minute
      }
    },

    // Database health checks
    healthChecks: {
      enabled: true,
      interval: 300000, // 5 minutes
      queries: [
        'SELECT COUNT(*) FROM transactions WHERE "createdAt" > NOW() - INTERVAL \'1 hour\'',
        'SELECT COUNT(*) FROM wallets WHERE status = \'active\'',
        'SELECT COUNT(*) FROM users WHERE "kycStatus" = \'verified\''
      ]
    }
  },

  // ========================================
  // CACHING STRATEGY
  // ========================================
  caching: {
    // Redis configuration for caching
    redis: {
      enabled: process.env.REDIS_ENABLED === 'true',
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD,
      db: process.env.REDIS_DB || 0,
      
      // Cache TTL settings
      ttl: {
        userProfile: 3600,        // 1 hour
        walletBalance: 300,       // 5 minutes
        transactionHistory: 1800, // 30 minutes
        kycStatus: 7200,          // 2 hours
        vasProducts: 3600,        // 1 hour
        supplierRates: 1800       // 30 minutes
      }
    },

    // In-memory caching fallback
    memory: {
      enabled: true,
      maxSize: 1000,              // Maximum items in cache
      ttl: 300000                 // 5 minutes default TTL
    }
  }
};
