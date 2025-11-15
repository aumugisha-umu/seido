/**
 * Hook pour récupérer les lots en mode démo
 * Filtre par team_id et building_id
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface LotFilters {
  team_id?: string
  building_id?: string
  category?: string
  search?: string
}

export function useDemoLots(filters?: LotFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const lots = useMemo(() => {
    if (!user) return []

    // Construire les filtres
    const queryFilters: Record<string, any> = {}

    // Filtrer par team_id (par défaut, team de l'utilisateur)
    queryFilters.team_id = filters?.team_id || user.team_id

    // Filtres optionnels
    if (filters?.building_id) {
      queryFilters.building_id = filters.building_id
    }

    if (filters?.category) {
      queryFilters.category = filters.category
    }

    // Récupérer les lots
    let results = store.query('lots', {
      filters: queryFilters,
      sort: { field: 'reference', order: 'asc' }
    })

    // Filtre de recherche (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      results = results.filter((lot: any) =>
        lot.reference?.toLowerCase().includes(searchLower) ||
        lot.name?.toLowerCase().includes(searchLower) ||
        lot.floor?.toLowerCase().includes(searchLower)
      )
    }

    return results
  }, [store, user, filters?.team_id, filters?.building_id, filters?.category, filters?.search])

  return {
    lots,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer un lot spécifique
 */
export function useDemoLot(lotId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const lot = useMemo(() => {
    if (!lotId || !user) return null

    const result = store.get('lots', lotId)

    // Vérifier que l'utilisateur a accès à ce lot (même team)
    if (result && result.team_id !== user.team_id) {
      return null
    }

    return result
  }, [store, lotId, user])

  // Récupérer l'immeuble associé
  const building = useMemo(() => {
    if (!lot?.building_id) return null
    return store.get('buildings', lot.building_id)
  }, [store, lot])

  return {
    lot,
    building,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les lots d'un utilisateur (locataire)
 */
export function useDemoUserLots(userId?: string) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()
  const targetUserId = userId || user?.id

  const lots = useMemo(() => {
    if (!targetUserId) return []

    // Récupérer les lot_contacts de cet utilisateur
    const lotContacts = store.query('lot_contacts', {
      filters: { user_id: targetUserId }
    })

    // Récupérer les lots associés
    const userLots = lotContacts.map((lc: any) =>
      store.get('lots', lc.lot_id)
    ).filter(Boolean)

    return userLots
  }, [store, targetUserId])

  return {
    lots,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les contacts d'un lot
 */
export function useDemoLotContacts(lotId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const contacts = useMemo(() => {
    if (!lotId || !user) return []

    // Récupérer les lot_contacts
    const lotContacts = store.query('lot_contacts', {
      filters: { lot_id: lotId }
    })

    // Récupérer les users associés avec leurs rôles
    const users = lotContacts.map((lc: any) => {
      const contactUser = store.get('users', lc.user_id)
      if (!contactUser) return null

      return {
        ...contactUser,
        contact_role: lc.role, // 'proprietaire', 'locataire', 'gestionnaire'
        contact_id: lc.id
      }
    }).filter(Boolean)

    return users
  }, [store, lotId, user])

  // Séparer par type de contact
  const proprietaires = useMemo(() =>
    contacts.filter((c: any) => c.contact_role === 'proprietaire'),
    [contacts]
  )

  const locataires = useMemo(() =>
    contacts.filter((c: any) => c.contact_role === 'locataire'),
    [contacts]
  )

  const gestionnaires = useMemo(() =>
    contacts.filter((c: any) => c.contact_role === 'gestionnaire'),
    [contacts]
  )

  return {
    contacts,
    proprietaires,
    locataires,
    gestionnaires,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les contacts hérités d'un lot (depuis l'immeuble)
 */
export function useDemoLotInheritedContacts(lotId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const inheritedContacts = useMemo(() => {
    if (!lotId || !user) return []

    // Récupérer le lot
    const lot = store.get('lots', lotId)
    if (!lot?.building_id) return []

    // Récupérer les building_contacts
    const buildingContacts = store.query('building_contacts', {
      filters: { building_id: lot.building_id }
    })

    // Récupérer les users associés
    const users = buildingContacts.map((bc: any) => {
      const contactUser = store.get('users', bc.user_id)
      if (!contactUser) return null

      return {
        ...contactUser,
        contact_role: bc.role,
        contact_id: bc.id,
        inherited: true
      }
    }).filter(Boolean)

    return users
  }, [store, lotId, user])

  return {
    inheritedContacts,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques d'un lot
 */
export function useDemoLotStats(lotId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!lotId || !user) {
      return {
        totalInterventions: 0,
        activeInterventions: 0,
        totalContacts: 0,
        surface: null
      }
    }

    const lot = store.get('lots', lotId)

    // Compter les interventions
    const totalInterventions = store.count('interventions', { lot_id: lotId })

    // Compter les interventions actives
    const activeInterventions = store.query('interventions', {
      filters: { lot_id: lotId }
    }).filter((i: any) =>
      !['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
    ).length

    // Compter les contacts
    const totalContacts = store.count('lot_contacts', { lot_id: lotId })

    return {
      totalInterventions,
      activeInterventions,
      totalContacts,
      surface: lot?.surface || null
    }
  }, [store, lotId, user])

  return {
    stats,
    isLoading: false,
    error: null
  }
}
