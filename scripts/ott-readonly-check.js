#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: process.env.DOTENV_CONFIG_PATH || '.env.codespaces' });
require('dotenv').config();

const { OttClient } = require('../services/ott/ottClient');

const CHECKS = {
  balance: (client) => client.getBalance({}),
  providers: (client) => client.getActiveProviders({}),
  limits: (client) => client.getActiveProviderLimits({}),
  countries: (client) => client.getCountryCodes({}),
  branches: (client) => client.getUniversalBranchCodes({}),
};

function parseArgs(argv) {
  const selected = argv
    .filter((arg) => arg.startsWith('--check='))
    .flatMap((arg) => arg.replace('--check=', '').split(','))
    .map((arg) => arg.trim())
    .filter(Boolean);
  return selected.length > 0 ? selected : Object.keys(CHECKS);
}

function summarise(data) {
  if (Array.isArray(data)) return { rows: data.length };
  if (data && typeof data === 'object') {
    return {
      keys: Object.keys(data).slice(0, 20),
      rowCount: Array.isArray(data.data) ? data.data.length : undefined,
    };
  }
  return { type: typeof data };
}

async function main() {
  const selectedChecks = parseArgs(process.argv.slice(2));
  const client = new OttClient();
  const results = [];

  for (const check of selectedChecks) {
    if (!CHECKS[check]) {
      throw new Error(`Unknown check "${check}". Valid checks: ${Object.keys(CHECKS).join(', ')}`);
    }
    const startedAt = Date.now();
    const response = await CHECKS[check](client);
    results.push({
      check,
      httpStatus: response.status,
      elapsedMs: Date.now() - startedAt,
      summary: summarise(response.data),
    });
  }

  console.log(JSON.stringify({ success: true, results }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    error: error.code || 'OTT_READONLY_CHECK_FAILED',
    message: error.message,
    statusCode: error.statusCode,
    responseData: error.responseData,
  }, null, 2));
  process.exit(1);
});
