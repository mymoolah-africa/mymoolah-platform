'use strict';

/**
 * Unit tests — SA-holiday-aware ReqdExctnDt default in pain001BulkBuilder.
 *
 * Scope:
 *   - When the caller omits `paymentDate`, the builder defaults to the next
 *     SA business day strictly AFTER today.
 *   - When the caller supplies a non-business-day `paymentDate`, the builder
 *     honours it verbatim in the XML but emits a console.warn describing why
 *     it is not a business day and what SBSA will likely roll it to.
 *   - When the caller supplies a business-day `paymentDate`, the XML matches
 *     exactly and no warning is emitted.
 *
 * Deliberately does NOT touch any network / DB / file systems — pure builder.
 */

const { buildPain001Bulk } = require('../../services/standardbank/pain001BulkBuilder');
const { nextBusinessDay } = require('../../utils/saPublicHolidays');

const BASE_PAYMENTS = [
  {
    endToEndId:      'E2E-001',
    beneficiaryName: 'Jane Doe',
    accountNumber:   '10111730633',
    branchCode:      '051001',
    amount:          1.00,
    reference:       'MMTP UNIT TEST',
  },
];

function extractReqdExctnDt(xml) {
  const m = xml.match(/<ReqdExctnDt>([^<]+)<\/ReqdExctnDt>/);
  return m ? m[1] : null;
}

describe('pain001BulkBuilder — SA-holiday-aware ReqdExctnDt', () => {
  const realDate = Date;

  afterEach(() => {
    global.Date = realDate;
    jest.restoreAllMocks();
  });

  function mockToday(ymd) {
    const base = new realDate(`${ymd}T10:00:00Z`);
    const MockDate = class extends realDate {
      constructor(...args) {
        if (args.length === 0) return base;
        return new realDate(...args);
      }
      static now() { return base.getTime(); }
    };
    global.Date = MockDate;
  }

  test('default: next SA business day strictly AFTER today (Thu → Fri)', () => {
    mockToday('2026-04-23'); // Thu
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-001',
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-04-24'); // Fri
  });

  test('default: Fri → Mon+holiday chain (Freedom Day) → Tue', () => {
    mockToday('2026-04-24'); // Fri
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-002',
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-04-28'); // Tue (skips Sat, Sun, Freedom Day Mon 27)
  });

  test('default: Christmas Eve Thu → first business day after Goodwill + weekend', () => {
    mockToday('2026-12-24'); // Thu
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-003',
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-12-28'); // Mon (25 Fri Xmas, 26 Sat Goodwill, 27 Sun → Mon)
  });

  test('caller-supplied business-day paymentDate is honoured verbatim (no warning)', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-004',
      paymentDate: '2026-04-24',
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-04-24');
    expect(warn).not.toHaveBeenCalled();
  });

  test('caller-supplied weekend paymentDate is kept verbatim but warned', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-005',
      paymentDate: '2026-04-25', // Sat
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-04-25');
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = warn.mock.calls[0].join(' ');
    expect(msg).toMatch(/2026-04-25/);
    expect(msg).toMatch(/Saturday/);
    // Suggested roll-forward should match nextBusinessDay exactly. For Sat
    // 2026-04-25 the chain skips Sun 26 + Freedom Day Mon 27 → Tue 2026-04-28.
    expect(msg).toMatch(new RegExp(nextBusinessDay('2026-04-25')));
  });

  test('caller-supplied public-holiday paymentDate is kept verbatim but warned', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const { xml } = buildPain001Bulk({
      runReference: 'TEST-006',
      paymentDate: '2026-04-27', // Freedom Day (Mon)
      payments: BASE_PAYMENTS,
    });
    expect(extractReqdExctnDt(xml)).toBe('2026-04-27');
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = warn.mock.calls[0].join(' ');
    expect(msg).toMatch(/Freedom Day/);
    expect(msg).toMatch(/2026-04-28/); // SBSA will likely roll here
  });
});
