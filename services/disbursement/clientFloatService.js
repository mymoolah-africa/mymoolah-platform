'use strict';

const { getUATClient, getStagingClient, getProductionClient } = require('../../scripts/db-connection-helper');

// ── Constants ────────────────────────────────────────────────────────────────

const VAT_RATE = 0.15;
const VAT_DIVISOR = 1 + VAT_RATE; // 1.15
const CLIENT_FLOAT_PREFIX = '2100-20-';
const BANK_ACCOUNT = '1100-01-01';
const USER_WALLET_ACCOUNT = '2100-01-01';
const FEE_ACCOUNTS = { eft: '4000-30-01', payshap: '4000-30-02', wallet: '4000-30-01' };
const VAT_CONTROL = '2300-30-01';
const DEFAULT_PAGE_LIMIT = 50;
const MAX_PAGE_LIMIT = 200;

// ── Helpers ──────────────────────────────────────────────────────────────────

function getClient() {
  const env = process.env.MM_DEPLOYMENT_ENV || process.env.NODE_ENV || 'uat';
  if (env === 'production') return getProductionClient();
  if (env === 'staging') return getStagingClient();
  return getUATClient();
}

function log(level, message, meta) {
  const entry = { ts: new Date().toISOString(), svc: '[ClientFloat]', level, message };
  if (meta) entry.meta = meta;
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function validatePositiveInt(value, name) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer, got: ${value}`);
  }
}

function validateNonNegativeInt(value, name) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer, got: ${value}`);
  }
}

function centsToZAR(cents) {
  return (cents / 100).toFixed(2);
}

function splitFeeVAT(feeCents) {
  const exVat = Math.round(feeCents / VAT_DIVISOR);
  const vat = feeCents - exVat;
  return { exVat, vat };
}

// ── Core Functions ───────────────────────────────────────────────────────────

/**
 * Retrieve the float balance for a disbursement client.
 */
async function getFloatBalance(clientId) {
  validatePositiveInt(clientId, 'clientId');

  const client = await getClient();
  try {
    const clientRow = await client.query(
      `SELECT ledger_account_code FROM disbursement_clients WHERE id = $1`,
      [clientId]
    );
    if (clientRow.rows.length === 0) {
      throw new Error(`Disbursement client not found: ${clientId}`);
    }

    const accountCode = clientRow.rows[0].ledger_account_code;
    if (!accountCode) {
      throw new Error(`Client ${clientId} has no assigned ledger account`);
    }

    const acctRow = await client.query(
      `SELECT balance FROM ledger_accounts WHERE code = $1 AND is_active = true`,
      [accountCode]
    );
    if (acctRow.rows.length === 0) {
      throw new Error(`Ledger account ${accountCode} not found or inactive`);
    }

    const balanceCents = Math.round(Number(acctRow.rows[0].balance) * 100);
    return {
      clientId,
      accountCode,
      balanceCents,
      balanceZAR: centsToZAR(balanceCents),
    };
  } finally {
    client.release();
  }
}

/**
 * Check whether a client has sufficient float for a given amount.
 */
async function checkSufficientFloat(clientId, requiredAmountCents) {
  validatePositiveInt(clientId, 'clientId');
  validatePositiveInt(requiredAmountCents, 'requiredAmountCents');

  const { balanceCents } = await getFloatBalance(clientId);
  const sufficient = balanceCents >= requiredAmountCents;
  const shortfallCents = sufficient ? 0 : requiredAmountCents - balanceCents;

  return {
    sufficient,
    balanceCents,
    requiredCents: requiredAmountCents,
    shortfallCents,
  };
}

/**
 * Debit client float in an ACID transaction.
 * Uses SELECT ... FOR UPDATE to prevent race conditions.
 */
