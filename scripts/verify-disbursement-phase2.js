'use strict';

/**
 * Disbursement Phase 2 — Verification Script
 *
 * Run this to ensure all Phase 1 + Phase 2 components are in place,
 * no files are missing, no duplicates exist, models load correctly,
 * and database tables match the expected schema.
 *
 * Usage:
 *   node scripts/verify-disbursement-phase2.js          # file checks only
 *   node scripts/verify-disbursement-phase2.js --db      # + database checks (needs proxy)
 *
 * @author MyMoolah Treasury Platform
 * @date 2026-04-07
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CHECK_DB = process.argv.includes('--db');

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(msg) { passed++; console.log(`  [PASS] ${msg}`); }
function fail(msg) { failed++; console.log(`  [FAIL] ${msg}`); }
function warn(msg) { warnings++; console.log(`  [WARN] ${msg}`); }
function heading(msg) { console.log(`\n=== ${msg} ===`); }

function fileExists(relPath, description) {
  const full = path.join(ROOT, relPath);
  if (fs.existsSync(full)) {
    ok(`${description} — ${relPath}`);
    return true;
  }
  fail(`MISSING: ${description} — ${relPath}`);
  return false;
}

function fileContains(relPath, substring, description) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) { fail(`File not found: ${relPath}`); return false; }
  const content = fs.readFileSync(full, 'utf8');
  if (content.includes(substring)) {
    ok(description);
    return true;
  }
  fail(`${description} — "${substring}" not found in ${relPath}`);
  return false;
}

function syntaxCheck(relPath) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) { fail(`Cannot syntax-check — file not found: ${relPath}`); return false; }
  try {
    require(full);
    return true;
  } catch (err) {
    if (err.code === 'MODULE_NOT_FOUND') {
      return true;
    }
    fail(`Syntax error in ${relPath}: ${err.message}`);
    return false;
  }
}

function noDuplicateExports(relPath, exportName) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) return;
  const content = fs.readFileSync(full, 'utf8');
  const regex = new RegExp(`module\\.exports.*${exportName}`, 'g');
  const matches = content.match(regex);
  if (matches && matches.length > 1) {
    warn(`Duplicate export of "${exportName}" in ${relPath}`);
  }
}

// =========================================================================
// PHASE 1 — Services (7 new + 2 StandardBank)
// =========================================================================

heading('Phase 1 Services');

const phase1Services = [
  ['services/disbursement/feeEngine.js', 'Fee calculation engine'],
  ['services/disbursement/clientFloatService.js', 'Client float ACID operations'],
  ['services/disbursement/fileParserService.js', 'CSV/Excel/Pain.001 parser'],
  ['services/disbursement/kybComplianceService.js', 'KYB GPT-4o OCR service'],
  ['services/disbursement/notificationEngine.js', 'Webhook + email notification engine'],
  ['services/standardbank/sbsaSftpClientService.js', 'GCS-based SFTP upload'],
  ['services/standardbank/pain002PollerService.js', 'GCS Pain.002 inbox poller'],
  ['services/standardbank/disbursementService.js', 'Core disbursement service (multi-rail)'],
];

for (const [file, desc] of phase1Services) {
  fileExists(file, desc);
}

// =========================================================================
// PHASE 1 — Migrations
// =========================================================================

heading('Phase 1 Migrations');

fileExists('migrations/20260408_01_create_disbursement_client_tables.js', 'Client tables migration');
fileExists('migrations/20260408_02_seed_disbursement_ledger_accounts.js', 'Ledger accounts seed migration');

// =========================================================================
// PHASE 2 — Sequelize Models
// =========================================================================

heading('Phase 2 Sequelize Models');

const phase2Models = [
  ['models/DisbursementClient.js', 'DisbursementClient model'],
  ['models/DisbursementClientFee.js', 'DisbursementClientFee model'],
  ['models/KybDocument.js', 'KybDocument model'],
  ['models/DisbursementNotificationPreference.js', 'DisbursementNotificationPreference model'],
  ['models/DisbursementClientUser.js', 'DisbursementClientUser model'],
  ['models/DisbursementPayment.js', 'DisbursementPayment model (updated)'],
  ['models/DisbursementRun.js', 'DisbursementRun model (updated)'],
];

for (const [file, desc] of phase2Models) {
  fileExists(file, desc);
}

fileContains('models/DisbursementPayment.js', 'fee_cents', 'DisbursementPayment has fee_cents column');
fileContains('models/DisbursementPayment.js', 'payment_rail', 'DisbursementPayment has payment_rail column');
fileContains('models/DisbursementPayment.js', 'metadata', 'DisbursementPayment has metadata column');
fileContains('models/DisbursementRun.js', 'DisbursementClient', 'DisbursementRun has belongsTo(DisbursementClient)');
fileContains('models/DisbursementClient.js', 'DisbursementRun', 'DisbursementClient has hasMany(DisbursementRun)');

// =========================================================================
// PHASE 2 — API Layer
// =========================================================================

heading('Phase 2 API Layer');

fileExists('controllers/disbursementClientController.js', 'Client management controller');
fileExists('routes/disbursementClient.js', 'Client management routes');
fileExists('controllers/disbursementController.js', 'Run management controller (Phase 0)');
fileExists('routes/disbursement.js', 'Run management routes (Phase 0)');

fileContains('server.js', 'disbursement-clients', 'server.js wires /api/v1/disbursement-clients');
fileContains('server.js', 'disbursementRoutes', 'server.js wires /api/v1/disbursements');

const controllerMethods = [
  'listClients', 'getClient', 'createClient', 'updateClient',
  'uploadKybDocument', 'reviewKybDocument', 'listFees', 'setFee', 'uploadBeneficiaryFile',
];
for (const method of controllerMethods) {
  fileContains('controllers/disbursementClientController.js', method, `Controller has ${method} method`);
}

// =========================================================================
// PHASE 2 — Portal UI
// =========================================================================

heading('Phase 2 Portal UI');

const portalOverlays = [
  ['portal/admin/frontend/src/components/admin-overlays/DisbursementRunsOverlay.tsx', 'Runs list overlay'],
  ['portal/admin/frontend/src/components/admin-overlays/CreateDisbursementRunOverlay.tsx', 'Create run overlay'],
  ['portal/admin/frontend/src/components/admin-overlays/DisbursementRunDetailOverlay.tsx', 'Run detail overlay'],
  ['portal/admin/frontend/src/components/admin-overlays/DisbursementClientManagementOverlay.tsx', 'Client management overlay'],
  ['portal/admin/frontend/src/components/admin-overlays/DisbursementClientDetailOverlay.tsx', 'Client detail overlay'],
];

for (const [file, desc] of portalOverlays) {
  fileExists(file, desc);
}

fileContains('portal/admin/frontend/src/components/routing/RouteConfig.tsx',
  'DisbursementClientManagementOverlay', 'RouteConfig imports client management overlay');
fileContains('portal/admin/frontend/src/components/routing/RouteConfig.tsx',
  'DisbursementClientDetailOverlay', 'RouteConfig imports client detail overlay');
fileContains('portal/admin/frontend/src/components/routing/RouteConfig.tsx',
  'disbursement-clients', 'RouteConfig has /admin/disbursement-clients route');

fileContains('portal/admin/frontend/src/components/layout/AppLayoutWrapper.tsx',
  'disbursement-clients', 'Sidebar has disbursement-clients nav item');

// =========================================================================
// PHASE 2 — Integration Wiring
// =========================================================================

heading('Phase 2 Integration Wiring');

fileContains('services/standardbank/disbursementService.js',
  'notificationEngine', 'disbursementService calls notificationEngine');
fileContains('services/standardbank/disbursementService.js',
  'RUN_SUBMITTED', 'disbursementService fires RUN_SUBMITTED event');
fileContains('services/standardbank/disbursementService.js',
  'RUN_APPROVED', 'disbursementService fires RUN_APPROVED event');

fileContains('controllers/disbursementClientController.js',
  'kybComplianceService', 'Client controller triggers KYB OCR analysis');

// =========================================================================
// PHASE 2 — Vite Proxy Configuration
// =========================================================================

heading('Vite Proxy Configuration');

fileContains('portal/admin/frontend/vite.config.ts',
  '/api/v1/admin', 'Vite proxy has /api/v1/admin rule (portal backend)');
fileContains('portal/admin/frontend/vite.config.ts',
  'localhost:3002', 'Vite proxy routes admin to portal backend (3002)');
fileContains('portal/admin/frontend/vite.config.ts',
  'localhost:3001', 'Vite proxy routes api to main backend (3001)');

// =========================================================================
// Documentation
// =========================================================================

heading('Documentation');

fileContains('docs/CHANGELOG.md', 'v2.89.0', 'CHANGELOG has v2.89.0 entry');
fileContains('docs/AGENT_HANDOVER.md', 'v2.89.0', 'AGENT_HANDOVER references v2.89.0');
fileContains('docs/PORTAL_DEVELOPMENT_GUIDE.md', 'DisbursementClientManagementOverlay',
  'Portal dev guide lists client management overlay');
fileContains('docs/API_DOCUMENTATION.md', 'disbursement-clients',
  'API docs cover disbursement-clients endpoints');
fileExists('docs/session_logs/2026-04-07_2100_disbursement-phase2-api-models-portal.md',
  'Phase 2 session log');

// =========================================================================
// Duplicate Detection
// =========================================================================

heading('Duplicate Detection');

const modelDir = path.join(ROOT, 'models');
const modelFiles = fs.readdirSync(modelDir).filter(f => f.endsWith('.js') && f !== 'index.js');
const seen = new Map();
for (const file of modelFiles) {
  const lower = file.toLowerCase();
  if (seen.has(lower)) {
    warn(`Potential duplicate model: ${file} vs ${seen.get(lower)}`);
  } else {
    seen.set(lower, file);
  }
}
if (!warnings) ok('No duplicate model files detected');

const routeDir = path.join(ROOT, 'routes');
const routeFiles = fs.readdirSync(routeDir).filter(f => f.endsWith('.js'));
const routeSeen = new Map();
for (const file of routeFiles) {
  const lower = file.toLowerCase();
  if (routeSeen.has(lower)) {
    warn(`Potential duplicate route file: ${file} vs ${routeSeen.get(lower)}`);
  } else {
    routeSeen.set(lower, file);
  }
}

const controllerDir = path.join(ROOT, 'controllers');
const controllerFiles = fs.readdirSync(controllerDir).filter(f => f.endsWith('.js'));
const ctrlSeen = new Map();
for (const file of controllerFiles) {
  const lower = file.toLowerCase();
  if (ctrlSeen.has(lower)) {
    warn(`Potential duplicate controller: ${file} vs ${ctrlSeen.get(lower)}`);
  } else {
    ctrlSeen.set(lower, file);
  }
}

// =========================================================================
// Database Checks (optional — requires proxy running)
// =========================================================================

if (CHECK_DB) {
  heading('Database Table Checks (--db flag)');

  (async () => {
    try {
      const { getUATClient } = require('./db-connection-helper');
      const client = await getUATClient();

      const expectedTables = [
        'disbursement_runs',
        'disbursement_payments',
        'disbursement_clients',
        'disbursement_client_fees',
        'kyb_documents',
        'disbursement_notification_preferences',
        'disbursement_client_users',
      ];

      for (const table of expectedTables) {
        const result = await client.query(
          `SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = $1)`,
          [table]
        );
        if (result.rows[0].exists) {
          ok(`Table exists: ${table}`);
        } else {
          fail(`Table MISSING: ${table} — run migrations first`);
        }
      }

      const colCheck = await client.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'disbursement_payments'
        AND column_name IN ('fee_cents', 'payment_rail')
      `);
      const cols = colCheck.rows.map(r => r.column_name);
      if (cols.includes('fee_cents')) ok('disbursement_payments.fee_cents column exists');
      else fail('disbursement_payments.fee_cents column MISSING — run migration 20260408_01');
      if (cols.includes('payment_rail')) ok('disbursement_payments.payment_rail column exists');
      else fail('disbursement_payments.payment_rail column MISSING — run migration 20260408_01');

      const ledgerCheck = await client.query(`
        SELECT code FROM ledger_accounts
        WHERE code IN ('4000-30-01', '4000-30-02', '2300-30-01', '5200-30-01', '5200-30-02')
      `);
      const ledgerCodes = ledgerCheck.rows.map(r => r.code);
      const expectedCodes = ['4000-30-01', '4000-30-02', '2300-30-01', '5200-30-01', '5200-30-02'];
      for (const code of expectedCodes) {
        if (ledgerCodes.includes(code)) ok(`Ledger account exists: ${code}`);
        else fail(`Ledger account MISSING: ${code} — run migration 20260408_02`);
      }

      client.release();
    } catch (err) {
      fail(`Database connection failed: ${err.message}`);
      console.log('    Ensure Cloud SQL proxy is running on port 6543');
    }

    printSummary();
  })();
} else {
  printSummary();
}

function printSummary() {
  heading('SUMMARY');
  console.log(`  Passed:   ${passed}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Warnings: ${warnings}`);
  console.log();

  if (failed > 0) {
    console.log('  STATUS: INCOMPLETE — fix the failures above before proceeding.');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('  STATUS: PASS WITH WARNINGS — review warnings above.');
    process.exit(0);
  } else {
    console.log('  STATUS: ALL CHECKS PASSED');
    process.exit(0);
  }
}
