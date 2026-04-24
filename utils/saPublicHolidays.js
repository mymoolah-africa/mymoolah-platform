'use strict';

/**
 * South African Public Holidays — Business-day calendar utility.
 *
 * Per the Public Holidays Act No. 36 of 1994 (section 2(1)): if a public
 * holiday falls on a Sunday, the following Monday is observed as a public
 * holiday. Public holidays that fall on a Saturday are NOT rolled.
 *
 * This module is the single source of truth for:
 *   - Deciding whether a given calendar date is an SA business day.
 *   - Rolling a requested settlement date forward to the next business day.
 *   - Computing the default ReqdExctnDt for Pain.001 generation (via the
 *     wrapper `nextBusinessDay()`).
 *
 * IMPORTANT — date semantics:
 *   All dates in this module are plain calendar dates in the SAST (UTC+2)
 *   time zone, expressed as `YYYY-MM-DD` strings. We deliberately avoid
 *   `new Date()` arithmetic against UTC because a financial "day" is a
 *   local-calendar concept, not a UTC-instant concept.
 *
 * Variable holidays (Good Friday, Family Day = Easter Monday) are hardcoded
 * per year because they depend on the computed Easter date. The coverage
 * window is **2025–2030 inclusive**. Extend `VARIABLE_HOLIDAYS_BY_YEAR`
 * before 2030 — the module will throw a clear error if called with a year
 * outside this range (fail loud, not silent).
 *
 * References:
 *   - Public Holidays Act No. 36 of 1994 (SA Government Gazette)
 *   - SA Government Public Holidays page (https://www.gov.za/about-sa/public-holidays)
 *
 * @module utils/saPublicHolidays
 */

const FIXED_HOLIDAYS = Object.freeze([
  { month: 1,  day: 1,  name: "New Year's Day" },
  { month: 3,  day: 21, name: 'Human Rights Day' },
  { month: 4,  day: 27, name: 'Freedom Day' },
  { month: 5,  day: 1,  name: "Workers' Day" },
  { month: 6,  day: 16, name: 'Youth Day' },
  { month: 8,  day: 9,  name: "National Women's Day" },
  { month: 9,  day: 24, name: 'Heritage Day' },
  { month: 12, day: 16, name: 'Day of Reconciliation' },
  { month: 12, day: 25, name: 'Christmas Day' },
  { month: 12, day: 26, name: 'Day of Goodwill' },
]);

const VARIABLE_HOLIDAYS_BY_YEAR = Object.freeze({
  2025: [
    { month: 4, day: 18, name: 'Good Friday' },
    { month: 4, day: 21, name: 'Family Day' },
  ],
  2026: [
    { month: 4, day: 3,  name: 'Good Friday' },
    { month: 4, day: 6,  name: 'Family Day' },
  ],
  2027: [
    { month: 3, day: 26, name: 'Good Friday' },
    { month: 3, day: 29, name: 'Family Day' },
  ],
  2028: [
    { month: 4, day: 14, name: 'Good Friday' },
    { month: 4, day: 17, name: 'Family Day' },
  ],
  2029: [
    { month: 3, day: 30, name: 'Good Friday' },
    { month: 4, day: 2,  name: 'Family Day' },
  ],
  2030: [
    { month: 4, day: 19, name: 'Good Friday' },
    { month: 4, day: 22, name: 'Family Day' },
  ],
});

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * Normalise a date input to canonical `YYYY-MM-DD`.
 * Accepts `YYYY-MM-DD` strings or `Date` instances.
 * Throws on anything else (strict — financial code must not silently coerce).
 *
 * @param {string|Date} input
 * @returns {string} YYYY-MM-DD
 */
