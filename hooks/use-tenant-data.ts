"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { createBrowserSupabaseClient, createTenantService } from '@/lib/services'
import { useAuth } from './use-auth'
import { useResolvedUserId } from './use-resolved-user-id'
import { useDataRefresh } from './use-cache-management'
import { logger, logError } from '@/lib/logger'
interface TenantData {
  id: string
  reference: string
  floor?: number
  apartment_number?: string
  surface_area?: number
  rooms?: number
  charges_amount?: number
  category?: string
  building?: {
    id: string
    name: string
    address: string
    city: string
    postal_code: string
    description?: string
  } | null
}

interface TenantStats {
  openRequests: number
  inProgress: number
  thisMonthInterventions: number
  documentsCount: number
  nextPaymentDate: number
}

interface TenantIntervention {
  id: string
  title: string
  description: string
  status: string
  created_at: string
  completed_date?: string
  urgency: string
  type: string
  lot?: {
    reference: string
    building?: {
      name: string
    }
  }
  assigned_contact?: {
    name: string
    phone: string
    email: string
  }
}

export const useTenantData = () => {
  const { user } = useAuth()
  const resolvedUserId = useResolvedUserId(user?.id)
  const [tenantData, setTenantData] = useState<TenantData | null>(null)
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null)
  const [tenantInterventions, setTenantInterventions] = useState<TenantIntervention[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const mountedRef = useRef(true)
  const lastResolvedIdRef = useRef<string | null>(null)

  const fetchTenantData = useCallback(async (bypassCache = false) => {
    // Attendre la résolution du user ID (JWT → UUID)
    if (!resolvedUserId || !user || user.role !== 'locataire') {
      setLoading(false)
      return
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info('🔒 [TENANT-DATA] Skipping fetch - already loading or unmounted')
      return
    }

    // Éviter les refetch pour le même resolvedUserId
    if (lastResolvedIdRef.current === resolvedUserId && !bypassCache) {
      logger.info('🔒 [TENANT-DATA] Skipping fetch - same resolvedUserId')
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)

      logger.info('📊 [TENANT-DATA] Fetching tenant data', {
        originalUserId: user.id,
        resolvedUserId,
        bypassCache
      })

      // ✅ Initialiser le client Supabase et s'assurer que la session est prête
      const supabase = createBrowserSupabaseClient()
      try {
        const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession()
        if (sessionErr || !sessionRes?.session) {
          logger.warn('⚠️ [TENANT-DATA] Session issue, attempting refresh...')
          await supabase.auth.refreshSession()
        }
      } catch (sessionError) {
        logger.warn('⚠️ [TENANT-DATA] Session check failed:', sessionError)
        // Continue anyway - let the service handle it
      }

      // Fetch all tenant data in parallel avec l'ID résolu
      const tenantService = createTenantService()
      const [data, stats, interventions] = await Promise.all([
        tenantService.getTenantData(resolvedUserId),
        tenantService.getTenantStats(resolvedUserId),
        tenantService.getTenantInterventions(resolvedUserId)
      ])

      if (mountedRef.current) {
        setTenantData(data)
        setTenantStats(stats)
        setTenantInterventions(interventions)
        lastResolvedIdRef.current = resolvedUserId
      }
    } catch (err) {
      logger.error('Error fetching tenant data:', err)
      if (mountedRef.current) {
        setError(err instanceof Error ? err.message : 'Une erreur est survenue')
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [resolvedUserId, user])

  useEffect(() => {
    fetchTenantData(false)
  }, [fetchTenantData])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // ✅ Intégration au bus de refresh: permet à useNavigationRefresh de déclencher ce hook
  useDataRefresh('tenant-data', () => {
    // Forcer un refetch en bypassant le cache local
    lastResolvedIdRef.current = null
    loadingRef.current = false
    fetchTenantData(true)
  })

  const refreshData = useCallback(async () => {
    logger.info('🔄 [TENANT-DATA] Manual refresh requested')
    lastResolvedIdRef.current = null
    loadingRef.current = false
    await fetchTenantData(true)
  }, [fetchTenantData])

  return {
    tenantData,
    tenantStats,
    tenantInterventions,
    loading,
    error,
    refreshData
  }
}
