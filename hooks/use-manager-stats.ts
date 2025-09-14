"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useAuth } from "./use-auth"
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

  const fetchStats = useCallback(async (userId: string) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      console.log("🔒 Skipping fetch - already loading or unmounted")
      return
    }

    // Éviter les appels redondants avec le même userId
    if (lastUserIdRef.current === userId && data) {
      console.log("🔒 Skipping fetch - same userId and data exists")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      console.log("🔄 Fetching manager stats for:", userId)
      
      const result = await statsService.getManagerStats(userId)
      
      if (mountedRef.current) {
        setData(result)
        lastUserIdRef.current = userId
        console.log("✅ Manager stats loaded:", result.stats)
      }
    } catch (err) {
      console.error("❌ Error fetching manager stats:", err)
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

  // Effect avec debouncing et nettoyage amélioré
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setData(null)
      setError(null)
      return
    }

    // Debounce plus long pour éviter les appels lors de la navigation rapide
    const timeoutId = setTimeout(() => {
      fetchStats(user.id)
    }, 300) // Augmenté à 300ms pour éviter les appels multiples lors de la navigation

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

  const refetch = useCallback(() => {
    if (user?.id) {
      // Forcer le refetch en réinitialisant TOUT le cache
      lastUserIdRef.current = null
      setData(null) // Clear current data to force fresh fetch
      loadingRef.current = false // Reset loading flag
      fetchStats(user.id)
    }
  }, [user?.id, fetchStats])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 Force refreshing manager data...")
      // Vider le cache du service ET les flags locaux
      statsService.clearStatsCache(user.id)
      lastUserIdRef.current = null
      setData(null)
      loadingRef.current = false
      
      // Force fetch
      await fetchStats(user.id)
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

  const fetchContactStats = useCallback(async (userId: string) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      console.log("🔒 Skipping fetch - already loading or unmounted")
      return
    }

    // Éviter les appels redondants avec le même userId
    if (lastUserIdRef.current === userId && contactStats) {
      console.log("🔒 Skipping fetch - same userId and data exists")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      console.log("🔄 Fetching contact stats for:", userId)
      
      const result = await statsService.getContactStats(userId)
      
      if (mountedRef.current) {
        setContactStats(result)
        lastUserIdRef.current = userId
        console.log("✅ Contact stats loaded:", result)
      }
    } catch (err) {
      console.error("❌ Error fetching contact stats:", err)
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

  // Effect avec debouncing et nettoyage amélioré
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setContactStats(null)
      setError(null)
      return
    }

    // Debounce pour éviter les appels multiples
    const timeoutId = setTimeout(() => {
      fetchContactStats(user.id)
    }, 300)

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

  const refetch = useCallback(() => {
    if (user?.id) {
      // Forcer le refetch en réinitialisant les caches
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false
      fetchContactStats(user.id)
    }
  }, [user?.id, fetchContactStats])

  const forceRefetch = useCallback(async () => {
    if (user?.id) {
      console.log("🔄 Force refreshing contact stats...")
      // Vider le cache du service ET les flags locaux
      statsService.clearStatsCache(user.id)
      lastUserIdRef.current = null
      setContactStats(null)
      loadingRef.current = false
      
      // Force fetch
      await fetchContactStats(user.id)
    }
  }, [user?.id, fetchContactStats])

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