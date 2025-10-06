"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import {
  createBuildingService,
  createLotService,
  createTeamService
} from "@/lib/services"
import { logger } from '@/lib/logger'

export interface Building {
  id: string
  name: string
  address: string
  city?: string
  postal_code?: string
  team_id: string
  lots?: Lot[]
  [key: string]: unknown
}

export interface Lot {
  id: string
  reference: string
  building_id: string
  floor?: number
  status?: string
  building_name?: string
  tenant?: unknown
  lot_tenants?: unknown[]
  interventions?: number
  [key: string]: unknown
}

export interface BuildingsData {
  buildings: Building[]
  lots: Lot[]
  teamId: string | null
}

export function useBuildings() {
  const { user } = useAuth()
  const [data, setData] = useState<BuildingsData>({
    buildings: [],
    lots: [],
    teamId: null
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Refs pour éviter les re-renders inutiles
  const loadingRef = useRef(false)
  const lastUserIdRef = useRef<string | null>(null)
  const mountedRef = useRef(true)

  const fetchBuildings = useCallback(async (userId: string, bypassCache = false) => {
    // Éviter les appels multiples
    if (loadingRef.current || !mountedRef.current) {
      logger.info("🔒 [BUILDINGS] Skipping fetch - already loading or unmounted")
      return
    }

    // Permettre le bypass du cache
    if (lastUserIdRef.current === userId && data.buildings.length > 0 && !bypassCache) {
      logger.info("🔒 [BUILDINGS] Skipping fetch - same userId and data exists")
      return
    }

    try {
      loadingRef.current = true
      setLoading(true)
      setError(null)
      logger.info("🔄 [BUILDINGS] Fetching buildings for:", userId)

      // 1. Récupérer l'équipe de l'utilisateur
      const teamService = createTeamService()
      const teamsResult = await teamService.getUserTeams(userId)
      const teams = teamsResult?.data || []

      if (!teams || teams.length === 0) {
        logger.info("⚠️ [BUILDINGS] No team found for user")
        setData({
          buildings: [],
          lots: [],
          teamId: null
        })
        setLoading(false)
        return
      }

      const teamId = teams[0].id
      logger.info("🏢 [BUILDINGS] Found team:", teamId)

      // 2. Récupérer les buildings de l'équipe
      const buildingService = createBuildingService()
      const buildingsResult = await buildingService.getBuildingsByTeam(teamId)

      if (!buildingsResult.success || !buildingsResult.data) {
        logger.error("❌ [BUILDINGS] Error fetching buildings")
        setError("Erreur lors du chargement des immeubles")
        setLoading(false)
        return
      }

      const buildings = buildingsResult.data
      logger.info("🏗️ [BUILDINGS] Loaded buildings:", buildings.length)

      // 3. Récupérer les lots pour chaque building
      const lotService = createLotService()
      const allLots: Lot[] = []

      for (const building of buildings) {
        try {
          const lotsResult = await lotService.getLotsByBuilding(building.id)

          if (lotsResult.success && lotsResult.data) {
            const buildingLots = lotsResult.data.map((lot: Lot) => ({
              ...lot,
              building_name: building.name
            }))

            building.lots = buildingLots
            allLots.push(...buildingLots)
            logger.info(`✅ [BUILDINGS] Loaded ${buildingLots.length} lots for building:`, building.name)
          } else {
            building.lots = []
          }
        } catch (lotError) {
          logger.error(`❌ [BUILDINGS] Error loading lots for building ${building.id}:`, lotError)
          building.lots = []
        }
      }

      logger.info("🏠 [BUILDINGS] Total lots loaded:", allLots.length)

      if (mountedRef.current) {
        setData({
          buildings,
          lots: allLots,
          teamId
        })
        lastUserIdRef.current = userId
      }
    } catch (err) {
      logger.error("❌ [BUILDINGS] Error fetching buildings:", err)
      if (mountedRef.current) {
        setError("Erreur lors du chargement des immeubles")
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
      loadingRef.current = false
    }
  }, [data.buildings.length])

  // Effect pour charger les buildings quand l'utilisateur change
  useEffect(() => {
    if (!user?.id) {
      setLoading(false)
      setData({
        buildings: [],
        lots: [],
        teamId: null
      })
      setError(null)
      return
    }

    // Débounce pour éviter les appels multiples
    const timeoutId = setTimeout(() => {
      fetchBuildings(user.id, false)
    }, 100)

    return () => {
      clearTimeout(timeoutId)
    }
  }, [user?.id, fetchBuildings])

  // Nettoyage au démontage
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  // Refetch manuel
  const refetch = useCallback(() => {
    if (user?.id) {
      logger.info("🔄 [BUILDINGS] Manual refetch requested")
      lastUserIdRef.current = null
      setData({
        buildings: [],
        lots: [],
        teamId: null
      })
      loadingRef.current = false
      fetchBuildings(user.id, true)
    }
  }, [user?.id, fetchBuildings])

  return {
    data,
    loading,
    error,
    refetch,
    buildings: data.buildings,
    lots: data.lots
  }
}
