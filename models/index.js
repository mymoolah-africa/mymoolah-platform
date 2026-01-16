'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
// CRITICAL: Load config but IGNORE dialectOptions.ssl - we'll set it explicitly
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  let url = process.env[config.use_env_variable];
  
  // CRITICAL: Log startup to verify models/index.js is loading
  console.log('📋 [models/index.js] Loading Sequelize configuration...');
  console.log(`📋 [models/index.js] DB_SSL env var: ${process.env.DB_SSL || 'NOT SET'}`);
  console.log(`📋 [models/index.js] NODE_ENV: ${process.env.NODE_ENV || 'NOT SET'}`);
  
  // Validate DATABASE_URL is set
  if (!url) {
    console.error(`❌ ERROR: ${config.use_env_variable} environment variable is not set!`);
    console.error('📋 Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')).join(', '));
    throw new Error(`${config.use_env_variable} environment variable is required but not set`);
  }
  
  // CRITICAL: Check DB_SSL environment variable first (most explicit and reliable)
  // If DB_SSL is explicitly set to false, disable SSL immediately
  const dbSslEnv = process.env.DB_SSL;
  // Use both console.log and process.stderr.write for Cloud Run visibility
  console.log(`📋 [models/index.js] DB_SSL value: "${dbSslEnv}" (type: ${typeof dbSslEnv}, undefined: ${dbSslEnv === undefined})`);
  process.stderr.write(`📋 [models/index.js] DB_SSL value: "${dbSslEnv}" (type: ${typeof dbSslEnv}, undefined: ${dbSslEnv === undefined})\n`);
  let shouldDisableSSL = false;
  let disableReason = '';
  
  if (dbSslEnv !== undefined) {
    // DB_SSL is set - use it explicitly
    const dbSslValue = dbSslEnv.toString().toLowerCase().trim();
    console.log(`📋 [models/index.js] DB_SSL processed value: "${dbSslValue}"`);
    process.stderr.write(`📋 [models/index.js] DB_SSL processed value: "${dbSslValue}"\n`);
    if (dbSslValue === 'false' || dbSslValue === '0' || dbSslValue === 'no' || dbSslValue === 'disable') {
      shouldDisableSSL = true;
      disableReason = 'DB_SSL environment variable set to false';
      console.log(`✅ SSL disabled via DB_SSL environment variable: ${dbSslEnv}`);
      process.stderr.write(`✅ SSL disabled via DB_SSL environment variable: ${dbSslEnv}\n`);
    } else {
      console.log(`ℹ️ DB_SSL environment variable set to: ${dbSslEnv} (SSL enabled)`);
    }
  }
  
  // If DB_SSL not set, fall back to URL-based detection
  if (!shouldDisableSSL) {
    // Check if SSL should be disabled (Unix socket, local proxy, or sslmode=disable in URL)
    // CRITICAL: Log DATABASE_URL format for debugging (redact password)
    const urlForLogging = url.replace(/:[^:@]+@/, ':****@');
    console.log(`📋 DATABASE_URL format: ${urlForLogging.substring(0, 100)}...`);
    console.log(`📋 DATABASE_URL includes /cloudsql/: ${url.includes('/cloudsql/')}`);
    console.log(`📋 DATABASE_URL includes sslmode=disable: ${url.includes('sslmode=disable')}`);
    
    try {
      const parsed = new URL(url);
      const host = (parsed.hostname || '').toLowerCase();
      const isLocalProxy = host === '127.0.0.1' || host === 'localhost';
      const isUnixSocket = !host || host === '' || url.includes('/cloudsql/');
      const hasSslModeDisable = url.includes('sslmode=disable');
      
      console.log(`📋 URL parsing succeeded - host: "${host}", isUnixSocket: ${isUnixSocket}, hasSslModeDisable: ${hasSslModeDisable}`);
      
      if (isLocalProxy) {
        shouldDisableSSL = true;
        disableReason = 'local proxy';
      } else if (isUnixSocket) {
        shouldDisableSSL = true;
        disableReason = 'Unix socket';
      } else if (hasSslModeDisable) {
        shouldDisableSSL = true;
        disableReason = 'sslmode=disable in URL';
      }
    } catch (urlError) {
      // If URL parsing fails, check for Unix socket indicators in the raw URL
      console.log(`📋 URL parsing failed (expected for Unix socket): ${urlError.message}`);
      if (url.includes('/cloudsql/') || url.includes('sslmode=disable')) {
        shouldDisableSSL = true;
        disableReason = 'Unix socket indicator or sslmode=disable detected';
        console.log(`✅ SSL detection: ${disableReason}`);
      }
    }
  }
  
  console.log(`📋 SSL detection result: shouldDisableSSL=${shouldDisableSSL}, reason="${disableReason}"`);
  process.stderr.write(`📋 SSL detection result: shouldDisableSSL=${shouldDisableSSL}, reason="${disableReason}"\n`);
  
  // CRITICAL: For Unix socket connections, ALWAYS ensure URL has sslmode=disable
  // Even if shouldDisableSSL is false, if URL contains /cloudsql/, force sslmode=disable
  if (shouldDisableSSL || url.includes('/cloudsql/')) {
    if (!url.includes('sslmode=')) {
      url += (url.includes('?') ? '&' : '?') + 'sslmode=disable';
    } else if (!url.includes('sslmode=disable')) {
      // Replace any existing sslmode with disable
      url = url.replace(/sslmode=[^&]*/, 'sslmode=disable');
    }
    console.log(`🔒 URL updated with sslmode=disable`);
    process.stderr.write(`🔒 URL updated with sslmode=disable\n`);
    // Force shouldDisableSSL to true if /cloudsql/ is present
    if (url.includes('/cloudsql/')) {
      shouldDisableSSL = true;
      disableReason = disableReason || 'Unix socket (/cloudsql/) detected';
    }
  }
  
  // Build dialectOptions - CRITICAL: Start fresh, don't merge from config.json
  // This prevents Sequelize from merging SSL settings from config.json
  let finalDialectOptions = {
    keepAlive: true,
    keepAliveInitialDelayMillis: 0
  };
  
  if (shouldDisableSSL) {
    // CRITICAL: For Unix socket connections, EXPLICITLY set ssl: false
    // The pg driver requires explicit ssl: false to disable SSL
    // Just removing the property or setting sslmode=disable in URL is not enough
    finalDialectOptions.ssl = false;
    console.log(`✅ SSL disabled for ${disableReason} connection - ssl explicitly set to false`);
    process.stderr.write(`✅ SSL disabled for ${disableReason} connection - ssl explicitly set to false\n`);
    console.log(`📋 Final dialectOptions:`, JSON.stringify(finalDialectOptions, null, 2));
    process.stderr.write(`📋 Final dialectOptions: ${JSON.stringify(finalDialectOptions)}\n`);
    console.log(`📋 URL has sslmode=disable: ${url.includes('sslmode=disable') ? '✅' : '❌'}`);
    process.stderr.write(`📋 URL has sslmode=disable: ${url.includes('sslmode=disable') ? '✅' : '❌'}\n`);
  } else {
    // For non-Unix socket connections, use SSL from config.json if needed
    if (config.dialectOptions && config.dialectOptions.ssl) {
      finalDialectOptions.ssl = config.dialectOptions.ssl;
    }
    console.log(`ℹ️ SSL enabled (not Unix socket or sslmode=disable)`);
  }
  
  // CRITICAL: For Unix socket connections, parse URL and use explicit connection parameters
  // This ensures SSL is completely disabled at the pg driver level
  // NOTE: Use outer sequelize variable (declared at top of file), don't redeclare
  
  // CRITICAL: For Unix socket connections, ALWAYS use explicit parameters
  // This completely bypasses URL parsing and config.json SSL settings
  if (url.includes('/cloudsql/')) {
    // Parse URL: postgres://user:pass@/db?host=/cloudsql/instance&sslmode=disable
    const urlMatch = url.match(/postgres:\/\/([^:]+):([^@]+)@\/([^?]+)\?host=([^&]+)/);
    if (urlMatch) {
      const [, username, password, database, socketPath] = urlMatch;
      const decodedPassword = decodeURIComponent(password);
      
      console.log(`🔧 FORCING explicit Unix socket connection (bypassing URL string)`);
      process.stderr.write(`🔧 FORCING explicit Unix socket connection (bypassing URL string)\n`);
      console.log(`📋 Database: ${database}, Host: ${socketPath}`);
      process.stderr.write(`📋 Database: ${database}, Host: ${socketPath}\n`);
      
      // Create Sequelize with explicit parameters - NO URL, NO config.json merge
      sequelize = new Sequelize(database, username, decodedPassword, {
        dialect: 'postgres',
        host: socketPath, // Unix socket path
        port: null, // No port for Unix socket
        dialectOptions: {
          // CRITICAL: Only include what we explicitly want - NO merge from config.json
          keepAlive: true,
          keepAliveInitialDelayMillis: 0,
          ssl: false // EXPLICITLY disable SSL - this is the key
        },
        pool: { 
          max: 20, 
          min: 2,
          acquire: 30000, 
          idle: 30000,
          evict: 10000
        },
        logging: false
      });
      
      console.log(`✅ Sequelize created with explicit parameters - SSL EXPLICITLY disabled`);
      process.stderr.write(`✅ Sequelize created with explicit parameters - SSL EXPLICITLY disabled\n`);
    } else {
      // If URL parsing fails, log error and throw
      const errorMsg = `❌ CRITICAL: Could not parse Unix socket URL: ${url.replace(/:[^:@]+@/, ':****@')}`;
      console.error(errorMsg);
      process.stderr.write(`${errorMsg}\n`);
      throw new Error('Failed to parse DATABASE_URL for Unix socket connection');
    }
  } else {
    // Standard TCP connection (not Unix socket) - use URL but still disable SSL if needed
    sequelize = new Sequelize(url, {
      dialect: 'postgres',
      dialectOptions: {
        ...finalDialectOptions,
        ssl: shouldDisableSSL ? false : (config.dialectOptions?.ssl || false)
      },
      pool: { 
        max: 20, 
        min: 2,
        acquire: 30000, 
        idle: 30000,
        evict: 10000
      },
      logging: false
    });
  }
  
  // Final verification log
  if (shouldDisableSSL) {
    console.log(`✅ Sequelize instance created with ssl disabled for Unix socket connection`);
    process.stderr.write(`✅ Sequelize instance created with ssl disabled for Unix socket connection\n`);
    console.log(`📋 Final URL: ${url.replace(/:[^:@]+@/, ':****@')}`);
    process.stderr.write(`📋 Final URL: ${url.replace(/:[^:@]+@/, ':****@')}\n`);
  }
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    // Optimized connection pool
    pool: { 
      max: 20, 
      min: 2,  // Keep 2 connections warm to avoid cold starts
      acquire: 30000, 
      idle: 30000,  // Increased from 10s to 30s to reduce connection churn
      evict: 10000  // Check for idle connections every 10s
    },
    dialectOptions: {
      ...(config.dialectOptions || {}),
      keepAlive: true,
      // TCP keepalive to prevent connection drops
      keepAliveInitialDelayMillis: 0
    },
    logging: false
  });
}

fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Add dtMercury models to exports
db.DtMercuryTransaction = require('./DtMercuryTransaction')(sequelize, Sequelize.DataTypes);
db.DtMercuryBank = require('./DtMercuryBank')(sequelize, Sequelize.DataTypes);

// Add PeachPayment model to exports
// Temporarily commented out to fix startup issue
// db.PeachPayment = require('./PeachPayment')(sequelize, Sequelize.DataTypes);

// Add Settlement and Float Account models to exports
db.SupplierFloat = require('./SupplierFloat')(sequelize, Sequelize.DataTypes);
db.Settlement = require('./Settlement')(sequelize, Sequelize.DataTypes);

// Add Client and Merchant Float Account models to exports
db.ClientFloat = require('./ClientFloat')(sequelize, Sequelize.DataTypes);
db.MerchantFloat = require('./MerchantFloat')(sequelize, Sequelize.DataTypes);

// Add unified MyMoolah Transaction model to exports
db.MyMoolahTransaction = require('./MyMoolahTransaction')(sequelize, Sequelize.DataTypes);

// Add Transaction model to exports
db.Transaction = require('./Transaction')(sequelize, Sequelize.DataTypes);

// Notifications
db.Notification = require('./Notification')(sequelize, Sequelize.DataTypes);
db.UserNotificationSettings = require('./UserNotificationSettings')(sequelize, Sequelize.DataTypes);

