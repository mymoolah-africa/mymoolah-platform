'use strict';

/**
 * @module fileParserService
 * @description Parses beneficiary files uploaded by disbursement clients.
 *
 * Supported formats:
 *   - CSV  (.csv)  — flexible column mapping, csv-parse/sync
 *   - Excel (.xlsx) — first sheet, same column mapping as CSV
 *   - Pain.001 XML (.xml) — ISO 20022 CdtTrfTxInf extraction
 *
 * Every parsed row is validated (field constraints + SA CDV check-digit)
 * and returned as a normalised beneficiary object with embedded validation
 * results.
 *
 * No PII is ever written to logs.
 */

const { parse: csvParse } = require('csv-parse/sync');
const { XMLParser } = require('fast-xml-parser');
const XLSX = require('xlsx');

const LOG_PREFIX = '[FileParser]';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_AMOUNT = 10_000_000; // R10 000 000

// ---------------------------------------------------------------------------
// Universal branch-code → bank-name lookup
// ---------------------------------------------------------------------------

const BRANCH_CODES = Object.freeze({
  '632005': 'ABSA',
  '250655': 'FNB / First National Bank',
  '198765': 'Nedbank',
  '051001': 'Standard Bank',
  '470010': 'Capitec',
  '462005': 'African Bank',
  '430000': 'Bidvest Bank',
  '679000': 'Discovery Bank',
  '580105': 'Investec',
  '261251': 'Sasfin',
  '431010': 'TymeBank',
  '678910': 'Bank Zero',
  '350005': 'Old Mutual / Nedbank Private Wealth',
});

/**
 * Legacy 3-digit bank prefixes → universal branch code.
 * Allows clients to submit older 6-digit branch codes where the first three
 * digits identify the bank. We map them to the canonical universal code.
 */
const LEGACY_PREFIX_MAP = Object.freeze({
  '632': '632005',
  '250': '250655',
  '198': '198765',
  '051': '051001',
  '470': '470010',
  '462': '462005',
  '430': '430000',
  '679': '679000',
  '580': '580105',
  '261': '261251',
  '431': '431010',
  '678': '678910',
  '350': '350005',
});

// ---------------------------------------------------------------------------
// Column-name mapping (case-insensitive, flexible naming)
// ---------------------------------------------------------------------------

const COLUMN_MAP = {
  beneficiaryName: ['name', 'beneficiary_name', 'beneficiaryname', 'full_name', 'fullname'],
  accountNumber:   ['account_number', 'accountnumber', 'account', 'acc_no', 'accno'],
  branchCode:      ['branch_code', 'branchcode', 'branch', 'sort_code', 'sortcode'],
  amount:          ['amount', 'payment_amount', 'paymentamount', 'salary'],
  bankName:        ['bank_name', 'bankname', 'bank'],
  reference:       ['reference', 'ref', 'payment_ref', 'paymentref'],
  employeeRef:     ['employee_ref', 'employeeref', 'emp_ref', 'empref', 'emp_id', 'empid'],
};

function buildColumnIndex(headers) {
  const index = {};
  const normHeaders = headers.map(h => h.toString().trim().toLowerCase().replace(/[\s-]+/g, '_'));

  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    const colIdx = normHeaders.findIndex(h => aliases.includes(h));
    if (colIdx !== -1) {
      index[field] = colIdx;
    }
  }
  return index;
}