async function debitFloat(clientId, params) {
  validatePositiveInt(clientId, 'clientId');

  const { amountCents, feeCents, rail, runId, description } = params || {};
  validatePositiveInt(amountCents, 'amountCents');
  validateNonNegativeInt(feeCents, 'feeCents');
  if (!rail || !['eft', 'payshap', 'wallet'].includes(rail)) {
    throw new Error(`Invalid rail: ${rail}. Must be 'eft', 'payshap', or 'wallet'`);
  }
  if (!runId) throw new Error('runId is required');
  if (!description) throw new Error('description is required');

  const totalDebitCents = amountCents + feeCents;
  const { exVat: feeExVatCents, vat: vatCents } = splitFeeVAT(feeCents);
  const feeAccount = FEE_ACCOUNTS[rail];

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Look up the client's ledger account code
    const clientRow = await client.query(
      `SELECT ledger_account_code FROM disbursement_clients WHERE id = $1`,
      [clientId]
    );
    if (clientRow.rows.length === 0) {
      throw new Error(`Disbursement client not found: ${clientId}`);
    }
    const accountCode = clientRow.rows[0].ledger_account_code;
    if (!accountCode) {
      throw new Error(`Client ${clientId} has no assigned ledger account`);
    }

    // Row-level lock on client's float account
    const lockRow = await client.query(
      `SELECT id, balance FROM ledger_accounts WHERE code = $1 AND is_active = true FOR UPDATE`,
      [accountCode]
    );
    if (lockRow.rows.length === 0) {
      throw new Error(`Ledger account ${accountCode} not found or inactive`);
    }

    const currentBalanceCents = Math.round(Number(lockRow.rows[0].balance) * 100);
    if (currentBalanceCents < totalDebitCents) {
      throw new Error(
        `Insufficient float: available ${currentBalanceCents} cents, required ${totalDebitCents} cents`
      );
    }

    const txnId = `DISB-${runId}-${Date.now()}`;
    const journalEntries = [];

    // Wallet rail: internal liability transfer (no bank movement)
    // EFT/PayShap: money leaves the bank to beneficiaries
    const creditAccountCode = rail === 'wallet' ? USER_WALLET_ACCOUNT : BANK_ACCOUNT;
    const creditDesc = rail === 'wallet'
      ? `Wallet credit settlement — ${description}`
      : `Bank settlement — ${description}`;

    // DR client float (liability decreases = debit)
    const je1 = await client.query(
      `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
       VALUES ($1, $2, $3, 0, $4, $5, NOW()) RETURNING id`,
      [txnId, accountCode, totalDebitCents, description, JSON.stringify({ runId, rail, clientId })]
    );
    journalEntries.push({ id: je1.rows[0].id, accountCode, debit: totalDebitCents, credit: 0 });

    // CR settlement account (bank for EFT/PayShap, user wallet for wallet rail)
    const je2 = await client.query(
      `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
       VALUES ($1, $2, 0, $3, $4, $5, NOW()) RETURNING id`,
      [txnId, creditAccountCode, amountCents, creditDesc, JSON.stringify({ runId, rail })]
    );
    journalEntries.push({ id: je2.rows[0].id, accountCode: creditAccountCode, debit: 0, credit: amountCents });

    // CR fee revenue (ex-VAT)
    if (feeExVatCents > 0) {
      const je3 = await client.query(
        `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
         VALUES ($1, $2, 0, $3, $4, $5, NOW()) RETURNING id`,
        [txnId, feeAccount, feeExVatCents, `Fee revenue (${rail}) — ${description}`, JSON.stringify({ runId, rail, feeCents, exVat: feeExVatCents })]
      );
      journalEntries.push({ id: je3.rows[0].id, accountCode: feeAccount, debit: 0, credit: feeExVatCents });
    }

    // CR VAT control
    if (vatCents > 0) {
      const je4 = await client.query(
        `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
         VALUES ($1, $2, 0, $3, $4, $5, NOW()) RETURNING id`,
        [txnId, VAT_CONTROL, vatCents, `VAT on ${rail} fee — ${description}`, JSON.stringify({ runId, rail, vatCents })]
      );
      journalEntries.push({ id: je4.rows[0].id, accountCode: VAT_CONTROL, debit: 0, credit: vatCents });
    }

    // Update balances on all affected ledger accounts
    await client.query(
      `UPDATE ledger_accounts SET balance = balance - $1, updated_at = NOW() WHERE code = $2`,
      [totalDebitCents / 100, accountCode]
    );
    await client.query(
      `UPDATE ledger_accounts SET balance = balance + $1, updated_at = NOW() WHERE code = $2`,
      [amountCents / 100, creditAccountCode]
    );
    if (feeExVatCents > 0) {
      await client.query(
        `UPDATE ledger_accounts SET balance = balance + $1, updated_at = NOW() WHERE code = $2`,
        [feeExVatCents / 100, feeAccount]
      );
    }
    if (vatCents > 0) {
      await client.query(
        `UPDATE ledger_accounts SET balance = balance + $1, updated_at = NOW() WHERE code = $2`,
        [vatCents / 100, VAT_CONTROL]
      );
    }

    await client.query('COMMIT');

    const newBalanceCents = currentBalanceCents - totalDebitCents;
    log('info', 'Float debited', {
      clientId, accountCode, amountCents, feeCents, rail, runId,
      previousBalanceCents: currentBalanceCents,
      newBalanceCents,
    });

    return { success: true, journalEntries, newBalanceCents };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log('error', 'Float debit failed', { clientId, runId, error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Credit client float (deposit or refund) in an ACID transaction.
 */
async function creditFloat(clientId, params) {
  validatePositiveInt(clientId, 'clientId');

  const { amountCents, reference, source, description } = params || {};
  validatePositiveInt(amountCents, 'amountCents');
  if (!reference) throw new Error('reference is required');
  if (!source) throw new Error('source is required');
  if (!description) throw new Error('description is required');

  const client = await getClient();
  try {
    await client.query('BEGIN');

    const clientRow = await client.query(
      `SELECT ledger_account_code FROM disbursement_clients WHERE id = $1`,
      [clientId]
    );
    if (clientRow.rows.length === 0) {
      throw new Error(`Disbursement client not found: ${clientId}`);
    }
    const accountCode = clientRow.rows[0].ledger_account_code;
    if (!accountCode) {
      throw new Error(`Client ${clientId} has no assigned ledger account`);
    }

    // Row-level lock on client's float account
    const lockRow = await client.query(
      `SELECT id, balance FROM ledger_accounts WHERE code = $1 AND is_active = true FOR UPDATE`,
      [accountCode]
    );
    if (lockRow.rows.length === 0) {
      throw new Error(`Ledger account ${accountCode} not found or inactive`);
    }

    const currentBalanceCents = Math.round(Number(lockRow.rows[0].balance) * 100);
    const txnId = `FLOAT-${reference}-${Date.now()}`;
    const journalEntries = [];

    // DR bank account (asset increases)
    const je1 = await client.query(
      `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
       VALUES ($1, $2, $3, 0, $4, $5, NOW()) RETURNING id`,
      [txnId, BANK_ACCOUNT, amountCents, `Float deposit — ${description}`, JSON.stringify({ reference, source, clientId })]
    );
    journalEntries.push({ id: je1.rows[0].id, accountCode: BANK_ACCOUNT, debit: amountCents, credit: 0 });

    // CR client float (liability increases)
    const je2 = await client.query(
      `INSERT INTO journal_entries (transaction_id, account_code, debit, credit, description, metadata, created_at)
       VALUES ($1, $2, 0, $3, $4, $5, NOW()) RETURNING id`,
      [txnId, accountCode, amountCents, description, JSON.stringify({ reference, source, clientId })]
    );
    journalEntries.push({ id: je2.rows[0].id, accountCode, debit: 0, credit: amountCents });

    // Update balances
    await client.query(
      `UPDATE ledger_accounts SET balance = balance + $1, updated_at = NOW() WHERE code = $2`,
      [amountCents / 100, BANK_ACCOUNT]
    );
    await client.query(
      `UPDATE ledger_accounts SET balance = balance + $1, updated_at = NOW() WHERE code = $2`,
      [amountCents / 100, accountCode]
    );

    await client.query('COMMIT');

    const newBalanceCents = currentBalanceCents + amountCents;
    log('info', 'Float credited', {
      clientId, accountCode, amountCents, reference, source,
      previousBalanceCents: currentBalanceCents,
      newBalanceCents,
    });

    return { success: true, journalEntries, newBalanceCents };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log('error', 'Float credit failed', { clientId, reference, error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Create a new dedicated ledger account for a disbursement client.
 * Auto-assigns the next available code in the 2100-20-XX range.
 */
async function createClientLedgerAccount(clientCode, companyName) {
  if (!clientCode || typeof clientCode !== 'string') {
    throw new Error('clientCode is required and must be a string');
  }
  if (!companyName || typeof companyName !== 'string') {
    throw new Error('companyName is required and must be a string');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Find the highest existing code in the 2100-20-XX range
    const maxRow = await client.query(
      `SELECT code FROM ledger_accounts
       WHERE code LIKE $1
       ORDER BY code DESC
       LIMIT 1`,
      [`${CLIENT_FLOAT_PREFIX}%`]
    );

    let nextSeq = 1;
    if (maxRow.rows.length > 0) {
      const lastCode = maxRow.rows[0].code;
      const lastSeq = parseInt(lastCode.replace(CLIENT_FLOAT_PREFIX, ''), 10);
      if (!isNaN(lastSeq)) nextSeq = lastSeq + 1;
    }

    const newCode = `${CLIENT_FLOAT_PREFIX}${String(nextSeq).padStart(2, '0')}`;

    // Ensure no collision (defensive)
    const collision = await client.query(
      `SELECT id FROM ledger_accounts WHERE code = $1`,
      [newCode]
    );
    if (collision.rows.length > 0) {
      throw new Error(`Ledger account ${newCode} already exists — sequence collision`);
    }

    await client.query(
      `INSERT INTO ledger_accounts (code, name, type, sub_type, balance, is_active, created_at, updated_at)
       VALUES ($1, $2, 'liability', 'client_float', 0, true, NOW(), NOW())`,
      [newCode, `Disbursement Float — ${companyName} (${clientCode})`]
    );

    await client.query('COMMIT');

    log('info', 'Ledger account created', { clientCode, accountCode: newCode });
    return newCode;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    log('error', 'Ledger account creation failed', { clientCode, error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Retrieve paginated float movement history for a client.
 */
async function getFloatHistory(clientId, options) {
  validatePositiveInt(clientId, 'clientId');

  const { page = 1, limit = DEFAULT_PAGE_LIMIT, dateFrom, dateTo } = options || {};
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), MAX_PAGE_LIMIT);
  const offset = (safePage - 1) * safeLimit;

  const client = await getClient();
  try {
    const clientRow = await client.query(
      `SELECT ledger_account_code FROM disbursement_clients WHERE id = $1`,
      [clientId]
    );
    if (clientRow.rows.length === 0) {
      throw new Error(`Disbursement client not found: ${clientId}`);
    }
    const accountCode = clientRow.rows[0].ledger_account_code;
    if (!accountCode) {
      throw new Error(`Client ${clientId} has no assigned ledger account`);
    }

    const conditions = ['je.account_code = $1'];
    const countConditions = ['account_code = $1'];
    const queryParams = [accountCode];
    const countParams = [accountCode];
    let paramIdx = 2;

    if (dateFrom) {
      conditions.push(`je.created_at >= $${paramIdx}`);
      countConditions.push(`created_at >= $${paramIdx}`);
      queryParams.push(dateFrom);
      countParams.push(dateFrom);
      paramIdx++;
    }
    if (dateTo) {
      conditions.push(`je.created_at <= $${paramIdx}`);
      countConditions.push(`created_at <= $${paramIdx}`);
      queryParams.push(dateTo);
      countParams.push(dateTo);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    const countWhereClause = countConditions.join(' AND ');

    const countResult = await client.query(
      `SELECT COUNT(*)::int AS total FROM journal_entries WHERE ${countWhereClause}`,
      countParams
    );
    const total = countResult.rows[0].total;

    queryParams.push(safeLimit, offset);
    const dataResult = await client.query(
      `SELECT je.id, je.transaction_id, je.debit, je.credit, je.description, je.metadata, je.created_at
       FROM journal_entries je
       WHERE ${whereClause}
       ORDER BY je.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      queryParams
    );

    const entries = dataResult.rows.map(row => ({
      id: row.id,
      transactionId: row.transaction_id,
      debitCents: Math.round(Number(row.debit || 0) * 100),
      creditCents: Math.round(Number(row.credit || 0) * 100),
      description: row.description,
      metadata: row.metadata,
      createdAt: row.created_at,
    }));

    return {
      entries,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages: Math.ceil(total / safeLimit),
      },
    };
  } finally {
    client.release();
  }
}

// ── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  getFloatBalance,
  checkSufficientFloat,
  debitFloat,
  creditFloat,
  createClientLedgerAccount,
  getFloatHistory,
};
