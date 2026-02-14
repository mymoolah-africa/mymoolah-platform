#!/usr/bin/env node

/**
 * Database Connection Helper
 * 
 * Centralized, reliable connection management for UAT, Staging, and Production
 * NEVER modify passwords or connection logic directly - use this helper
 * 
 * Usage:
 *   const { getUATClient, getStagingClient, getProductionClient } = require('./db-connection-helper');
 *   const uatClient = await getUATClient();
 *   const stagingClient = await getStagingClient();
 *   const productionClient = await getProductionClient();
 */

require('dotenv').config();
const { Pool } = require('pg');
const { execSync } = require('child_process');

// ============================================================================
// CONFIGURATION (DO NOT CHANGE - THESE ARE THE STANDARDS)
// ============================================================================

const CONFIG = {
  UAT: {
    PROXY_PORTS: [6543, 5432], // Primary: 6543 (Codespaces), Fallback: 5432
    DATABASE: 'mymoolah',
    USER: 'mymoolah_app',
    PASSWORD_SOURCE: 'env', // From .env file (DATABASE_URL or DB_PASSWORD)
  },
  STAGING: {
    PROXY_PORTS: [6544, 5432], // Primary: 6544 (Codespaces), Fallback: 5432
    DATABASE: 'mymoolah_staging',
    USER: 'mymoolah_app',
    PASSWORD_SOURCE: 'secret_manager', // From GCS Secret Manager
    SECRET_NAME: 'db-mmtp-pg-staging-password',
    PROJECT_ID: 'mymoolah-db',
  },
  PRODUCTION: {
    PROXY_PORTS: [6545, 5432], // Primary: 6545 (Codespaces), Fallback: 5432
    DATABASE: 'mymoolah_production',
    USER: 'mymoolah_app',
    PASSWORD_SOURCE: 'secret_manager', // From GCS Secret Manager
    SECRET_NAME: 'db-mmtp-pg-production-password',
    PROJECT_ID: 'mymoolah-db',
  },
  HOST: '127.0.0.1', // Always use localhost (proxy handles routing)
  SSL: false, // Proxy handles SSL/TLS
};

// ============================================================================
// PASSWORD RETRIEVAL
// ============================================================================

/**
 * Get UAT password from .env file
 * Handles DATABASE_URL (with URL encoding) or DB_PASSWORD
 */
function getUATPassword() {
  // Try DATABASE_URL first
  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      if (url.password) {
        return decodeURIComponent(url.password);
      }
    } catch (e) {
      // Manual parsing for complex passwords
      const urlString = process.env.DATABASE_URL;
      const hostPattern = '@127.0.0.1:';
      const hostIndex = urlString.indexOf(hostPattern);
      if (hostIndex > 0) {
        const userPassStart = urlString.indexOf('://') + 3;
        const passwordStart = urlString.indexOf(':', userPassStart) + 1;
        if (passwordStart > userPassStart && passwordStart < hostIndex) {
          const password = urlString.substring(passwordStart, hostIndex);
          try {
            return decodeURIComponent(password);
          } catch {
            return password;
          }
        }
      }
    }
  }
  
  // Fallback to DB_PASSWORD
  if (process.env.DB_PASSWORD) {
    return process.env.DB_PASSWORD;
  }
  
  throw new Error('UAT password not found. Set DATABASE_URL or DB_PASSWORD in .env file.');
}

/**
 * Get Staging password from GCS Secret Manager
 */
function getStagingPassword() {
  try {
    const password = execSync(
      `gcloud secrets versions access latest --secret="${CONFIG.STAGING.SECRET_NAME}" --project=${CONFIG.STAGING.PROJECT_ID}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get Staging password from Secret Manager: ${CONFIG.STAGING.SECRET_NAME} - ${error.message}`);
  }
}

/**
 * Get Production password from GCS Secret Manager
 */
