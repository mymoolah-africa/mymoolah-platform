'use strict';

// CRITICAL: Set TLS rejection BEFORE any database modules load
// This must be set before Sequelize or pg are required
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// Patch TLS module at the lowest level to force rejectUnauthorized: false
const tls = require('tls');
const originalCreateSecureContext = tls.createSecureContext;
tls.createSecureContext = function(options) {
  if (options) {
    options.rejectUnauthorized = false;
  }
  return originalCreateSecureContext.call(this, options);
};

const originalConnect = tls.connect;
tls.connect = function(...args) {
  const options = args[0];
  if (options && typeof options === 'object') {
    options.rejectUnauthorized = false;
  }
  return originalConnect.apply(this, args);
};

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const db = {};

let sequelize;
if (config.use_env_variable) {
  const url = process.env[config.use_env_variable];
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
    pool: { max: 20, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ...(options.dialectOptions || {}),
      keepAlive: true
    },
    logging: false
  });
} else {
  sequelize = new Sequelize(config.database, config.username, config.password, {
    ...config,
    pool: { max: 20, min: 0, acquire: 30000, idle: 10000 },
    dialectOptions: {
      ...(config.dialectOptions || {}),
      keepAlive: true
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

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
