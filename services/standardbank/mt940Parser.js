'use strict';

/**
 * MT940 / MT942 Parser — SBSA H2H Bank Statements
 *
 * Parses SWIFT MT940 (end-of-day) and MT942 (intraday) statement files
 * delivered by Standard Bank South Africa via SFTP H2H.
 *
 * MT940 = CustomerStatement (end-of-day closing balance)
 * MT942 = IntermediateCustomerStatement (intraday/midday snapshot)
 *
 * SWIFT MT940 Field Reference:
 *   :20:   Transaction Reference Number
 *   :25:   Account Identification (bank/account)
 *   :28C:  Statement / Sequence Number
 *   :60F:  Opening Balance — Final    (MT940)
 *   :60M:  Opening Balance — Midday   (MT942)
 *   :61:   Statement Line  (one per transaction)
 *   :86:   Information to Account Owner (narrative for preceding :61:)
 *   :62F:  Closing Balance — Final    (MT940)
 *   :62M:  Closing Balance — Midday   (MT942)
 *   :64:   Available Balance (optional)
 *   :65:   Forward Available Balance (optional)
 *
 * :61: Field Structure:
 *   YYMMDD[MMDD]CRDDDDDDd,ddNSSSREFERENCE
 *   ├── YYMMDD     = Value date
 *   ├── [MMDD]     = Entry date (optional, if different from value date)
 *   ├── CR / DR    = Credit / Debit indicator (RD = reverse debit, RC = reverse credit)
 *   ├── Amount     = Integer part + comma + decimal (e.g. 123456,78 = R123,456.78)
 *   ├── N          = SWIFT type indicator (always N for non-SWIFT originated)
 *   ├── SSS        = 3-char SWIFT transaction type code (e.g. TRF, MSC, CHG)
 *   └── REFERENCE  = Client reference / end-to-end ID (up to 16 chars + //bank ref)
 *
 * @module services/standardbank/mt940Parser
 */

/**
 * Parse a full MT940 or MT942 file string.
 * A file may contain multiple statements separated by "-" (SWIFT block delimiter).
 *
 * @param {string} fileContent - Raw MT940/MT942 file content
 * @param {string} [filename='unknown'] - For logging/audit
 * @returns {ParsedMT940File}
 */
function parseMT940File(fileContent, filename = 'unknown') {
  if (!fileContent || typeof fileContent !== 'string') {
    throw new Error('MT940 file content is required');
  }

  // Normalise line endings
  const normalised = fileContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into individual statement blocks (separated by :20: tags or "-" delimiters)
  const blocks = splitIntoBlocks(normalised);

  if (blocks.length === 0) {
    throw new Error(`MT940 parse error: no statement blocks found in ${filename}`);
  }

  const statements = blocks.map((block, idx) => {
    try {
      return parseStatementBlock(block);
    } catch (err) {
      throw new Error(`MT940 parse error in block ${idx + 1} of ${filename}: ${err.message}`);
    }
  });

  return {
    filename,
    statementCount: statements.length,
    statements,
    parsedAt: new Date().toISOString(),
  };
}

/**
 * Split raw file content into individual statement blocks.
 * SWIFT files may contain multiple :20: blocks in one file.
 *
 * @param {string} content
 * @returns {string[]}
 */
function splitIntoBlocks(content) {
  // Split on lines that start a new transaction reference (:20:)
  // Keep the :20: line with its block
  const parts = content.split(/(?=^:20:)/m).filter(b => b.trim().length > 0);
  if (parts.length > 0) return parts;

  // Fallback: entire file is one block
  return [content];
}

/**
 * Parse a single statement block.
 *
 * @param {string} block
 * @returns {MT940Statement}
 */
