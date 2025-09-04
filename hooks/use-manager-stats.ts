"use client"

import { useState, useEffect } from "react"
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

  const fetchStats = async () => {
    if (!user?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      console.log("🔄 Fetching manager stats...")
      
      const result = await statsService.getManagerStats(user.id)
      setData(result)
      
      console.log("✅ Manager stats loaded:", result.stats)
    } catch (err) {
      console.error("❌ Error fetching manager stats:", err)
      setError("Erreur lors du chargement des statistiques")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user?.id])

  const refetch = () => {
    fetchStats()
  }

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
