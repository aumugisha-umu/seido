import { useState, useMemo, useCallback } from 'react'

// ============================================================================
// TYPES
// ============================================================================

export interface UsePaginationOptions<T> {
  /** Items to paginate */
  items: T[]
  /** Number of items per page (default: 10) */
  pageSize?: number
  /** Initial page number (default: 1) */
  initialPage?: number
}

export interface UsePaginationResult<T> {
  /** Items for the current page */
  paginatedItems: T[]
  /** Current page number (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  totalItems: number
  /** Number of items per page */
  pageSize: number
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPreviousPage: boolean
  /** Navigate to a specific page */
  goToPage: (page: number) => void
  /** Navigate to the next page */
  goToNextPage: () => void
  /** Navigate to the previous page */
  goToPreviousPage: () => void
  /** Reset to the first page */
  resetToFirstPage: () => void
  /** First item index (1-indexed) for display */
  startIndex: number
  /** Last item index (1-indexed) for display */
  endIndex: number
}

// ============================================================================
// HOOK
// ============================================================================

/**
 * 📖 usePagination - Reusable pagination hook
 *
 * Provides client-side pagination logic for arrays of items.
 * Perfect for lists that are already loaded in memory.
 *
 * @example
 * ```tsx
 * const {
 *   paginatedItems,
 *   currentPage,
 *   totalPages,
 *   goToPage,
 *   resetToFirstPage
 * } = usePagination({
 *   items: interventions,
 *   pageSize: 10
 * })
 *
 * // Reset on filter change
 * useEffect(() => {
 *   resetToFirstPage()
 * }, [filterValue, resetToFirstPage])
 * ```
 */
export function usePagination<T>({
  items,
  pageSize = 10,
  initialPage = 1
}: UsePaginationOptions<T>): UsePaginationResult<T> {
  const [currentPage, setCurrentPage] = useState(initialPage)

  // Calculate total pages
  const totalItems = items.length
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize))

  // Ensure current page is within bounds when items change
  const validCurrentPage = useMemo(() => {
    if (currentPage > totalPages) {
      return totalPages
    }
    if (currentPage < 1) {
      return 1
    }
    return currentPage
  }, [currentPage, totalPages])

  // Update current page if it became invalid
  if (validCurrentPage !== currentPage) {
    setCurrentPage(validCurrentPage)
  }

  // Calculate paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return items.slice(startIndex, endIndex)
  }, [items, validCurrentPage, pageSize])

  // Navigation flags
  const hasNextPage = validCurrentPage < totalPages
  const hasPreviousPage = validCurrentPage > 1

  // Display indices (1-indexed for UI)
  const startIndex = totalItems === 0 ? 0 : (validCurrentPage - 1) * pageSize + 1
  const endIndex = Math.min(validCurrentPage * pageSize, totalItems)

  // Navigation functions (memoized for useEffect dependencies)
  const goToPage = useCallback((page: number) => {
    const validPage = Math.min(Math.max(1, page), totalPages)
    setCurrentPage(validPage)
  }, [totalPages])

  const goToNextPage = useCallback(() => {
    if (hasNextPage) {
      setCurrentPage(prev => prev + 1)
    }
  }, [hasNextPage])

  const goToPreviousPage = useCallback(() => {
    if (hasPreviousPage) {
      setCurrentPage(prev => prev - 1)
    }
  }, [hasPreviousPage])

  const resetToFirstPage = useCallback(() => {
    setCurrentPage(1)
  }, [])

  return {
    paginatedItems,
    currentPage: validCurrentPage,
    totalPages,
    totalItems,
    pageSize,
    hasNextPage,
    hasPreviousPage,
    goToPage,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
    startIndex,
    endIndex
  }
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Why Client-Side Pagination Here?**
 *
 * Client-side pagination is ideal when:
 * 1. Data is already loaded (Server Component → props)
 * 2. Dataset is reasonably sized (< 1000 items)
 * 3. Instant page navigation is expected
 * 4. Filtering/sorting happens client-side
 *
 * For very large datasets (10K+ items), consider:
 * - Server-side pagination with cursor/offset
 * - Infinite scroll with virtualization
 * - Search-based filtering instead of loading all
 *
 * **The `useCallback` Pattern:**
 * We memoize `resetToFirstPage` so it can be safely used
 * as a dependency in `useEffect` without causing infinite loops.
 * This is crucial for the filter-reset pattern.
 *
 * ─────────────────────────────────────────────────
 */
