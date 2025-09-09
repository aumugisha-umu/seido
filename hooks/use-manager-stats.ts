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

  // Effect avec debouncing et nettoyage
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setData(null)
      setError(null)
      return
    }

    // Debounce pour éviter les appels trop fréquents
    const timeoutId = setTimeout(() => {
      fetchStats(user.id)
    }, 100)

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
      // Forcer le refetch en réinitialisant la référence
      lastUserIdRef.current = null
      fetchStats(user.id)
    }
  }, [user?.id, fetchStats])

  return {
    data,
    loading,
    error,
    refetch,
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
