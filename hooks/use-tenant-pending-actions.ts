"use client"

import { useState, useEffect } from 'react'
import { createBrowserInterventionService } from '@/lib/services'
import { useResolvedUserId } from './use-resolved-user-id'
import { logger, logError } from '@/lib/logger'
const interventionService = createBrowserInterventionService()

interface PendingAction {
  id: string
  type: string
  title: string
  description?: string
  status: string
  reference?: string
  priority?: string
  location?: {
    building?: string
    lot?: string
  }
  contact?: {
    name: string
    role: string
  }
  metadata?: Record<string, any>
  actionUrl: string
}

interface UseTenantPendingActionsReturn {
  pendingActions: PendingAction[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

export function useTenantPendingActions(userId: string): UseTenantPendingActionsReturn {
  const resolvedUserId = useResolvedUserId(userId)
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingActions = async () => {
    // Attendre la résolution du user ID (JWT → UUID)
    if (!resolvedUserId) {
      setLoading(false)
      return
    }

    try {
      setError(null)

      logger.info('📋 [useTenantPendingActions] Fetching pending actions', {
        originalUserId: userId,
        resolvedUserId
      })

      // Récupérer les interventions du locataire avec l'ID résolu
      const interventions = await interventionService.getByTenantId(resolvedUserId)

      // Filtrer les interventions nécessitant une action du locataire
      const actionsRequirantes = interventions.filter((intervention: unknown) => {
        // Statuts nécessitant une action du locataire
        return [
          'planification',     // Renseigner ses disponibilités
          'quote_submitted',   // Consulter/valider les devis reçus
          'demande',          // Suivi de la demande initiale
          'planifiee',        // Intervention planifiée - être informé
          'en_cours'          // Intervention en cours - suivi
        ].includes(intervention.status)
      })

      // Convertir en format PendingAction
      const actions: PendingAction[] = actionsRequirantes.map((intervention: unknown) => {
        let description = ''
        let actionUrl = `/locataire/interventions/${intervention.id}`

        // Descriptions spécifiques selon le statut
        switch (intervention.status) {
          case 'planification':
            description = 'Veuillez renseigner vos disponibilités pour planifier l\'intervention'
            break
          case 'quote_submitted':
            description = 'Un devis a été soumis pour votre intervention'
            break
          case 'demande':
            description = 'Votre demande est en cours de traitement'
            break
          case 'planifiee':
            description = 'Votre intervention a été planifiée'
            break
          case 'en_cours':
            description = 'L\'intervention est actuellement en cours'
            break
          default:
            description = 'Action requise pour cette intervention'
        }

        return {
          id: intervention.id,
          type: 'intervention',
          title: intervention.title || 'Intervention',
          description,
          status: intervention.status,
          reference: intervention.reference,
          priority: intervention.priority,
          location: {
            building: intervention.lot?.building?.name,
            lot: intervention.lot?.reference || intervention.lot?.apartment_number
          },
          contact: intervention.assigned_contact ? {
            name: intervention.assigned_contact.name,
            role: 'Prestataire'
          } : undefined,
          actionUrl
        }
      })

      setPendingActions(actions)
    } catch (err) {
      logger.error('Error fetching tenant pending actions:', err)
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  const refresh = async () => {
    setLoading(true)
    await fetchPendingActions()
  }

  useEffect(() => {
    fetchPendingActions()
  }, [resolvedUserId])

  return {
    pendingActions,
    loading,
    error,
    refresh
  }
}