function toYMD(input) {
  if (typeof input === 'string') {
    const m = input.match(YMD_RE);
    if (!m) throw new TypeError(`Invalid date string: "${input}" (expected YYYY-MM-DD)`);
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    if (mo < 1 || mo > 12 || d < 1 || d > 31) {
      throw new RangeError(`Invalid date components: "${input}"`);
    }
    return `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (input instanceof Date && !Number.isNaN(input.getTime())) {
    return `${input.getUTCFullYear()}-${pad2(input.getUTCMonth() + 1)}-${pad2(input.getUTCDate())}`;
  }
  throw new TypeError(`Invalid date input: ${input} (expected YYYY-MM-DD string or Date)`);
}

function parseYMD(ymd) {
  const s = toYMD(ymd);
  const [y, m, d] = s.split('-').map(Number);
  return { year: y, month: m, day: d };
}

function toUTCMidnight(ymd) {
  const { year, month, day } = parseYMD(ymd);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUTCMidnight(d) {
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

function addDays(ymd, n) {
  const d = toUTCMidnight(ymd);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTCMidnight(d);
}

/**
 * Day-of-week for a calendar date (0=Sun, 1=Mon, ..., 6=Sat).
 * Uses the UTC fields of the midnight-UTC anchor, so the result is
 * independent of the caller's local timezone.
 *
 * @param {string|Date} date
 * @returns {number}
 */
function dayOfWeek(date) {
  return toUTCMidnight(toYMD(date)).getUTCDay();
}

/**
 * Return all SA public holidays for a given year, including observed
 * Mondays where a fixed holiday fell on a Sunday.
 *
 * @param {number} year
 * @returns {Array<{ date: string, name: string, observed: boolean }>}
 */
function listPublicHolidays(year) {
  if (!Number.isInteger(year)) {
    throw new TypeError(`listPublicHolidays: year must be an integer (got ${year})`);
  }
  if (!VARIABLE_HOLIDAYS_BY_YEAR[year]) {
    throw new RangeError(
      `Year ${year} is outside the supported SA public-holiday range (2025–2030). ` +
      `Extend utils/saPublicHolidays.js before ${Math.min(...Object.keys(VARIABLE_HOLIDAYS_BY_YEAR).map(Number)) + 1} ends.`
    );
  }

  const base = [
    ...FIXED_HOLIDAYS.map(h => ({
      date: `${year}-${pad2(h.month)}-${pad2(h.day)}`,
      name: h.name,
      observed: false,
    })),
    ...VARIABLE_HOLIDAYS_BY_YEAR[year].map(h => ({
      date: `${year}-${pad2(h.month)}-${pad2(h.day)}`,
      name: h.name,
      observed: false,
    })),
  ];

  const extras = [];
  for (const h of base) {
    if (dayOfWeek(h.date) === 0) {
      extras.push({
        date: addDays(h.date, 1),
        name: `${h.name} (observed)`,
        observed: true,
      });
    }
  }

  return [...base, ...extras].sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Is the given date a South African public holiday?
 * Includes observed Mondays (when a fixed holiday fell on a Sunday).
 *
 * @param {string|Date} date
 * @returns {boolean}
 */
function isSAPublicHoliday(date) {
  const ymd = toYMD(date);
  const { year } = parseYMD(ymd);
  return listPublicHolidays(year).some(h => h.date === ymd);
}

/**
 * Is the given date a weekend (Saturday or Sunday)?
 *
 * @param {string|Date} date
 * @returns {boolean}
 */
function isWeekend(date) {
  const d = dayOfWeek(date);
  return d === 0 || d === 6;
}

/**
 * Is the given date a South African business day?
 * A business day is a weekday that is not a public holiday.
 *
 * @param {string|Date} date
 * @returns {boolean}
 */
function isBusinessDay(date) {
  return !isWeekend(date) && !isSAPublicHoliday(date);
}

/**
 * Get the next business day strictly AFTER the given date.
 * Rolls forward through weekends and public holidays.
 *
 * @param {string|Date} date
 * @returns {string} YYYY-MM-DD
 */
function nextBusinessDay(date) {
  let cursor = addDays(toYMD(date), 1);
  while (!isBusinessDay(cursor)) {
    cursor = addDays(cursor, 1);
  }
  return cursor;
}

/**
 * If the given date is already a business day, return it unchanged.
 * Otherwise roll forward to the next business day.
 *
 * Use this when a caller has a "preferred" settlement date and you want
 * to honour it if possible but silently skip non-business days.
 *
 * @param {string|Date} date
 * @returns {string} YYYY-MM-DD
 */
function rollToBusinessDay(date) {
  const ymd = toYMD(date);
  if (isBusinessDay(ymd)) return ymd;
  return nextBusinessDay(ymd);
}

/**
 * Describe why a date is or is not a business day. Useful for logging
 * and error messages ("2026-04-27 is Freedom Day").
 *
 * @param {string|Date} date
 * @returns {{ businessDay: boolean, reason: string|null, holiday: string|null }}
 */
function describeDate(date) {
  const ymd = toYMD(date);
  if (isWeekend(ymd)) {
    const d = dayOfWeek(ymd);
    return {
      businessDay: false,
      reason: d === 6 ? 'Saturday' : 'Sunday',
      holiday: null,
    };
  }
  const { year } = parseYMD(ymd);
  const match = listPublicHolidays(year).find(h => h.date === ymd);
  if (match) {
    return { businessDay: false, reason: `SA public holiday: ${match.name}`, holiday: match.name };
  }
  return { businessDay: true, reason: null, holiday: null };
}

module.exports = {
  FIXED_HOLIDAYS,
  VARIABLE_HOLIDAYS_BY_YEAR,
  toYMD,
  dayOfWeek,
  listPublicHolidays,
  isSAPublicHoliday,
  isWeekend,
  isBusinessDay,
  nextBusinessDay,
  rollToBusinessDay,
  describeDate,
};
