'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  let url = process.env[config.use_env_variable];
  
  // Validate DATABASE_URL is set
  if (!url) {
    console.error(`❌ ERROR: ${config.use_env_variable} environment variable is not set!`);
    console.error('📋 Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')).join(', '));
    throw new Error(`${config.use_env_variable} environment variable is required but not set`);
  }
  
  // Clone config so we can safely tweak connection options per environment
  const options = { ...config };
  
  // Check if SSL should be disabled (Unix socket, local proxy, or sslmode=disable in URL)
  // CRITICAL: Log DATABASE_URL format for debugging (redact password)
  const urlForLogging = url.replace(/:[^:@]+@/, ':****@');
  console.log(`📋 DATABASE_URL format: ${urlForLogging.substring(0, 100)}...`);
  console.log(`📋 DATABASE_URL includes /cloudsql/: ${url.includes('/cloudsql/')}`);
  console.log(`📋 DATABASE_URL includes sslmode=disable: ${url.includes('sslmode=disable')}`);
  
  let shouldDisableSSL = false;
  let disableReason = '';
  
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
  
  console.log(`📋 SSL detection result: shouldDisableSSL=${shouldDisableSSL}, reason="${disableReason}"`);
  
  // Disable SSL if needed
  // CRITICAL: Remove dialectOptions from options BEFORE spreading, to prevent Sequelize from merging SSL
  const { dialectOptions: originalDialectOptions, ...optionsWithoutDialectOptions } = options;
  let finalDialectOptions = { ...(originalDialectOptions || {}) };
  
  if (shouldDisableSSL) {
    // When using Cloud SQL Auth Proxy locally or Unix socket in Cloud Run:
    // Disable client-side SSL - the connection is already secure
    // Completely remove SSL property (not set to false, just absent)
    const { ssl, ...dialectOptionsWithoutSsl } = finalDialectOptions;
    finalDialectOptions = {
      ...dialectOptionsWithoutSsl
      // SSL property is completely removed - not present at all
    };
    // Ensure sslmode=disable is in the URL (start.sh already sets this, but double-check)
    if (!url.includes('sslmode=')) {
      url += (url.includes('?') ? '&' : '?') + 'sslmode=disable';
    }
    console.log(`✅ SSL disabled for ${disableReason} connection - dialectOptions.ssl removed`);
    console.log(`📋 Final dialectOptions (no SSL):`, JSON.stringify(finalDialectOptions, null, 2));
  } else {
    console.log(`ℹ️ SSL enabled (not Unix socket or sslmode=disable)`);
  }
  
  // Build final dialectOptions with keepAlive settings (but NO SSL if shouldDisableSSL)
  finalDialectOptions = {
    ...finalDialectOptions,
    keepAlive: true,
    // TCP keepalive to prevent connection drops
    keepAliveInitialDelayMillis: 0
  };
  
  // CRITICAL: Ensure SSL is NOT in finalDialectOptions for Unix socket connections
  if (shouldDisableSSL && finalDialectOptions.ssl !== undefined) {
    console.warn('⚠️ WARNING: SSL property still present in finalDialectOptions! Removing it...');
    const { ssl, ...cleanDialectOptions } = finalDialectOptions;
    finalDialectOptions = cleanDialectOptions;
  }
  
  sequelize = new Sequelize(url, {
    ...optionsWithoutDialectOptions, // Spread options WITHOUT dialectOptions to prevent SSL merge
    // Optimized connection pool for Cloud SQL Auth Proxy
    // min: 2 keeps connections warm to avoid cold starts
    // idle: 30000 (30s) prevents frequent connection churn
    pool: { 
      max: 20, 
      min: 2,  // Keep 2 connections warm to avoid cold starts
      acquire: 30000, 
      idle: 30000,  // Increased from 10s to 30s to reduce connection churn
      evict: 10000  // Check for idle connections every 10s
    },
    dialectOptions: finalDialectOptions, // Use the final dialectOptions (SSL removed if needed)
    logging: false
  });
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
