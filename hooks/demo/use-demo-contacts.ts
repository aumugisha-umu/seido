/**
 * Hook pour récupérer les contacts en mode démo
 * Filtre par team_id et rôle
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface ContactFilters {
  team_id?: string
  role?: 'gestionnaire' | 'locataire' | 'prestataire' | 'admin'
  search?: string
}

export function useDemoContacts(filters?: ContactFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const contacts = useMemo(() => {
    if (!user) return []

    // Construire les filtres
    const queryFilters: Record<string, any> = {
      team_id: filters?.team_id || user.team_id
    }

    // Filtrer par rôle si spécifié
    if (filters?.role) {
      queryFilters.role = filters.role
    }

    // Récupérer les contacts
    let results = store.query('users', {
      filters: queryFilters,
      sort: { field: 'last_name', order: 'asc' }
    })

    // Filtre de recherche (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      results = results.filter((contact: any) =>
        contact.first_name?.toLowerCase().includes(searchLower) ||
        contact.last_name?.toLowerCase().includes(searchLower) ||
        contact.email?.toLowerCase().includes(searchLower) ||
        contact.phone?.toLowerCase().includes(searchLower)
      )
    }

    return results
  }, [store, user, filters?.team_id, filters?.role, filters?.search])

  return {
    contacts,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les contacts par rôle
 */
export function useDemoContactsByRole() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const contactsByRole = useMemo(() => {
    if (!user) {
      return {
        gestionnaires: [],
        locataires: [],
        prestataires: [],
        admins: []
      }
    }

    const allContacts = store.query('users', {
      filters: { team_id: user.team_id },
      sort: { field: 'last_name', order: 'asc' }
    })

    return {
      gestionnaires: allContacts.filter((c: any) => c.role === 'gestionnaire'),
      locataires: allContacts.filter((c: any) => c.role === 'locataire'),
      prestataires: allContacts.filter((c: any) => c.role === 'prestataire'),
      admins: allContacts.filter((c: any) => c.role === 'admin')
    }
  }, [store, user])

  return {
    ...contactsByRole,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer un contact spécifique
 */
export function useDemoContact(contactId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const contact = useMemo(() => {
    if (!contactId || !user) return null

    const result = store.get('users', contactId)

    // Vérifier que le contact appartient à la même team
    if (result && result.team_id !== user.team_id) {
      return null
    }

    return result
  }, [store, contactId, user])

  return {
    contact,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les lots d'un contact
 */
export function useDemoContactLots(contactId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const lots = useMemo(() => {
    if (!contactId || !user) return []

    // Récupérer les lot_contacts de ce contact
    const lotContacts = store.query('lot_contacts', {
      filters: { user_id: contactId }
    })

    // Récupérer les lots avec leur rôle
    const contactLots = lotContacts.map((lc: any) => {
      const lot = store.get('lots', lc.lot_id)
      if (!lot) return null

      return {
        ...lot,
        contact_role: lc.role, // 'proprietaire', 'locataire', 'gestionnaire'
        contact_id: lc.id
      }
    }).filter(Boolean)

    return contactLots
  }, [store, contactId, user])

  return {
    lots,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les immeubles d'un contact
 */
export function useDemoContactBuildings(contactId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const buildings = useMemo(() => {
    if (!contactId || !user) return []

    // Récupérer les building_contacts de ce contact
    const buildingContacts = store.query('building_contacts', {
      filters: { user_id: contactId }
    })

    // Récupérer les immeubles avec leur rôle
    const contactBuildings = buildingContacts.map((bc: any) => {
      const building = store.get('buildings', bc.building_id)
      if (!building) return null

      return {
        ...building,
        contact_role: bc.role, // 'proprietaire', 'gestionnaire', 'syndic'
        contact_id: bc.id
      }
    }).filter(Boolean)

    return contactBuildings
  }, [store, contactId, user])

  return {
    buildings,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les interventions d'un contact
 */
export function useDemoContactInterventions(contactId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const interventions = useMemo(() => {
    if (!contactId || !user) return []

    // Récupérer les assignments de ce contact
    const assignments = store.query('intervention_assignments', {
      filters: { user_id: contactId }
    })

    // Récupérer les interventions
    const interventionIds = assignments.map((a: any) => a.intervention_id)
    const contactInterventions = interventionIds.map((id: string) => {
      const intervention = store.get('interventions', id)
      if (!intervention) return null

      // Trouver le rôle de ce contact dans cette intervention
      const assignment = assignments.find((a: any) => a.intervention_id === id)

      return {
        ...intervention,
        assignment_role: assignment?.role
      }
    }).filter(Boolean)

    // Trier par date
    contactInterventions.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return contactInterventions
  }, [store, contactId, user])

  return {
    interventions,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques d'un contact
 */
export function useDemoContactStats(contactId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!contactId || !user) {
      return {
        totalLots: 0,
        totalBuildings: 0,
        totalInterventions: 0,
        activeInterventions: 0
      }
    }

    // Compter les lots
    const totalLots = store.count('lot_contacts', { user_id: contactId })

    // Compter les immeubles
    const totalBuildings = store.count('building_contacts', { user_id: contactId })

    // Compter les interventions
    const assignments = store.query('intervention_assignments', {
      filters: { user_id: contactId }
    })
    const totalInterventions = assignments.length

    // Compter les interventions actives
    const interventionIds = assignments.map((a: any) => a.intervention_id)
    const interventions = interventionIds.map((id: string) => store.get('interventions', id)).filter(Boolean)
    const activeInterventions = interventions.filter((i: any) =>
      !['cloturee_par_gestionnaire', 'annulee'].includes(i.status)
    ).length

    return {
      totalLots,
      totalBuildings,
      totalInterventions,
      activeInterventions
    }
  }, [store, contactId, user])

  return {
    stats,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les invitations en attente
 */
export function useDemoPendingInvitations() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const invitations = useMemo(() => {
    if (!user || user.role !== 'gestionnaire') return []

    return store.query('user_invitations', {
      filters: { team_id: user.team_id, status: 'pending' },
      sort: { field: 'created_at', order: 'desc' }
    })
  }, [store, user])

  return {
    invitations,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les entreprises (prestataires)
 */
export function useDemoCompanies() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const companies = useMemo(() => {
    if (!user) return []

    return store.query('companies', {
      filters: { team_id: user.team_id },
      sort: { field: 'name', order: 'asc' }
    })
  }, [store, user])

  return {
    companies,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les membres d'une entreprise
 */
export function useDemoCompanyMembers(companyId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const members = useMemo(() => {
    if (!companyId || !user) return []

    // Récupérer les company_members
    const companyMembers = store.query('company_members', {
      filters: { company_id: companyId }
    })

    // Récupérer les users
    const memberUsers = companyMembers.map((cm: any) => {
      const memberUser = store.get('users', cm.user_id)
      if (!memberUser) return null

      return {
        ...memberUser,
        membership_role: cm.role, // 'owner', 'member'
        membership_id: cm.id
      }
    }).filter(Boolean)

    return memberUsers
  }, [store, companyId, user])

  return {
    members,
    isLoading: false,
    error: null
  }
}
