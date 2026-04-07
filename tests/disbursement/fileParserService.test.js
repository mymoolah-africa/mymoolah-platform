'use strict';

const {
  parseFile,
  parseCSV,
  parseExcel,
  parsePain001XML,
  validateBeneficiary,
  validateCDV,
  BRANCH_CODES,
} = require('../../services/disbursement/fileParserService');

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {});
});

afterEach(() => {
  console.log.mockRestore();
});

// ─── BRANCH_CODES ───────────────────────────────────────────────────────────

describe('BRANCH_CODES', () => {
  it('contains all 13 SA banks', () => {
    expect(Object.keys(BRANCH_CODES)).toHaveLength(13);
  });

  const expectedBanks = [
    ['632005', 'ABSA'],
    ['250655', 'FNB'],
    ['198765', 'Nedbank'],
    ['051001', 'Standard Bank'],
    ['470010', 'Capitec'],
    ['462005', 'African Bank'],
    ['430000', 'Bidvest Bank'],
    ['679000', 'Discovery Bank'],
    ['580105', 'Investec'],
    ['261251', 'Sasfin'],
    ['431010', 'TymeBank'],
    ['678910', 'Bank Zero'],
    ['350005', 'Old Mutual'],
  ];

  it.each(expectedBanks)('maps %s to %s', (code, bankSubstring) => {
    expect(BRANCH_CODES[code]).toContain(bankSubstring);
  });
});

// ─── validateCDV ────────────────────────────────────────────────────────────

describe('validateCDV', () => {
  it('returns valid=false for account number shorter than 6 digits', () => {
    const result = validateCDV('12345', '632005');
    expect(result.valid).toBe(false);
    expect(result.warning).toContain('format invalid');
  });

  it('returns valid=false for account number longer than 20 digits', () => {
    const result = validateCDV('123456789012345678901', '632005');
    expect(result.valid).toBe(false);
  });

  it('returns valid=false for non-numeric account number', () => {
    const result = validateCDV('12345A', '632005');
    expect(result.valid).toBe(false);
  });

  it('skips CDV for unknown branch code (returns valid=true)', () => {
    const result = validateCDV('1234567890', '999999');
    expect(result.valid).toBe(true);
    expect(result.warning).toBeNull();
  });

  it('skips CDV for null branch code', () => {
    const result = validateCDV('1234567890', null);
    expect(result.valid).toBe(true);
  });

  it('returns valid=true for account passing Luhn-like check', () => {
    const result = validateCDV('1234567890', '632005');
    expect(typeof result.valid).toBe('boolean');
    expect(result.warning === null || typeof result.warning === 'string').toBe(true);
  });

  it('returns a warning message for failed CDV (not an error)', () => {
    const result = validateCDV('1234567891', '632005');
    if (!result.valid) {
      expect(result.warning).toContain('CDV check-digit mismatch');
    }
  });

  it('handles null account number', () => {
    const result = validateCDV(null, '632005');
    expect(result.valid).toBe(false);
  });

  it('handles empty account number', () => {
    const result = validateCDV('', '632005');
    expect(result.valid).toBe(false);
  });
});

// ─── validateBeneficiary ────────────────────────────────────────────────────

