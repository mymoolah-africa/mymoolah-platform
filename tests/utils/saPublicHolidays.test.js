'use strict';

/**
 * Unit tests — utils/saPublicHolidays
 *
 * Covers:
 *   - Canonical public-holiday set for 2025–2030.
 *   - Sunday-roll rule (Monday observed when a fixed holiday falls on Sunday).
 *   - Weekend and business-day classification.
 *   - nextBusinessDay / rollToBusinessDay edge cases (Freedom Day, Christmas,
 *     Easter cluster, New Year, consecutive holidays).
 *   - Input normalisation and strict error behaviour.
 */

const {
  isSAPublicHoliday,
  isWeekend,
  isBusinessDay,
  nextBusinessDay,
  rollToBusinessDay,
  listPublicHolidays,
  describeDate,
  dayOfWeek,
  toYMD,
} = require('../../utils/saPublicHolidays');

describe('utils/saPublicHolidays — input normalisation', () => {
  test('toYMD accepts YYYY-MM-DD strings', () => {
    expect(toYMD('2026-04-27')).toBe('2026-04-27');
  });

  test('toYMD accepts Date instances (using UTC fields)', () => {
    const d = new Date(Date.UTC(2026, 3, 27));
    expect(toYMD(d)).toBe('2026-04-27');
  });

  test('toYMD rejects malformed strings', () => {
    expect(() => toYMD('2026/04/27')).toThrow(TypeError);
    expect(() => toYMD('27 April 2026')).toThrow(TypeError);
    expect(() => toYMD('2026-4-27')).toThrow(TypeError);
  });

  test('toYMD rejects invalid components', () => {
    expect(() => toYMD('2026-13-01')).toThrow(RangeError);
    expect(() => toYMD('2026-00-15')).toThrow(RangeError);
    expect(() => toYMD('2026-04-32')).toThrow(RangeError);
  });

  test('toYMD rejects non-string non-Date inputs', () => {
    expect(() => toYMD(null)).toThrow(TypeError);
    expect(() => toYMD(undefined)).toThrow(TypeError);
    expect(() => toYMD(1745712000000)).toThrow(TypeError);
  });
});

describe('utils/saPublicHolidays — fixed holidays 2026', () => {
  const fixed2026 = [
    ['2026-01-01', "New Year's Day"],
    ['2026-03-21', 'Human Rights Day'],
    ['2026-04-27', 'Freedom Day'],
    ['2026-05-01', "Workers' Day"],
    ['2026-06-16', 'Youth Day'],
    ['2026-08-09', "National Women's Day"],
    ['2026-09-24', 'Heritage Day'],
    ['2026-12-16', 'Day of Reconciliation'],
    ['2026-12-25', 'Christmas Day'],
    ['2026-12-26', 'Day of Goodwill'],
  ];

  test.each(fixed2026)('%s is %s', (date) => {
    expect(isSAPublicHoliday(date)).toBe(true);
    expect(isBusinessDay(date)).toBe(false);
  });
});

describe('utils/saPublicHolidays — variable holidays 2026', () => {
  test('2026 Good Friday is 3 April', () => {
    expect(isSAPublicHoliday('2026-04-03')).toBe(true);
  });

  test('2026 Family Day (Easter Monday) is 6 April', () => {
    expect(isSAPublicHoliday('2026-04-06')).toBe(true);
  });

  test('non-holiday dates near Easter are not holidays', () => {
    expect(isSAPublicHoliday('2026-04-02')).toBe(false);
    expect(isSAPublicHoliday('2026-04-07')).toBe(false);
  });
});

describe('utils/saPublicHolidays — Sunday-roll rule', () => {
  test("2026 Women's Day (9 Aug) falls on Sunday → Mon 10 Aug observed", () => {
    expect(dayOfWeek('2026-08-09')).toBe(0);
    expect(isSAPublicHoliday('2026-08-09')).toBe(true);
    expect(isSAPublicHoliday('2026-08-10')).toBe(true);

    const observed = listPublicHolidays(2026).find(h => h.date === '2026-08-10');
    expect(observed).toBeDefined();
    expect(observed.observed).toBe(true);
    expect(observed.name).toBe("National Women's Day (observed)");
  });

  test('2025 Freedom Day (27 Apr Sun) → Mon 28 Apr observed', () => {
    expect(dayOfWeek('2025-04-27')).toBe(0);
    expect(isSAPublicHoliday('2025-04-27')).toBe(true);
    expect(isSAPublicHoliday('2025-04-28')).toBe(true);
  });

  test('Saturday holidays are NOT rolled (per the Act)', () => {
    // 2025 Women's Day falls on Saturday 9 Aug — no observance on Monday.
    expect(dayOfWeek('2025-08-09')).toBe(6);
    expect(isSAPublicHoliday('2025-08-09')).toBe(true);
    expect(isSAPublicHoliday('2025-08-11')).toBe(false); // Mon stays normal
  });
});

describe('utils/saPublicHolidays — weekend and business-day classification', () => {
  test('Saturday and Sunday are weekends', () => {
    expect(isWeekend('2026-04-25')).toBe(true); // Sat
    expect(isWeekend('2026-04-26')).toBe(true); // Sun
    expect(isBusinessDay('2026-04-25')).toBe(false);
  });

  test('Mon-Fri are weekdays', () => {
    for (const ymd of ['2026-04-20', '2026-04-21', '2026-04-22', '2026-04-23', '2026-04-24']) {
      expect(isWeekend(ymd)).toBe(false);
    }
  });

  test('A weekday that is also a public holiday is NOT a business day', () => {
    // Freedom Day 2026 is Monday 27 April.
    expect(dayOfWeek('2026-04-27')).toBe(1);
    expect(isWeekend('2026-04-27')).toBe(false);
    expect(isSAPublicHoliday('2026-04-27')).toBe(true);
    expect(isBusinessDay('2026-04-27')).toBe(false);
  });
});

