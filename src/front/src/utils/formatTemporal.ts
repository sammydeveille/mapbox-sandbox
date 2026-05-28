/**
 * Precision-based temporal formatting utilities.
 *
 * Used by KnowledgeDetailView for item_time display and
 * TemporalContextBar for slide view state temporal windows.
 */

export type TemporalPrecision = 'year' | 'month' | 'day' | 'hour' | 'exact';

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Formats a single timestamp according to the given precision level.
 *
 * - year  → "YYYY"
 * - month → "YYYY-MM"
 * - day   → "YYYY-MM-DD"
 * - hour  → "YYYY-MM-DD HH:00"
 * - exact → "YYYY-MM-DD HH:mm:ss"
 */
export function formatTemporalBinding(
  timestamp: string,
  precision: TemporalPrecision,
): string {
  const date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  switch (precision) {
    case 'year':
      return `${year}`;
    case 'month':
      return `${year}-${month}`;
    case 'day':
      return `${year}-${month}-${day}`;
    case 'hour':
      return `${year}-${month}-${day} ${hours}:00`;
    case 'exact':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  }
}

/**
 * Formats a temporal range for display in the TemporalContextBar.
 *
 * - year  → "YYYY – YYYY" (e.g., "1940 – 1945")
 * - month → "Mon YYYY – Mon YYYY" (e.g., "Jan 1940 – Dec 1945")
 * - day+  → "Mon D, YYYY – Mon D, YYYY" (e.g., "Jan 1, 1940 – Dec 31, 1945")
 *
 * If start and end resolve to the same display value at the given precision,
 * a single label is returned instead of a range.
 */
export function formatTemporalRange(
  start: string,
  end: string,
  precision: TemporalPrecision,
): string {
  const startLabel = formatRangeLabel(start, precision);
  const endLabel = formatRangeLabel(end, precision);

  if (startLabel === endLabel) {
    return startLabel;
  }

  return `${startLabel} – ${endLabel}`;
}

function formatRangeLabel(timestamp: string, precision: TemporalPrecision): string {
  const date = new Date(timestamp);

  const year = date.getUTCFullYear();
  const monthIndex = date.getUTCMonth();
  const day = date.getUTCDate();

  switch (precision) {
    case 'year':
      return `${year}`;
    case 'month':
      return `${MONTH_ABBR[monthIndex]} ${year}`;
    case 'day':
    case 'hour':
    case 'exact':
      return `${MONTH_ABBR[monthIndex]} ${day}, ${year}`;
  }
}
