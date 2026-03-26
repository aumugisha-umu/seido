'use server'

/**
 * Intervention CRUD Server Actions
 * Create, read, update, delete operations + batch creation + pagination
 */

import {
  createServerActionInterventionService,
  createServerActionSupabaseClient,
  createServiceRoleSupabaseClient
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { after } from 'next/server'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { createInterventionNotification } from '../notification-actions'
import { ensureInterventionConversationThreads } from '../conversation-actions'
import { mapInterventionType } from '@/lib/utils/intervention-mappers'
import { createQuoteRequestsForProviders } from '@/app/api/create-manager-intervention/create-quote-requests'
import {
  type ActionResult,
  type Intervention,
  type InterventionUrgency,
  type InterventionType,
  type InterventionStatus,
  type DashboardStats,
  InterventionCreateSchema,
  InterventionFiltersSchema,
  checkLotLockedBySubscription,
} from './intervention-shared'
import { assignUserAction } from './intervention-assignment-actions'

/**
 * Create a new intervention (for tenant requests)
 * Used by InterventionRequestForm component
 */
export async function createInterventionAction(
  data: {
    title: string
    description: string
    type: string
    urgency?: string
    lot_id?: string
    building_id?: string
    team_id: string
    contract_id?: string
    requested_date?: Date
  },
  options?: {
    redirectTo?: string
    useServiceRole?: boolean
    assignments?: Array<{ userId: string; role: string }>
  }
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const lotLocked = await checkLotLockedBySubscription(data.lot_id, data.team_id)
    if (lotLocked) {
      return { success: false, error: lotLocked }
    }

    const validatedData = InterventionCreateSchema.safeParse({
      ...data,
      type: data.type,
      urgency: (data.urgency || 'normale') as InterventionUrgency
    })

    if (!validatedData.success) {
      logger.warn({ errors: validatedData.error.errors }, 'Intervention creation validation failed')
      return { success: false, error: 'Donnees invalides: ' + validatedData.error.errors.map(e => e.message).join(', ') }
    }

    const supabase = options?.useServiceRole
      ? createServiceRoleSupabaseClient()
      : await createServerActionSupabaseClient()

    const mappedType = mapInterventionType(validatedData.data.type)
    const isPreScheduled = !!data.requested_date

    const { data: intervention, error } = await supabase
      .from('interventions')
      .insert({
        title: validatedData.data.title,
        description: validatedData.data.description,
        type: mappedType,
        urgency: validatedData.data.urgency,
        status: (isPreScheduled ? 'planifiee' : 'demande') as InterventionStatus,
        lot_id: validatedData.data.lot_id || null,
        building_id: validatedData.data.building_id || null,
        team_id: validatedData.data.team_id,
        contract_id: validatedData.data.contract_id || null,
        created_by: user.id,
        scheduled_date: data.requested_date
          ? data.requested_date.toISOString().split('T')[0] + 'T09:00:00.000Z'
          : null,
        scheduling_method: isPreScheduled ? 'direct' : null,
        creation_source: 'wizard'
      })
      .select()
      .single()

    if (error) {
      logger.error({ error }, 'Failed to create intervention')
      return { success: false, error: 'Echec de la creation de l\'intervention' }
    }

    if (isPreScheduled && data.requested_date && intervention) {
      const slotDate = data.requested_date.toISOString().split('T')[0]

      const { data: timeSlot, error: slotError } = await supabase
        .from('intervention_time_slots')
        .insert({
          intervention_id: intervention.id,
          slot_date: slotDate,
          start_time: '09:00',
          end_time: '10:00',
          is_selected: true,
          status: 'selected',
          proposed_by: user.id,
          selected_by_manager: true
        })
        .select('id')
        .single()

      if (slotError) {
        logger.warn({ error: slotError }, 'Failed to create time slot for pre-scheduled intervention')
      } else if (timeSlot) {
        await supabase
          .from('interventions')
          .update({ selected_slot_id: timeSlot.id })
          .eq('id', intervention.id)

        logger.info({ slotId: timeSlot.id, interventionId: intervention.id }, 'Time slot created and linked')
      }
    }

    const VALID_ASSIGNMENT_ROLES = ['gestionnaire', 'prestataire', 'locataire'] as const
    if (options?.assignments && options.assignments.length > 0 && intervention) {
      const validAssignments = options.assignments.filter(a =>
        (VALID_ASSIGNMENT_ROLES as readonly string[]).includes(a.role)
      )
      const assignmentPromises = validAssignments.map(a =>
        assignUserAction(intervention.id, a.userId, a.role as typeof VALID_ASSIGNMENT_ROLES[number])
      )

      const assignResults = await Promise.allSettled(assignmentPromises)
      const succeeded = assignResults.filter(r => r.status === 'fulfilled' && (r.value as ActionResult<void>).success).length
      const failed = assignResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !(r.value as ActionResult<void>).success)).length

      if (failed > 0) {
        logger.warn({ succeeded, failed, interventionId: intervention.id }, 'Some intervention assignments failed (non-blocking)')
      } else {
        logger.info({ count: succeeded, interventionId: intervention.id }, 'Intervention assignments created via assignUserAction')
      }
    }

    after(async () => {
      try {
        await createInterventionNotification(intervention.id)
      } catch (notifError) {
        logger.warn({ error: notifError }, 'Failed to create intervention notification (non-blocking)')
      }
    })

    logger.info({ interventionId: intervention.id }, 'Intervention created successfully by tenant')

    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }

    return { success: true, data: intervention }
  } catch (error) {
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    logger.error({ error }, 'Unexpected error in createInterventionAction')
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Batch create rent payment reminders for a contract.
 */
export async function createBatchRentRemindersAction(
  reminders: Array<{
    title: string
    scheduledDate: string
  }>,
  config: {
    lot_id: string
    team_id: string
    contract_id: string
    assignments?: Array<{ userId: string; role: string }>
  }
): Promise<ActionResult<{ successCount: number; totalCount: number }>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const lotLocked = await checkLotLockedBySubscription(config.lot_id, config.team_id)
    if (lotLocked) {
      return { success: false, error: lotLocked }
    }

    const supabase = createServiceRoleSupabaseClient()

    const interventionRows = reminders.map(r => ({
      title: r.title,
      description: 'Appel de loyer mensuel',
      type: 'rappel_loyer' as InterventionType,
      urgency: 'basse' as InterventionUrgency,
      status: 'planifiee' as InterventionStatus,
      lot_id: config.lot_id,
      building_id: null as string | null,
      team_id: config.team_id,
      contract_id: config.contract_id,
      created_by: user.id,
      scheduled_date: r.scheduledDate + 'T09:00:00.000Z',
      scheduling_method: 'direct'
    }))

    const { data: interventions, error: insertError } = await supabase
      .from('interventions')
      .insert(interventionRows)
      .select('id, scheduled_date')

    if (insertError || !interventions || interventions.length === 0) {
      logger.error({ error: insertError }, 'Failed to bulk create rent reminders')
      return { success: false, error: 'Echec de la creation des rappels de loyer' }
    }

    const timeSlotRows = interventions.map(i => ({
      intervention_id: i.id,
      slot_date: i.scheduled_date?.split('T')[0] || '',
      start_time: '09:00',
      end_time: '10:00',
      is_selected: true,
      status: 'selected' as Database['public']['Enums']['time_slot_status'],
      proposed_by: user.id,
      selected_by_manager: true
    }))

    const { data: timeSlots, error: slotError } = await supabase
      .from('intervention_time_slots')
      .insert(timeSlotRows)
      .select('id, intervention_id')

    if (!slotError && timeSlots && timeSlots.length > 0) {
      await Promise.all(
        timeSlots.map(slot =>
          supabase
            .from('interventions')
            .update({ selected_slot_id: slot.id })
            .eq('id', slot.intervention_id)
        )
      )
    }

    const VALID_ROLES = ['gestionnaire', 'prestataire', 'locataire'] as const
    if (config.assignments && config.assignments.length > 0) {
      const validAssignments = config.assignments.filter(a =>
        (VALID_ROLES as readonly string[]).includes(a.role)
      )

      if (validAssignments.length > 0) {
        const assignmentRows = interventions.flatMap(i =>
          validAssignments.map(a => ({
            intervention_id: i.id,
            user_id: a.userId,
            role: a.role,
            assigned_by: user.id
          }))
        )

        const { error: assignError } = await supabase
          .from('intervention_assignments')
          .insert(assignmentRows)

        if (assignError) {
          logger.warn({ error: assignError }, 'Some rent reminder assignments failed (non-blocking)')
        }
      }
    }

    after(async () => {
      const results = await Promise.allSettled(
        interventions.map(intervention => createInterventionNotification(intervention.id))
      )
      results.forEach((result, i) => {
        if (result.status === 'rejected') {
          logger.warn({ error: result.reason, interventionId: interventions[i].id }, 'Rent reminder notification failed (non-blocking)')
        }
      })
    })

    logger.info({ successCount: interventions.length, totalCount: reminders.length, contractId: config.contract_id }, 'Batch rent reminders created')
    return { success: true, data: { successCount: interventions.length, totalCount: reminders.length } }
  } catch (error) {
    logger.error({ error }, 'Unexpected error in createBatchRentRemindersAction')
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Get a single intervention by ID
 */
export async function getInterventionAction(
  id: string
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { success: false, error: 'Invalid intervention ID format' }
    }

    const supabase = await createServerActionSupabaseClient()

    const { data: intervention, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !intervention) {
      logger.error('[SERVER-ACTION] Error fetching intervention:', { error, id })
      return { success: false, error: error?.message || 'Intervention not found' }
    }

    logger.info('[SERVER-ACTION] Intervention fetched:', { id, status: intervention.status })

    return { success: true, data: intervention }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching intervention:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update an existing intervention
 */
export async function updateInterventionAction(
  interventionId: string,
  data: {
    title?: string
    description?: string
    type?: string
    urgency?: string
    provider_guidelines?: string
    requires_quote?: boolean
    assignedManagerIds?: string[]
    assignedProviderIds?: string[]
    assignedTenantIds?: string[]
    timeSlots?: Array<{
      id?: string
      slot_date: string
      start_time: string
      end_time: string
    }>
    assignment_mode?: 'single' | 'group'
    requires_participant_confirmation?: boolean
    confirmationRequiredUserIds?: string[]
    documentsToDelete?: string[]
    scheduling_type?: 'fixed' | 'flexible' | 'slots'
    scheduled_date?: string | null
  }
): Promise<ActionResult<Intervention>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!interventionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(interventionId)) {
      return { success: false, error: 'Invalid intervention ID format' }
    }

    const supabase = await createServerActionSupabaseClient()

    const { data: existingIntervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*, team_id')
      .eq('id', interventionId)
      .single()

    if (fetchError || !existingIntervention) {
      return { success: false, error: 'Intervention not found' }
    }

    const lotLocked = await checkLotLockedBySubscription(existingIntervention.lot_id, existingIntervention.team_id)
    if (lotLocked) return { success: false, error: lotLocked }

    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.type !== undefined) updateData.type = data.type as InterventionType
    if (data.urgency !== undefined) updateData.urgency = data.urgency as InterventionUrgency
    if (data.provider_guidelines !== undefined) updateData.provider_guidelines = data.provider_guidelines
    if (data.requires_quote !== undefined) updateData.requires_quote = data.requires_quote
    if (data.assignment_mode !== undefined) updateData.assignment_mode = data.assignment_mode
    if (data.requires_participant_confirmation !== undefined) {
      updateData.requires_participant_confirmation = data.requires_participant_confirmation
    }
    if (data.scheduling_type !== undefined) {
      updateData.scheduling_type = data.scheduling_type
    }
    if (data.scheduled_date !== undefined) {
      updateData.scheduled_date = data.scheduled_date
    }
    updateData.updated_at = new Date().toISOString()

    const { data: updatedIntervention, error: updateError } = await supabase
      .from('interventions')
      .update(updateData)
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError) {
      logger.error({ error: updateError }, 'Failed to update intervention')
      return { success: false, error: 'Failed to update intervention' }
    }

    // Update assignments if provided
    if (data.assignedManagerIds !== undefined || data.assignedProviderIds !== undefined) {
      const { data: currentAssignments } = await supabase
        .from('intervention_assignments')
        .select('id, user_id, role')
        .eq('intervention_id', interventionId)

      const allNewAssignments: Array<{ user_id: string; role: string }> = []

      if (data.assignedManagerIds) {
        data.assignedManagerIds.forEach(userId => {
          allNewAssignments.push({ user_id: userId, role: 'gestionnaire' })
        })
      }

      if (data.assignedProviderIds) {
        data.assignedProviderIds.forEach(userId => {
          allNewAssignments.push({ user_id: userId, role: 'prestataire' })
        })
      }

      if (currentAssignments) {
        const toDelete = currentAssignments.filter(a =>
          a.role !== 'locataire' &&
          !allNewAssignments.some(n => n.user_id === a.user_id && n.role === a.role)
        )

        if (toDelete.length > 0) {
          await supabase
            .from('intervention_assignments')
            .delete()
            .in('id', toDelete.map(a => a.id))
        }
      }

      const toInsert = allNewAssignments.filter(n =>
        !currentAssignments?.some(c => c.user_id === n.user_id && c.role === n.role)
      )

      if (toInsert.length > 0) {
        await supabase
          .from('intervention_assignments')
          .insert(toInsert.map(a => ({
            intervention_id: interventionId,
            user_id: a.user_id,
            role: a.role,
            assigned_by: user.id
          })))
      }
    }

    // Update tenant assignments if provided
    if (data.assignedTenantIds !== undefined) {
      const { data: currentTenantAssignments } = await supabase
        .from('intervention_assignments')
        .select('id, user_id')
        .eq('intervention_id', interventionId)
        .eq('role', 'locataire')

      const currentTenantIds = new Set(
        currentTenantAssignments?.map(a => a.user_id) || []
      )
      const newTenantIds = new Set(data.assignedTenantIds)

      const tenantsToDelete = currentTenantAssignments?.filter(
        a => !newTenantIds.has(a.user_id)
      ) || []

      if (tenantsToDelete.length > 0) {
        await supabase
          .from('intervention_assignments')
          .delete()
          .in('id', tenantsToDelete.map(a => a.id))
      }

      const tenantsToInsert = data.assignedTenantIds.filter(
        userId => !currentTenantIds.has(userId)
      )

      if (tenantsToInsert.length > 0) {
        await supabase
          .from('intervention_assignments')
          .insert(tenantsToInsert.map((userId, index) => ({
            intervention_id: interventionId,
            user_id: userId,
            role: 'locataire',
            is_primary: index === 0,
            assigned_by: user.id
          })))
      }

      logger.info({
        removed: tenantsToDelete.length,
        added: tenantsToInsert.length,
        total: data.assignedTenantIds.length
      }, 'Tenant assignments updated')
    }

    // Ensure conversation threads exist for all assigned users (non-blocking)
    if (data.assignedManagerIds !== undefined || data.assignedProviderIds !== undefined || data.assignedTenantIds !== undefined) {
      try {
        const threadResult = await ensureInterventionConversationThreads(interventionId)
        if (threadResult.success) {
          logger.info({ created: threadResult.data.created }, 'Conversation threads ensured')
        } else {
          logger.warn({ error: threadResult.error }, 'Failed to ensure conversation threads (non-blocking)')
        }
      } catch (error) {
        logger.warn({ error }, 'Error ensuring conversation threads (non-blocking)')
      }
    }

    // Update time slots if provided - Intelligent upsert with change tracking
    if (data.timeSlots !== undefined) {
      logger.info({ count: data.timeSlots.length }, 'Processing time slots update')

      const { data: existingSlots } = await supabase
        .from('intervention_time_slots')
        .select('id, slot_date, start_time, end_time, status')
        .eq('intervention_id', interventionId)

      type ExistingSlot = {
        id: string
        slot_date: string
        start_time: string
        end_time: string
        status: string
      }

      const existingMap = new Map<string, ExistingSlot>(
        (existingSlots || []).map(s => [s.id, s as ExistingSlot])
      )

      const incomingIds = new Set(
        data.timeSlots.filter(ts => ts.id).map(ts => ts.id!)
      )

      const slotsToInsert: typeof data.timeSlots = []
      const slotsToUpdate: Array<{
        id: string
        data: { slot_date: string; start_time: string; end_time: string }
        oldData: { slot_date: string; start_time: string; end_time: string }
      }> = []
      const slotsToDelete: string[] = []

      existingMap.forEach((existingSlot, existingId) => {
        if (!incomingIds.has(existingId)) {
          if (['pending', 'proposed', 'requested'].includes(existingSlot.status)) {
            slotsToDelete.push(existingId)
          }
        }
      })

      for (const slot of data.timeSlots) {
        if (slot.id && existingMap.has(slot.id)) {
          const existing = existingMap.get(slot.id)!
          const isModified =
            existing.slot_date !== slot.slot_date ||
            existing.start_time !== slot.start_time ||
            existing.end_time !== slot.end_time

          if (isModified) {
            slotsToUpdate.push({
              id: slot.id,
              data: { slot_date: slot.slot_date, start_time: slot.start_time, end_time: slot.end_time },
              oldData: { slot_date: existing.slot_date, start_time: existing.start_time, end_time: existing.end_time }
            })
          }
        } else {
          slotsToInsert.push(slot)
        }
      }

      if (slotsToDelete.length > 0) {
        await supabase
          .from('intervention_time_slots')
          .delete()
          .in('id', slotsToDelete)
        logger.info({ count: slotsToDelete.length }, 'Deleted time slots')
      }

      if (slotsToUpdate.length > 0) {
        await Promise.all(slotsToUpdate.map(update =>
          supabase
            .from('intervention_time_slots')
            .update(update.data)
            .eq('id', update.id)
        ))
        logger.info({ count: slotsToUpdate.length, changes: slotsToUpdate }, 'Updated time slots')
      }

      if (slotsToInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('intervention_time_slots')
          .insert(slotsToInsert.map(slot => ({
            intervention_id: interventionId,
            slot_date: slot.slot_date,
            start_time: slot.start_time,
            end_time: slot.end_time,
            status: 'pending',
            proposed_by: user.id
          })))

        if (insertError) {
          logger.error({ error: insertError }, 'Error inserting time slots')
        } else {
          logger.info({ count: slotsToInsert.length }, 'Inserted new time slots')
        }
      }

      const slotChanges = {
        deleted: slotsToDelete.length,
        updated: slotsToUpdate.length,
        inserted: slotsToInsert.length,
        unchanged: data.timeSlots.length - slotsToInsert.length - slotsToUpdate.length,
        details: slotsToUpdate
      }
      logger.info(slotChanges, 'Time slots changes summary')
    }

    // Update requires_confirmation per assignment
    if (data.confirmationRequiredUserIds !== undefined) {
      await supabase
        .from('intervention_assignments')
        .update({ requires_confirmation: false })
        .eq('intervention_id', interventionId)

      if (data.confirmationRequiredUserIds.length > 0) {
        await supabase
          .from('intervention_assignments')
          .update({ requires_confirmation: true })
          .eq('intervention_id', interventionId)
          .in('user_id', data.confirmationRequiredUserIds)
      }
      logger.info({ count: data.confirmationRequiredUserIds.length }, 'Confirmation requirements updated')
    }

    // Create quote requests if requires_quote is enabled and providers are assigned
    if (data.requires_quote && data.assignedProviderIds && data.assignedProviderIds.length > 0) {
      try {
        logger.info({ interventionId, providerCount: data.assignedProviderIds.length }, 'Creating quote requests for providers')

        const { data: existingQuotes } = await supabase
          .from('intervention_quotes')
          .select('id, provider_id, status')
          .eq('intervention_id', interventionId)
          .in('status', ['pending', 'sent'])

        const existingProviderIds = new Set(
          (existingQuotes || []).map(q => q.provider_id)
        )

        const newProviderIds = data.assignedProviderIds.filter(
          providerId => !existingProviderIds.has(providerId)
        )

        if (newProviderIds.length > 0) {
          await createQuoteRequestsForProviders({
            interventionId,
            teamId: existingIntervention.team_id,
            providerIds: newProviderIds,
            createdBy: user.id,
            messageType: 'global',
            globalMessage: data.provider_guidelines || undefined,
            supabase
          })

          logger.info({ newQuotesCount: newProviderIds.length }, 'Quote requests created for new providers')
        } else {
          logger.info({}, 'Skipped quote creation - all providers already have active quotes')
        }
      } catch (quoteError) {
        logger.error({ error: quoteError }, 'Error creating quote requests')
      }
    }

    // Soft delete documents if requested
    if (data.documentsToDelete && data.documentsToDelete.length > 0) {
      try {
        const { error: deleteDocsError } = await supabase
          .from('intervention_documents')
          .update({ deleted_at: new Date().toISOString() })
          .eq('intervention_id', interventionId)
          .in('id', data.documentsToDelete)

        if (deleteDocsError) {
          logger.error({ error: deleteDocsError }, 'Error soft-deleting documents')
        } else {
          logger.info({ count: data.documentsToDelete.length }, 'Documents soft-deleted')
        }
      } catch (docDeleteError) {
        logger.error({ error: docDeleteError }, 'Unexpected error soft-deleting documents')
      }
    }

    logger.info({ interventionId }, 'Intervention updated successfully')

    return { success: true, data: updatedIntervention }
  } catch (error) {
    logger.error({ error }, 'Unexpected error in updateInterventionAction')
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Get interventions with filters
 */
export async function getInterventionsAction(
  filters?: z.infer<typeof InterventionFiltersSchema>
): Promise<ActionResult<Intervention[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const validatedFilters = filters ? InterventionFiltersSchema.parse(filters) : undefined

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getByTeam(user.team_id, validatedFilters)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch interventions' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching interventions:', error)
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
 * Get dashboard statistics
 */
export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getDashboardStats(user.team_id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch dashboard stats' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching dashboard stats:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get my interventions
 */
export async function getMyInterventionsAction(): Promise<ActionResult<Intervention[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getMyInterventions(user.id, user.role)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch interventions' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching my interventions:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get intervention count for a property (lot or building)
 */
export async function getInterventionCountByPropertyAction(
  propertyType: 'lot' | 'building',
  propertyId: string
): Promise<ActionResult<number>> {
  try {
    const { supabase, user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifie' }
    }

    const column = propertyType === 'lot' ? 'lot_id' : 'building_id'
    const { count, error } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .eq(column, propertyId)
      .is('deleted_at', null)

    if (error) {
      logger.error('[SERVER-ACTION] Error counting interventions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: count || 0 }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error counting interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Load interventions with pagination support
 */
export async function loadInterventionsPaginatedAction(
  teamId: string,
  options?: {
    limit?: number
    offset?: number
    filters?: {
      status?: InterventionStatus
      urgency?: string
      type?: string
      building_id?: string
      lot_id?: string
    }
  }
): Promise<ActionResult<{
  data: Intervention[]
  total: number
  hasMore: boolean
}>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()

    if (!authContext) {
      return { success: false, error: 'Non authentifie' }
    }

    if (authContext.team.id !== teamId && !authContext.activeTeamIds.includes(teamId)) {
      return { success: false, error: 'Acces non autorise a cette equipe' }
    }

    const interventionService = await createServerActionInterventionService()

    const result = await interventionService.getByTeamPaginated(teamId, {
      limit: options?.limit ?? 50,
      offset: options?.offset ?? 0,
      filters: options?.filters
    })

    if (!result.success) {
      return { success: false, error: result.error || 'Erreur lors du chargement' }
    }

    return {
      success: true,
      data: {
        data: result.data,
        total: result.total,
        hasMore: result.hasMore
      }
    }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error loading paginated interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}
