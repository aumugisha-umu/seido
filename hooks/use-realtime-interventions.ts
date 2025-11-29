'use client'

/**
 * 🔧 USE REALTIME INTERVENTIONS - Consumer Hook
 *
 * Hook consumer pour les interventions utilisant le RealtimeProvider centralisé.
 * Écoute les updates sur:
 * - interventions (status changes)
 * - intervention_quotes (devis prestataires)
 * - intervention_time_slots (créneaux proposés/confirmés)
 *
 * @see contexts/realtime-context.tsx
 * @created 2025-11-28
 */

import { useEffect, useCallback } from 'react'
import { useRealtimeOptional } from '@/contexts/realtime-context'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// ============================================================================
// Types
// ============================================================================

type DbIntervention = Database['public']['Tables']['interventions']['Row']
type DbQuote = Database['public']['Tables']['intervention_quotes']['Row']
type DbTimeSlot = Database['public']['Tables']['intervention_time_slots']['Row']

/** Callbacks pour les événements intervention */
interface InterventionCallbacks {
  onUpdate?: (intervention: DbIntervention) => void
}

/** Callbacks pour les événements quotes */
interface QuoteCallbacks {
  onInsert?: (quote: DbQuote) => void
  onUpdate?: (quote: DbQuote) => void
  onDelete?: (quote: DbQuote) => void
}

/** Callbacks pour les événements time slots */
interface TimeSlotCallbacks {
  onInsert?: (slot: DbTimeSlot) => void
  onUpdate?: (slot: DbTimeSlot) => void
  onDelete?: (slot: DbTimeSlot) => void
}

/** Options du hook */
interface UseRealtimeInterventionsOptions {
  /** ID de l'intervention à écouter (optionnel, pour filtrage côté client) */
  interventionId?: string
  /** Callbacks pour les interventions */
  interventionCallbacks?: InterventionCallbacks
  /** Callbacks pour les quotes */
  quoteCallbacks?: QuoteCallbacks
  /** Callbacks pour les time slots */
  timeSlotCallbacks?: TimeSlotCallbacks
  /** Désactiver le hook */
  enabled?: boolean
}

/** Retour du hook */
interface UseRealtimeInterventionsReturn {
  isConnected: boolean
}

// ============================================================================
// Hook Principal
// ============================================================================

/**
 * Hook pour écouter les mises à jour d'interventions en temps réel.
 *
 * @example
 * ```tsx
 * // Écouter une intervention spécifique
 * const { isConnected } = useRealtimeInterventions({
 *   interventionId: intervention.id,
 *   interventionCallbacks: {
 *     onUpdate: (updated) => {
 *       if (updated.status !== intervention.status) {
 *         toast.info(`Status changé: ${updated.status}`)
 *         setIntervention(updated)
 *       }
 *     }
 *   },
 *   quoteCallbacks: {
 *     onInsert: (quote) => {
 *       toast.success('Nouveau devis reçu!')
 *       setQuotes(prev => [...prev, quote])
 *     }
 *   }
 * })
 *
 * // Écouter toutes les interventions (dashboard)
 * const { isConnected } = useRealtimeInterventions({
 *   interventionCallbacks: {
 *     onUpdate: (intervention) => {
 *       setInterventions(prev =>
 *         prev.map(i => i.id === intervention.id ? intervention : i)
 *       )
 *     }
 *   }
 * })
 * ```
 */
