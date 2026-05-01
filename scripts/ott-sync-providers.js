#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: process.env.ENV_FILE || '.env' });

const db = require('../models');
const { syncOttProviders } = require('../services/ott/ottProviderCatalogService');

async function main() {
  const importCatalog = process.argv.includes('--import-catalog');
  const result = await syncOttProviders({ importCatalog });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .then(async () => {
    await db.sequelize.close();
  })
  .catch(async (error) => {
    console.error('OTT provider sync failed:', error.code || error.message);
    if (error.responseData) {
      console.error(JSON.stringify(error.responseData, null, 2));
    }
    await db.sequelize.close();
    process.exit(1);
  });
