#!/usr/bin/env node
/**
 * Performance sampler for MyMoolah APIs.
 *
 * Measures average/min/max latency for a curated list of authenticated endpoints.
 *
 * Usage:
 *   API_BASE_URL="http://localhost:3001/api/v1" \
 *   PERF_TEST_IDENTIFIER="27825571055" \
 *   PERF_TEST_PASSWORD="Andre123!" \
 *   PERF_TEST_ITERATIONS=3 \
 *   node scripts/perf-test-api-latencies.js
 *
 * Environment variables:
 *   - API_BASE_URL (default http://localhost:3001/api/v1)
 *   - PERF_TEST_IDENTIFIER (required)
 *   - PERF_TEST_PASSWORD (required)
 *   - PERF_TEST_ITERATIONS (default 3)
 */

const { performance } = require('perf_hooks');

const baseUrl = (process.env.API_BASE_URL || 'http://localhost:3001/api/v1').replace(/\/$/, '');
const identifier = process.env.PERF_TEST_IDENTIFIER;
const password = process.env.PERF_TEST_PASSWORD;
const iterations = Number(process.env.PERF_TEST_ITERATIONS || 3);

if (!identifier || !password) {
  console.error('❌ PERF_TEST_IDENTIFIER and PERF_TEST_PASSWORD environment variables are required');
  process.exit(1);
}

const endpoints = [
  { name: 'Auth Verify', method: 'GET', path: '/auth/verify' },
  { name: 'Settings', method: 'GET', path: '/settings' },
  { name: 'Notifications (unread)', method: 'GET', path: '/notifications?status=unread&limit=50' },
  { name: 'Wallet Balance', method: 'GET', path: '/wallets/balance' },
  { name: 'Wallet Transactions (10)', method: 'GET', path: '/wallets/transactions?limit=10' },
  { name: 'Wallet Transactions (50)', method: 'GET', path: '/wallets/transactions?limit=50' },
  { name: 'Vouchers Balance Summary', method: 'GET', path: '/vouchers/balance-summary' },
  { name: 'Vouchers Listing', method: 'GET', path: '/vouchers' },
  { name: 'Unified Beneficiaries - Payment', method: 'GET', path: '/unified-beneficiaries/by-service/payment' },
  { name: 'Unified Beneficiaries - Airtime/Data', method: 'GET', path: '/unified-beneficiaries/by-service/airtime-data' },
  { name: 'Unified Beneficiaries - Electricity', method: 'GET', path: '/unified-beneficiaries/by-service/electricity' },
  { name: 'Suppliers Trending', method: 'GET', path: '/suppliers/trending' },
  { name: 'Suppliers Compare Airtime', method: 'GET', path: '/suppliers/compare/airtime' },
  { name: 'Suppliers Promotions', method: 'GET', path: '/suppliers/promotions' },
  { name: 'Overlay Bills Categories', method: 'GET', path: '/overlay/bills/categories' }
];

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
};

const formatMs = (value) => `${value.toFixed(1)} ms`;

async function login() {
  const response = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Login failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data?.token) {
    throw new Error('Login succeeded but no token returned');
  }

  return data.token;
}

async function measureEndpoint(token, endpoint) {
  const url = `${baseUrl}${endpoint.path}`;
  const stats = {
    name: endpoint.name,
    path: endpoint.path,
    method: endpoint.method || 'GET',
    samples: [],
    errors: []
  };

  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    try {
      const res = await fetch(url, {
        method: stats.method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Drain body to completion (without logging) to ensure accurate timing
      await res.text();

      const duration = performance.now() - start;
      stats.samples.push(duration);

      if (!res.ok) {
        stats.errors.push(`HTTP ${res.status}: ${res.statusText}`);
      }
    } catch (err) {
      stats.errors.push(err.message);
    }
  }

  if (stats.samples.length) {
    stats.avg = stats.samples.reduce((sum, value) => sum + value, 0) / stats.samples.length;
    stats.min = Math.min(...stats.samples);
    stats.max = Math.max(...stats.samples);
    stats.p95 = percentile(stats.samples, 95);
  } else {
    stats.avg = stats.min = stats.max = stats.p95 = 0;
  }

  return stats;
}

function printSummary(results) {
  const header = [
    'Endpoint'.padEnd(40),
    'Avg'.padStart(10),
    'P95'.padStart(10),
    'Min'.padStart(10),
    'Max'.padStart(10),
    'Errors'.padStart(8)
  ].join(' | ');

  console.log('\nAPI Latency Summary (higher than 200 ms highlighted with ⚠️):\n');
  console.log(header);
  console.log('-'.repeat(header.length));

  results
    .sort((a, b) => b.avg - a.avg)
    .forEach((result) => {
      const warn = result.avg > 200 ? ' ⚠️' : '';
      const line = [
        result.name.padEnd(40),
        formatMs(result.avg).padStart(10),
        formatMs(result.p95).padStart(10),
        formatMs(result.min).padStart(10),
        formatMs(result.max).padStart(10),
        String(result.errors.length).padStart(8)
      ].join(' | ');
      console.log(line + warn);
    });

  console.log('\nLegend: Avg = arithmetic mean, P95 = 95th percentile, Min/Max per sample window.');
  console.log('Endpoints with Avg > 200 ms are flagged for investigation.\n');
}

async function run() {
  try {
    console.log(`🔐 Logging in as ${identifier} against ${baseUrl}`);
    const token = await login();
    console.log(`✅ Authenticated. Sampling ${endpoints.length} endpoints with ${iterations} iteration(s) each...\n`);

    const results = [];
    for (const endpoint of endpoints) {
      process.stdout.write(`→ Measuring ${endpoint.name} (${endpoint.path}) ... `);
      const measurement = await measureEndpoint(token, endpoint);
      results.push(measurement);
      if (measurement.errors.length) {
        process.stdout.write(`DONE with ${measurement.errors.length} error(s)\n`);
        measurement.errors.slice(0, 2).forEach((err) => console.error(`   • ${err}`));
      } else {
        process.stdout.write('DONE\n');
      }
    }

    printSummary(results);
  } catch (error) {
    console.error('❌ Performance test failed:', error.message);
    process.exit(1);
  }
}

run();

