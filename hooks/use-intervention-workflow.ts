'use client'

/**
 * useInterventionWorkflow Hook
 * Custom hook for managing intervention workflow with optimistic updates
 * Handles all 11 status transitions and workflow operations
 */

import { useState, useEffect, useCallback, useOptimistic } from 'react'
import { toast } from 'sonner'
import type {
  Tables,
  Enums
} from '@/lib/database.types'

// Import Server Actions
import {
  getInterventionAction,
  approveInterventionAction,
  rejectInterventionAction,
  requestQuoteAction,
  startPlanningAction,
  confirmScheduleAction,
  // startInterventionAction, // DEPRECATED: 'en_cours' status removed from workflow
  completeByProviderAction,
  validateByTenantAction,
  finalizeByManagerAction,
  cancelInterventionAction,
  assignUserAction,
  unassignUserAction,
  proposeTimeSlotsAction,
  selectTimeSlotAction
} from '@/app/actions/intervention-actions'

// Type aliases
type Intervention = Tables<'interventions'>
type InterventionStatus = Enums<'intervention_status'>
type TimeSlotInput = {
  date: string
  start_time: string
  end_time: string
  duration_minutes?: number
}

// Hook return type
interface UseInterventionWorkflowReturn {
  // Data
  intervention: Intervention | null
  loading: boolean
  error: string | null

  // Actions
  approve: (comment?: string) => Promise<void>
  reject: (reason: string) => Promise<void>
  requestQuote: (providerId: string) => Promise<void>
  startPlanning: () => Promise<void>
  confirmSchedule: (slotId: string) => Promise<void>
  startWork: () => Promise<void>
  completeWork: (report?: string) => Promise<void>
  validateWork: (satisfaction?: number) => Promise<void>
  finalize: (finalCost?: number) => Promise<void>
  cancel: (reason: string) => Promise<void>

  // Assignment
  assignUser: (userId: string, role: 'gestionnaire' | 'prestataire') => Promise<void>
  unassignUser: (userId: string, role: string) => Promise<void>

  // Time slots
  proposeSlots: (slots: TimeSlotInput[]) => Promise<void>
  selectSlot: (slotId: string) => Promise<void>

  // Utils
  canTransitionTo: (nextStatus: InterventionStatus) => boolean
  isTransitioning: boolean
}

// Status transition rules
// Note: 'en_cours' is DEPRECATED - interventions go directly from 'planifiee' to 'cloturee_par_*'
const ALLOWED_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  'demande': ['approuvee', 'rejetee'],
  'rejetee': [],
  'approuvee': ['demande_de_devis', 'planification', 'annulee'],
  'demande_de_devis': ['planification', 'annulee'],
  'planification': ['planifiee', 'annulee'],
  'planifiee': ['cloturee_par_prestataire', 'cloturee_par_gestionnaire', 'annulee'], // Direct to closure
  'en_cours': ['cloturee_par_prestataire', 'annulee'], // DEPRECATED: kept for backward compatibility
  'cloturee_par_prestataire': ['cloturee_par_locataire', 'cloturee_par_gestionnaire'], // Manager can finalize directly
  'cloturee_par_locataire': ['cloturee_par_gestionnaire'],
  'cloturee_par_gestionnaire': [],
  'annulee': []
}

