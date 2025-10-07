"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { logger } from '@/lib/logger'

/**
 * 🔄 STALE-WHILE-REVALIDATE HOOK
 *
 * Stratégie de cache inspirée de HTTP Cache-Control stale-while-revalidate.
 * Améliore l'UX en affichant les données cached (même stale) pendant le refetch.
 *
 * Comportement :
 * - freshTime : Données considérées fraîches (pas de refetch)
 * - staleTime : Données montrées à l'utilisateur mais refetch en background
 * - maxAge : Au-delà, données supprimées du cache
 *
 * Exemple :
 * - freshTime: 30s  → Pas de refetch si < 30s
 * - staleTime: 300s → Montre données cached + refetch en background si 30s-300s
 * - maxAge: 900s    → Supprime cache si > 900s
 *
 * Usage :
 * const { data, loading, error, isStale, refetch } = useSWR(
 *   'my-key',
 *   fetchFunction,
 *   { freshTime: 30, staleTime: 300, maxAge: 900 }
 * )
 */

interface SWROptions<T> {
  freshTime?: number // Secondes pendant lesquelles données sont fraîches
  staleTime?: number // Secondes pendant lesquelles on montre données stale
  maxAge?: number // Secondes max de conservation en cache
  onSuccess?: (data: T) => void
  onError?: (error: Error) => void
  refetchOnWindowFocus?: boolean
  refetchOnReconnect?: boolean
}

interface SWRReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  isStale: boolean
  isValidating: boolean
  refetch: () => Promise<void>
  mutate: (newData: T | ((current: T | null) => T)) => void
}

interface CacheEntry<T> {
  data: T
  timestamp: number
}

// Cache global partagé entre toutes les instances du hook
const globalCache = new Map<string, CacheEntry<unknown>>()

export function useSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: SWROptions<T> = {}
): SWRReturn<T> {
  const {
    freshTime = 30, // 30 secondes par défaut
    staleTime = 300, // 5 minutes par défaut
    maxAge = 900, // 15 minutes par défaut
    onSuccess,
    onError,
    refetchOnWindowFocus = false,
    refetchOnReconnect = false
  } = options

  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [isValidating, setIsValidating] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [isStale, setIsStale] = useState(false)

  const mountedRef = useRef(true)
  const fetchingRef = useRef(false)

  // Vérifier si les données en cache sont encore valides
  const getCachedData = useCallback((): { data: T | null; status: 'fresh' | 'stale' | 'expired' } => {
    const cached = globalCache.get(key) as CacheEntry<T> | undefined

    if (!cached) {
      return { data: null, status: 'expired' }
    }

    const age = (Date.now() - cached.timestamp) / 1000 // Age en secondes

    if (age < freshTime) {
      return { data: cached.data, status: 'fresh' }
    } else if (age < staleTime) {
      return { data: cached.data, status: 'stale' }
    } else if (age < maxAge) {
      return { data: cached.data, status: 'stale' }
    } else {
      // Cache expiré, le supprimer
      globalCache.delete(key)
      return { data: null, status: 'expired' }
    }
  }, [key, freshTime, staleTime, maxAge])

  // Fonction principale de fetch
  const fetchData = useCallback(async (showLoading = true) => {
    // Éviter les fetches multiples simultanés
    if (fetchingRef.current) {
      logger.info(`🔒 [SWR:${key}] Already fetching, skipping...`)
      return
    }

    try {
      fetchingRef.current = true
      setIsValidating(true)
      if (showLoading) {
        setLoading(true)
      }
      setError(null)

      logger.info(`🔄 [SWR:${key}] Fetching data...`)

      const result = await fetcher()

      if (mountedRef.current) {
        // Sauvegarder dans le cache
        globalCache.set(key, {
          data: result,
          timestamp: Date.now()
        })

        setData(result)
        setIsStale(false)
        onSuccess?.(result)

        logger.info(`✅ [SWR:${key}] Data fetched and cached`)
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      logger.error(`❌ [SWR:${key}] Fetch error:`, error)

      if (mountedRef.current) {
        setError(error)
        onError?.(error)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
        setIsValidating(false)
      }
      fetchingRef.current = false
    }
  }, [key, fetcher, onSuccess, onError])

  // Effet initial : charger depuis le cache ou fetcher
  useEffect(() => {
    const { data: cachedData, status } = getCachedData()

    if (status === 'fresh') {
      // Données fraîches : les utiliser sans refetch
      logger.info(`✨ [SWR:${key}] Using fresh cache`)
      setData(cachedData)
      setIsStale(false)
      setLoading(false)
      setIsValidating(false)
    } else if (status === 'stale' && cachedData) {
      // Données stale : les montrer + refetch en background
      logger.info(`📦 [SWR:${key}] Using stale cache + revalidating in background`)
      setData(cachedData)
      setIsStale(true)
      setLoading(false)
      // Refetch en background (sans loading)
      fetchData(false)
    } else {
      // Pas de cache : fetch avec loading
      logger.info(`🆕 [SWR:${key}] No cache, fetching...`)
      fetchData(true)
    }
  }, [key, getCachedData, fetchData])

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return

    const handleFocus = () => {
      const { status } = getCachedData()
      if (status === 'stale' || status === 'expired') {
        logger.info(`👁️ [SWR:${key}] Window focus - revalidating`)
        fetchData(false)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [refetchOnWindowFocus, getCachedData, fetchData, key])

  // Refetch on reconnect
  useEffect(() => {
    if (!refetchOnReconnect) return

    const handleOnline = () => {
      logger.info(`🌐 [SWR:${key}] Network reconnected - revalidating`)
      fetchData(false)
    }

    window.addEventListener('online', handleOnline)
    return () => window.removeEventListener('online', handleOnline)
  }, [refetchOnReconnect, fetchData, key])

  // Cleanup
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Refetch manuel
  const refetch = useCallback(async () => {
    logger.info(`🔄 [SWR:${key}] Manual refetch requested`)
    await fetchData(true)
  }, [fetchData, key])

  // Mutation optimiste
  const mutate = useCallback((newData: T | ((current: T | null) => T)) => {
    const updatedData = typeof newData === 'function' ? newData(data) : newData

    // Mettre à jour immédiatement l'état
    setData(updatedData)

    // Mettre à jour le cache
    globalCache.set(key, {
      data: updatedData,
      timestamp: Date.now()
    })

    logger.info(`✏️ [SWR:${key}] Data mutated`)
  }, [data, key])

  return {
    data,
    loading,
    error,
    isStale,
    isValidating,
    refetch,
    mutate
  }
}

/**
 * Fonction utilitaire pour invalider le cache manuellement
 */
export function invalidateSWRCache(keyPattern: string | RegExp) {
  const keysToDelete: string[] = []

  globalCache.forEach((_, key) => {
    if (typeof keyPattern === 'string') {
      if (key === keyPattern || key.startsWith(keyPattern)) {
        keysToDelete.push(key)
      }
    } else {
      if (keyPattern.test(key)) {
        keysToDelete.push(key)
      }
    }
  })

  keysToDelete.forEach(key => {
    globalCache.delete(key)
    logger.info(`🗑️ [SWR] Invalidated cache for: ${key}`)
  })

  return keysToDelete.length
}

/**
 * Fonction utilitaire pour précharger des données dans le cache
 */
export function prefetchSWR<T>(key: string, data: T) {
  globalCache.set(key, {
    data,
    timestamp: Date.now()
  })
  logger.info(`📥 [SWR] Prefetched data for: ${key}`)
}
