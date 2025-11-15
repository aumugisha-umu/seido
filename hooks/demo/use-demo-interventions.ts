/**
 * Hook pour récupérer les interventions en mode démo
 * Filtre par rôle : team pour gestionnaire/admin, assignments pour locataire/prestataire
 */

'use client'

import { useDemoContext } from '@/lib/demo/demo-context'
import { useMemo } from 'react'

interface InterventionFilters {
  team_id?: string
  building_id?: string
  lot_id?: string
  status?: string
  type?: string
  urgency?: string
  search?: string
}

export function useDemoInterventions(filters?: InterventionFilters) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const interventions = useMemo(() => {
    if (!user) return []

    let results: any[] = []

    // Filtrage selon le rôle
    if (user.role === 'gestionnaire' || user.role === 'admin') {
      // Gestionnaire et Admin : Voir toutes les interventions de leur team
      const queryFilters: Record<string, any> = {
        team_id: filters?.team_id || user.team_id
      }

      if (filters?.building_id) queryFilters.building_id = filters.building_id
      if (filters?.lot_id) queryFilters.lot_id = filters.lot_id
      if (filters?.status) queryFilters.status = filters.status
      if (filters?.type) queryFilters.type = filters.type
      if (filters?.urgency) queryFilters.urgency = filters.urgency

      results = store.query('interventions', {
        filters: queryFilters,
        sort: { field: 'created_at', order: 'desc' }
      })
    } else if (user.role === 'locataire') {
      // Locataire : Voir uniquement les interventions assignées via intervention_assignments
      const assignments = store.query('intervention_assignments', {
        filters: { user_id: user.id }
      })

      const interventionIds = assignments.map((a: any) => a.intervention_id)
      results = interventionIds.map((id: string) => store.get('interventions', id)).filter(Boolean)

      // Appliquer les filtres additionnels
      if (filters?.building_id) {
        results = results.filter((i: any) => i.building_id === filters.building_id)
      }
      if (filters?.lot_id) {
        results = results.filter((i: any) => i.lot_id === filters.lot_id)
      }
      if (filters?.status) {
        results = results.filter((i: any) => i.status === filters.status)
      }
      if (filters?.type) {
        results = results.filter((i: any) => i.type === filters.type)
      }
      if (filters?.urgency) {
        results = results.filter((i: any) => i.urgency === filters.urgency)
      }

      // Trier par date
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (user.role === 'prestataire') {
      // Prestataire : Voir uniquement les interventions assignées
      const assignments = store.query('intervention_assignments', {
        filters: { user_id: user.id, role: 'prestataire' }
      })

      const interventionIds = assignments.map((a: any) => a.intervention_id)
      results = interventionIds.map((id: string) => store.get('interventions', id)).filter(Boolean)

      // Appliquer les filtres additionnels
      if (filters?.status) {
        results = results.filter((i: any) => i.status === filters.status)
      }
      if (filters?.type) {
        results = results.filter((i: any) => i.type === filters.type)
      }

      // Trier par date
      results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    }

    // Filtre de recherche (client-side)
    if (filters?.search) {
      const searchLower = filters.search.toLowerCase()
      results = results.filter((intervention: any) =>
        intervention.reference?.toLowerCase().includes(searchLower) ||
        intervention.title?.toLowerCase().includes(searchLower) ||
        intervention.description?.toLowerCase().includes(searchLower)
      )
    }

    return results
  }, [store, user, filters?.team_id, filters?.building_id, filters?.lot_id, filters?.status, filters?.type, filters?.urgency, filters?.search])

  return {
    interventions,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer une intervention spécifique
 */
export function useDemoIntervention(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const intervention = useMemo(() => {
    if (!interventionId || !user) return null

    const result = store.get('interventions', interventionId)
    if (!result) return null

    // Vérifier l'accès selon le rôle
    if (user.role === 'gestionnaire' || user.role === 'admin') {
      // Vérifier que l'intervention appartient à la team
      if (result.team_id !== user.team_id) return null
    } else if (user.role === 'locataire' || user.role === 'prestataire') {
      // Vérifier que l'utilisateur est assigné à cette intervention
      const assignment = store.query('intervention_assignments', {
        filters: { intervention_id: interventionId, user_id: user.id }
      })[0]

      if (!assignment) return null
    }

    return result
  }, [store, interventionId, user])

  // Récupérer le lot associé
  const lot = useMemo(() => {
    if (!intervention?.lot_id) return null
    return store.get('lots', intervention.lot_id)
  }, [store, intervention])

  // Récupérer l'immeuble associé
  const building = useMemo(() => {
    if (intervention?.building_id) {
      return store.get('buildings', intervention.building_id)
    }
    if (lot?.building_id) {
      return store.get('buildings', lot.building_id)
    }
    return null
  }, [store, intervention, lot])

  return {
    intervention,
    lot,
    building,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les assignments d'une intervention
 */
export function useDemoInterventionAssignments(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const assignments = useMemo(() => {
    if (!interventionId || !user) return []

    const assigns = store.query('intervention_assignments', {
      filters: { intervention_id: interventionId }
    })

    // Enrichir avec les users
    return assigns.map((a: any) => {
      const assignedUser = store.get('users', a.user_id)
      return {
        ...a,
        user: assignedUser
      }
    }).filter((a: any) => a.user)
  }, [store, interventionId, user])

  // Séparer par rôle
  const locataire = useMemo(() =>
    assignments.find((a: any) => a.role === 'locataire'),
    [assignments]
  )

  const prestataire = useMemo(() =>
    assignments.find((a: any) => a.role === 'prestataire'),
    [assignments]
  )

  const gestionnaire = useMemo(() =>
    assignments.find((a: any) => a.role === 'gestionnaire'),
    [assignments]
  )

  return {
    assignments,
    locataire,
    prestataire,
    gestionnaire,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les devis d'une intervention
 */
export function useDemoInterventionQuotes(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const quotes = useMemo(() => {
    if (!interventionId || !user) return []

    const quotesList = store.query('intervention_quotes', {
      filters: { intervention_id: interventionId },
      sort: { field: 'created_at', order: 'desc' }
    })

    // Enrichir avec les providers
    return quotesList.map((q: any) => {
      const provider = store.get('users', q.provider_id)
      return {
        ...q,
        provider
      }
    }).filter((q: any) => q.provider)
  }, [store, interventionId, user])

  return {
    quotes,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les commentaires d'une intervention
 */
export function useDemoInterventionComments(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const comments = useMemo(() => {
    if (!interventionId || !user) return []

    const commentsList = store.query('intervention_comments', {
      filters: { intervention_id: interventionId },
      sort: { field: 'created_at', order: 'asc' }
    })

    // Enrichir avec les users
    return commentsList.map((c: any) => {
      const commentUser = store.get('users', c.user_id)
      return {
        ...c,
        user: commentUser
      }
    }).filter((c: any) => c.user)
  }, [store, interventionId, user])

  return {
    comments,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les créneaux horaires d'une intervention
 */
export function useDemoInterventionTimeSlots(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const timeSlots = useMemo(() => {
    if (!interventionId || !user) return []

    return store.query('intervention_time_slots', {
      filters: { intervention_id: interventionId },
      sort: { field: 'start_time', order: 'asc' }
    })
  }, [store, interventionId, user])

  return {
    timeSlots,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les conversations d'une intervention
 */
export function useDemoInterventionConversations(interventionId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const threads = useMemo(() => {
    if (!interventionId || !user) return []

    return store.query('conversation_threads', {
      filters: { intervention_id: interventionId },
      sort: { field: 'updated_at', order: 'desc' }
    })
  }, [store, interventionId, user])

  return {
    threads,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les messages d'une conversation
 */
export function useDemoConversationMessages(threadId: string | null) {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const messages = useMemo(() => {
    if (!threadId || !user) return []

    const messagesList = store.query('conversation_messages', {
      filters: { thread_id: threadId },
      sort: { field: 'created_at', order: 'asc' }
    })

    // Enrichir avec les users
    return messagesList.map((m: any) => {
      const messageUser = store.get('users', m.user_id)
      return {
        ...m,
        user: messageUser
      }
    }).filter((m: any) => m.user)
  }, [store, threadId, user])

  return {
    messages,
    isLoading: false,
    error: null
  }
}

/**
 * Hook pour récupérer les statistiques des interventions
 */
export function useDemoInterventionStats() {
  const { store, getCurrentUser } = useDemoContext()

  const user = getCurrentUser()

  const stats = useMemo(() => {
    if (!user) {
      return {
        total: 0,
        demandes: 0,
        enCours: 0,
        planifiees: 0,
        cloturees: 0,
        annulees: 0
      }
    }

    let interventions: any[] = []

    // Récupérer les interventions selon le rôle
    if (user.role === 'gestionnaire' || user.role === 'admin') {
      interventions = store.query('interventions', {
        filters: { team_id: user.team_id }
      })
    } else {
      const assignments = store.query('intervention_assignments', {
        filters: { user_id: user.id }
      })
      const interventionIds = assignments.map((a: any) => a.intervention_id)
      interventions = interventionIds.map((id: string) => store.get('interventions', id)).filter(Boolean)
    }

    return {
      total: interventions.length,
      demandes: interventions.filter((i: any) => i.status === 'demande').length,
      enCours: interventions.filter((i: any) => i.status === 'en_cours').length,
      planifiees: interventions.filter((i: any) => i.status === 'planifiee').length,
      cloturees: interventions.filter((i: any) => ['cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire'].includes(i.status)).length,
      annulees: interventions.filter((i: any) => i.status === 'annulee').length
    }
  }, [store, user])

  return {
    stats,
    isLoading: false,
    error: null
  }
}
