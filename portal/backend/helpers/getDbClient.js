'use strict';

/**
 * Portal admin routes: pooled PostgreSQL client via repo db-connection-helper.
 * Same environment selection as portal/backend/models/index.js
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../.env'),
});

const helper = require('../../../scripts/db-connection-helper');

const PORTAL_ENV = process.env.PORTAL_ENV || process.env.MM_DEPLOYMENT_ENV || 'uat';

async function getClient() {
  if (PORTAL_ENV === 'production') {
    return helper.getProductionClient();
  }
  if (PORTAL_ENV === 'staging') {
    return helper.getStagingClient();
  }
  return helper.getUATClient();
}

module.exports = { getClient };
