#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

function configureDatabaseTarget(argv) {
  const requested = new Set(argv);
  if (!requested.has('--staging') && !requested.has('--production') && !requested.has('--uat')) return 'default';

  const {
    getUATDatabaseURL,
    getStagingDatabaseURL,
    getProductionDatabaseURL,
  } = require('./db-connection-helper');

  if (requested.has('--production') && !requested.has('--confirm-production')) {
    throw new Error('Production provider sync requires --confirm-production.');
  }
  if (requested.has('--production')) {
    process.env.NODE_ENV = 'production-proxy';
    process.env.DATABASE_URL = getProductionDatabaseURL();
    return 'production';
  }
  if (requested.has('--staging')) {
    process.env.NODE_ENV = 'staging';
    process.env.DATABASE_URL = getStagingDatabaseURL();
    return 'staging';
  }
  process.env.NODE_ENV = 'development';
  process.env.DATABASE_URL = getUATDatabaseURL();
  return 'uat';
}

let db;

async function main() {
  const environment = configureDatabaseTarget(process.argv.slice(2));
  db = require('../models');
  const { syncOttProviders } = require('../services/ott/ottProviderCatalogService');
  const importCatalog = process.argv.includes('--import-catalog');
  const result = await syncOttProviders({ importCatalog });
  console.log(JSON.stringify({ environment, ...result }, null, 2));
  await db.sequelize.close();
}

main()
  .catch(async (error) => {
    console.error('OTT provider sync failed:', error.code || error.message);
    if (error.responseData) {
      console.error(JSON.stringify(error.responseData, null, 2));
    }
    if (db?.sequelize) {
      await db.sequelize.close();
    }
    process.exit(1);
  });
