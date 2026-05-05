#!/usr/bin/env node
'use strict';

/**
 * Guarded production OTT float top-up runbook.
 *
 * Default mode is dry-run. Apply requires:
 *   node scripts/load-ott-production-float.js --production --apply --confirm-production
 */

const args = new Set(process.argv.slice(2));

function getArgValue(name, fallback) {
  const prefix = `${name}=`;
  const match = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  if (!match) return fallback;
  return match.slice(prefix.length);
}

const isProduction = args.has('--production');
const shouldApply = args.has('--apply');
const confirmedProduction = args.has('--confirm-production');
const amount = Number(getArgValue('--amount', '1000'));
const minimumBalance = Number(getArgValue('--min-balance', '100'));
const reference = getArgValue('--reference', 'FLOAT-TOPUP-OTT-20260505-001');

const TREASURY_ACCOUNT_CODE = '1100-01-01';
const OTT_FLOAT_ACCOUNT_CODE = '1200-10-08';

if (!isProduction) {
  console.error('Refusing to run without --production. This script is only for the approved production OTT float runbook.');
  process.exit(1);
}

if (shouldApply && !confirmedProduction) {
  console.error('Refusing production write without --confirm-production.');
  process.exit(1);
}

if (!Number.isFinite(amount) || amount <= 0) {
  console.error('Invalid --amount. Use a positive Rand amount, e.g. --amount=1000.');
  process.exit(1);
}

if (!Number.isFinite(minimumBalance) || minimumBalance < 0) {
  console.error('Invalid --min-balance. Use zero or a positive Rand amount, e.g. --min-balance=100.');
  process.exit(1);
}

const { getProductionDatabaseURL } = require('./db-connection-helper');
process.env.DATABASE_URL = getProductionDatabaseURL();

const db = require('../models');
const ledgerService = require('../services/ledgerService');

function money(value) {
  return Number(value || 0).toFixed(2);
}

function isRetryableDbError(error) {
  const message = String(error?.message || '').toLowerCase();
  return (
    message.includes('econnreset') ||
    message.includes('read econnreset') ||
    message.includes('connection terminated') ||
    message.includes('connection refused') ||
    message.includes('timeout')
  );
}

async function withDbRetry(label, fn, maxAttempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isRetryableDbError(error) || attempt === maxAttempts) {
        throw error;
      }
      console.warn(`[OTT Float Top-Up] ${label} failed with ${error.message}; retrying (${attempt + 1}/${maxAttempts})...`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
  throw lastError;
}

async function findOttSupplierFloat() {
  return db.SupplierFloat.findOne({
    where: {
      ledgerAccountCode: OTT_FLOAT_ACCOUNT_CODE,
      supplierId: 'OTT',
      status: 'active',
      isActive: true,
    },
  });
}

async function preflight() {
  const accounts = await db.LedgerAccount.findAll({
    where: { code: [TREASURY_ACCOUNT_CODE, OTT_FLOAT_ACCOUNT_CODE] },
    raw: true,
  });
  const accountCodes = new Set(accounts.map((account) => account.code));
  const missingAccounts = [TREASURY_ACCOUNT_CODE, OTT_FLOAT_ACCOUNT_CODE]
    .filter((code) => !accountCodes.has(code));

  const existingJournal = await db.JournalEntry.findOne({
    where: { reference },
    raw: true,
  });

  const supplierFloat = await findOttSupplierFloat();
  const treasuryBalance = await ledgerService.getAccountBalanceByCode(TREASURY_ACCOUNT_CODE);
  const ottFloatBalance = await ledgerService.getAccountBalanceByCode(OTT_FLOAT_ACCOUNT_CODE);

  return {
    missingAccounts,
    existingJournal,
    supplierFloat,
    treasuryBalance,
    ottFloatBalance,
  };
}

async function syncSupplierFloatFromLedger({ context }) {
  const supplierFloat = await findOttSupplierFloat();
  if (!supplierFloat) {
    throw new Error(`SupplierFloat row not found for OTT / ${OTT_FLOAT_ACCOUNT_CODE}`);
  }

  const ledgerBalance = await ledgerService.getAccountBalanceByCode(OTT_FLOAT_ACCOUNT_CODE);
  if (ledgerBalance === null) {
    throw new Error(`Ledger account ${OTT_FLOAT_ACCOUNT_CODE} not found`);
  }

  await supplierFloat.update({
    currentBalance: money(ledgerBalance),
    minimumBalance: money(minimumBalance),
    metadata: {
      ...(supplierFloat.metadata || {}),
      lastLedgerSyncAt: new Date().toISOString(),
      lastLedgerSyncSource: context,
      lowBalanceMinimumSetBy: 'load-ott-production-float',
    },
  });

  await supplierFloat.reload();
  return supplierFloat;
}