function getProductionPassword() {
  try {
    const password = execSync(
      `gcloud secrets versions access latest --secret="${CONFIG.PRODUCTION.SECRET_NAME}" --project=${CONFIG.PRODUCTION.PROJECT_ID}`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return password.replace(/[\r\n\s]+$/g, '').trim();
  } catch (error) {
    throw new Error(`Failed to get Production password from Secret Manager: ${CONFIG.PRODUCTION.SECRET_NAME} - ${error.message}`);
  }
}

// ============================================================================
// PROXY DETECTION
// ============================================================================

/**
 * Detect which proxy port is running
 */
function detectProxyPort(ports, name) {
  for (const port of ports) {
    try {
      execSync(`lsof -i :${port}`, { stdio: 'ignore' });
      return port;
    } catch {
      continue;
    }
  }
  throw new Error(
    `${name} proxy not running on any of: ${ports.join(', ')}\n` +
    `Start proxy: ./scripts/ensure-proxies-running.sh`
  );
}

// ============================================================================
// CONNECTION POOL CREATION
// ============================================================================

let uatPool = null;
let stagingPool = null;
let productionPool = null;

/**
 * Get UAT database connection pool
 * Uses .env file for credentials
 */
function getUATPool() {
  if (uatPool) {
    return uatPool;
  }

  const proxyPort = detectProxyPort(CONFIG.UAT.PROXY_PORTS, 'UAT');
  const password = getUATPassword();

  uatPool = new Pool({
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.UAT.DATABASE,
    user: CONFIG.UAT.USER,
    password: password,
    ssl: CONFIG.SSL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return uatPool;
}

/**
 * Get Staging database connection pool
 * Uses GCS Secret Manager for credentials
 */
function getStagingPool() {
  if (stagingPool) {
    return stagingPool;
  }

  const proxyPort = detectProxyPort(CONFIG.STAGING.PROXY_PORTS, 'Staging');
  const password = getStagingPassword();

  stagingPool = new Pool({
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.STAGING.DATABASE,
    user: CONFIG.STAGING.USER,
    password: password,
    ssl: CONFIG.SSL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return stagingPool;
}

/**
 * Get Production database connection pool
 * Uses GCS Secret Manager for credentials
 */
function getProductionPool() {
  if (productionPool) {
    return productionPool;
  }

  const proxyPort = detectProxyPort(CONFIG.PRODUCTION.PROXY_PORTS, 'Production');
  const password = getProductionPassword();

  productionPool = new Pool({
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.PRODUCTION.DATABASE,
    user: CONFIG.PRODUCTION.USER,
    password: password,
    ssl: CONFIG.SSL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  return productionPool;
}

/**
 * Get a client from UAT pool
 */
async function getUATClient() {
  const pool = getUATPool();
  return await pool.connect();
}

/**
 * Get a client from Staging pool
 */
async function getStagingClient() {
  const pool = getStagingPool();
  return await pool.connect();
}

/**
 * Get a client from Production pool
 */
async function getProductionClient() {
  const pool = getProductionPool();
  return await pool.connect();
}

/**
 * Get connection config objects (for scripts that need raw config)
 */
function getUATConfig() {
  const proxyPort = detectProxyPort(CONFIG.UAT.PROXY_PORTS, 'UAT');
  const password = getUATPassword();
  
  return {
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.UAT.DATABASE,
    user: CONFIG.UAT.USER,
    password: password,
    ssl: CONFIG.SSL,
  };
}

function getStagingConfig() {
  const proxyPort = detectProxyPort(CONFIG.STAGING.PROXY_PORTS, 'Staging');
  const password = getStagingPassword();
  
  return {
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.STAGING.DATABASE,
    user: CONFIG.STAGING.USER,
    password: password,
    ssl: CONFIG.SSL,
  };
}

function getProductionConfig() {
  const proxyPort = detectProxyPort(CONFIG.PRODUCTION.PROXY_PORTS, 'Production');
  const password = getProductionPassword();
  
  return {
    host: CONFIG.HOST,
    port: proxyPort,
    database: CONFIG.PRODUCTION.DATABASE,
    user: CONFIG.PRODUCTION.USER,
    password: password,
    ssl: CONFIG.SSL,
  };
}

/**
 * Get DATABASE_URL for Sequelize CLI (UAT)
 */
function getUATDatabaseURL() {
  const config = getUATConfig();
  const encodedPassword = encodeURIComponent(config.password);
  return `postgres://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}?sslmode=disable`;
}

/**
 * Get DATABASE_URL for Sequelize CLI (Staging)
 */
function getStagingDatabaseURL() {
  const config = getStagingConfig();
  const encodedPassword = encodeURIComponent(config.password);
  return `postgres://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}?sslmode=disable`;
}

/**
 * Get DATABASE_URL for Sequelize CLI (Production)
 */
function getProductionDatabaseURL() {
  const config = getProductionConfig();
  const encodedPassword = encodeURIComponent(config.password);
  return `postgres://${config.user}:${encodedPassword}@${config.host}:${config.port}/${config.database}?sslmode=disable`;
}

/**
 * Close all connection pools (cleanup)
 */
async function closeAll() {
  if (uatPool) {
    await uatPool.end();
    uatPool = null;
  }
  if (stagingPool) {
    await stagingPool.end();
    stagingPool = null;
  }
  if (productionPool) {
    await productionPool.end();
    productionPool = null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Connection pools
  getUATPool,
  getStagingPool,
  getProductionPool,
  
  // Single clients (remember to release!)
  getUATClient,
  getStagingClient,
  getProductionClient,
  
  // Raw configs (for pg_dump, etc.)
  getUATConfig,
  getStagingConfig,
  getProductionConfig,
  
  // DATABASE_URL for Sequelize CLI
  getUATDatabaseURL,
  getStagingDatabaseURL,
  getProductionDatabaseURL,
  
  // Utilities
  detectProxyPort,
  getUATPassword,
  getStagingPassword,
  getProductionPassword,
  closeAll,
  
  // Constants
  CONFIG,
};