function parseStatementBlock(block) {
  const fields = extractFields(block);

  const transactionRef  = fields[':20:']  || null;
  const accountRaw      = fields[':25:']  || null;
  const statementNum    = fields[':28C:'] || null;

  // Opening balance — :60F: (final) or :60M: (midday/MT942)
  const openingBalRaw   = fields[':60F:'] || fields[':60M:'] || null;
  const statementType   = fields[':60F:'] ? 'MT940' : 'MT942';

  // Closing balance — :62F: (final) or :62M: (midday)
  const closingBalRaw   = fields[':62F:'] || fields[':62M:'] || null;

  // Optional balances
  const availableBalRaw = fields[':64:']  || null;
  const forwardBalRaw   = fields[':65:']  || null;

  if (!openingBalRaw) {
    throw new Error('Missing opening balance field (:60F: or :60M:)');
  }
  if (!closingBalRaw) {
    throw new Error('Missing closing balance field (:62F: or :62M:)');
  }

  const openingBalance = parseBalance(openingBalRaw);
  const closingBalance = parseBalance(closingBalRaw);
  const availableBalance = availableBalRaw ? parseBalance(availableBalRaw) : null;

  // Parse account identifier  — "BANKCODE/ACCOUNTNUMBER" or just account number
  const accountParts = (accountRaw || '').split('/');
  const bankCode     = accountParts.length > 1 ? accountParts[0].trim() : null;
  const accountNumber = accountParts.length > 1
    ? accountParts[accountParts.length - 1].trim()
    : (accountRaw || '').trim();

  // Parse transactions (pairs of :61: + optional :86:)
  const transactions = parseTransactionLines(block);

  // Validate double-entry: opening + net credits - net debits = closing
  const netMovement = transactions.reduce((sum, t) => {
    return sum + (t.direction === 'credit' ? t.amountCents : -t.amountCents);
  }, 0);
  const expectedClosing = openingBalance.amountCents + netMovement;
  const closingMatch = expectedClosing === closingBalance.amountCents;

  return {
    statementType,                    // 'MT940' | 'MT942'
    transactionRef,
    accountNumber,
    bankCode,
    statementNumber: statementNum,
    currency: openingBalance.currency,
    openingBalance,
    closingBalance,
    availableBalance,
    transactions,
    transactionCount: transactions.length,
    // Reconciliation integrity check
    reconciliation: {
      valid: closingMatch,
      openingCents: openingBalance.amountCents,
      netMovementCents: netMovement,
      expectedClosingCents: expectedClosing,
      actualClosingCents: closingBalance.amountCents,
      discrepancyCents: closingBalance.amountCents - expectedClosing,
    },
  };
}

/**
 * Extract all Swift fields from a statement block.
 * Multi-line field values (lines not starting with :xx:) are appended to the previous field.
 *
 * @param {string} block
 * @returns {Object} Map of field tag -> value
 */
function extractFields(block) {
  const fields = {};
  let currentTag = null;

  const lines = block.split('\n');
  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;

    // SWIFT field tag: starts with :dd: or :ddL: pattern
    const tagMatch = line.match(/^:([0-9]{2}[A-Z]?):/);
    if (tagMatch) {
      currentTag = `:${tagMatch[1]}:`;
      const value = line.slice(tagMatch[0].length);
      // For :61: and :86:, we may have multiple — store as array
      if (currentTag === ':61:' || currentTag === ':86:') {
        if (!fields[currentTag]) fields[currentTag] = [];
        fields[currentTag].push(value);
      } else {
        fields[currentTag] = value;
      }
    } else if (currentTag && line !== '-') {
      // Continuation line — append to current field value
      if (currentTag === ':61:' || currentTag === ':86:') {
        const arr = fields[currentTag];
        arr[arr.length - 1] += '\n' + line;
      } else if (fields[currentTag] !== undefined) {
        fields[currentTag] += '\n' + line;
      }
    }
  }

  return fields;
}

/**
 * Parse a SWIFT balance field value.
 * Format: C/D + YYMMDD + currency(3) + amount (comma as decimal separator)
 * Example: "C260317ZAR1500000,00" → credit, 2026-03-17, ZAR, R15,000.00
 *
 * @param {string} raw
 * @returns {BalanceField}
 */
