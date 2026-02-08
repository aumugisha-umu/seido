/**
 * useDebounce Hook
 *
 * Delays updating a value until after a specified delay has passed
 * since the last change. Essential for search inputs and filters
 * to avoid excessive re-renders and API calls.
 *
 * @example
 * const [searchTerm, setSearchTerm] = useState('')
 * const debouncedSearch = useDebounce(searchTerm, 300)
 *
 * // debouncedSearch only updates 300ms after user stops typing
 * useEffect(() => {
 *   // This runs less frequently
 *   filterData(debouncedSearch)
 * }, [debouncedSearch])
 */

import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Debounces a value by delaying updates until after a specified delay
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 300ms)
 * @returns The debounced value
 */
export function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set up timeout to update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cancel timeout if value changes (or component unmounts)
    // This is the key to the debounce behavior
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

/**
 * useDebounceCallback Hook
 *
 * Alternative approach: debounces a callback function instead of a value.
 * Useful when you need to debounce function calls directly.
 *
 * ⚠️ IMPORTANT: The callback should be memoized with useCallback to prevent
 * the debounced function from being recreated on every render.
 *
 * @example
 * const searchFn = useCallback((term: string) => {
 *   fetchResults(term)
 * }, [])
 * const debouncedSearch = useDebounceCallback(searchFn, 300)
 *
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useDebounceCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 300
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const callbackRef = useRef(callback)

  // Keep callback ref up to date (avoids stale closure issues)
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args)
      }, delay)
    },
    [delay] // Only depends on delay, not callback (uses ref)
  )

  return debouncedCallback
}

export default useDebounce