export function useInterventionWorkflow(interventionId: string): UseInterventionWorkflowReturn {
  // State
  const [intervention, setIntervention] = useState<Intervention | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Optimistic updates for status changes
  const [optimisticIntervention, addOptimisticUpdate] = useOptimistic(
    intervention,
    (state, update: Partial<Intervention>) => {
      if (!state) return state
      return { ...state, ...update }
    }
  )

  // Fetch intervention on mount or ID change
  useEffect(() => {
    let cancelled = false

    const fetchIntervention = async () => {
      if (!interventionId) {
        setError('No intervention ID provided')
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const result = await getInterventionAction(interventionId)

        if (!cancelled) {
          if (result.success && result.data) {
            setIntervention(result.data)
            setError(null)
          } else {
            setError(result.error || 'Failed to fetch intervention')
            setIntervention(null)
          }
        }
      } catch (err) {
        if (!cancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
          setError(errorMessage)
          toast.error('Failed to load intervention')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchIntervention()

    return () => {
      cancelled = true
    }
  }, [interventionId])

  // Check if transition to a status is allowed
  const canTransitionTo = useCallback((nextStatus: InterventionStatus): boolean => {
    if (!intervention) return false
    const allowedStatuses = ALLOWED_TRANSITIONS[intervention.status]
    return allowedStatuses.includes(nextStatus)
  }, [intervention])

  // Generic action wrapper with optimistic updates
  const executeAction = useCallback(async (
    action: () => Promise<any>,
    optimisticStatus?: InterventionStatus,
    successMessage?: string,
    errorMessage?: string
  ) => {
    if (isTransitioning) {
      toast.warning('Another action is in progress')
      return
    }

    try {
      setIsTransitioning(true)
      setError(null)

      // Apply optimistic update if status provided
      if (optimisticStatus && intervention) {
        addOptimisticUpdate({ status: optimisticStatus })
      }

      const result = await action()

      if (result.success) {
        if (result.data) {
          setIntervention(result.data)
        }
        if (successMessage) {
          toast.success(successMessage)
        }
      } else {
        // Revert optimistic update on error
        if (intervention) {
          setIntervention(intervention)
        }
        const message = result.error || errorMessage || 'Action failed'
        setError(message)
        toast.error(message)
      }
    } catch (err) {
      // Revert optimistic update on error
      if (intervention) {
        setIntervention(intervention)
      }
      const message = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(message)
      toast.error(errorMessage || message)
    } finally {
      setIsTransitioning(false)
    }
  }, [intervention, isTransitioning, addOptimisticUpdate])

  // Workflow actions
  const approve = useCallback(async (comment?: string) => {
    if (!canTransitionTo('approuvee')) {
      toast.error('Cannot approve intervention in current status')
      return
    }
    await executeAction(
      () => approveInterventionAction(interventionId, comment),
      'approuvee',
      'Intervention approved successfully',
      'Failed to approve intervention'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const reject = useCallback(async (reason: string) => {
    if (!reason || reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters)')
      return
    }
    if (!canTransitionTo('rejetee')) {
      toast.error('Cannot reject intervention in current status')
      return
    }
    await executeAction(
      () => rejectInterventionAction(interventionId, reason),
      'rejetee',
      'Intervention rejected',
      'Failed to reject intervention'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const requestQuote = useCallback(async (providerId: string) => {
    if (!providerId) {
      toast.error('Please select a provider')
      return
    }
    if (!canTransitionTo('demande_de_devis')) {
      toast.error('Cannot request quote in current status')
      return
    }
    await executeAction(
      () => requestQuoteAction(interventionId, providerId),
      'demande_de_devis',
      'Quote requested successfully',
      'Failed to request quote'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const startPlanning = useCallback(async () => {
    if (!canTransitionTo('planification')) {
      toast.error('Cannot start planning in current status')
      return
    }
    await executeAction(
      () => startPlanningAction(interventionId),
      'planification',
      'Planning started',
      'Failed to start planning'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const confirmSchedule = useCallback(async (slotId: string) => {
    if (!slotId) {
      toast.error('Please select a time slot')
      return
    }
    if (!canTransitionTo('planifiee')) {
      toast.error('Cannot confirm schedule in current status')
      return
    }
    await executeAction(
      () => confirmScheduleAction(interventionId, slotId),
      'planifiee',
      'Schedule confirmed',
      'Failed to confirm schedule'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const completeWork = useCallback(async (report?: string) => {
    // Allow completion from both 'planifiee' (new flow) and 'en_cours' (deprecated legacy flow)
    const currentStatus = intervention?.status
    if (currentStatus !== 'planifiee' && currentStatus !== 'en_cours') {
      toast.error('Cannot complete work in current status')
      return
    }
    await executeAction(
      () => completeByProviderAction(interventionId, report),
      'cloturee_par_prestataire',
      'Work completed',
      'Failed to complete work'
    )
  }, [interventionId, intervention?.status, executeAction])

  /**
   * @deprecated The 'en_cours' status is deprecated. Use completeWork() instead.
   * Interventions now go directly from 'planifiee' to 'cloturee_par_prestataire'.
   * This method now calls completeWork() for backward compatibility.
   */
  const startWork = useCallback(async () => {
    // DEPRECATED: Skip 'en_cours' and go directly to provider completion
    console.warn('[DEPRECATED] startWork() is deprecated. Use completeWork() instead.')
    await completeWork()
  }, [completeWork])

  const validateWork = useCallback(async (satisfaction?: number) => {
    if (!canTransitionTo('cloturee_par_locataire')) {
      toast.error('Cannot validate work in current status')
      return
    }
    if (satisfaction !== undefined && (satisfaction < 1 || satisfaction > 5)) {
      toast.error('Satisfaction must be between 1 and 5')
      return
    }
    await executeAction(
      () => validateByTenantAction(interventionId, satisfaction),
      'cloturee_par_locataire',
      'Work validated',
      'Failed to validate work'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const finalize = useCallback(async (finalCost?: number) => {
    if (!canTransitionTo('cloturee_par_gestionnaire')) {
      toast.error('Cannot finalize intervention in current status')
      return
    }
    if (finalCost !== undefined && finalCost < 0) {
      toast.error('Final cost cannot be negative')
      return
    }
    await executeAction(
      () => finalizeByManagerAction(interventionId, finalCost),
      'cloturee_par_gestionnaire',
      'Intervention finalized',
      'Failed to finalize intervention'
    )
  }, [interventionId, canTransitionTo, executeAction])

  const cancel = useCallback(async (reason: string) => {
    if (!reason || reason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters)')
      return
    }
    if (!canTransitionTo('annulee')) {
      toast.error('Cannot cancel intervention in current status')
      return
    }
    await executeAction(
      () => cancelInterventionAction(interventionId, reason),
      'annulee',
      'Intervention cancelled',
      'Failed to cancel intervention'
    )
  }, [interventionId, canTransitionTo, executeAction])

  // Assignment actions
  const assignUser = useCallback(async (userId: string, role: 'gestionnaire' | 'prestataire') => {
    if (!userId) {
      toast.error('Please select a user')
      return
    }
    await executeAction(
      () => assignUserAction(interventionId, userId, role),
      undefined,
      `${role === 'gestionnaire' ? 'Manager' : 'Provider'} assigned successfully`,
      'Failed to assign user'
    )
  }, [interventionId, executeAction])

  const unassignUser = useCallback(async (userId: string, role: string) => {
    if (!userId) {
      toast.error('Please select a user')
      return
    }
    await executeAction(
      () => unassignUserAction(interventionId, userId, role),
      undefined,
      'User unassigned successfully',
      'Failed to unassign user'
    )
  }, [interventionId, executeAction])

  // Time slot actions
  const proposeSlots = useCallback(async (slots: TimeSlotInput[]) => {
    if (!slots || slots.length === 0) {
      toast.error('Please provide at least one time slot')
      return
    }
    await executeAction(
      () => proposeTimeSlotsAction(interventionId, slots),
      undefined,
      'Time slots proposed',
      'Failed to propose time slots'
    )
  }, [interventionId, executeAction])

  const selectSlot = useCallback(async (slotId: string) => {
    if (!slotId) {
      toast.error('Please select a time slot')
      return
    }
    await executeAction(
      () => selectTimeSlotAction(interventionId, slotId),
      undefined,
      'Time slot selected',
      'Failed to select time slot'
    )
  }, [interventionId, executeAction])

  return {
    // Use optimistic intervention if available, otherwise actual intervention
    intervention: optimisticIntervention || intervention,
    loading,
    error,
    approve,
    reject,
    requestQuote,
    startPlanning,
    confirmSchedule,
    startWork,
    completeWork,
    validateWork,
    finalize,
    cancel,
    assignUser,
    unassignUser,
    proposeSlots,
    selectSlot,
    canTransitionTo,
    isTransitioning
  }
}