function buildColumnIndexFromKeys(keys) {
  const index = {};
  const normKeys = keys.map(k => k.toString().trim().toLowerCase().replace(/[\s-]+/g, '_'));

  for (const [field, aliases] of Object.entries(COLUMN_MAP)) {
    const matchKey = normKeys.find(k => aliases.includes(k));
    if (matchKey) {
      index[field] = matchKey;
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Amount parsing
// ---------------------------------------------------------------------------

function parseAmount(raw) {
  if (raw == null) return NaN;
  const str = String(raw).trim().replace(/,/g, '').replace(/^R\s*/i, '');
  const num = parseFloat(str);
  return Number.isFinite(num) ? Math.round(num * 100) / 100 : NaN;
}

// ---------------------------------------------------------------------------
// Branch-code resolution
// ---------------------------------------------------------------------------

function resolveBranchCode(raw) {
  if (!raw) return { code: null, bankName: null };
  const trimmed = String(raw).trim().replace(/\s/g, '');

  if (BRANCH_CODES[trimmed]) {
    return { code: trimmed, bankName: BRANCH_CODES[trimmed] };
  }

  const prefix = trimmed.substring(0, 3);
  const universalCode = LEGACY_PREFIX_MAP[prefix];
  if (universalCode) {
    return { code: universalCode, bankName: BRANCH_CODES[universalCode] };
  }

  return { code: trimmed, bankName: null };
}

// ---------------------------------------------------------------------------
// CDV (Check Digit Verification) — SA Modulus 10 double-alternate
// ---------------------------------------------------------------------------

/**
 * South African CDV validation (Modulus 10 double-alternate).
 *
 * WARNING-only: some legitimate accounts (older, special-purpose) may fail.
 *
 * @param {string} accountNumber — digits only
 * @param {string} branchCode   — universal branch code
 * @returns {{ valid: boolean, warning: string|null }}
 */
function validateCDV(accountNumber, branchCode) {
  if (!accountNumber || !/^\d{6,20}$/.test(accountNumber)) {
    return { valid: false, warning: 'Account number format invalid for CDV check' };
  }

  if (!branchCode || !BRANCH_CODES[branchCode]) {
    return { valid: true, warning: null };
  }

  try {
    const digits = accountNumber.split('').map(Number);
    let sum = 0;

    for (let i = digits.length - 1; i >= 0; i--) {
      const pos = digits.length - 1 - i;
      let d = digits[i];

      if (pos % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }

    const valid = sum % 10 === 0;
    return {
      valid,
      warning: valid ? null : 'CDV check-digit mismatch (may be legitimate for older accounts)',
    };
  } catch {
    return { valid: true, warning: 'CDV check could not be performed' };
  }
}

// ---------------------------------------------------------------------------
// Single-beneficiary validation
// ---------------------------------------------------------------------------

/**
 * @param {object} b     — beneficiary object
 * @param {number} index — 0-based row index (for error messages)
 * @returns {{ valid: boolean, errors: string[], warnings: string[] }}
 */
function validateBeneficiary(b, index) {
  const errors = [];
  const warnings = [];
  const row = index + 1;

  if (!b.beneficiaryName || b.beneficiaryName.length === 0) {
    errors.push(`Row ${row}: beneficiaryName is required`);
  } else if (b.beneficiaryName.length > 140) {
    errors.push(`Row ${row}: beneficiaryName exceeds 140 characters`);
  }

  const acctClean = b.accountNumber ? String(b.accountNumber).replace(/\s/g, '') : '';
  if (!acctClean) {
    errors.push(`Row ${row}: accountNumber is required`);
  } else if (!/^\d{6,20}$/.test(acctClean)) {
    errors.push(`Row ${row}: accountNumber must be 6-20 digits`);
  }

  if (!b.branchCode) {
    errors.push(`Row ${row}: branchCode is required`);
  } else if (!BRANCH_CODES[b.branchCode]) {
    errors.push(`Row ${row}: branchCode '${b.branchCode}' not recognised`);
  }

  if (b.amount == null || Number.isNaN(b.amount)) {
    errors.push(`Row ${row}: amount is required`);
  } else if (b.amount <= 0) {
    errors.push(`Row ${row}: amount must be greater than zero`);
  } else if (b.amount > MAX_AMOUNT) {
    errors.push(`Row ${row}: amount exceeds R10,000,000 limit`);
  }

  if (b.reference && b.reference.length > 35) {
    errors.push(`Row ${row}: reference exceeds 35 characters`);
  }

  if (acctClean && /^\d{6,20}$/.test(acctClean) && b.branchCode) {
    const cdv = validateCDV(acctClean, b.branchCode);
    if (!cdv.valid && cdv.warning) {
      warnings.push(`Row ${row}: ${cdv.warning}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ---------------------------------------------------------------------------
// Normalise a single row into a beneficiary object
// ---------------------------------------------------------------------------

function normaliseBeneficiary(raw, index) {
  const accountRaw = raw.accountNumber ? String(raw.accountNumber).replace(/\s/g, '') : '';
  const { code: branchCode, bankName: resolvedBank } = resolveBranchCode(raw.branchCode);

  const b = {
    beneficiaryName: raw.beneficiaryName ? String(raw.beneficiaryName).trim() : '',
    accountNumber: accountRaw,
    branchCode: branchCode || '',
    bankName: raw.bankName ? String(raw.bankName).trim() : resolvedBank,
    amount: parseAmount(raw.amount),
    reference: raw.reference ? String(raw.reference).trim().substring(0, 35) : null,
    employeeRef: raw.employeeRef ? String(raw.employeeRef).trim() : null,
    validation: { valid: true, errors: [], warnings: [] },
  };

  b.validation = validateBeneficiary(b, index);
  return b;
}

// ---------------------------------------------------------------------------
// Input guards
// ---------------------------------------------------------------------------

function assertBuffer(buffer) {
  if (!Buffer.isBuffer(buffer) && typeof buffer !== 'string') {
    throw new Error(`${LOG_PREFIX} Input must be a Buffer or string`);
  }
  const size = Buffer.isBuffer(buffer) ? buffer.length : Buffer.byteLength(buffer, 'utf8');
  if (size > MAX_FILE_SIZE) {
    throw new Error(`${LOG_PREFIX} File exceeds 50 MB limit (${(size / 1024 / 1024).toFixed(1)} MB)`);
  }
}

// ---------------------------------------------------------------------------
// Duplicate detection
// ---------------------------------------------------------------------------

function detectDuplicates(beneficiaries) {
  const seen = new Map();
  for (let i = 0; i < beneficiaries.length; i++) {
    const acct = beneficiaries[i].accountNumber;
    if (!acct) continue;
    if (seen.has(acct)) {
      const firstRow = seen.get(acct) + 1;
      beneficiaries[i].validation.warnings.push(
        `Row ${i + 1}: duplicate account number (first seen in row ${firstRow})`
      );
    } else {
      seen.set(acct, i);
    }
  }
}

// ---------------------------------------------------------------------------
// CSV Parser
// ---------------------------------------------------------------------------

function parseCSV(buffer) {
  assertBuffer(buffer);
  const content = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : buffer;

  const records = csvParse(content, {
    columns: false,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    bom: true,
  });

  if (records.length === 0) {
    console.log(`${LOG_PREFIX} CSV file is empty — 0 rows`);
    return [];
  }

  const headers = records[0];
  const colIdx = buildColumnIndex(headers);
  const dataRows = records.slice(1);

  const beneficiaries = [];
  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const allEmpty = row.every(cell => !cell || String(cell).trim() === '');
    if (allEmpty) continue;

    const raw = {
      beneficiaryName: colIdx.beneficiaryName != null ? row[colIdx.beneficiaryName] : undefined,
      accountNumber:   colIdx.accountNumber   != null ? row[colIdx.accountNumber]   : undefined,
      branchCode:      colIdx.branchCode      != null ? row[colIdx.branchCode]      : undefined,
      amount:          colIdx.amount           != null ? row[colIdx.amount]          : undefined,
      bankName:        colIdx.bankName         != null ? row[colIdx.bankName]        : undefined,
      reference:       colIdx.reference        != null ? row[colIdx.reference]       : undefined,
      employeeRef:     colIdx.employeeRef      != null ? row[colIdx.employeeRef]     : undefined,
    };

    beneficiaries.push(normaliseBeneficiary(raw, beneficiaries.length));
  }

  detectDuplicates(beneficiaries);
  const validCount = beneficiaries.filter(b => b.validation.valid).length;
  console.log(
    `${LOG_PREFIX} CSV parsed — ${beneficiaries.length} rows, ${validCount} valid, ${beneficiaries.length - validCount} with errors`
  );
  return beneficiaries;
}

// ---------------------------------------------------------------------------
// Excel Parser
// ---------------------------------------------------------------------------

function parseExcel(buffer) {
  assertBuffer(buffer);

  const workbook = XLSX.read(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer), { type: 'buffer' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    console.log(`${LOG_PREFIX} Excel file has no sheets — 0 rows`);
    return [];
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '' });
  if (rows.length === 0) {
    console.log(`${LOG_PREFIX} Excel sheet "${sheetName}" is empty — 0 rows`);
    return [];
  }

  const colIdx = buildColumnIndexFromKeys(Object.keys(rows[0]));

  const beneficiaries = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const raw = {
      beneficiaryName: colIdx.beneficiaryName ? r[colIdx.beneficiaryName] : undefined,
      accountNumber:   colIdx.accountNumber   ? r[colIdx.accountNumber]   : undefined,
      branchCode:      colIdx.branchCode      ? r[colIdx.branchCode]      : undefined,
      amount:          colIdx.amount           ? r[colIdx.amount]          : undefined,
      bankName:        colIdx.bankName         ? r[colIdx.bankName]        : undefined,
      reference:       colIdx.reference        ? r[colIdx.reference]       : undefined,
      employeeRef:     colIdx.employeeRef      ? r[colIdx.employeeRef]     : undefined,
    };

    beneficiaries.push(normaliseBeneficiary(raw, beneficiaries.length));
  }

  detectDuplicates(beneficiaries);
  const validCount = beneficiaries.filter(b => b.validation.valid).length;
  console.log(
    `${LOG_PREFIX} Excel parsed (sheet: "${sheetName}") — ${beneficiaries.length} rows, ${validCount} valid, ${beneficiaries.length - validCount} with errors`
  );
  return beneficiaries;
}

// ---------------------------------------------------------------------------
// Pain.001 XML Parser
// ---------------------------------------------------------------------------

function parsePain001XML(buffer) {
  assertBuffer(buffer);
  const content = Buffer.isBuffer(buffer) ? buffer.toString('utf8') : buffer;

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
    parseTagValue: false,
    isArray: (name) => name === 'CdtTrfTxInf' || name === 'PmtInf',
  });

  const doc = parser.parse(content);
  const root = doc.Document || doc;
  const initiation = root.CstmrCdtTrfInitn;
  if (!initiation) {
    throw new Error(`${LOG_PREFIX} Invalid Pain.001 XML — missing CstmrCdtTrfInitn element`);
  }

  const pmtInfos = Array.isArray(initiation.PmtInf)
    ? initiation.PmtInf
    : initiation.PmtInf ? [initiation.PmtInf] : [];

  const beneficiaries = [];

  for (const pmtInf of pmtInfos) {
    const txns = Array.isArray(pmtInf.CdtTrfTxInf)
      ? pmtInf.CdtTrfTxInf
      : pmtInf.CdtTrfTxInf ? [pmtInf.CdtTrfTxInf] : [];

    for (const tx of txns) {
      const beneficiaryName = tx.Cdtr && tx.Cdtr.Nm ? String(tx.Cdtr.Nm).trim() : '';

      let accountNumber = '';
      try { accountNumber = String(tx.CdtrAcct.Id.Othr.Id).trim(); } catch { /* optional nesting */ }

      let branchCode = '';
      try { branchCode = String(tx.CdtrAgt.FinInstnId.ClrSysMmbId.MmbId).trim(); } catch { /* optional nesting */ }

      let amount = NaN;
      try {
        const instd = tx.Amt && tx.Amt.InstdAmt;
        const rawAmt = typeof instd === 'object' ? instd['#text'] : instd;
        amount = parseAmount(rawAmt);
      } catch { /* optional */ }

      let reference = null;
      try { reference = String(tx.RmtInf.Ustrd).trim(); } catch { /* optional */ }
      if (!reference) {
        try { reference = String(tx.PmtId.EndToEndId).trim(); } catch { /* optional */ }
      }

      const raw = { beneficiaryName, accountNumber, branchCode, amount, reference };
      beneficiaries.push(normaliseBeneficiary(raw, beneficiaries.length));
    }
  }

  detectDuplicates(beneficiaries);
  const validCount = beneficiaries.filter(b => b.validation.valid).length;
  console.log(
    `${LOG_PREFIX} Pain.001 XML parsed — ${beneficiaries.length} transactions, ${validCount} valid, ${beneficiaries.length - validCount} with errors`
  );
  return beneficiaries;
}

// ---------------------------------------------------------------------------
// Auto-detect entry point
// ---------------------------------------------------------------------------

/**
 * Parse a beneficiary file (CSV, Excel, or Pain.001 XML).
 * Format is detected from the filename extension.
 *
 * @param {Buffer|string} buffer   — file contents
 * @param {string}        filename — original filename (used for format detection)
 * @returns {Array<object>} normalised beneficiary array
 */
function parseFile(buffer, filename) {
  if (!filename || typeof filename !== 'string') {
    throw new Error(`${LOG_PREFIX} filename is required for format detection`);
  }

  assertBuffer(buffer);

  const ext = filename.toLowerCase().split('.').pop();
  console.log(`${LOG_PREFIX} Processing file "${filename}" — detected format: ${ext}`);

  switch (ext) {
    case 'csv':
      return parseCSV(buffer);
    case 'xlsx':
    case 'xls':
      return parseExcel(buffer);
    case 'xml':
      return parsePain001XML(buffer);
    default:
      throw new Error(
        `${LOG_PREFIX} Unsupported file format ".${ext}". Accepted: .csv, .xlsx, .xml`
      );
  }
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
  parseFile,
  parseCSV,
  parseExcel,
  parsePain001XML,
  validateBeneficiary,
  validateCDV,
  BRANCH_CODES,
};