describe('utils/saPublicHolidays — nextBusinessDay', () => {
  test('Friday → Monday (skips weekend)', () => {
    // Fri 2026-04-24 → Mon 2026-04-27 is Freedom Day → Tue 2026-04-28.
    // Validates the exact Penny #2 case.
    expect(nextBusinessDay('2026-04-24')).toBe('2026-04-28');
  });

  test('Thursday 2026-04-23 → Friday 2026-04-24 (plain weekday)', () => {
    expect(nextBusinessDay('2026-04-23')).toBe('2026-04-24');
  });

  test('Christmas Eve 2026-12-24 (Thu) → Mon 2026-12-28 (Fri=25, Sat=26 Goodwill)', () => {
    // 25 Dec Fri (holiday) + 26 Dec Sat (holiday, not rolled) + 27 Dec Sun → Mon 28 Dec.
    expect(nextBusinessDay('2026-12-24')).toBe('2026-12-28');
  });

  test('End-of-year 2026-12-31 (Thu) → Fri 2027-01-02… but 1 Jan Fri is a holiday → Mon 2027-01-04', () => {
    // 1 Jan 2027 is Friday and a public holiday → next business day is Mon 4 Jan 2027.
    expect(nextBusinessDay('2026-12-31')).toBe('2027-01-04');
  });

  test('Around Easter 2026 (3 Apr Good Fri, 6 Apr Family Day): Thu 2026-04-02 → Tue 2026-04-07', () => {
    expect(nextBusinessDay('2026-04-02')).toBe('2026-04-07');
  });

  test('nextBusinessDay is strictly AFTER input (even if input is a business day)', () => {
    expect(nextBusinessDay('2026-04-23')).toBe('2026-04-24');
    expect(nextBusinessDay('2026-04-22')).toBe('2026-04-23');
  });
});

describe('utils/saPublicHolidays — rollToBusinessDay', () => {
  test('Business day is returned unchanged', () => {
    expect(rollToBusinessDay('2026-04-23')).toBe('2026-04-23');
  });

  test('Saturday rolls forward through weekend + public holiday chain', () => {
    // Sat 2026-04-25 → Sun 26 → Mon 27 (Freedom Day, holiday) → Tue 28 (business).
    // rollToBusinessDay chains through all non-business days to reach the next
    // settlement-capable day.
    expect(rollToBusinessDay('2026-04-25')).toBe('2026-04-28');
  });

  test('Saturday rolls to Monday when Monday IS a business day', () => {
    // Sat 2026-04-18 → Sun 19 → Mon 20 (plain weekday).
    expect(rollToBusinessDay('2026-04-18')).toBe('2026-04-20');
  });

  test('Sunday rolls forward to Monday (then past holiday)', () => {
    // 26 Apr 2026 Sun → Mon 27 Apr → but it is Freedom Day, so nextBusinessDay takes it onwards
    expect(rollToBusinessDay('2026-04-26')).toBe('2026-04-28'); // because Mon 27 is a holiday
  });

  test('SBSA Penny #2 scenario: rollToBusinessDay("2026-04-27") === "2026-04-28"', () => {
    expect(rollToBusinessDay('2026-04-27')).toBe('2026-04-28');
  });
});

describe('utils/saPublicHolidays — describeDate', () => {
  test('business day', () => {
    const info = describeDate('2026-04-23');
    expect(info.businessDay).toBe(true);
    expect(info.reason).toBeNull();
    expect(info.holiday).toBeNull();
  });

  test('Saturday', () => {
    const info = describeDate('2026-04-25');
    expect(info.businessDay).toBe(false);
    expect(info.reason).toBe('Saturday');
  });

  test('Sunday', () => {
    const info = describeDate('2026-04-26');
    expect(info.businessDay).toBe(false);
    expect(info.reason).toBe('Sunday');
  });

  test('Freedom Day', () => {
    const info = describeDate('2026-04-27');
    expect(info.businessDay).toBe(false);
    expect(info.reason).toBe('SA public holiday: Freedom Day');
    expect(info.holiday).toBe('Freedom Day');
  });

  test('observed holiday (Sunday-roll Monday)', () => {
    const info = describeDate('2026-08-10');
    expect(info.businessDay).toBe(false);
    expect(info.holiday).toBe("National Women's Day (observed)");
  });
});

describe('utils/saPublicHolidays — out-of-range years', () => {
  test('listPublicHolidays throws for year outside 2025-2030', () => {
    expect(() => listPublicHolidays(2024)).toThrow(RangeError);
    expect(() => listPublicHolidays(2031)).toThrow(RangeError);
  });

  test('isSAPublicHoliday throws for out-of-range years (fail loud, not silent)', () => {
    expect(() => isSAPublicHoliday('2031-04-27')).toThrow(RangeError);
  });

  test('listPublicHolidays throws for non-integer input', () => {
    expect(() => listPublicHolidays('2026')).toThrow(TypeError);
    expect(() => listPublicHolidays(2026.5)).toThrow(TypeError);
  });
});

describe('utils/saPublicHolidays — year coverage sanity', () => {
  test.each([2025, 2026, 2027, 2028, 2029, 2030])('%i has 12 base holidays + possible observed', (year) => {
    const holidays = listPublicHolidays(year);
    const base = holidays.filter(h => !h.observed).length;
    expect(base).toBe(12); // 10 fixed + 2 variable
    expect(holidays.length).toBeGreaterThanOrEqual(12);
    expect(holidays.length).toBeLessThanOrEqual(14); // at most 2 Sunday-rolled
  });
});