// Payment Requests
db.PaymentRequest = require('./PaymentRequest')(sequelize, Sequelize.DataTypes);
db.RecurringPaymentRequest = require('./RecurringPaymentRequest')(sequelize, Sequelize.DataTypes);

// Add Reseller, Tax, and Compliance models to exports
db.ResellerFloat = require('./ResellerFloat')(sequelize, Sequelize.DataTypes);
db.TaxConfiguration = require('./TaxConfiguration')(sequelize, Sequelize.DataTypes);
db.TaxTransaction = require('./TaxTransaction')(sequelize, Sequelize.DataTypes);
db.ComplianceRecord = require('./ComplianceRecord')(sequelize, Sequelize.DataTypes);

// Add Support System models to exports
db.SupportInteraction = require('./SupportInteraction')(sequelize, Sequelize.DataTypes);
db.SupportFeedback = require('./SupportFeedback')(sequelize, Sequelize.DataTypes);
db.AiKnowledgeBase = require('./AiKnowledgeBase')(sequelize, Sequelize.DataTypes);

// Add IdempotencyKey model to exports
db.IdempotencyKey = require('./IdempotencyKey')(sequelize, Sequelize.DataTypes);

// Add Feedback System models to exports
db.FeedbackCategory = require('./FeedbackCategory')(sequelize, Sequelize.DataTypes);
db.FeedbackSubmission = require('./FeedbackSubmission')(sequelize, Sequelize.DataTypes);
db.FeedbackAiInsight = require('./FeedbackAiInsight')(sequelize, Sequelize.DataTypes);
db.FeedbackContentGeneration = require('./FeedbackContentGeneration')(sequelize, Sequelize.DataTypes);
db.FeedbackAnalytics = require('./FeedbackAnalytics')(sequelize, Sequelize.DataTypes);
db.FeedbackAttachment = require('./FeedbackAttachment')(sequelize, Sequelize.DataTypes);

