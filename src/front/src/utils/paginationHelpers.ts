/**
 * Pagination computation result.
 */
export interface PaginationResult {
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
  displayPage: number;
}

/**
 * Computes pagination metadata from a total result count and current 0-indexed page number.
 *
 * @param total - Total number of results
 * @param page - Current page index (0-based)
 * @param pageSize - Number of results per page (default: 20)
 * @returns Pagination metadata with totalPages, hasNext, hasPrevious, and displayPage (1-based)
 */
export function computePagination(
  total: number,
  page: number,
  pageSize: number = 20
): PaginationResult {
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  const hasNext = page < totalPages - 1;
  const hasPrevious = page > 0;
  const displayPage = page + 1;

  return { totalPages, hasNext, hasPrevious, displayPage };
}
