"use client"

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================================
// TYPES
// ============================================================================

interface InterventionPaginationProps {
  /** Current page number (1-indexed) */
  currentPage: number
  /** Total number of pages */
  totalPages: number
  /** Total number of items */
  totalItems: number
  /** First item index (1-indexed) */
  startIndex: number
  /** Last item index (1-indexed) */
  endIndex: number
  /** Callback when page changes */
  onPageChange: (page: number) => void
  /** Whether there is a next page */
  hasNextPage: boolean
  /** Whether there is a previous page */
  hasPreviousPage: boolean
  /** Optional CSS classes */
  className?: string
  /** Current page size (for page size selector) */
  pageSize?: number
  /** Callback when page size changes */
  onPageSizeChange?: (size: number) => void
  /** Available page size options */
  pageSizeOptions?: number[]
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate page numbers with ellipses for large page counts
 *
 * Examples:
 * - 5 pages: [1, 2, 3, 4, 5]
 * - 10 pages, current=1: [1, 2, 3, '...', 10]
 * - 10 pages, current=5: [1, '...', 4, 5, 6, '...', 10]
 * - 10 pages, current=10: [1, '...', 8, 9, 10]
 */
function generatePageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = []

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i)
    }
  } else {
    // Always show first page
    pages.push(1)

    if (currentPage > 3) {
      pages.push('ellipsis')
    }

    // Show pages around current
    const start = Math.max(2, currentPage - 1)
    const end = Math.min(totalPages - 1, currentPage + 1)

    for (let i = start; i <= end; i++) {
      pages.push(i)
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis')
    }

    // Always show last page
    if (!pages.includes(totalPages)) {
      pages.push(totalPages)
    }
  }

  return pages
}

// ============================================================================
// COMPONENT
// ============================================================================

/**
 * 📄 InterventionPagination - French pagination controls
 *
 * Displays:
 * - Item range ("1-10 sur 89 interventions")
 * - Previous/Next buttons
 * - Page numbers with ellipses for large lists
 */
export function InterventionPagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  hasNextPage,
  hasPreviousPage,
  className,
  pageSize,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50]
}: InterventionPaginationProps) {
  // Don't render if only one page or no items (but show if page size selector is enabled and there are items)
  if (totalPages <= 1 && !onPageSizeChange) {
    return null
  }

  const pageNumbers = generatePageNumbers(currentPage, totalPages)

  return (
    <div className={cn(
      "flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border",
      className
    )}>
      {/* Left section: Item count + Page size selector */}
      <div className="flex items-center gap-4 order-2 sm:order-1">
        {/* Item count - French text */}
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{startIndex}-{endIndex}</span>
          {' '}sur{' '}
          <span className="font-medium text-foreground">{totalItems}</span>
          {' '}intervention{totalItems > 1 ? 's' : ''}
        </p>

        {/* Page size selector */}
        {onPageSizeChange && pageSize && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground hidden sm:inline">Afficher</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger className="h-8 w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {pageSizeOptions.map((size) => (
                  <SelectItem key={size} value={String(size)}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground hidden sm:inline">par page</span>
          </div>
        )}
      </div>

      {/* Pagination controls - only show if more than one page */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1 order-1 sm:order-2">
        {/* Previous button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="h-8 px-2 sm:px-3 gap-1"
          aria-label="Page précédente"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Précédent</span>
        </Button>

        {/* Page numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((page, index) => (
            page === 'ellipsis' ? (
              <span
                key={`ellipsis-${index}`}
                className="px-2 text-muted-foreground"
                aria-hidden="true"
              >
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                onClick={() => onPageChange(page)}
                className={cn(
                  "h-8 w-8 p-0",
                  page === currentPage && "pointer-events-none"
                )}
                aria-label={`Page ${page}`}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* Mobile page indicator */}
        <span className="sm:hidden text-sm text-muted-foreground px-2">
          {currentPage} / {totalPages}
        </span>

        {/* Next button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="h-8 px-2 sm:px-3 gap-1"
          aria-label="Page suivante"
        >
          <span className="hidden sm:inline">Suivant</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      )}
    </div>
  )
}

/**
 * ✶ Insight ─────────────────────────────────────
 *
 * **Pagination UX Best Practices:**
 *
 * 1. **Ellipsis pattern**: Shows first, last, and nearby pages
 *    to prevent overwhelming users with 50+ page buttons
 *
 * 2. **French labels**: "Précédent/Suivant" and "1-10 sur 89"
 *    match the app's French UI
 *
 * 3. **Mobile-first**: Page numbers hidden on mobile,
 *    replaced with compact "3 / 9" indicator
 *
 * 4. **Accessible**: aria-labels for screen readers,
 *    aria-current for active page
 *
 * 5. **Disabled states**: Buttons disable at boundaries
 *    to prevent invalid navigation
 *
 * ─────────────────────────────────────────────────
 */
