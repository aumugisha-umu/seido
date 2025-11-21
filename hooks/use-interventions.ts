'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBrowserSupabaseClient, createInterventionService } from '@/lib/services'
import { logger } from '@/lib/logger'

interface UseInterventionsReturn {
  interventions: any[]
  loading: boolean
  error: string | null
  refetch: () => void
  forceRefetch: () => Promise<void>
}

/**
 * Hook to load all interventions for the current user's team
 *
 * This hook directly calls the intervention service (bypassing stats service)
 * to ensure all interventions (lot-based AND building-wide) are loaded.
 *
 * Features:
 * - Session check before fetching (prevents stale session errors)
 * - Integrated with cache refresh bus (responds to navigation events)
 * - Protection against double fetching
 * - Uses the same approach as the dashboard for consistency
 */
export function useInterventions(): UseInterventionsReturn {
  const [interventions, setInterventions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const lastFetchTimeRef = useRef<number>(0)

  const loadInterventions = useCallback(async (bypassCache = false) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info('🔒 [useInterventions] Skipping fetch - already loading or unmounted')
      return
    }

    // ✅ OPTIMISATION: Éviter les appels trop rapprochés (debounce 1s)
    const now = Date.now()
    if (!bypassCache && now - lastFetchTimeRef.current < 1000) {
      logger.info('🔒 [useInterventions] Skipping fetch - too soon after last fetch')
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info(`🔄 [useInterventions] Loading interventions... ${bypassCache ? '(bypassing cache)' : ''}`)

      // ✅ Initialiser le client Supabase et s'assurer que la session est prête
      const supabase = createBrowserSupabaseClient()
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr || !sessionRes?.session) {
          logger.warn('⚠️ [useInterventions] Session issue, attempting refresh...')
          await supabase.auth.refreshSession()
        }
      } catch (sessionError) {
        logger.warn(`⚠️ [useInterventions] Session check failed: ${sessionError}`)
        // Continue anyway - let the service handle it
      }

      // Create browser-side intervention service
      const interventionService = createInterventionService()

      // Load all interventions (same as dashboard approach)
      const result = await interventionService.getAll({ limit: 100 })

      if (mountedRef.current) {
        if (result.success && result.data) {
          setInterventions(result.data)
          lastFetchTimeRef.current = Date.now()
          logger.info(`✅ [useInterventions] Loaded ${result.data.length} interventions`)
        } else {
          const errorMsg = 'Failed to load interventions'
          setError(errorMsg)
          logger.error(`❌ [useInterventions] Error: ${errorMsg}`)
        }
      }
    } catch (err) {
      logger.error('❌ [useInterventions] Exception:', err)
      if (mountedRef.current) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMsg)
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, []) // Removed circular dependency - callback is now stable

  // ✅ Initial fetch
  useEffect(() => {
    loadInterventions(false) // Utilisation normale du cache
  }, [loadInterventions])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ✅ OPTIMISÉ: Refetch sans vider les données (meilleure UX)
  const refetch = useCallback(() => {
    logger.info('🔄 [useInterventions] Manual refetch requested')
    lastFetchTimeRef.current = 0
    loadingRef.current = false
    loadInterventions(true) // Bypass cache
  }, [loadInterventions])

  const forceRefetch = useCallback(async () => {
    logger.info('🔄 [useInterventions] Force refresh requested')
    lastFetchTimeRef.current = 0
    loadingRef.current = false
    await loadInterventions(true)
  }, [loadInterventions])

  return {
    interventions,
    loading,
    error,
    refetch,
    forceRefetch
  }
}