async function main() {
  const mode = shouldApply ? 'APPLY' : 'DRY-RUN';
  console.log(`[OTT Float Top-Up] Mode: ${mode}`);
  console.log(`[OTT Float Top-Up] Reference: ${reference}`);
  console.log(`[OTT Float Top-Up] Journal: DR ${OTT_FLOAT_ACCOUNT_CODE} R${money(amount)} / CR ${TREASURY_ACCOUNT_CODE} R${money(amount)}`);
  console.log(`[OTT Float Top-Up] Low-balance minimum: R${money(minimumBalance)}`);

  const checks = await withDbRetry('Preflight', preflight);

  console.log(`[OTT Float Top-Up] Treasury ledger balance before: R${money(checks.treasuryBalance)}`);
  console.log(`[OTT Float Top-Up] OTT float ledger balance before: R${money(checks.ottFloatBalance)}`);
  console.log(`[OTT Float Top-Up] OTT SupplierFloat present: ${checks.supplierFloat ? 'yes' : 'no'}`);
  if (checks.supplierFloat) {
    console.log(`[OTT Float Top-Up] OTT SupplierFloat currentBalance before: R${money(checks.supplierFloat.currentBalance)}`);
    console.log(`[OTT Float Top-Up] OTT SupplierFloat minimumBalance before: R${money(checks.supplierFloat.minimumBalance)}`);
  }

  if (checks.missingAccounts.length > 0) {
    throw new Error(`Missing required ledger account(s): ${checks.missingAccounts.join(', ')}`);
  }
  if (!checks.supplierFloat) {
    throw new Error(`Missing active OTT SupplierFloat row for ${OTT_FLOAT_ACCOUNT_CODE}`);
  }

  if (!shouldApply) {
    console.log('[OTT Float Top-Up] Dry-run only. No journal or SupplierFloat update was written.');
    return;
  }

  if (checks.existingJournal) {
    console.log(`[OTT Float Top-Up] Journal reference already exists (id ${checks.existingJournal.id}); skipping duplicate post and syncing SupplierFloat only.`);
  } else {
    await withDbRetry('Journal posting', () => ledgerService.postJournalEntry({
      reference,
      description: 'OTT production float top-up from SBSA Treasury Account',
      lines: [
        {
          accountCode: OTT_FLOAT_ACCOUNT_CODE,
          dc: 'debit',
          amount,
          memo: 'OTT production prefunded float top-up',
        },
        {
          accountCode: TREASURY_ACCOUNT_CODE,
          dc: 'credit',
          amount,
          memo: 'SBSA Treasury Account funding OTT float',
        },
      ],
    }));
    console.log('[OTT Float Top-Up] Journal posted successfully.');
  }

  const syncedFloat = await withDbRetry('SupplierFloat sync', () => syncSupplierFloatFromLedger({ context: 'production_ott_float_topup' }));
  const treasuryBalanceAfter = await withDbRetry('Treasury balance verification', () => ledgerService.getAccountBalanceByCode(TREASURY_ACCOUNT_CODE));
  const ottFloatBalanceAfter = await withDbRetry('OTT float balance verification', () => ledgerService.getAccountBalanceByCode(OTT_FLOAT_ACCOUNT_CODE));

  console.log(`[OTT Float Top-Up] Treasury ledger balance after: R${money(treasuryBalanceAfter)}`);
  console.log(`[OTT Float Top-Up] OTT float ledger balance after: R${money(ottFloatBalanceAfter)}`);
  console.log(`[OTT Float Top-Up] OTT SupplierFloat currentBalance after: R${money(syncedFloat.currentBalance)}`);
  console.log(`[OTT Float Top-Up] OTT SupplierFloat minimumBalance after: R${money(syncedFloat.minimumBalance)}`);
}

main()
  .catch((error) => {
    console.error('[OTT Float Top-Up] Failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.sequelize.close().catch(() => {});
  });
