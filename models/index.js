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
  const url = process.env[config.use_env_variable];
  
  // Validate DATABASE_URL is set
  if (!url) {
    console.error(`❌ ERROR: ${config.use_env_variable} environment variable is not set!`);
    console.error('📋 Available env vars:', Object.keys(process.env).filter(k => k.includes('DATABASE') || k.includes('DB')).join(', '));
    throw new Error(`${config.use_env_variable} environment variable is required but not set`);
  }
  
  // Clone config so we can safely tweak connection options per environment
  const options = { ...config };
  try {
    const parsed = new URL(url);
    const host = (parsed.hostname || '').toLowerCase();
    const isLocalProxy = host === '127.0.0.1' || host === 'localhost';
    if (isLocalProxy) {
      // When using Cloud SQL Auth Proxy locally, disable client-side SSL to the proxy
      if (options.dialectOptions && options.dialectOptions.ssl) {
        delete options.dialectOptions.ssl;
      }
    }
  } catch (_) {
    // Ignore URL parse errors; fall back to defaults
  }
  sequelize = new Sequelize(url, {
    ...options,
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
    dialectOptions: {
      ...(options.dialectOptions || {}),
      keepAlive: true,
      // TCP keepalive to prevent connection drops
      keepAliveInitialDelayMillis: 0
    },
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

// Re-run associations after loading BeneficiaryPaymentMethod and BeneficiaryServiceAccount
// This ensures Beneficiary.hasMany associations are set up correctly
if (db.Beneficiary && db.Beneficiary.associate) {
  db.Beneficiary.associate(db);
}
if (db.BeneficiaryPaymentMethod && db.BeneficiaryPaymentMethod.associate) {
  db.BeneficiaryPaymentMethod.associate(db);
}
if (db.BeneficiaryServiceAccount && db.BeneficiaryServiceAccount.associate) {
  db.BeneficiaryServiceAccount.associate(db);
}

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