export function useRealtimeInterventions(
  options: UseRealtimeInterventionsOptions = {}
): UseRealtimeInterventionsReturn {
  const {
    interventionId,
    interventionCallbacks,
    quoteCallbacks,
    timeSlotCallbacks,
    enabled = true
  } = options

  const realtimeContext = useRealtimeOptional()

  // ────────────────────────────────────────────────────────────────────────
  // Subscribe to interventions updates
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !realtimeContext || !interventionCallbacks?.onUpdate) return

    const { subscribe } = realtimeContext

    const unsubscribe = subscribe<DbIntervention>({
      table: 'interventions',
      event: 'UPDATE', // On écoute uniquement les UPDATEs (créations via Server Actions)
      callback: (payload: RealtimePostgresChangesPayload<DbIntervention>) => {
        const { new: newRecord } = payload

        if (!newRecord) return

        // Filtrage côté client si interventionId spécifié
        if (interventionId && newRecord.id !== interventionId) return

        interventionCallbacks.onUpdate?.(newRecord as DbIntervention)
      }
    })

    return unsubscribe
  }, [enabled, realtimeContext, interventionId, interventionCallbacks])

  // ────────────────────────────────────────────────────────────────────────
  // Subscribe to quotes
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !realtimeContext) return
    if (!quoteCallbacks?.onInsert && !quoteCallbacks?.onUpdate && !quoteCallbacks?.onDelete) return

    const { subscribe } = realtimeContext

    const unsubscribe = subscribe<DbQuote>({
      table: 'intervention_quotes',
      event: '*',
      callback: (payload: RealtimePostgresChangesPayload<DbQuote>) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        // Filtrage côté client si interventionId spécifié
        if (interventionId) {
          const recordToCheck = newRecord || oldRecord
          if (recordToCheck && 'intervention_id' in recordToCheck) {
            if (recordToCheck.intervention_id !== interventionId) return
          }
        }

        switch (eventType) {
          case 'INSERT':
            if (newRecord && quoteCallbacks?.onInsert) {
              quoteCallbacks.onInsert(newRecord as DbQuote)
            }
            break

          case 'UPDATE':
            if (newRecord && quoteCallbacks?.onUpdate) {
              quoteCallbacks.onUpdate(newRecord as DbQuote)
            }
            break

          case 'DELETE':
            if (oldRecord && quoteCallbacks?.onDelete) {
              quoteCallbacks.onDelete(oldRecord as DbQuote)
            }
            break
        }
      }
    })

    return unsubscribe
  }, [enabled, realtimeContext, interventionId, quoteCallbacks])

  // ────────────────────────────────────────────────────────────────────────
  // Subscribe to time slots
  // ────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!enabled || !realtimeContext) return
    if (!timeSlotCallbacks?.onInsert && !timeSlotCallbacks?.onUpdate && !timeSlotCallbacks?.onDelete) return

    const { subscribe } = realtimeContext

    const unsubscribe = subscribe<DbTimeSlot>({
      table: 'intervention_time_slots',
      event: '*',
      callback: (payload: RealtimePostgresChangesPayload<DbTimeSlot>) => {
        const { eventType, new: newRecord, old: oldRecord } = payload

        // Filtrage côté client si interventionId spécifié
        if (interventionId) {
          const recordToCheck = newRecord || oldRecord
          if (recordToCheck && 'intervention_id' in recordToCheck) {
            if (recordToCheck.intervention_id !== interventionId) return
          }
        }

        switch (eventType) {
          case 'INSERT':
            if (newRecord && timeSlotCallbacks?.onInsert) {
              timeSlotCallbacks.onInsert(newRecord as DbTimeSlot)
            }
            break

          case 'UPDATE':
            if (newRecord && timeSlotCallbacks?.onUpdate) {
              timeSlotCallbacks.onUpdate(newRecord as DbTimeSlot)
            }
            break

          case 'DELETE':
            if (oldRecord && timeSlotCallbacks?.onDelete) {
              timeSlotCallbacks.onDelete(oldRecord as DbTimeSlot)
            }
            break
        }
      }
    })

    return unsubscribe
  }, [enabled, realtimeContext, interventionId, timeSlotCallbacks])

  return {
    isConnected: realtimeContext?.isConnected ?? false
  }
}

// ============================================================================
// Convenience Hooks
// ============================================================================

/**
 * Hook simplifié pour écouter uniquement les mises à jour de status.
 *
 * @example
 * ```tsx
 * useInterventionStatusUpdates(intervention.id, (updated) => {
 *   if (updated.status === 'approuvee') {
 *     toast.success('Intervention approuvée!')
 *   }
 * })
 * ```
 */
export function useInterventionStatusUpdates(
  interventionId: string | undefined,
  onStatusUpdate: (intervention: DbIntervention) => void
) {
  return useRealtimeInterventions({
    interventionId,
    interventionCallbacks: {
      onUpdate: onStatusUpdate
    },
    enabled: !!interventionId
  })
}

/**
 * Hook simplifié pour écouter les nouveaux devis.
 *
 * @example
 * ```tsx
 * useNewQuotes(intervention.id, (quote) => {
 *   setQuotes(prev => [...prev, quote])
 *   toast.success(`Devis reçu de ${quote.provider_id}`)
 * })
 * ```
 */
export function useNewQuotes(
  interventionId: string | undefined,
  onNewQuote: (quote: DbQuote) => void
) {
  return useRealtimeInterventions({
    interventionId,
    quoteCallbacks: {
      onInsert: onNewQuote
    },
    enabled: !!interventionId
  })
}

/**
 * Hook simplifié pour écouter les créneaux confirmés.
 *
 * @example
 * ```tsx
 * useConfirmedTimeSlots(intervention.id, (slot) => {
 *   if (slot.status === 'confirmed') {
 *     toast.success('Créneau confirmé!')
 *     setConfirmedSlot(slot)
 *   }
 * })
 * ```
 */
export function useConfirmedTimeSlots(
  interventionId: string | undefined,
  onSlotUpdate: (slot: DbTimeSlot) => void
) {
  return useRealtimeInterventions({
    interventionId,
    timeSlotCallbacks: {
      onInsert: onSlotUpdate,
      onUpdate: onSlotUpdate
    },
    enabled: !!interventionId
  })
}