function parseBalance(raw) {
  if (!raw) throw new Error('Balance field is empty');

  const clean = raw.trim();
  // Pattern: [C|D] YYMMDD CURRENCY AMOUNT,CENTS
  const match = clean.match(/^([CD])(\d{6})([A-Z]{3})([\d,]+)$/);
  if (!match) {
    throw new Error(`Cannot parse balance field: "${clean}"`);
  }

  const [, indicator, dateStr, currency, amountStr] = match;
  const direction = indicator === 'C' ? 'credit' : 'debit';
  const date = parseSwiftDate(dateStr);
  const amountCents = swiftAmountToCents(amountStr);

  return {
    direction,
    date,
    currency,
    amountCents,
    amount: amountCents / 100,
  };
}

/**
 * Parse all :61: transaction lines (with associated :86: narratives).
 *
 * @param {string} block
 * @returns {MT940Transaction[]}
 */
function parseTransactionLines(block) {
  const fields = extractFields(block);
  const lines61  = Array.isArray(fields[':61:']) ? fields[':61:'] : [];
  const lines86  = Array.isArray(fields[':86:']) ? fields[':86:'] : [];

  return lines61.map((line61, idx) => {
    const narrative = lines86[idx] || null;
    return parseTransactionLine(line61, narrative, idx + 1);
  });
}

/**
 * Parse a single :61: statement line.
 *
 * :61: format:
 *   YYMMDD[MMDD]<CR/DR>[A<3rdCurrency>]<Amount>N<SwiftCode><ClientRef>[//<BankRef>][<CRLF><Supplementary>]
 *
 * @param {string} line
 * @param {string|null} narrative - Associated :86: narrative
 * @param {number} seq - Sequence number for error reporting
 * @returns {MT940Transaction}
 */
function parseTransactionLine(line, narrative, seq) {
  if (!line) throw new Error(`Empty :61: line at position ${seq}`);

  const clean = line.trim();

  // Value date: YYMMDD (6 chars)
  const valueDate = parseSwiftDate(clean.substring(0, 6));

  let pos = 6;

  // Optional entry date: MMDD (4 chars) — present only when entry date differs from value date
  let entryDate = null;
  if (/^\d{4}[A-Z]/.test(clean.substring(pos))) {
    // Could be MMDD or start of direction — only MMDD if next 4 chars are digits AND char after is a letter
    const next4 = clean.substring(pos, pos + 4);
    const charAfter = clean[pos + 4];
    if (/^\d{4}$/.test(next4) && charAfter && /[A-Z]/.test(charAfter)) {
      // It's MMDD
      const mm = next4.substring(0, 2);
      const dd = next4.substring(2, 4);
      const valueDateYear = valueDate.substring(0, 4);
      entryDate = `${valueDateYear}-${mm}-${dd}`;
      pos += 4;
    }
  }

  // Direction: C, D, RC (reverse credit), RD (reverse debit), CR, DR
  let direction;
  let reversal = false;
  if (clean[pos] === 'R' && (clean[pos + 1] === 'C' || clean[pos + 1] === 'D')) {
    reversal = true;
    direction = clean[pos + 1] === 'C' ? 'credit' : 'debit';
    pos += 2;
  } else if (clean[pos] === 'C' && clean[pos + 1] === 'R') {
    direction = 'credit';
    pos += 2;
  } else if (clean[pos] === 'D' && clean[pos + 1] === 'R') {
    direction = 'debit';
    pos += 2;
  } else if (clean[pos] === 'C') {
    direction = 'credit';
    pos += 1;
  } else if (clean[pos] === 'D') {
    direction = 'debit';
    pos += 1;
  } else {
    throw new Error(`Cannot determine direction in :61: line ${seq}: "${clean}"`);
  }

  // Optional: 3rd currency indicator (e.g. AZAR for ZAR)
  if (clean[pos] === 'A' && /[A-Z]{3}/.test(clean.substring(pos + 1, pos + 4))) {
    pos += 4;
  }

  // Amount: digits + comma + 2 digits
  const amountMatch = clean.substring(pos).match(/^([\d]+,\d{2})/);
  if (!amountMatch) {
    throw new Error(`Cannot parse amount in :61: line ${seq}: "${clean.substring(pos)}"`);
  }
  const amountCents = swiftAmountToCents(amountMatch[1]);
  pos += amountMatch[1].length;

  // SWIFT transaction type: N + 3-char code (e.g. NTRF, NMSC, NCHG)
  let swiftTypeCode = null;
  if (clean[pos] === 'N') {
    swiftTypeCode = clean.substring(pos + 1, pos + 4);
    pos += 4;
  } else if (/[A-Z]/.test(clean[pos])) {
    // Some banks omit N — take next 3 chars as type code
    swiftTypeCode = clean.substring(pos, pos + 3);
    pos += 3;
  }

  // Remaining: client reference (up to // or end of first line) + optional //bank ref
  const remainder = clean.substring(pos);
  const refLines = remainder.split('\n')[0]; // First line only for reference
  const slashIdx = refLines.indexOf('//');
  const clientReference = slashIdx >= 0
    ? refLines.substring(0, slashIdx).trim()
    : refLines.trim();
  const bankReference = slashIdx >= 0
    ? refLines.substring(slashIdx + 2).trim()
    : null;

  // Parse narrative (:86: field) — may contain structured sub-fields
  const parsedNarrative = narrative ? parseNarrative(narrative) : null;

  return {
    seq,
    valueDate,
    entryDate: entryDate || valueDate,
    direction,             // 'credit' | 'debit'
    reversal,
    amountCents,
    amount: amountCents / 100,
    swiftTypeCode,         // e.g. 'TRF', 'MSC', 'CHG'
    clientReference,       // Our transaction reference
    bankReference,         // Bank's own reference
    narrative: parsedNarrative,
    rawNarrative: narrative || null,
  };
}