// Add Google Reviews Integration models to exports
db.FeedbackGoogleReview = require('./FeedbackGoogleReview')(sequelize, Sequelize.DataTypes);
db.GoogleReviewResponse = require('./GoogleReviewResponse')(sequelize, Sequelize.DataTypes);
db.GoogleReviewAnalytics = require('./GoogleReviewAnalytics')(sequelize, Sequelize.DataTypes);
db.GoogleApiConfig = require('./GoogleApiConfig')(sequelize, Sequelize.DataTypes);

// Beneficiary normalization tables (payment methods & service accounts)
db.BeneficiaryPaymentMethod = require('./BeneficiaryPaymentMethod')(sequelize, Sequelize.DataTypes);
db.BeneficiaryServiceAccount = require('./BeneficiaryServiceAccount')(sequelize, Sequelize.DataTypes);

// Re-run associations ONLY for the newly loaded models (BeneficiaryPaymentMethod and BeneficiaryServiceAccount)
// Do NOT re-run Beneficiary.associate as it will duplicate the 'user' association
if (db.BeneficiaryPaymentMethod && db.BeneficiaryPaymentMethod.associate) {
  db.BeneficiaryPaymentMethod.associate(db);
}
if (db.BeneficiaryServiceAccount && db.BeneficiaryServiceAccount.associate) {
  db.BeneficiaryServiceAccount.associate(db);
}

// Manually add the hasMany associations to Beneficiary after both models are loaded
// This avoids re-running the entire associate function which would duplicate the 'user' association
if (db.Beneficiary && db.BeneficiaryPaymentMethod && db.BeneficiaryServiceAccount) {
  // Add hasMany associations directly (they weren't set up in the initial associate call)
  if (!db.Beneficiary.associations.paymentMethodRecords) {
    db.Beneficiary.hasMany(db.BeneficiaryPaymentMethod, {
      foreignKey: 'beneficiaryId',
      as: 'paymentMethodRecords'
    });
  }
  if (!db.Beneficiary.associations.serviceAccountRecords) {
    db.Beneficiary.hasMany(db.BeneficiaryServiceAccount, {
      foreignKey: 'beneficiaryId',
      as: 'serviceAccountRecords'
    });
  }
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
