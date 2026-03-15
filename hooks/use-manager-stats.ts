"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "./use-auth"
import { createStatsService } from "@/lib/services"
import { logger, logError } from '@/lib/logger'
import { useRealtimeOptional } from '@/contexts/realtime-context'
export interface ManagerStats {
  buildingsCount: number
  lotsCount: number
  occupiedLotsCount: number
  occupancyRate: number
  contactsCount: number
  interventionsCount: number
}

export interface ManagerData {
  buildings: unknown[]
  lots: unknown[]
  contacts: unknown[]
  interventions: unknown[]
  recentInterventions: unknown[]
  stats: ManagerStats
  team?: unknown
}

export function useManagerStats() {
  const { user } = useAuth()
  const [data, setData] = useState<ManagerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  const fetchStats = useCallback(async (userId: string, bypassCache = false) => {
    // ✅ NOUVEAU: Skip pour les utilisateurs JWT-only SANS sauvegarder lastUserIdRef
    if (userId.startsWith('jwt_')) {
      logger.info("⚠️ [MANAGER-STATS] JWT-only user detected, returning empty stats")
      if (mountedRef.current) {
        setData({
          stats: {
            buildingsCount: 0,
            lotsCount: 0,
            occupiedLotsCount: 0,
            occupancyRate: 0,
            contactsCount: 0,
            interventionsCount: 0
          },
          buildings: [],
          lots: [],
          contacts: [],
          interventions: [],
          recentInterventions: []
        })
        setLoading(false)
        setError(null)
        // ❌ SUPPRIMÉ: lastUserIdRef.current = userId
        // ✅ NOUVEAU: Ne pas marquer comme cached pour permettre fetch après recovery
      }
      return
    }

    // ✅ NOUVEAU: Guard contre re-fetch répétés après JWT recovery
    if (lastUserIdRef.current?.startsWith('jwt_') && !userId.startsWith('jwt_')) {
      logger.info("🔄 [MANAGER-STATS] JWT user recovered, forcing fresh fetch")
      lastUserIdRef.current = null  // Reset pour permettre fetch unique
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info("🔒 [MANAGER-STATS] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    if (lastUserIdRef.current === userId && data && !bypassCache) {
      logger.info("🔒 [MANAGER-STATS] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info(`🔄 [MANAGER-STATS] Fetching manager stats for: ${userId} ${bypassCache ? '(bypassing cache)' : ''}`)

      // ⚡ OPTIMISATION: Session check supprimé (Supabase gère automatiquement)
      // Les clients Supabase rafraîchissent la session en background
      // Économie: ~100-200ms par fetch
      const statsService = createStatsService()
      const result = await statsService.getManagerStats(userId)

      if (mountedRef.current) {
        setData(result)
        lastUserIdRef.current = userId
        logger.info("✅ [MANAGER-STATS] Manager stats loaded:", result.stats)
      }
    } catch (err) {
      logger.error("❌ [MANAGER-STATS] Error fetching manager stats:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des statistiques")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [])  // ✅ CORRECTION: Dependency array vide - fetchStats n'a pas besoin de dépendances

  // ✅ OPTIMISÉ: Effect avec debouncing réduit et intégration cache
  useEffect(() => {
    logger.info("🔍 [MANAGER-STATS] useEffect triggered, user.id:", user?.id)
    if (!user?.id) {
      logger.info("🔍 [MANAGER-STATS] No user ID, setting loading=false")
      setLoading(false)
      setData(null)
      setError(null)
      return
    }

    logger.info("🔍 [MANAGER-STATS] Scheduling fetchStats for user:", user.id)
    // ✅ OPTIMISATION: Débounce réduit pour une navigation plus réactive
    const timeoutId = setTimeout(() => {
      logger.info("🔍 [MANAGER-STATS] Calling fetchStats now")
      fetchStats(user.id, false) // Utilisation normale du cache
    }, 100) // Réduit de 300ms à 100ms pour plus de réactivité

    return () => {
      clearTimeout(timeoutId)
    }
  }, [user?.id, fetchStats])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Auto-refetch on invalidation broadcast
  const realtime = useRealtimeOptional()

  useEffect(() => {
    if (!realtime?.onInvalidation) return
    return realtime.onInvalidation(['buildings', 'lots', 'contacts', 'interventions', 'stats'], () => {
      if (user?.id) {
        logger.info('🔄 [MANAGER-STATS] Auto-refetch triggered by invalidation')
        lastUserIdRef.current = null
        loadingRef.current = false
        fetchStats(user.id, true)
      }
    })
  }, [realtime, user?.id, fetchStats])

  // ✅ SIMPLIFIÉ: Refetch direct sans couche de cache
  const refetch = useCallback(() => {
    if (user?.id) {
      logger.info("🔄 [MANAGER-STATS] Manual refetch requested")
      lastUserIdRef.current = null
      setData(null) // Clear current data to show loading
      loadingRef.current = false
      fetchStats(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchStats])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      logger.info("🔄 [MANAGER-STATS] Force refresh requested")
      lastUserIdRef.current = null
      setData(null)
      loadingRef.current = false

      // Force fetch
      await fetchStats(user.id, true)
    }
  }, [user?.id, fetchStats])

  return {
    data,
    loading,
    error,
    refetch,
    forceRefetch,
    stats: data?.stats || {
      buildingsCount: 0,
      lotsCount: 0,
      occupiedLotsCount: 0,
      occupancyRate: 0,
      contactsCount: 0,
      interventionsCount: 0
    }
  }
}

export interface ContactStats {
  totalContacts: number
  contactsByType: {
    gestionnaire: { total: number; active: number }
    locataire: { total: number; active: number }
    proprietaire: { total: number; active: number }
    prestataire: { total: number; active: number }
    autre: { total: number; active: number }
  }
  totalActiveAccounts: number
  invitationsPending: number
}

export function useContactStats() {
  const { user } = useAuth()
  const [contactStats, setContactStats] = useState<ContactStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Utiliser des refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  const fetchContactStats = useCallback(async (userId: string, bypassCache = false) => {
    // ✅ NOUVEAU: Skip pour les utilisateurs JWT-only SANS sauvegarder lastUserIdRef
    if (userId.startsWith('jwt_')) {
      logger.info("⚠️ [CONTACT-STATS] JWT-only user detected, returning empty stats")
      if (mountedRef.current) {
        setContactStats({
          totalContacts: 0,
          contactsByType: {
            gestionnaire: { total: 0, active: 0 },
            locataire: { total: 0, active: 0 },
            proprietaire: { total: 0, active: 0 },
            prestataire: { total: 0, active: 0 },
            autre: { total: 0, active: 0 }
          },
          totalActiveAccounts: 0,
          invitationsPending: 0
        })
        setLoading(false)
        setError(null)
        // ❌ SUPPRIMÉ: lastUserIdRef.current = userId
        // ✅ NOUVEAU: Ne pas marquer comme cached pour permettre fetch après recovery
      }
      return
    }

    // ✅ NOUVEAU: Guard contre re-fetch répétés après JWT recovery
    if (lastUserIdRef.current?.startsWith('jwt_') && !userId.startsWith('jwt_')) {
      logger.info("🔄 [CONTACT-STATS] JWT user recovered, forcing fresh fetch")
      lastUserIdRef.current = null  // Reset pour permettre fetch unique
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info("🔒 [CONTACT-STATS] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    if (lastUserIdRef.current === userId && contactStats && !bypassCache) {
      logger.info("🔒 [CONTACT-STATS] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info("🔄 [CONTACT-STATS] Fetching contact stats for:", userId, bypassCache ? "(bypassing cache)" : "")

      const statsService = createStatsService()
      const result = await statsService.getContactStats(userId)
      
      if (mountedRef.current) {
        setContactStats(result)
        lastUserIdRef.current = userId
        logger.info("✅ [CONTACT-STATS] Contact stats loaded:", result)
      }
    } catch (err) {
      logger.error("❌ [CONTACT-STATS] Error fetching contact stats:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des statistiques des contacts")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [])  // ✅ CORRECTION: Dependency array vide - fetchContactStats n'a pas besoin de dépendances

  // ✅ SIMPLIFIÉ: Effect standard React sans userIdRef
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setContactStats(null)
      setError(null)
      return
    }

    // ✅ OPTIMISATION: Débounce réduit pour plus de réactivité
    const timeoutId = setTimeout(() => {
      fetchContactStats(user.id, false) // Utilisation normale du cache
    }, 100) // Réduit de 300ms à 100ms

    return () => {
      clearTimeout(timeoutId)
    }
  }, [user?.id, fetchContactStats])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Auto-refetch on invalidation broadcast
  const realtime = useRealtimeOptional()

  useEffect(() => {
    if (!realtime?.onInvalidation) return
    return realtime.onInvalidation(['contacts'], () => {
      if (user?.id) {
        logger.info('🔄 [CONTACT-STATS] Auto-refetch triggered by invalidation')
        lastUserIdRef.current = null
        loadingRef.current = false
        fetchContactStats(user.id, true)
      }
    })
  }, [realtime, user?.id, fetchContactStats])

  // ✅ SIMPLIFIÉ: Refetch direct sans couche de cache
  const refetch = useCallback(() => {
    if (user?.id) {
      logger.info("🔄 [CONTACT-STATS] Manual refetch requested")
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false
      fetchContactStats(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchContactStats])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      logger.info("🔄 [CONTACT-STATS] Force refresh requested")
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false

      // Force fetch
      await fetchContactStats(user.id, true)
    }
  }, [user?.id, fetchContactStats])

  return {
    contactStats: contactStats || {
      totalContacts: 0,
      contactsByType: {
        gestionnaire: { total: 0, active: 0 },
        locataire: { total: 0, active: 0 },
        prestataire: { total: 0, active: 0 },
        proprietaire: { total: 0, active: 0 },
        autre: { total: 0, active: 0 }
      },
      totalActiveAccounts: 0,
      invitationsPending: 0
    },
    loading,
    error,
    refetch,
    forceRefetch
  }
}
