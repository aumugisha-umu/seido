/**
 * usePrefetch Hook
 *
 * Prefetches a page when user hovers over an element (after a short delay).
 * Uses Next.js router.prefetch() under the hood for optimal performance.
 *
 * Benefits:
 * - Page loads instantly when user clicks (already cached)
 * - No visual change to the UI
 * - Intelligent delay avoids prefetching on quick mouse passes
 *
 * @example
 * const { onMouseEnter, onMouseLeave } = usePrefetch('/interventions/123')
 *
 * <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *   <InterventionCard />
 * </div>
 */

import { useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface UsePrefetchOptions {
  /** Delay in ms before prefetching starts (default: 150ms) */
  delay?: number
  /** Whether prefetching is enabled (default: true) */
  enabled?: boolean
}

interface UsePrefetchReturn {
  /** Attach to element's onMouseEnter */
  onMouseEnter: () => void
  /** Attach to element's onMouseLeave */
  onMouseLeave: () => void
  /** Manually trigger prefetch */
  prefetch: () => void
}

/**
 * Prefetches a route when user hovers over an element
 *
 * @param href - The route to prefetch (e.g., '/interventions/123')
 * @param options - Configuration options
 * @returns Event handlers to attach to hoverable element
 *
 * @example Basic usage
 * ```tsx
 * function Card({ id }: { id: string }) {
 *   const { onMouseEnter, onMouseLeave } = usePrefetch(`/interventions/${id}`)
 *
 *   return (
 *     <div onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
 *       ...
 *     </div>
 *   )
 * }
 * ```
 *
 * @example With custom delay
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePrefetch('/page', { delay: 300 })
 * ```
 *
 * @example Conditionally disabled
 * ```tsx
 * const { onMouseEnter, onMouseLeave } = usePrefetch('/page', {
 *   enabled: !isMobile // Disable on mobile where hover doesn't exist
 * })
 * ```
 */
export function usePrefetch(
  href: string,
  options: UsePrefetchOptions = {}
): UsePrefetchReturn {
  const { delay = 150, enabled = true } = options
  const router = useRouter()
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const prefetchedRef = useRef(false)

  const prefetch = useCallback(() => {
    if (!enabled || prefetchedRef.current) return

    // Mark as prefetched to avoid duplicate requests
    prefetchedRef.current = true

    // Use Next.js router.prefetch for optimal caching
    router.prefetch(href)
  }, [href, router, enabled])

  const onMouseEnter = useCallback(() => {
    if (!enabled || prefetchedRef.current) return

    // Start prefetch after delay (avoids prefetching on quick mouse passes)
    timeoutRef.current = setTimeout(() => {
      prefetch()
    }, delay)
  }, [delay, enabled, prefetch])

  const onMouseLeave = useCallback(() => {
    // Cancel pending prefetch if user moves away quickly
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
  }, [])

  return { onMouseEnter, onMouseLeave, prefetch }
}

/**
 * Simplified hook for Link-like elements that just need mouse handlers
 *
 * @example
 * ```tsx
 * <Card {...usePrefetchHandlers('/page')}>
 *   ...
 * </Card>
 * ```
 */
export function usePrefetchHandlers(href: string, options?: UsePrefetchOptions) {
  const { onMouseEnter, onMouseLeave } = usePrefetch(href, options)
  return { onMouseEnter, onMouseLeave }
}

export default usePrefetch