/**
 * Parse :86: narrative field.
 * SBSA uses structured sub-fields separated by ? characters:
 *   ?00 = Transaction code
 *   ?10 = Reference
 *   ?20-?29 = Narrative lines
 *   ?30 = BIC
 *   ?31 = Account number
 *   ?32 = Name
 *   ?34 = Charges
 *
 * @param {string} narrative
 * @returns {Object}
 */
function parseNarrative(narrative) {
  if (!narrative) return null;

  const clean = narrative.trim();

  // Structured narrative: contains ?XX sub-fields
  if (clean.includes('?')) {
    const subFields = {};
    const narLines = [];
    const parts = clean.split(/\?(\d{2})/g);

    for (let i = 1; i < parts.length; i += 2) {
      const code = parts[i];
      const value = (parts[i + 1] || '').trim();
      const codeNum = parseInt(code, 10);

      if (codeNum >= 20 && codeNum <= 29) {
        narLines.push(value);
      } else {
        subFields[`?${code}`] = value;
      }
    }

    return {
      structured: true,
      transactionCode: subFields['?00'] || null,
      reference: subFields['?10'] || null,
      narrativeLines: narLines,
      narrative: narLines.join(' ').trim() || null,
      counterpartyBic: subFields['?30'] || null,
      counterpartyAccount: subFields['?31'] || null,
      counterpartyName: subFields['?32'] || null,
      charges: subFields['?34'] || null,
      raw: clean,
    };
  }

  // Unstructured narrative
  return {
    structured: false,
    narrative: clean,
    narrativeLines: clean.split('\n'),
    raw: clean,
  };
}

/**
 * Convert SWIFT 6-digit date string (YYMMDD) to ISO date string (YYYY-MM-DD).
 * SWIFT dates use 2-digit year — assume 2000s for YY < 80, 1900s for YY >= 80.
 *
 * @param {string} dateStr - e.g. '260317'
 * @returns {string} ISO date e.g. '2026-03-17'
 */
