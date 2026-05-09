import { TemporalPrecision } from '../types/spatiotemporal';

// --- Start-of-period helpers (UTC) ---

function startOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
}

function startOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function startOfHour(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours()
  ));
}

// --- End-of-period helpers (UTC, last millisecond) ---

function endOfYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 11, 31, 23, 59, 59, 999));
}

function endOfMonth(date: Date): Date {
  // Day 0 of the next month gives the last day of the current month
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), lastDay, 23, 59, 59, 999));
}

function endOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function endOfHour(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    59, 59, 999
  ));
}

/**
 * Expands a timestamp to a range based on its precision.
 * A "month" precision timestamp of 2024-03-01 expands to [2024-03-01, 2024-03-31T23:59:59.999Z].
 */
export function expandToPrecisionRange(
  timestamp: Date,
  precision: TemporalPrecision
): { start: Date; end: Date } {
  switch (precision) {
    case 'year':
      return { start: startOfYear(timestamp), end: endOfYear(timestamp) };
    case 'month':
      return { start: startOfMonth(timestamp), end: endOfMonth(timestamp) };
    case 'day':
      return { start: startOfDay(timestamp), end: endOfDay(timestamp) };
    case 'hour':
      return { start: startOfHour(timestamp), end: endOfHour(timestamp) };
    case 'instant':
      return { start: timestamp, end: timestamp };
  }
}

/**
 * Determines if a data point with a given precision overlaps a time window.
 */
export function overlapsTimeWindow(
  pointTimestamp: Date,
  precision: TemporalPrecision,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const range = expandToPrecisionRange(pointTimestamp, precision);
  return range.start <= windowEnd && range.end >= windowStart;
}
