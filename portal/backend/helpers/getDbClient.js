'use strict';

/**
 * Portal admin routes: pooled PostgreSQL client.
 * Cloud Run: uses DATABASE_URL (constructed by start.sh from Cloud Run secrets).
 * Codespaces/local: falls back to repo db-connection-helper.js via proxy ports.
 */
require('dotenv').config({
  path: require('path').resolve(__dirname, '../../../.env'),
});

const { Pool } = require('pg');

const PORTAL_ENV = process.env.PORTAL_ENV || process.env.MM_DEPLOYMENT_ENV || 'uat';

let cloudRunPool = null;

async function getClient() {
  if (process.env.DATABASE_URL) {
    if (!cloudRunPool) {
      cloudRunPool = new Pool({
        connectionString: process.env.DATABASE_URL,
        max: 10,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });
    }
    return cloudRunPool.connect();
  }

  const helper = require('../../../scripts/db-connection-helper');
  if (PORTAL_ENV === 'production') {
    return helper.getProductionClient();
  }
  if (PORTAL_ENV === 'staging') {
    return helper.getStagingClient();
  }
  return helper.getUATClient();
}

module.exports = { getClient };
