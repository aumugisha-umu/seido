/**
 * Hook pour récupérer les immeubles en mode démo
 * Filtre par team_id
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface BuildingFilters {
  team_id?: string
  city?: string
  country?: string
  search?: string
}

export function useDemoBuildings(filters?: BuildingFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const buildings = useMemo(() => {
    if (!user) return []

    // Construire les filtres
    const queryFilters: Record<string, any> = {}

    // Filtrer par team_id (par défaut, team de l'utilisateur)
    queryFilters.team_id = filters?.team_id || user.team_id

    // Filtres optionnels
    if (filters?.city) {
      queryFilters.city = filters.city
    }

    if (filters?.country) {
      queryFilters.country = filters.country
    }

    // Récupérer les immeubles
    let results = store.query('buildings', {
      filters: queryFilters,
      sort: { field: 'created_at', order: 'desc' }
    })

    // Filtre de recherche (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      results = results.filter((building: any) =>
        building.reference?.toLowerCase().includes(searchLower) ||
        building.name?.toLowerCase().includes(searchLower) ||
        building.address?.toLowerCase().includes(searchLower) ||
        building.city?.toLowerCase().includes(searchLower)
      )
    }

    return results
  }, [store, user, filters?.team_id, filters?.city, filters?.country, filters?.search])

  return {
    buildings,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer un immeuble spécifique
 */
export function useDemoBuilding(buildingId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const building = useMemo(() => {
    if (!buildingId || !user) return null

    const result = store.get('buildings', buildingId)

    // Vérifier que l'utilisateur a accès à cet immeuble (même team)
    if (result && result.team_id !== user.team_id) {
      return null
    }

    return result
  }, [store, buildingId, user])

  return {
    building,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les lots d'un immeuble
 */
export function useDemoBuildingLots(buildingId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const lots = useMemo(() => {
    if (!buildingId || !user) return []

    return store.query('lots', {
      filters: { building_id: buildingId },
      sort: { field: 'reference', order: 'asc' }
    })
  }, [store, buildingId, user])

  return {
    lots,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les contacts d'un immeuble
 */
export function useDemoBuildingContacts(buildingId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const contacts = useMemo(() => {
    if (!buildingId || !user) return []

    // Récupérer les building_contacts
    const buildingContacts = store.query('building_contacts', {
      filters: { building_id: buildingId }
    })

    // Récupérer les users associés
    const users = buildingContacts.map((bc: any) =>
      store.get('users', bc.user_id)
    ).filter(Boolean)

    return users
  }, [store, buildingId, user])

  return {
    contacts,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques d'un immeuble
 */
export function useDemoBuildingStats(buildingId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!buildingId || !user) {
      return {
        totalLots: 0,
        totalInterventions: 0,
        activeInterventions: 0,
        totalContacts: 0
      }
    }

    // Compter les lots
    const totalLots = store.count('lots', { building_id: buildingId })

    // Compter les interventions
    const totalInterventions = store.count('interventions', { building_id: buildingId })

    // Compter les interventions actives
    const activeInterventions = store.query('interventions', {
      filters: { building_id: buildingId }
    }).filter((i: any) =>
      !['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
    ).length

    // Compter les contacts
    const totalContacts = store.count('building_contacts', { building_id: buildingId })

    return {
      totalLots,
      totalInterventions,
      activeInterventions,
      totalContacts
    }
  }, [store, buildingId, user])

  return {
    stats,
    isLoading: false,
    error: null
  }
}
