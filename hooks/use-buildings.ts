"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { useAuth } from "./use-auth"
import {
  createBuildingService,
  createTeamService,
  createLotService
} from "@/lib/services"
import { logger } from '@/lib/logger'

// Address record from centralized addresses table
export interface AddressRecord {
  id: string
  street?: string | null
  postal_code?: string | null
  city?: string | null
  formatted_address?: string | null
}

export interface Building {
  id: string
  name: string
  team_id: string
  lots?: Lot[]
  // Address from centralized addresses table
  address_record?: AddressRecord | null
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
  // Address from centralized addresses table (for independent lots)
  address_record?: AddressRecord | null
  [key: string]: unknown
}

/**
 * Helper to get formatted address text from address_record
 */
export function getAddressText(addressRecord?: AddressRecord | null): string {
  if (!addressRecord) return ''
  if (addressRecord.formatted_address) return addressRecord.formatted_address
  if (addressRecord.street || addressRecord.city) {
    const parts = [addressRecord.street, addressRecord.postal_code, addressRecord.city].filter(Boolean)
    return parts.join(', ')
  }
  return ''
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

      // 3. Récupérer TOUS les lots de l'équipe (incluant lots indépendants)
      logger.info("🏠 [BUILDINGS] Loading ALL lots for team (including independent lots)...")
      const lotService = createLotService()
      const lotsResult = await lotService.getLotsByTeam(teamId)

      if (!lotsResult.success || !lotsResult.data) {
        logger.error("❌ [BUILDINGS] Error fetching team lots")
        // Continue avec juste les buildings si erreur sur les lots
        if (mountedRef.current) {
          setData({
            buildings,
            lots: [],
            teamId
          })
          lastUserIdRef.current = userId
        }
        setLoading(false)
        return
      }

      const allTeamLots = lotsResult.data
      logger.info("🏠 [BUILDINGS] Loaded ALL team lots:", allTeamLots.length, "(including independent lots)")

      // 4. Séparer les lots et attacher aux buildings correspondants
      buildings.forEach((building: Building) => {
        building.lots = []
      })

      const allLotsForDisplay: Lot[] = []

      allTeamLots.forEach((lot: Lot) => {
        const lotWithBuilding = {
          ...lot,
          building_name: buildings.find((b: Building) => b.id === lot.building_id)?.name || null
        }

        if (lot.building_id) {
          // Lot lié à un immeuble - attacher au building
          const building = buildings.find((b: Building) => b.id === lot.building_id)
          if (building) {
            if (!building.lots) building.lots = []
            building.lots.push(lotWithBuilding)
          }
        }

        // Ajouter TOUS les lots (liés + indépendants) à la liste globale
        allLotsForDisplay.push(lotWithBuilding)
      })

      logger.info("🏢 [BUILDINGS] Lots by building:", allTeamLots.length - allLotsForDisplay.filter((l: Lot) => !l.building_id).length)
      logger.info("🏠 [BUILDINGS] Independent lots:", allLotsForDisplay.filter((l: Lot) => !l.building_id).length)
      logger.info("📊 [BUILDINGS] Total lots for display:", allLotsForDisplay.length)

      if (mountedRef.current) {
        setData({
          buildings,
          lots: allLotsForDisplay,  // ✅ TOUS les lots (liés + indépendants)
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
