/**
 * Truncates a description string to a maximum length, appending an ellipsis
 * character ("…") if the string exceeds the limit.
 *
 * @param text - The input string to truncate
 * @param maxLength - Maximum allowed length before truncation (default: 100)
 * @returns The original string if within maxLength, otherwise the first maxLength characters followed by "…"
 */
export function truncateDescription(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.slice(0, maxLength) + "\u2026";
}
