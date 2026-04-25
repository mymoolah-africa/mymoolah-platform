'use strict';

const moment = require('moment-timezone');
const {
  isBusinessDay,
  isSAPublicHoliday,
  isWeekend,
  nextBusinessDay,
  rollToBusinessDay,
  toYMD,
  dayOfWeek,
} = require('./saPublicHolidays');

const SAST_TZ = 'Africa/Johannesburg';

function parseCutoff(cutoff) {
  const raw = String(cutoff || process.env.SBSA_H2H_EFT_CUTOFF_SAST || '15:00').trim();
  const match = raw.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!match) {
    throw new Error(`Invalid SBSA_H2H_EFT_CUTOFF_SAST "${raw}" (expected HH:mm)`);
  }
  return { raw, hour: Number(match[1]), minute: Number(match[2]) };
}

function isSaturday(ymd) {
  return dayOfWeek(ymd) === 6;
}

function saturdayProcessingEnabled() {
  return String(process.env.SBSA_H2H_EFT_SATURDAY_PROCESSING || 'true').toLowerCase() === 'true';
}

function canUseDateAsIntakeDay(ymd) {
  if (isBusinessDay(ymd)) return true;
  if (saturdayProcessingEnabled() && isSaturday(ymd) && !isSAPublicHoliday(ymd)) return true;
  return false;
}

function nextIntakeDayAfter(ymd) {
  let cursor = ymd;
  do {
    cursor = moment.tz(cursor, 'YYYY-MM-DD', SAST_TZ).add(1, 'day').format('YYYY-MM-DD');
  } while (!canUseDateAsIntakeDay(cursor));
  return cursor;
}

function formatDisplayDate(ymd) {
  return moment.tz(ymd, 'YYYY-MM-DD', SAST_TZ).format('dddd, D MMMM YYYY');
}

/**
 * Estimate SBSA H2H EFT processing and receiver availability.
 *
 * Semantics for launch:
 * - Weekdays before 15:00 SAST: submit into today's intake; receiver availability
 *   is the next SA business day.
 * - After 15:00: next intake day; availability is the business day after that.
 * - Saturday before 15:00: accepted as an intake day; availability rolls to the
 *   next valid bank day. This remains configurable.
 */
function estimateEftSettlement(now = new Date(), options = {}) {
  const cutoff = parseCutoff(options.cutoff || process.env.SBSA_H2H_EFT_CUTOFF_SAST || '15:00');
  const current = moment.tz(now, SAST_TZ);
  const today = current.format('YYYY-MM-DD');
  const cutoffMoment = current.clone().hour(cutoff.hour).minute(cutoff.minute).second(0).millisecond(0);
  const beforeCutoff = current.isBefore(cutoffMoment);

  let requestedExecutionDate;
  let reason;

  if (canUseDateAsIntakeDay(today) && beforeCutoff) {
    requestedExecutionDate = today;
    reason = isSaturday(today) ? 'SATURDAY_BEFORE_CUTOFF' : 'BEFORE_CUTOFF';
  } else if (canUseDateAsIntakeDay(today)) {
    requestedExecutionDate = nextIntakeDayAfter(today);
    reason = 'AFTER_CUTOFF';
  } else {
    requestedExecutionDate = nextIntakeDayAfter(today);
    reason = isWeekend(today) ? 'WEEKEND' : 'PUBLIC_HOLIDAY';
  }

  const estimatedReceiverAvailabilityDate = rollToBusinessDay(nextBusinessDay(requestedExecutionDate));

  return {
    cutoffSast: cutoff.raw,
    submittedAtSast: current.format(),
    beforeCutoff,
    saturdayProcessing: saturdayProcessingEnabled(),
    requestedExecutionDate: toYMD(requestedExecutionDate),
    estimatedReceiverAvailabilityDate,
    reason,
    message: `Receiver should receive funds by ${formatDisplayDate(estimatedReceiverAvailabilityDate)}.`,
  };
}

module.exports = {
  estimateEftSettlement,
  parseCutoff,
};