function parseSwiftDate(dateStr) {
  if (!dateStr || dateStr.length !== 6) {
    throw new Error(`Invalid SWIFT date: "${dateStr}"`);
  }
  const yy = parseInt(dateStr.substring(0, 2), 10);
  const mm = dateStr.substring(2, 4);
  const dd = dateStr.substring(4, 6);
  const yyyy = yy < 80 ? 2000 + yy : 1900 + yy;
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Convert SWIFT amount string to integer cents.
 * SWIFT uses comma as decimal separator: "1500000,00" → 150000000 cents (R1,500,000.00)
 *
 * @param {string} amountStr - e.g. '1500000,00'
 * @returns {number} Amount in cents
 */
function swiftAmountToCents(amountStr) {
  if (!amountStr) throw new Error('Amount string is empty');

  const clean = amountStr.trim();
  const commaIdx = clean.indexOf(',');

  if (commaIdx === -1) {
    // No decimal — treat as whole rands
    return parseInt(clean, 10) * 100;
  }

  const intPart   = clean.substring(0, commaIdx).replace(/\./g, '');
  const decPart   = clean.substring(commaIdx + 1).padEnd(2, '0').substring(0, 2);
  return parseInt(intPart, 10) * 100 + parseInt(decPart, 10);
}

/**
 * Summary helpers — convenient wrappers for the statement service
 */

/**
 * Extract all credit transactions from a parsed statement (deposits received).
 *
 * @param {MT940Statement} statement
 * @returns {MT940Transaction[]}
 */
function getCredits(statement) {
  return statement.transactions.filter(t => t.direction === 'credit' && !t.reversal);
}

/**
 * Extract all debit transactions from a parsed statement (payments made).
 *
 * @param {MT940Statement} statement
 * @returns {MT940Transaction[]}
 */
function getDebits(statement) {
  return statement.transactions.filter(t => t.direction === 'debit' && !t.reversal);
}

/**
 * Get total credits in cents.
 *
 * @param {MT940Statement} statement
 * @returns {number}
 */
function totalCreditsCents(statement) {
  return getCredits(statement).reduce((s, t) => s + t.amountCents, 0);
}

/**
 * Get total debits in cents.
 *
 * @param {MT940Statement} statement
 * @returns {number}
 */
function totalDebitsCents(statement) {
  return getDebits(statement).reduce((s, t) => s + t.amountCents, 0);
}

module.exports = {
  parseMT940File,
  parseStatementBlock,
  parseBalance,
  parseTransactionLine,
  parseNarrative,
  parseSwiftDate,
  swiftAmountToCents,
  getCredits,
  getDebits,
  totalCreditsCents,
  totalDebitsCents,
};

/**
 * @typedef {Object} ParsedMT940File
 * @property {string} filename
 * @property {number} statementCount
 * @property {MT940Statement[]} statements
 * @property {string} parsedAt
 *
 * @typedef {Object} MT940Statement
 * @property {'MT940'|'MT942'} statementType
 * @property {string} transactionRef
 * @property {string} accountNumber
 * @property {string|null} bankCode
 * @property {string} statementNumber
 * @property {string} currency
 * @property {BalanceField} openingBalance
 * @property {BalanceField} closingBalance
 * @property {BalanceField|null} availableBalance
 * @property {MT940Transaction[]} transactions
 * @property {number} transactionCount
 * @property {Object} reconciliation
 *
 * @typedef {Object} BalanceField
 * @property {'credit'|'debit'} direction
 * @property {string} date         ISO date YYYY-MM-DD
 * @property {string} currency     ISO 4217 e.g. 'ZAR'
 * @property {number} amountCents
 * @property {number} amount
 *
 * @typedef {Object} MT940Transaction
 * @property {number} seq
 * @property {string} valueDate     ISO date YYYY-MM-DD
 * @property {string} entryDate     ISO date YYYY-MM-DD
 * @property {'credit'|'debit'} direction
 * @property {boolean} reversal
 * @property {number} amountCents
 * @property {number} amount
 * @property {string|null} swiftTypeCode
 * @property {string} clientReference
 * @property {string|null} bankReference
 * @property {Object|null} narrative
 * @property {string|null} rawNarrative
 */
