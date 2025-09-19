"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "./use-auth"
import { useDataRefresh } from "./use-cache-management"
import { statsService } from "@/lib/database-service"

export interface ManagerStats {
  buildingsCount: number
  lotsCount: number
  occupiedLotsCount: number
  occupancyRate: number
  contactsCount: number
  interventionsCount: number
}

export interface ManagerData {
  buildings: any[]
  lots: any[]
  contacts: any[]
  interventions: any[]
  stats: ManagerStats
  team?: any
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
    // ✅ NOUVEAU: Skip pour les utilisateurs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [MANAGER-STATS] JWT-only user detected, returning empty stats")
      if (mountedRef.current) {
        setData({
          stats: {
            buildingsCount: 0,
            lotsCount: 0,
            occupiedLotsCount: 0,
            occupancyRate: 0,
            contactsCount: 0,
            documentsCount: 0,
            recentActivities: []
          }
        })
        setLoading(false)
        setError(null)
        lastUserIdRef.current = userId
      }
      return
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      console.log("🔒 [MANAGER-STATS] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    if (lastUserIdRef.current === userId && data && !bypassCache) {
      console.log("🔒 [MANAGER-STATS] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      console.log("🔄 [MANAGER-STATS] Fetching manager stats for:", userId, bypassCache ? "(bypassing cache)" : "")
      
      const result = await statsService.getManagerStats(userId)
      
      if (mountedRef.current) {
        setData(result)
        lastUserIdRef.current = userId
        console.log("✅ [MANAGER-STATS] Manager stats loaded:", result.stats)
      }
    } catch (err) {
      console.error("❌ [MANAGER-STATS] Error fetching manager stats:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des statistiques")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [data])

  // ✅ NOUVEAU: Intégration avec le système de cache pour refresh automatique
  const refreshCallback = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [MANAGER-STATS] Cache refresh triggered")
      // Forcer le bypass du cache pour le refresh
      lastUserIdRef.current = null
      setData(null) // Clear data to show loading state
      fetchStats(user.id, true)
    }
  }, [user?.id, fetchStats])

  // Enregistrer le hook avec le système de cache
  const { setCacheValid, invalidateCache, forceRefresh } = useDataRefresh('manager-stats', refreshCallback)

  // ✅ OPTIMISÉ: Effect avec debouncing réduit et intégration cache
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setData(null)
      setError(null)
      return
    }

    // ✅ OPTIMISATION: Débounce réduit pour une navigation plus réactive
    const timeoutId = setTimeout(() => {
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

  // ✅ OPTIMISÉ: Refetch avec système de cache intégré
  const refetch = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [MANAGER-STATS] Manual refetch requested")
      // Invalider le cache et forcer le refetch
      invalidateCache()
      lastUserIdRef.current = null
      setData(null) // Clear current data to show loading
      loadingRef.current = false
      fetchStats(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchStats, invalidateCache])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 [MANAGER-STATS] Force refresh requested - clearing service cache too")
      // Vider le cache du service ET le cache local
      statsService.clearStatsCache(user.id)
      invalidateCache()
      lastUserIdRef.current = null
      setData(null)
      loadingRef.current = false
      
      // Force fetch
      await fetchStats(user.id, true)
    }
  }, [user?.id, fetchStats, invalidateCache])

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
    prestataire: { total: number; active: number }
    syndic: { total: number; active: number }
    notaire: { total: number; active: number }
    assurance: { total: number; active: number }
    proprietaire: { total: number; active: number }
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
    // ✅ NOUVEAU: Skip pour les utilisateurs JWT-only
    if (userId.startsWith('jwt_')) {
      console.log("⚠️ [CONTACT-STATS] JWT-only user detected, returning empty stats")
      if (mountedRef.current) {
        setContactStats({
          totalContacts: 0,
          contactsByType: {
            locataire: 0,
            gestionnaire: 0,
            prestataire: 0,
            syndic: 0,
            notaire: 0,
            assurance: 0,
            proprietaire: 0,
            autre: 0
          },
          totalActiveAccounts: 0,
          invitationsPending: 0
        })
        setLoading(false)
        setError(null)
        lastUserIdRef.current = userId
      }
      return
    }

    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      console.log("🔒 [CONTACT-STATS] Skipping fetch - already loading or unmounted")
      return
    }

    // ✅ OPTIMISATION: Permettre le bypass du cache lors des navigations
    if (lastUserIdRef.current === userId && contactStats && !bypassCache) {
      console.log("🔒 [CONTACT-STATS] Skipping fetch - same userId and data exists (use bypassCache=true to force)")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      console.log("🔄 [CONTACT-STATS] Fetching contact stats for:", userId, bypassCache ? "(bypassing cache)" : "")
      
      const result = await statsService.getContactStats(userId)
      
      if (mountedRef.current) {
        setContactStats(result)
        lastUserIdRef.current = userId
        console.log("✅ [CONTACT-STATS] Contact stats loaded:", result)
      }
    } catch (err) {
      console.error("❌ [CONTACT-STATS] Error fetching contact stats:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des statistiques des contacts")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [contactStats])

  // ✅ NOUVEAU: Intégration avec le système de cache pour refresh automatique
  const refreshCallback = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [CONTACT-STATS] Cache refresh triggered")
      // Forcer le bypass du cache pour le refresh
      lastUserIdRef.current = null
      setContactStats(null)
      fetchContactStats(user.id, true)
    }
  }, [user?.id, fetchContactStats])

  // Enregistrer le hook avec le système de cache
  const { setCacheValid, invalidateCache, forceRefresh } = useDataRefresh('contact-stats', refreshCallback)

  // ✅ OPTIMISÉ: Effect avec debouncing réduit et intégration cache
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

  // ✅ OPTIMISÉ: Refetch avec système de cache intégré
  const refetch = useCallback(() => {
    if (user?.id) {
      console.log("🔄 [CONTACT-STATS] Manual refetch requested")
      // Invalider le cache et forcer le refetch
      invalidateCache()
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false
      fetchContactStats(user.id, true) // Bypass cache
    }
  }, [user?.id, fetchContactStats, invalidateCache])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 [CONTACT-STATS] Force refresh requested - clearing service cache too")
      // Vider le cache du service ET le cache local
      statsService.clearStatsCache(user.id)
      invalidateCache()
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false
      
      // Force fetch
      await fetchContactStats(user.id, true)
    }
  }, [user?.id, fetchContactStats, invalidateCache])

  return {
    contactStats: contactStats || {
      totalContacts: 0,
      contactsByType: {
        gestionnaire: { total: 0, active: 0 },
        locataire: { total: 0, active: 0 },
        prestataire: { total: 0, active: 0 },
        syndic: { total: 0, active: 0 },
        notaire: { total: 0, active: 0 },
        assurance: { total: 0, active: 0 },
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