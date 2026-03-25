'use server'

/**
 * Intervention Time Slot Server Actions
 * Propose, select, cancel, accept, reject, withdraw time slots + manager slot choice
 */

import {
  createServerActionInterventionService,
  createServerActionSupabaseClient,
} from '@/lib/services'
import { createServiceRoleSupabaseClient } from '@/lib/services/core/supabase-client'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import {
  type ActionResult,
  TimeSlotSchema,
} from './intervention-shared'

/**
 * Propose time slots
 */
export async function proposeTimeSlotsAction(
  interventionId: string,
  slots: z.infer<typeof TimeSlotSchema>[]
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate slots
    const validatedSlots = z.array(TimeSlotSchema).parse(slots)

    logger.info('[SERVER-ACTION] Proposing time slots:', {
      interventionId,
      slotsCount: validatedSlots.length,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.proposeTimeSlots(
      interventionId,
      validatedSlots,
      user.id
    )

    if (result.success) {
      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to propose time slots' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error proposing time slots:', error)
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validation error: ${error.errors[0].message}`
        : error instanceof Error
          ? error.message
          : 'Unknown error occurred'
    }
  }
}

/**
 * Select time slot
 */
export async function selectTimeSlotAction(
  interventionId: string,
  slotId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Selecting time slot:', {
      interventionId,
      slotId,
      userId: user.id
    })

    // Validate that the slot meets requirements (1 tenant + provider accepted)
    const supabase = await createServerActionSupabaseClient()
    const { data: canFinalize, error: validationError } = await supabase.rpc(
      'check_timeslot_can_be_finalized',
      { slot_id_param: slotId }
    )

    if (validationError) {
      logger.error('Error checking slot validation:', validationError)
      return {
        success: false,
        error: 'Erreur lors de la validation du creneau'
      }
    }

    if (!canFinalize) {
      logger.warn('Slot validation requirements not met')
      return {
        success: false,
        error: 'Validation incomplete : au moins 1 locataire ET le prestataire doivent accepter ce creneau'
      }
    }

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.selectTimeSlot(interventionId, slotId, user.id)

    if (result.success) {
      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to select time slot' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error selecting time slot:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Cancel a time slot
 *
 * Permissions:
 * - Proposer can cancel their own slots
 * - Team managers can cancel any slot in their team's interventions
 * - Admins can cancel any slot
 */
export async function cancelTimeSlotAction(
  slotId: string,
  interventionId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Cancelling time slot:', {
      slotId,
      interventionId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Get the time slot (RLS enforces access via intervention's team)
    const { data: slot, error: fetchError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !slot) {
      logger.error('Time slot not found:', fetchError)
      return { success: false, error: 'Creneau introuvable' }
    }

    // Check permissions (RLS already verified access via the slot fetch above)
    const isProposer = slot.proposed_by === user.id
    const isAdmin = user.role === 'admin'
    const isManager = user.role === 'gestionnaire'

    if (!isProposer && !isManager && !isAdmin) {
      logger.warn('Permission denied: User cannot cancel this time slot')
      return {
        success: false,
        error: 'Vous n\'avez pas la permission d\'annuler ce creneau'
      }
    }

    // Check if slot is already cancelled or selected
    if (slot.status === 'cancelled') {
      return { success: false, error: 'Ce creneau est deja annule' }
    }

    if (slot.status === 'selected') {
      return {
        success: false,
        error: 'Impossible d\'annuler un creneau selectionne. Veuillez d\'abord le deselectionner.'
      }
    }

    // Cancel the time slot
    const { error: updateError } = await supabase
      .from('intervention_time_slots')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.id
      })
      .eq('id', slotId)

    if (updateError) {
      logger.error('Error cancelling time slot:', updateError)
      return { success: false, error: 'Erreur lors de l\'annulation du creneau' }
    }

    // Log activity
    await supabase.from('activity_logs').insert({
      intervention_id: interventionId,
      user_id: user.id,
      action: 'time_slot_cancelled',
      details: {
        slot_id: slotId,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time
      }
    })

    logger.info('Time slot cancelled successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error cancelling time slot:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Check if a time slot can be auto-confirmed
 *
 * Conditions for auto-confirmation:
 * 1. No pending responses left (all participants have responded)
 * 2. At least 1 tenant has accepted
 * 3. At least 1 provider has accepted
 * 4. Intervention is in "planification" status
 *
 * @returns true if slot can be auto-confirmed, false otherwise
 */
async function checkIfSlotCanBeAutoConfirmed(
  supabase: ReturnType<typeof createServiceRoleSupabaseClient>,
  slotId: string,
  interventionId: string
): Promise<boolean> {
  try {
    logger.info('[AUTO-CONFIRM] Checking if slot can be auto-confirmed:', {
      slotId,
      interventionId
    })

    // 1. Get intervention status
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('status')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.warn('[AUTO-CONFIRM] Intervention not found')
      return false
    }

    if (intervention.status !== 'planification') {
      logger.info('[AUTO-CONFIRM] Cannot auto-confirm: intervention not in planification status', {
        currentStatus: intervention.status
      })
      return false
    }

    // 2. Check for pending responses
    const { data: pendingResponses, error: pendingError } = await supabase
      .from('time_slot_responses')
      .select('id, user_id, user_role')
      .eq('time_slot_id', slotId)
      .eq('response', 'pending')

    if (pendingError) {
      logger.error('[AUTO-CONFIRM] Error checking pending responses:', pendingError)
      return false
    }

    if (pendingResponses && pendingResponses.length > 0) {
      logger.info('[AUTO-CONFIRM] Cannot auto-confirm: pending responses exist', {
        pendingCount: pendingResponses.length,
        pendingRoles: pendingResponses.map((r: { user_role: string }) => r.user_role)
      })
      return false
    }

    // 3. Use SQL function to check validation requirements (at least 1 tenant + provider accepted)
    const { data: canFinalize, error: validateError } = await supabase.rpc(
      'check_timeslot_can_be_finalized',
      { slot_id_param: slotId }
    )

    if (validateError) {
      logger.error('[AUTO-CONFIRM] Error calling validation function:', validateError)
      return false
    }

    if (!canFinalize) {
      // Get detailed info about why validation failed
      const [
        { data: slot },
        { data: assignments },
        { data: responses }
      ] = await Promise.all([
        supabase
          .from('intervention_time_slots')
          .select('selected_by_manager, selected_by_provider, selected_by_tenant, status')
          .eq('id', slotId)
          .single(),
        supabase
          .from('intervention_assignments')
          .select('role, user_id')
          .eq('intervention_id', interventionId),
        supabase
          .from('time_slot_responses')
          .select('user_role, response')
          .eq('time_slot_id', slotId)
      ])

      logger.info('[AUTO-CONFIRM] Cannot auto-confirm: validation requirements not met', {
        slotStatus: slot?.status,
        summary: {
          selected_by_manager: slot?.selected_by_manager,
          selected_by_provider: slot?.selected_by_provider,
          selected_by_tenant: slot?.selected_by_tenant
        },
        assignedRoles: assignments?.map((a: { role: string }) => a.role) || [],
        responses: responses?.map((r: { user_role: string; response: string }) => ({ role: r.user_role, response: r.response })) || []
      })
      return false
    }

    logger.info('[AUTO-CONFIRM] Slot meets all auto-confirmation criteria')
    return true
  } catch (error) {
    logger.error('[AUTO-CONFIRM] Exception checking auto-confirmation:', error)
    return false
  }
}

/**
 * Accept a time slot
 * Creates or updates a time_slot_response with response='accepted'
 *
 * Permissions:
 * - Team members (managers) can accept
 * - Tenants assigned via intervention_assignments can accept
 * - Providers assigned via intervention_assignments can accept
 * - Cannot accept own proposed slot
 */
export async function acceptTimeSlotAction(
  slotId: string,
  interventionId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Accepting time slot:', {
      slotId,
      interventionId,
      userId: user.id,
      userRole: user.role
    })

    const supabase = await createServerActionSupabaseClient()

    // RLS already enforces access — if the user can fetch the slot, they have permission
    const { data: slot, error: fetchError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !slot) {
      logger.error('Time slot not found:', {
        error: fetchError,
        slotId,
        interventionId,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message
      })
      return { success: false, error: 'Creneau introuvable' }
    }

    // Cannot accept own slot
    if (slot.proposed_by === user.id) {
      return {
        success: false,
        error: 'Vous ne pouvez pas accepter votre propre creneau'
      }
    }

    // Cannot accept if slot is cancelled
    if (slot.status === 'cancelled' || slot.status === 'rejected') {
      return {
        success: false,
        error: 'Ce creneau a ete annule ou rejete'
      }
    }

    // Check if response already exists
    const { data: existingResponse } = await supabase
      .from('time_slot_responses')
      .select('*')
      .eq('time_slot_id', slotId)
      .eq('user_id', user.id)
      .maybeSingle()

    logger.info('Existing response:', {
      exists: !!existingResponse,
      currentStatus: existingResponse?.response,
      willUpdate: !!existingResponse
    })

    // Upsert response
    const { error: upsertError, data: upsertData } = await supabase
      .from('time_slot_responses')
      .upsert({
        time_slot_id: slotId,
        user_id: user.id,
        user_role: user.role,
        response: 'accepted',
        notes: null,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'time_slot_id,user_id'
      })
      .select()

    if (upsertError) {
      logger.error('Error creating/updating response:', {
        error: upsertError,
        code: upsertError.code,
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        slotId,
        userId: user.id,
        userRole: user.role
      })
      return {
        success: false,
        error: `Erreur lors de l'enregistrement de votre reponse: ${upsertError.message} (Code: ${upsertError.code})`
      }
    }

    logger.info('Response upserted successfully:', {
      responseId: upsertData?.[0]?.id,
      wasCreated: !existingResponse,
      wasUpdated: !!existingResponse
    })

    // Verify the PostgreSQL trigger updated the selected_by_X column
    const { data: updatedSlot } = await supabase
      .from('intervention_time_slots')
      .select('selected_by_manager, selected_by_provider, selected_by_tenant')
      .eq('id', slotId)
      .single()

    const expectedField =
      user.role === 'gestionnaire' || user.role === 'admin' ? 'selected_by_manager' :
        user.role === 'prestataire' ? 'selected_by_provider' :
          'selected_by_tenant'

    const wasUpdatedByTrigger = updatedSlot?.[expectedField] === true

    logger.info('Trigger verification result:', {
      userRole: user.role,
      expectedField,
      fieldValue: updatedSlot?.[expectedField],
      wasUpdatedByTrigger,
      allFields: {
        selected_by_manager: updatedSlot?.selected_by_manager,
        selected_by_provider: updatedSlot?.selected_by_provider,
        selected_by_tenant: updatedSlot?.selected_by_tenant
      }
    })

    if (!wasUpdatedByTrigger) {
      logger.error('CRITICAL: Trigger did NOT update the expected field!', {
        expectedField,
        slotId,
        userRole: user.role
      })
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        intervention_id: interventionId,
        user_id: user.id,
        action: 'time_slot_accepted',
        details: {
          slot_id: slotId,
          user_role: user.role,
          was_update: !!existingResponse
        }
      })

    logger.info('[SERVER-ACTION] Time slot accepted successfully')

    // Check if slot can be auto-confirmed
    const shouldAutoConfirm = await checkIfSlotCanBeAutoConfirmed(
      supabase,
      slotId,
      interventionId
    )

    if (shouldAutoConfirm) {
      logger.info('[AUTO-CONFIRM] Auto-confirming slot (all conditions met)')

      try {
        const interventionService = await createServerActionInterventionService()
        const confirmResult = await interventionService.confirmSchedule(
          interventionId,
          user.id,
          slotId,
          { useServiceRole: true }
        )

        if (confirmResult.success) {
          logger.info('[AUTO-CONFIRM] Slot auto-confirmed successfully', {
            interventionId,
            slotId,
            userId: user.id
          })

          // Log auto-confirmation activity (use service role to bypass RLS)
          try {
            const serviceRoleClient = createServiceRoleSupabaseClient()

            await serviceRoleClient
              .from('activity_logs')
              .insert({
                intervention_id: interventionId,
                user_id: user.id,
                action: 'time_slot_auto_confirmed',
                details: {
                  slot_id: slotId,
                  triggered_by_role: user.role
                }
              })
          } catch (logError) {
            logger.warn('[AUTO-CONFIRM] Failed to log activity:', logError)
          }
        } else {
          logger.warn('[AUTO-CONFIRM] Auto-confirmation failed:', {
            errorMessage: confirmResult.error,
            context: {
              interventionId,
              slotId,
              userId: user.id,
              userRole: user.role
            }
          })
        }
      } catch (confirmError) {
        logger.error('[AUTO-CONFIRM] Exception during auto-confirmation:', {
          error: confirmError,
          errorMessage: confirmError instanceof Error ? confirmError.message : String(confirmError),
          context: {
            interventionId,
            slotId,
            userId: user.id,
            userRole: user.role
          }
        })
        // Don't fail the accept action if auto-confirm fails
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error accepting time slot:', {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Reject a time slot with mandatory reason
 * Creates or updates a time_slot_response with response='rejected'
 *
 * Permissions: Same as acceptTimeSlotAction
 * Note: If rejecting a slot proposed by same role group, auto-cancels slot (handled by trigger)
 */
export async function rejectTimeSlotAction(
  slotId: string,
  interventionId: string,
  reason: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate reason
    if (!reason || reason.trim().length === 0) {
      return {
        success: false,
        error: 'Une raison est requise pour rejeter un creneau'
      }
    }

    logger.info('[SERVER-ACTION] Rejecting time slot:', {
      slotId,
      interventionId,
      userId: user.id,
      userRole: user.role,
      reason: reason.substring(0, 50) + '...'
    })

    const supabase = await createServerActionSupabaseClient()

    // Get the time slot
    const { data: slot, error: fetchError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !slot) {
      logger.error('Time slot not found:', fetchError)
      return { success: false, error: 'Creneau introuvable' }
    }

    // Cannot reject own slot
    if (slot.proposed_by === user.id) {
      return {
        success: false,
        error: 'Vous ne pouvez pas rejeter votre propre creneau'
      }
    }

    // Cannot reject if already cancelled
    if (slot.status === 'cancelled') {
      return {
        success: false,
        error: 'Ce creneau est deja annule'
      }
    }

    // Upsert response (INSERT or UPDATE if already exists)
    const { error: upsertError } = await supabase
      .from('time_slot_responses')
      .upsert({
        time_slot_id: slotId,
        user_id: user.id,
        user_role: user.role,
        response: 'rejected',
        notes: reason.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'time_slot_id,user_id'
      })

    if (upsertError) {
      logger.error('Error creating/updating rejection:', upsertError)
      return { success: false, error: 'Erreur lors de l\'enregistrement de votre reponse' }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        intervention_id: interventionId,
        user_id: user.id,
        action: 'time_slot_rejected',
        details: {
          slot_id: slotId,
          user_role: user.role,
          reason: reason
        }
      })

    logger.info('[SERVER-ACTION] Time slot rejected successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error rejecting time slot:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Withdraw a previous response to a time slot
 * Deletes the user's time_slot_response (accept or reject)
 *
 * Permissions: User can only withdraw their own responses
 */
export async function withdrawResponseAction(
  slotId: string,
  interventionId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Withdrawing response:', {
      slotId,
      interventionId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Get the existing response
    const { data: existingResponse, error: fetchError } = await supabase
      .from('time_slot_responses')
      .select('*')
      .eq('time_slot_id', slotId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !existingResponse) {
      return {
        success: false,
        error: 'Aucune reponse a retirer'
      }
    }

    // Update response to 'pending' (instead of deleting)
    const { error: updateError } = await supabase
      .from('time_slot_responses')
      .update({
        response: 'pending',
        notes: null,
        updated_at: new Date().toISOString()
      })
      .eq('time_slot_id', slotId)
      .eq('user_id', user.id)

    if (updateError) {
      logger.error('Error updating response to pending:', updateError)
      return { success: false, error: 'Erreur lors du retrait de votre reponse' }
    }

    // Log activity
    await supabase
      .from('activity_logs')
      .insert({
        intervention_id: interventionId,
        user_id: user.id,
        action: 'time_slot_response_withdrawn',
        details: {
          slot_id: slotId,
          previous_response: existingResponse.response,
          user_role: user.role
        }
      })

    logger.info('[SERVER-ACTION] Response withdrawn successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error withdrawing response:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Choose a time slot as manager and schedule the intervention
 *
 * This action:
 * - Marks the chosen slot as 'selected'
 * - Rejects all other pending/requested slots
 * - Updates the intervention status to 'planifiee'
 *
 * Permissions: Gestionnaire or admin only
 */
export async function chooseTimeSlotAsManagerAction(
  slotId: string,
  interventionId: string
): Promise<ActionResult<{ hasActiveQuotes: boolean }>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('[SERVER-ACTION] Manager choosing time slot:', {
      slotId,
      interventionId,
      userId: user.id,
      userRole: user.role
    })

    const supabase = await createServerActionSupabaseClient()

    // 1. Verify user is gestionnaire or admin
    if (user.role !== 'gestionnaire' && user.role !== 'admin') {
      logger.warn('Permission denied: User is not a manager or admin')
      return {
        success: false,
        error: 'Seuls les gestionnaires et administrateurs peuvent choisir un creneau'
      }
    }

    // 2. Get the intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, status, team_id')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error('Intervention not found:', interventionError)
      return { success: false, error: 'Intervention introuvable' }
    }

    // 3. Get the time slot
    const { data: slot, error: slotError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (slotError || !slot) {
      logger.error('Time slot not found:', slotError)
      return { success: false, error: 'Creneau introuvable' }
    }

    // 4. Verify slot is not already cancelled or selected
    if (slot.status === 'cancelled') {
      return {
        success: false,
        error: 'Ce creneau a ete annule et ne peut pas etre selectionne'
      }
    }

    if (slot.status === 'selected') {
      return {
        success: false,
        error: 'Ce creneau est deja selectionne'
      }
    }

    // 5. Check for active quotes
    const { data: quotes } = await supabase
      .from('intervention_quotes')
      .select('id, status')
      .eq('intervention_id', interventionId)
      .in('status', ['pending', 'sent'])

    const hasActiveQuotes = (quotes && quotes.length > 0) || false

    logger.info('Active quotes check:', {
      hasActiveQuotes,
      quotesCount: quotes?.length || 0
    })

    // 6. Update the chosen slot to 'selected'
    const { error: updateSlotError } = await supabase
      .from('intervention_time_slots')
      .update({
        status: 'selected',
        is_selected: true
      })
      .eq('id', slotId)

    if (updateSlotError) {
      logger.error('Error updating chosen slot:', updateSlotError)
      return { success: false, error: 'Erreur lors de la selection du creneau' }
    }

    logger.info('Chosen slot updated to selected')

    // 7. Reject all other slots (pending or requested)
    const { error: rejectOthersError } = await supabase
      .from('intervention_time_slots')
      .update({
        status: 'rejected'
      })
      .eq('intervention_id', interventionId)
      .neq('id', slotId)
      .in('status', ['pending', 'requested'])

    if (rejectOthersError) {
      logger.error('Error rejecting other slots:', rejectOthersError)
      // Don't fail the entire operation, just log the error
    } else {
      logger.info('Other slots updated to rejected')
    }

    // 8. Calculate scheduled date-time (slot_date + start_time)
    let timeWithSeconds = slot.start_time
    const timeParts = timeWithSeconds.split(':')
    if (timeParts.length === 2) {
      timeWithSeconds = `${timeWithSeconds}:00`
    }
    const scheduledDateTime = `${slot.slot_date}T${timeWithSeconds}`

    logger.info('Scheduled date-time constructed:', {
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      scheduledDateTime
    })

    // 9. Update intervention status to 'planifiee'
    const { error: updateInterventionError } = await supabase
      .from('interventions')
      .update({
        status: 'planifiee',
        scheduled_date: scheduledDateTime,
        updated_at: new Date().toISOString()
      })
      .eq('id', interventionId)

    if (updateInterventionError) {
      logger.error('Error updating intervention:', {
        error: updateInterventionError,
        code: updateInterventionError.code,
        message: updateInterventionError.message,
        scheduledDateTime
      })
      return {
        success: false,
        error: `Erreur lors de la mise a jour de l'intervention: ${updateInterventionError.message || 'erreur inconnue'}`
      }
    }

    logger.info('Intervention updated to planifiee')

    // 10. Log activity (ignore errors, not critical)
    const { error: activityLogError } = await supabase.from('activity_logs').insert({
      intervention_id: interventionId,
      user_id: user.id,
      action: 'time_slot_chosen_by_manager',
      details: {
        slot_id: slotId,
        slot_date: slot.slot_date,
        start_time: slot.start_time,
        end_time: slot.end_time,
        scheduled_date: scheduledDateTime
      }
    })

    if (activityLogError) {
      logger.warn('Could not log activity (non-critical):', activityLogError)
    }

    logger.info('Time slot chosen successfully by manager')

    return {
      success: true,
      data: { hasActiveQuotes }
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error choosing time slot as manager:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