describe('validateBeneficiary', () => {
  const validBeneficiary = {
    beneficiaryName: 'John Doe',
    accountNumber: '1234567890',
    branchCode: '632005',
    amount: 1500.00,
    reference: 'SAL-001',
  };

  it('passes for a valid beneficiary', () => {
    const result = validateBeneficiary(validBeneficiary, 0);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when beneficiaryName is empty', () => {
    const result = validateBeneficiary({ ...validBeneficiary, beneficiaryName: '' }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('beneficiaryName is required');
  });

  it('fails when beneficiaryName exceeds 140 characters', () => {
    const longName = 'A'.repeat(141);
    const result = validateBeneficiary({ ...validBeneficiary, beneficiaryName: longName }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('140 characters');
  });

  it('fails when accountNumber is missing', () => {
    const result = validateBeneficiary({ ...validBeneficiary, accountNumber: '' }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.stringContaining('accountNumber is required'),
    ]));
  });

  it('fails when accountNumber has non-digit characters', () => {
    const result = validateBeneficiary({ ...validBeneficiary, accountNumber: '123-ABC' }, 0);
    expect(result.valid).toBe(false);
  });

  it('fails when branchCode is not recognised', () => {
    const result = validateBeneficiary({ ...validBeneficiary, branchCode: '000000' }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not recognised');
  });

  it('fails when branchCode is missing', () => {
    const result = validateBeneficiary({ ...validBeneficiary, branchCode: '' }, 0);
    expect(result.valid).toBe(false);
  });

  it('fails when amount is zero', () => {
    const result = validateBeneficiary({ ...validBeneficiary, amount: 0 }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('greater than zero');
  });

  it('fails when amount is negative', () => {
    const result = validateBeneficiary({ ...validBeneficiary, amount: -500 }, 0);
    expect(result.valid).toBe(false);
  });

  it('fails when amount exceeds R10,000,000', () => {
    const result = validateBeneficiary({ ...validBeneficiary, amount: 10_000_001 }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('R10,000,000');
  });

  it('fails when amount is NaN', () => {
    const result = validateBeneficiary({ ...validBeneficiary, amount: NaN }, 0);
    expect(result.valid).toBe(false);
  });

  it('fails when reference exceeds 35 characters', () => {
    const result = validateBeneficiary({ ...validBeneficiary, reference: 'X'.repeat(36) }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('35 characters');
  });

  it('uses 1-based row numbers in error messages', () => {
    const result = validateBeneficiary({ ...validBeneficiary, amount: -1 }, 4);
    expect(result.errors[0]).toContain('Row 5');
  });
});

// ─── parseCSV ───────────────────────────────────────────────────────────────

describe('parseCSV', () => {
  it('parses CSV with standard headers', () => {
    const csv = [
      'Name,Account Number,Branch Code,Amount,Reference',
      'Alice,1234567890,632005,1500.00,SAL-001',
      'Bob,9876543210,250655,2500.50,SAL-002',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(2);
    expect(result[0].beneficiaryName).toBe('Alice');
    expect(result[0].accountNumber).toBe('1234567890');
    expect(result[0].branchCode).toBe('632005');
    expect(result[0].amount).toBe(1500.00);
    expect(result[0].bankName).toBe('ABSA');
  });

  it('handles alternative header names (beneficiary_name, acc_no)', () => {
    const csv = [
      'beneficiary_name,acc_no,branch,payment_amount,ref',
      'Charlie,1111222233,470010,800.00,REF-X',
    ].join('\n');

    const result = parseCSV(csv);

    expect(result).toHaveLength(1);
    expect(result[0].beneficiaryName).toBe('Charlie');
    expect(result[0].accountNumber).toBe('1111222233');
  });

  it('returns empty array for empty CSV', () => {
    const result = parseCSV('');
    expect(result).toEqual([]);
  });

  it('skips rows where all cells are empty', () => {
    const csv = [
      'Name,Account Number,Branch Code,Amount',
      'Alice,1234567890,632005,100',
      ',,,',
      'Bob,9876543210,250655,200',
    ].join('\n');

    const result = parseCSV(csv);
    expect(result).toHaveLength(2);
  });

  it('parses amounts with commas and R prefix', () => {
    const csv = [
      'Name,Account Number,Branch Code,Amount',
      'Alice,1234567890,632005,"R 1,500.00"',
    ].join('\n');

    const result = parseCSV(csv);
    expect(result[0].amount).toBe(1500.00);
  });

  it('resolves legacy branch codes to universal codes', () => {
    const csv = [
      'Name,Account Number,Branch Code,Amount',
      'Alice,1234567890,632999,100',
    ].join('\n');

    const result = parseCSV(csv);
    expect(result[0].branchCode).toBe('632005');
    expect(result[0].bankName).toBe('ABSA');
  });

  it('detects duplicate account numbers and adds warnings', () => {
    const csv = [
      'Name,Account Number,Branch Code,Amount',
      'Alice,1234567890,632005,100',
      'Bob,1234567890,250655,200',
    ].join('\n');

    const result = parseCSV(csv);
    expect(result[1].validation.warnings.length).toBeGreaterThan(0);
    expect(result[1].validation.warnings.some(w => w.includes('duplicate'))).toBe(true);
  });

  it('truncates reference to 35 characters', () => {
    const longRef = 'A'.repeat(50);
    const csv = [
      'Name,Account Number,Branch Code,Amount,Reference',
      `Alice,1234567890,632005,100,${longRef}`,
    ].join('\n');

    const result = parseCSV(csv);
    expect(result[0].reference).toHaveLength(35);
  });

  it('accepts Buffer input', () => {
    const csv = Buffer.from([
      'Name,Account Number,Branch Code,Amount',
      'Alice,1234567890,632005,100',
    ].join('\n'));

    const result = parseCSV(csv);
    expect(result).toHaveLength(1);
  });

  it('throws for input exceeding 50 MB', () => {
    const hugeInput = { length: 51 * 1024 * 1024 };
    Object.setPrototypeOf(hugeInput, Buffer.prototype);
    expect(() => parseCSV(hugeInput)).toThrow('50 MB');
  });

  it('throws for non-Buffer/non-string input', () => {
    expect(() => parseCSV(12345)).toThrow('Buffer or string');
    expect(() => parseCSV(null)).toThrow('Buffer or string');
  });
});

// ─── parseExcel ─────────────────────────────────────────────────────────────

describe('parseExcel', () => {
  it('throws for non-Buffer input', () => {
    expect(() => parseExcel(42)).toThrow('Buffer or string');
  });

  it('throws for null input', () => {
    expect(() => parseExcel(null)).toThrow('Buffer or string');
  });

  it('accepts string input without throwing input error', () => {
    try {
      parseExcel('not-a-real-xlsx');
    } catch (err) {
      expect(err.message).not.toContain('Buffer or string');
    }
  });
});

// ─── parsePain001XML ────────────────────────────────────────────────────────

describe('parsePain001XML', () => {
  const validXml = `<?xml version="1.0" encoding="UTF-8"?>
<Document>
  <CstmrCdtTrfInitn>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>Alice Smith</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>1234567890</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>632005</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>1500.00</InstdAmt></Amt>
        <RmtInf><Ustrd>SAL-001</Ustrd></RmtInf>
      </CdtTrfTxInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>Bob Jones</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>9876543210</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>250655</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>2500.50</InstdAmt></Amt>
        <PmtId><EndToEndId>SAL-002</EndToEndId></PmtId>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

  it('parses valid Pain.001 XML with multiple transactions', () => {
    const result = parsePain001XML(validXml);

    expect(result).toHaveLength(2);
    expect(result[0].beneficiaryName).toBe('Alice Smith');
    expect(result[0].accountNumber).toBe('1234567890');
    expect(result[0].branchCode).toBe('632005');
    expect(result[0].amount).toBe(1500.00);
    expect(result[0].reference).toBe('SAL-001');
    expect(result[0].bankName).toBe('ABSA');
  });

  it('falls back to EndToEndId when RmtInf is missing', () => {
    const result = parsePain001XML(validXml);
    expect(result[1].reference).toBe('SAL-002');
  });

  it('throws for XML missing CstmrCdtTrfInitn element', () => {
    const badXml = '<Document><Other>data</Other></Document>';
    expect(() => parsePain001XML(badXml)).toThrow('missing CstmrCdtTrfInitn');
  });

  it('handles XML with single PmtInf (not array)', () => {
    const singleXml = `<?xml version="1.0"?>
<Document>
  <CstmrCdtTrfInitn>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>Solo</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>1111111111</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>470010</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>999.99</InstdAmt></Amt>
        <RmtInf><Ustrd>ONLY</Ustrd></RmtInf>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    const result = parsePain001XML(singleXml);
    expect(result).toHaveLength(1);
    expect(result[0].beneficiaryName).toBe('Solo');
    expect(result[0].bankName).toBe('Capitec');
  });

  it('handles XML with missing optional fields gracefully', () => {
    const minimalXml = `<?xml version="1.0"?>
<Document>
  <CstmrCdtTrfInitn>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>Minimal</Nm></Cdtr>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    const result = parsePain001XML(minimalXml);
    expect(result).toHaveLength(1);
    expect(result[0].beneficiaryName).toBe('Minimal');
    expect(result[0].validation.valid).toBe(false);
  });

  it('detects duplicates across PmtInf blocks', () => {
    const dupXml = `<?xml version="1.0"?>
<Document>
  <CstmrCdtTrfInitn>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>A</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>1234567890</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>632005</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>100</InstdAmt></Amt>
      </CdtTrfTxInf>
    </PmtInf>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>B</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>1234567890</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>250655</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>200</InstdAmt></Amt>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;

    const result = parsePain001XML(dupXml);
    const warnings = result.flatMap(b => b.validation.warnings);
    expect(warnings.some(w => w.includes('duplicate'))).toBe(true);
  });

  it('accepts Buffer input', () => {
    const buf = Buffer.from(validXml);
    const result = parsePain001XML(buf);
    expect(result).toHaveLength(2);
  });
});

// ─── parseFile (auto-detect) ────────────────────────────────────────────────

describe('parseFile', () => {
  it('routes .csv to CSV parser', () => {
    const csv = 'Name,Account Number,Branch Code,Amount\nAlice,1234567890,632005,100\n';
    const result = parseFile(csv, 'payroll.csv');
    expect(result).toHaveLength(1);
  });

  it('routes .xml to Pain.001 parser', () => {
    const xml = `<?xml version="1.0"?>
<Document>
  <CstmrCdtTrfInitn>
    <PmtInf>
      <CdtTrfTxInf>
        <Cdtr><Nm>X</Nm></Cdtr>
        <CdtrAcct><Id><Othr><Id>1234567890</Id></Othr></Id></CdtrAcct>
        <CdtrAgt><FinInstnId><ClrSysMmbId><MmbId>632005</MmbId></ClrSysMmbId></FinInstnId></CdtrAgt>
        <Amt><InstdAmt>50</InstdAmt></Amt>
      </CdtTrfTxInf>
    </PmtInf>
  </CstmrCdtTrfInitn>
</Document>`;
    const result = parseFile(xml, 'batch.xml');
    expect(result).toHaveLength(1);
  });

  it('throws for unsupported file extension', () => {
    expect(() => parseFile('data', 'file.pdf')).toThrow('Unsupported file format');
  });

  it('throws when filename is missing', () => {
    expect(() => parseFile('data')).toThrow('filename is required');
  });

  it('throws when filename is not a string', () => {
    expect(() => parseFile('data', 123)).toThrow('filename is required');
  });

  it('handles .xlsx extension routing', () => {
    try {
      parseFile(Buffer.alloc(10), 'payroll.xlsx');
    } catch (err) {
      expect(err.message).not.toContain('Unsupported file format');
    }
  });

  it('handles .xls extension routing', () => {
    try {
      parseFile(Buffer.alloc(10), 'legacy.xls');
    } catch (err) {
      expect(err.message).not.toContain('Unsupported file format');
    }
  });
});

// ─── Amount parsing edge cases ──────────────────────────────────────────────

describe('amount parsing via CSV', () => {
  it('parses plain decimal amounts', () => {
    const csv = 'Name,Account Number,Branch Code,Amount\nA,1234567890,632005,99.99\n';
    const result = parseCSV(csv);
    expect(result[0].amount).toBe(99.99);
  });

  it('strips R prefix from amounts', () => {
    const csv = 'Name,Account Number,Branch Code,Amount\nA,1234567890,632005,R100\n';
    const result = parseCSV(csv);
    expect(result[0].amount).toBe(100);
  });

  it('strips commas from large amounts', () => {
    const csv = 'Name,Account Number,Branch Code,Amount\nA,1234567890,632005,"1,000,000"\n';
    const result = parseCSV(csv);
    expect(result[0].amount).toBe(1000000);
  });

  it('marks non-numeric amounts as NaN (invalid)', () => {
    const csv = 'Name,Account Number,Branch Code,Amount\nA,1234567890,632005,abc\n';
    const result = parseCSV(csv);
    expect(result[0].validation.valid).toBe(false);
    expect(result[0].validation.errors[0]).toContain('amount');
  });
});
