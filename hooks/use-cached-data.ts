/**
 * 🚀 PHASE 3: Advanced Cache Hooks
 *
 * Hooks pour utiliser facilement le cache multi-niveaux
 * avec gestion automatique des états loading/error
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { cache } from '@/lib/cache/cache-manager'
import { useDataRefresh } from './use-cache-management'

// ✅ Hook pour utiliser le cache directement
export function useCache() {
  return {
    get: <T>(_key: string) => cache.get<T>(key),
    set: (key: string, data: unknown, ttl?: number) => cache.set(key, data, ttl),
    getOrSet: <T>(key: string, fetcher: () => Promise<T>, ttl?: number) =>
      cache.getOrSet<T>(key, fetcher, ttl),
    invalidate: (_pattern: string) => cache.invalidate(pattern),
    metrics: () => cache.getMetrics(),
    status: () => cache.getStatus()
  }
}

// ✅ Hook pour les données avec cache automatique et états
export function useCachedData<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: {
    ttl?: number
    refetchOnWindowFocus?: boolean
    refetchInterval?: number
    enabled?: boolean
  } = {}
) {
  const {
    ttl = 300,
    refetchOnWindowFocus = false,
    refetchInterval,
    enabled = true
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!enabled) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const result = await cache.getOrSet(key, fetcher, ttl)
      setData(result)
    } catch (err) {
      console.error(`[CACHED-DATA] Error fetching ${key}:`, err)
      setError(err instanceof Error ? err : new Error('Unknown error'))
    } finally {
      setLoading(false)
    }
  }, [key, fetcher, ttl, enabled])

  // Initial fetch
  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return

    const handleFocus = () => {
      console.log(`🔍 [CACHED-DATA] Window focus refetch: ${key}`)
      fetchData()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, fetchData, enabled, key])

  // Interval refetch
  useEffect(() => {
    if (!refetchInterval || !enabled) return

    console.log(`⏰ [CACHED-DATA] Setting up interval refetch: ${key} (${refetchInterval}ms)`)
    const interval = setInterval(fetchData, refetchInterval)
    return () => clearInterval(interval)
  }, [refetchInterval, fetchData, enabled, key])

  // Register for cache invalidation
  useDataRefresh(key, fetchData)

  const invalidate = useCallback(async () => {
    await cache.invalidate(key)
    await fetchData()
  }, [key, fetchData])

  const mutate = useCallback(async (updater: (current: T | null) => T | Promise<T>) => {
    try {
      const newData = await Promise.resolve(updater(data))
      setData(newData)
      await cache.set(key, newData, ttl)
    } catch (err) {
      console.error(`[CACHED-DATA] Error mutating ${key}:`, err)
      setError(err instanceof Error ? err : new Error('Mutation error'))
    }
  }, [data, key, ttl])

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    invalidate,
    mutate
  }
}

// ✅ Hook pour listes avec pagination et cache
export function useCachedList<T>(
  baseKey: string,
  fetcher: (page: number, limit: number) => Promise<{ items: T[], total: number }>,
  options: {
    ttl?: number
    pageSize?: number
    prefetchNextPage?: boolean
  } = {}
) {
  const { ttl = 300, pageSize = 20, prefetchNextPage = true } = options
  const [page, setPage] = useState(1)

  const cacheKey = `${baseKey}:page:${page}:limit:${pageSize}`

  const { data, loading, error, refetch, invalidate } = useCachedData(
    cacheKey,
    () => fetcher(page, pageSize),
    { ttl }
  )

  // Prefetch next page
  useEffect(() => {
    if (!prefetchNextPage || !data || loading) return

    const totalPages = Math.ceil(data.total / pageSize)
    if (page < totalPages) {
      const nextPageKey = `${baseKey}:page:${page + 1}:limit:${pageSize}`

      // Check if next page is not already cached
      cache.get(nextPageKey).then(cached => {
        if (!cached) {
          console.log(`🔮 [CACHED-LIST] Prefetching next page: ${page + 1}`)
          cache.getOrSet(nextPageKey, () => fetcher(page + 1, pageSize), ttl)
        }
      })
    }
  }, [data, page, pageSize, loading, baseKey, fetcher, ttl, prefetchNextPage])

  const goToPage = useCallback((newPage: number) => {
    setPage(Math.max(1, newPage))
  }, [])

  const invalidateAll = useCallback(async () => {
    await cache.invalidate(baseKey)
    await refetch()
  }, [baseKey, refetch])

  return {
    items: data?.items || [],
    total: data?.total || 0,
    page,
    pageSize,
    totalPages: data ? Math.ceil(data.total / pageSize) : 0,
    loading,
    error,
    goToPage,
    nextPage: () => goToPage(page + 1),
    prevPage: () => goToPage(page - 1),
    refetch,
    invalidate: invalidateAll
  }
}

// ✅ Hook pour optimistic updates avec cache
export function useOptimisticMutation<T, TArgs extends unknown[]>(
  cacheKey: string,
  mutationFn: (...args: TArgs) => Promise<T>,
  options: {
    onSuccess?: (data: T) => void
    onError?: (error: Error) => void
    rollbackOnError?: boolean
  } = {}
) {
  const { onSuccess, onError, rollbackOnError = true } = options
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(async (
    optimisticUpdate: (current: T | null) => T,
    ...args: TArgs
  ) => {
    setLoading(true)

    // Get current data
    const currentData = await cache.get<T>(cacheKey)

    // Apply optimistic update
    const optimisticData = optimisticUpdate(currentData)
    await cache.set(cacheKey, optimisticData, 300)

    try {
      // Perform actual mutation
      const result = await mutationFn(...args)

      // Update cache with real result
      await cache.set(cacheKey, result, 300)

      onSuccess?.(result)
      return result
    } catch (error) {
      // Rollback on error
      if (rollbackOnError) {
        await cache.set(cacheKey, currentData, 300)
      }

      const err = error instanceof Error ? error : new Error('Mutation failed')
      onError?.(err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [cacheKey, mutationFn, onSuccess, onError, rollbackOnError])

  return {
    mutate,
    loading
  }
}
