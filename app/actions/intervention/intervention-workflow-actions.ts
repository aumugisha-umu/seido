'use server'

/**
 * Intervention Workflow Server Actions
 * Status transitions: approve, reject, cancel, close, start planning, program
 */

import {
  createServerActionInterventionService,
  createServerActionSupabaseClient,
  createServiceRoleSupabaseClient
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import { createQuoteRequestsForProviders } from '@/app/api/create-manager-intervention/create-quote-requests'
import { ensureInterventionConversationThreads } from '../conversation-actions'
import {
  determineInterventionStatus,
  mapOptionToSchedulingType,
  computeScheduledDate,
  createFixedSlot,
  createProposedSlots,
  clearTimeSlots,
  updateConfirmationRequirements,
} from '@/lib/services/domain/scheduling-service'
import {
  type ActionResult,
  type Intervention,
  checkInterventionLotLocked,
} from './intervention-shared'

/**
 * Approve intervention
 */
export async function approveInterventionAction(
  id: string,
  comment?: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can approve interventions' }
    }

    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('[SERVER-ACTION] Approving intervention:', { id, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.approveIntervention(id, user.id, comment)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to approve intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error approving intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Reject intervention
 */
export async function rejectInterventionAction(
  id: string,
  reason: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can reject interventions' }
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Rejection reason must be at least 10 characters' }
    }

    logger.info('[SERVER-ACTION] Rejecting intervention:', { id, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.rejectIntervention(id, user.id, reason)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to reject intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error rejecting intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Start planning
 */
export async function startPlanningAction(id: string): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can start planning' }
    }

    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('[SERVER-ACTION] Starting planning:', { id, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.startPlanning(id, user.id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to start planning' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error starting planning:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Confirm schedule
 */
export async function confirmScheduleAction(
  id: string,
  slotId: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Confirming schedule:', { id, slotId, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.confirmSchedule(id, user.id, slotId)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to confirm schedule' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error confirming schedule:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Start intervention
 * @deprecated Use completeByProviderAction() instead.
 */
export async function startInterventionAction(id: string): Promise<ActionResult<Intervention>> {
  logger.warn('[DEPRECATED] startInterventionAction is deprecated. Use completeByProviderAction instead.')
  return completeByProviderAction(id)
}

/**
 * Complete by provider
 */
export async function completeByProviderAction(
  id: string,
  report?: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (user.role !== 'prestataire') {
      return { success: false, error: 'Only providers can complete interventions' }
    }

    logger.info('[SERVER-ACTION] Provider completing intervention:', { id, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.completeByProvider(id, user.id, report)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to complete intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error completing intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Validate by tenant
 */
export async function validateByTenantAction(
  id: string,
  satisfaction?: number
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (user.role !== 'locataire') {
      return { success: false, error: 'Only tenants can validate interventions' }
    }

    if (satisfaction !== undefined && (satisfaction < 1 || satisfaction > 5)) {
      return { success: false, error: 'Satisfaction score must be between 1 and 5' }
    }

    logger.info('[SERVER-ACTION] Tenant validating intervention:', { id, userId: user.id, satisfaction })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.validateByTenant(id, user.id, satisfaction)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to validate intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error validating intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Finalize by manager
 */
export async function finalizeByManagerAction(
  id: string,
  finalCost?: number
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can finalize interventions' }
    }

    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    if (finalCost !== undefined && finalCost < 0) {
      return { success: false, error: 'Final cost cannot be negative' }
    }

    logger.info('[SERVER-ACTION] Manager finalizing intervention:', { id, userId: user.id, finalCost })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.finalizeByManager(id, user.id, finalCost)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to finalize intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error finalizing intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Cancel intervention
 */
export async function cancelInterventionAction(
  id: string,
  reason: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Cancellation reason must be at least 10 characters' }
    }

    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('[SERVER-ACTION] Cancelling intervention:', { id, userId: user.id })

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.cancelIntervention(id, user.id, reason)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to cancel intervention' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error cancelling intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Program intervention with 3 modes: direct, propose, organize
 */
export async function programInterventionAction(
  interventionId: string,
  planningData: {
    option: 'direct' | 'propose' | 'organize'
    directSchedule?: {
      date: string
      startTime: string
      endTime: string
    }
    proposedSlots?: Array<{
      date: string
      startTime: string
      endTime: string
    }>
    requireQuote?: boolean
    selectedProviders?: string[]
    instructions?: string
    assignmentMode?: string
    confirmationRequired?: string[]
    requiresConfirmation?: boolean
    assignedManagerIds?: string[]
    assignedProviderIds?: string[]
    assignedTenantIds?: string[]
  }
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Seuls les gestionnaires peuvent planifier les interventions' }
    }

    const supabase = await createServerActionSupabaseClient()

    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error('[programIntervention] Intervention not found:', { error: interventionError, interventionId })
      return {
        success: false,
        error: interventionError?.message || 'Intervention non trouvee'
      }
    }

    if (!['approuvee', 'planification', 'planifiee'].includes(intervention.status)) {
      return {
        success: false,
        error: `L'intervention ne peut pas etre planifiee (statut actuel: ${intervention.status})`
      }
    }

    const { option, directSchedule, proposedSlots } = planningData
    const requiresConfirmation = !!(planningData.requiresConfirmation || (planningData.confirmationRequired && planningData.confirmationRequired.length > 0))

    if (option === 'direct') {
      if (!directSchedule || !directSchedule.date || !directSchedule.startTime) {
        return { success: false, error: 'Date et heure sont requises pour fixer le rendez-vous' }
      }
    } else if (option === 'propose') {
      if (!proposedSlots || proposedSlots.length === 0) {
        return { success: false, error: 'Des creneaux proposes sont requis pour la planification avec choix' }
      }
    }

    // Phase B: Sync assignments
    const hasAssignmentChanges = planningData.assignedManagerIds !== undefined
      || planningData.assignedProviderIds !== undefined
      || planningData.assignedTenantIds !== undefined

    if (hasAssignmentChanges) {
      const { data: currentAssignments } = await supabase
        .from('intervention_assignments')
        .select('id, user_id, role')
        .eq('intervention_id', interventionId)

      if (planningData.assignedManagerIds !== undefined || planningData.assignedProviderIds !== undefined) {
        const allNewAssignments: Array<{ user_id: string; role: string }> = []
        if (planningData.assignedManagerIds) {
          planningData.assignedManagerIds.forEach(userId => {
            allNewAssignments.push({ user_id: userId, role: 'gestionnaire' })
          })
        }
        if (planningData.assignedProviderIds) {
          planningData.assignedProviderIds.forEach(userId => {
            allNewAssignments.push({ user_id: userId, role: 'prestataire' })
          })
        }

        const toDelete = (currentAssignments || []).filter(a =>
          a.role !== 'locataire' &&
          !allNewAssignments.some(n => n.user_id === a.user_id && n.role === a.role)
        )
        const toInsert = allNewAssignments.filter(n =>
          !currentAssignments?.some(c => c.user_id === n.user_id && c.role === n.role)
        )

        const assignmentOps: Promise<unknown>[] = []
        if (toDelete.length > 0) {
          assignmentOps.push(
            supabase.from('intervention_assignments').delete().in('id', toDelete.map(a => a.id))
          )
        }
        if (toInsert.length > 0) {
          assignmentOps.push(
            supabase.from('intervention_assignments').insert(
              toInsert.map(a => ({
                intervention_id: interventionId,
                user_id: a.user_id,
                role: a.role,
                assigned_by: user.id
              }))
            )
          )
        }
        if (assignmentOps.length > 0) await Promise.all(assignmentOps)
      }

      if (planningData.assignedTenantIds !== undefined) {
        const currentTenantAssignments = (currentAssignments || []).filter(a => a.role === 'locataire')
        const currentTenantIds = new Set(currentTenantAssignments.map(a => a.user_id))
        const newTenantIds = new Set(planningData.assignedTenantIds)

        const tenantsToDelete = currentTenantAssignments.filter(a => !newTenantIds.has(a.user_id))
        const tenantsToInsert = planningData.assignedTenantIds.filter(userId => !currentTenantIds.has(userId))

        const tenantOps: Promise<unknown>[] = []
        if (tenantsToDelete.length > 0) {
          tenantOps.push(
            supabase.from('intervention_assignments').delete().in('id', tenantsToDelete.map(a => a.id))
          )
        }
        if (tenantsToInsert.length > 0) {
          tenantOps.push(
            supabase.from('intervention_assignments').insert(
              tenantsToInsert.map((userId, index) => ({
                intervention_id: interventionId,
                user_id: userId,
                role: 'locataire',
                is_primary: index === 0,
                assigned_by: user.id
              }))
            )
          )
        }
        if (tenantOps.length > 0) await Promise.all(tenantOps)
      }

      ensureInterventionConversationThreads(interventionId).catch(err =>
        logger.warn({ error: err }, '[programIntervention] Non-blocking thread creation failed')
      )
    }

    // Phase C: Parallel independent operations (time slots)
    const parallelOps: Promise<unknown>[] = []

    if (option === 'direct' && directSchedule) {
      parallelOps.push(
        createFixedSlot(supabase, interventionId, directSchedule.date, directSchedule.startTime,
          directSchedule.endTime || undefined, user.id, requiresConfirmation)
          .then(result => {
            if (result.error) throw new Error('Erreur lors de la creation du rendez-vous')
          })
      )
    } else if (option === 'propose' && proposedSlots) {
      parallelOps.push(
        createProposedSlots(supabase, interventionId, proposedSlots, user.id)
          .then(result => {
            if (result.error) throw new Error('Erreur lors de la creation des creneaux')
          })
      )
    } else if (option === 'organize') {
      parallelOps.push(clearTimeSlots(supabase, interventionId))
    }

    if (parallelOps.length > 0) await Promise.all(parallelOps)

    // Phase D: Single merged UPDATE on interventions row
    const newStatus = determineInterventionStatus(option, directSchedule, requiresConfirmation, planningData.requireQuote)

    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      scheduling_type: mapOptionToSchedulingType(option),
      updated_at: new Date().toISOString(),
    }

    if (option === 'direct' && directSchedule?.date && directSchedule?.startTime) {
      updatePayload.scheduled_date = computeScheduledDate(directSchedule.date, directSchedule.startTime)
    }
    if (planningData.assignmentMode) {
      updatePayload.assignment_mode = planningData.assignmentMode
    }
    if (planningData.instructions?.trim()) {
      updatePayload.provider_guidelines = planningData.instructions.trim()
    }
    updatePayload.requires_participant_confirmation = requiresConfirmation
    if (planningData.requireQuote !== undefined) {
      updatePayload.requires_quote = planningData.requireQuote
    }

    const { data: updatedIntervention, error: updateError } = await supabase
      .from('interventions')
      .update(updatePayload)
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError) {
      logger.error('[programIntervention] Error updating intervention:', updateError)
      return { success: false, error: 'Erreur lors de la mise a jour de l\'intervention' }
    }

    // Phase E: Post-update parallel ops
    const postUpdateOps: Promise<unknown>[] = []

    postUpdateOps.push(
      updateConfirmationRequirements(supabase, interventionId, planningData.confirmationRequired || [], requiresConfirmation)
    )

    let quoteStats: { totalSelected: number; skipped: number; created: number } | null = null

    if (planningData.requireQuote && planningData.selectedProviders && planningData.selectedProviders.length > 0) {
      postUpdateOps.push(
        (async () => {
          const [existingResult, accountResult] = await Promise.all([
            supabase.from('intervention_quotes').select('id, provider_id, status')
              .eq('intervention_id', interventionId).in('status', ['pending', 'sent']),
            supabase.from('users').select('id')
              .in('id', planningData.selectedProviders!).not('auth_user_id', 'is', null)
          ])

          const existingProviderIds = new Set((existingResult.data || []).map(q => q.provider_id))
          const accountProviderIds = new Set((accountResult.data || []).map(p => p.id))

          const eligibleProviderIds = planningData.selectedProviders!.filter(
            id => !existingProviderIds.has(id) && accountProviderIds.has(id)
          )

          quoteStats = {
            totalSelected: planningData.selectedProviders!.length,
            skipped: planningData.selectedProviders!.length - eligibleProviderIds.length,
            created: eligibleProviderIds.length
          }

          if (eligibleProviderIds.length > 0) {
            await createQuoteRequestsForProviders({
              interventionId,
              teamId: intervention.team_id,
              providerIds: eligibleProviderIds,
              createdBy: user.id,
              messageType: 'global',
              globalMessage: planningData.instructions || undefined,
              supabase
            })
          }
        })().catch(err => logger.error('[programIntervention] Quote creation error:', err))
      )
    } else if (planningData.requireQuote === false) {
      postUpdateOps.push(
        (async () => {
          const { data: pendingQuotes, error: pendingError } = await supabase
            .from('intervention_quotes')
            .select('id, status, amount')
            .eq('intervention_id', interventionId)
            .in('status', ['pending', 'sent'])
            .is('deleted_at', null)

          if (!pendingError && pendingQuotes && pendingQuotes.length > 0) {
            const cancellableIds = pendingQuotes
              .filter(q => !q.amount || q.amount <= 0)
              .map(q => q.id)

            if (cancellableIds.length > 0) {
              await supabase.from('intervention_quotes')
                .update({ status: 'cancelled' }).in('id', cancellableIds)
            }
          }
        })().catch(err => logger.error('[programIntervention] Quote cancellation error:', err))
      )
    }

    await Promise.all(postUpdateOps)

    logger.info('[programIntervention] Intervention programmed successfully', { status: newStatus })

    return {
      success: true,
      data: {
        intervention: updatedIntervention,
        quoteStats
      }
    }
  } catch (error) {
    logger.error('[programIntervention] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update Provider Guidelines Action
 */
export async function updateProviderGuidelinesAction(
  interventionId: string,
  guidelines: string | null
): Promise<ActionResult<Intervention>> {
  try {
    logger.info('[SERVER-ACTION] Updating provider guidelines', {
      interventionId,
      guidelinesLength: guidelines?.length || 0
    })

    const { supabase, user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    if (guidelines && guidelines.length > 5000) {
      return {
        success: false,
        error: 'Les instructions ne doivent pas depasser 5000 caracteres'
      }
    }

    const { data: intervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (fetchError || !intervention) {
      logger.error('Intervention not found', { interventionId, error: fetchError })
      return { success: false, error: 'Intervention non trouvee' }
    }

    const { data: updated, error: updateError } = await supabase
      .from('interventions')
      .update({ provider_guidelines: guidelines?.trim() || null })
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError || !updated) {
      logger.error('Failed to update provider guidelines', { error: updateError })
      return {
        success: false,
        error: 'Erreur lors de la mise a jour des instructions'
      }
    }

    logger.info('Provider guidelines updated successfully', {
      interventionId,
      hasGuidelines: !!updated.provider_guidelines
    })

    return { success: true, data: updated }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error updating provider guidelines:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
