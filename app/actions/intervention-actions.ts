'use server'

/**
 * Intervention Server Actions
 * Server-side operations for intervention management with proper auth context
 * Handles the complete 11-status workflow
 *
 * ✅ REFACTORED (Jan 2026): Uses centralized getServerActionAuthContextOrNull()
 *    instead of duplicated local auth helper
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
import { createQuoteRequestsForProviders } from '@/app/api/create-manager-intervention/create-quote-requests'
import { createInterventionNotification } from './notification-actions'
import { ensureInterventionConversationThreads } from './conversation-actions'
import { mapInterventionType } from '@/lib/utils/intervention-mappers'
import {
  determineInterventionStatus,
  mapOptionToSchedulingType,
  computeScheduledDate,
  createFixedSlot,
  createProposedSlots,
  clearTimeSlots,
  updateConfirmationRequirements,
  storeProviderGuidelines,
} from '@/lib/services/domain/scheduling-service'

// Type aliases
type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
type InterventionType = Database['public']['Enums']['intervention_type']
type InterventionStatus = Database['public']['Enums']['intervention_status']
type Intervention = Database['public']['Tables']['interventions']['Row']
type UserRole = Database['public']['Enums']['user_role']

/**
 * Helper: Send system message when a participant is added to an intervention
 * Message is sent to the GROUP thread so all participants see it
 */
async function sendParticipantAddedSystemMessage(
  interventionId: string,
  addedUserId: string,
  addedUserRole: 'gestionnaire' | 'prestataire' | 'locataire',
  addedByUser: { id: string; name: string }
) {
  const supabase = createServiceRoleSupabaseClient()

  // Fetch user details and group thread in parallel (independent queries)
  const [userResult, threadResult] = await Promise.all([
    supabase.from('users').select('id, name, role').eq('id', addedUserId).single(),
    supabase.from('conversation_threads').select('id')
      .eq('intervention_id', interventionId).eq('thread_type', 'group').single()
  ])

  const { data: addedUser, error: userError } = userResult
  const { data: groupThread, error: threadError } = threadResult

  if (userError || !addedUser) {
    logger.error('❌ [SYSTEM-MESSAGE] Could not find added user:', userError)
    return
  }
  if (threadError || !groupThread) {
    logger.error('❌ [SYSTEM-MESSAGE] Could not find group thread:', threadError)
    return
  }

  // Format role in French
  const roleFr: Record<string, string> = {
    gestionnaire: 'Gestionnaire',
    prestataire: 'Prestataire',
    locataire: 'Locataire',
    admin: 'Admin'
  }
  const roleLabel = roleFr[addedUserRole] || addedUserRole

  // Build system message
  const content = `🔔 ${addedUser.name} (${roleLabel}) a été ajouté à l'intervention par ${addedByUser.name}`

  // Insert the system message
  const { error: msgError } = await supabase
    .from('conversation_messages')
    .insert({
      thread_id: groupThread.id,
      user_id: addedByUser.id,
      content,
      metadata: {
        source: 'system',
        action: 'participant_added',
        added_user_id: addedUserId,
        added_user_name: addedUser.name,
        added_user_role: addedUserRole
      }
    })

  if (msgError) {
    logger.error('❌ [SYSTEM-MESSAGE] Failed to insert message:', msgError)
    return
  }

  logger.info('✅ [SYSTEM-MESSAGE] Participant added message sent:', {
    threadId: groupThread.id,
    addedUser: addedUser.name,
    addedBy: addedByUser.name
  })
}

// Action result type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

/**
 * Check if a lot is locked by subscription restriction.
 * Returns error message if locked, null if accessible.
 * Fail-open: returns null on any error (doesn't block users on service failures).
 */
async function checkLotLockedBySubscription(lotId: string | null | undefined, teamId: string): Promise<string | null> {
  if (!lotId) return null
  try {
    const { createSubscriptionService } = await import('@/lib/services/domain/subscription-helpers')
    const { SubscriptionRepository } = await import('@/lib/services/repositories/subscription.repository')
    const serviceRoleClient = createServiceRoleSupabaseClient()
    const service = createSubscriptionService(serviceRoleClient)
    const serviceRoleRepo = new SubscriptionRepository(serviceRoleClient)
    const subscriptionInfo = await service.getSubscriptionInfo(teamId, serviceRoleRepo)
    if (!subscriptionInfo) return null
    const accessibleLotIds = await service.getAccessibleLotIds(teamId, subscriptionInfo, serviceRoleClient)
    if (!accessibleLotIds) return null // null = all accessible
    if (accessibleLotIds.includes(lotId)) return null // lot is in accessible list
    return 'Lot verrouillé — souscrivez pour y accéder'
  } catch (error) {
    logger.warn('[INTERVENTION] Subscription check failed, allowing access (fail-open)', { lotId, teamId, error })
    return null
  }
}

/**
 * Check if an intervention's lot is locked by looking up the intervention first.
 * Used by status change actions where we have intervention ID but not lot_id.
 */
async function checkInterventionLotLocked(interventionId: string, teamId: string): Promise<string | null> {
  try {
    const supabase = createServiceRoleSupabaseClient()
    const { data: intervention } = await supabase
      .from('interventions')
      .select('lot_id')
      .eq('id', interventionId)
      .limit(1)
      .single()
    if (!intervention?.lot_id) return null
    return checkLotLockedBySubscription(intervention.lot_id, teamId)
  } catch {
    return null // Fail open
  }
}

// Pages are force-dynamic — no cache invalidation needed

// Validation schemas
// NOTE: type uses z.string() to accept all intervention types from intervention_types table
// (bien, bail, locataire categories - 36+ types) instead of hardcoded enum
const InterventionCreateSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  type: z.string().min(1, "Le type d'intervention est obligatoire"),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional().default('normale'),
  lot_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid(),
  contract_id: z.string().uuid().optional().nullable()  // Lien vers le contrat source
})

const InterventionUpdateSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  type: z.string().min(1).optional(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional(),
  provider_guidelines: z.string().max(5000).optional().nullable(),
  estimated_cost: z.number().positive().optional().nullable(),
  final_cost: z.number().positive().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable()
})

const TimeSlotSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  duration_minutes: z.number().positive().optional()
})

const InterventionFiltersSchema = z.object({
  // Note: 'en_cours' and 'demande_de_devis' are removed from the workflow
  // Quote status is now tracked via intervention_quotes table with QuoteStatusBadge
  status: z.enum(['demande', 'rejetee', 'approuvee', 'planification', 'planifiee', 'cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee'] as const).optional(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional(),
  type: z.string().optional(),
  building_id: z.string().uuid().optional(),
  lot_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  assigned_to: z.string().uuid().optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional()
})

// Dashboard stats type
interface DashboardStats {
  total: number
  by_status: Record<InterventionStatus, number>
  by_urgency: Record<InterventionUrgency, number>
  by_type: Partial<Record<InterventionType, number>>
  average_resolution_time: number | null
  pending_quotes: number
  overdue: number
  upcoming: number
  completed_this_month: number
}

// ✅ REFACTORED: Auth helper removed - now using centralized getServerActionAuthContextOrNull()
// from lib/server-context.ts

/**
 * Create a new intervention (for tenant requests)
 * Used by InterventionRequestForm component
 *
 * @param data - Intervention data
 * @param options - Optional configuration including redirectTo for server-side redirect
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
    contract_id?: string  // Lien vers le contrat source (optionnel)
    requested_date?: Date
  },
  options?: {
    redirectTo?: string
    useServiceRole?: boolean  // Bypass RLS pour création batch (auth vérifiée au niveau applicatif)
    assignments?: Array<{ userId: string; role: string }>  // Personnes à assigner à l'intervention
  }
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check - TOUJOURS vérifié, même avec useServiceRole
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Subscription restriction: block creation on locked lots
    const lotLocked = await checkLotLockedBySubscription(data.lot_id, data.team_id)
    if (lotLocked) {
      return { success: false, error: lotLocked }
    }

    // Validate input data
    const validatedData = InterventionCreateSchema.safeParse({
      ...data,
      type: data.type,  // Accepts all types from intervention_types table
      urgency: (data.urgency || 'normale') as InterventionUrgency
    })

    if (!validatedData.success) {
      logger.warn({ errors: validatedData.error.errors }, 'Intervention creation validation failed')
      return { success: false, error: 'Données invalides: ' + validatedData.error.errors.map(e => e.message).join(', ') }
    }

    // Choisir le client selon l'option useServiceRole
    // Service role bypasse RLS mais l'auth est vérifiée au niveau applicatif ci-dessus
    const supabase = options?.useServiceRole
      ? createServiceRoleSupabaseClient()
      : await createServerActionSupabaseClient()

    // Map type for legacy compatibility (e.g., 'jardinage' → 'espaces_verts')
    const mappedType = mapInterventionType(validatedData.data.type)

    // ✅ Déterminer si c'est une intervention pré-planifiée (création depuis bail)
    // Si requested_date est fourni → status 'planifiee' avec créneau à 9h00
    const isPreScheduled = !!data.requested_date

    // Create intervention (status dynamique selon contexte)
    const { data: intervention, error } = await supabase
      .from('interventions')
      .insert({
        title: validatedData.data.title,
        description: validatedData.data.description,
        type: mappedType,
        urgency: validatedData.data.urgency,
        // ✅ Status dynamique: 'planifiee' si date fournie (bail), sinon 'demande' (locataire)
        status: (isPreScheduled ? 'planifiee' : 'demande') as InterventionStatus,
        lot_id: validatedData.data.lot_id || null,
        building_id: validatedData.data.building_id || null,
        team_id: validatedData.data.team_id,
        contract_id: validatedData.data.contract_id || null,
        created_by: user.id,
        // ✅ Date planifiée à 9h00 si fournie
        scheduled_date: data.requested_date
          ? data.requested_date.toISOString().split('T')[0] + 'T09:00:00.000Z'
          : null,
        // ✅ Méthode de planification directe si pré-planifié (valeurs: 'direct', 'slots', 'flexible')
        scheduling_method: isPreScheduled ? 'direct' : null,
        creation_source: 'wizard'
      })
      .select()
      .single()

    if (error) {
      logger.error({ error }, 'Failed to create intervention')
      return { success: false, error: 'Échec de la création de l\'intervention' }
    }

    // ✅ Créer un créneau horaire fixé à 9h00 si pré-planifié (création depuis bail)
    if (isPreScheduled && data.requested_date && intervention) {
      const slotDate = data.requested_date.toISOString().split('T')[0] // YYYY-MM-DD

      const { data: timeSlot, error: slotError } = await supabase
        .from('intervention_time_slots')
        .insert({
          intervention_id: intervention.id,
          slot_date: slotDate,
          start_time: '09:00',
          end_time: '10:00',  // 1 heure par défaut
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
        // Mettre à jour l'intervention avec le slot sélectionné
        await supabase
          .from('interventions')
          .update({ selected_slot_id: timeSlot.id })
          .eq('id', intervention.id)

        logger.info({ slotId: timeSlot.id, interventionId: intervention.id }, 'Time slot created and linked')
      }
    }

    // Assigner les utilisateurs via la logique centralisée (même flow que gestionnaire UI)
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

    // Create notification for managers (non-blocking, runs after response)
    after(async () => {
      try {
        await createInterventionNotification(intervention.id)
      } catch (notifError) {
        logger.warn({ error: notifError }, 'Failed to create intervention notification (non-blocking)')
      }
    })

    logger.info({ interventionId: intervention.id }, 'Intervention created successfully by tenant')

    // Server-side redirect if requested (Next.js 15 pattern)
    if (options?.redirectTo) {
      redirect(options.redirectTo)
    }

    return { success: true, data: intervention }
  } catch (error) {
    // Propagate NEXT_REDIRECT (thrown by redirect())
    if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
      throw error
    }
    logger.error({ error }, 'Unexpected error in createInterventionAction')
    return { success: false, error: 'Erreur inattendue' }
  }
}

/**
 * Batch create rent payment reminders for a contract.
 * Replaces N × createInterventionAction calls with:
 * 1 auth check, 1 subscription check, 1 bulk insert + 1 bulk time_slot insert.
 */
export async function createBatchRentRemindersAction(
  reminders: Array<{
    title: string
    scheduledDate: string // ISO date string YYYY-MM-DD
  }>,
  config: {
    lot_id: string
    team_id: string
    contract_id: string
    assignments?: Array<{ userId: string; role: string }>
  }
): Promise<ActionResult<{ successCount: number; totalCount: number }>> {
  try {
    // 1 auth check for ALL reminders
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // 1 subscription check for ALL reminders
    const lotLocked = await checkLotLockedBySubscription(config.lot_id, config.team_id)
    if (lotLocked) {
      return { success: false, error: lotLocked }
    }

    // Use service role client (same as individual createInterventionAction with useServiceRole: true)
    const supabase = createServiceRoleSupabaseClient()

    // Bulk INSERT all interventions at once
    const interventionRows = reminders.map(r => ({
      title: r.title,
      description: 'Rappel mensuel de paiement du loyer',
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
      return { success: false, error: 'Échec de la création des rappels de loyer' }
    }

    // Bulk INSERT all time_slots at once
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
      // Parallel UPDATE each intervention with its selected_slot_id
      await Promise.all(
        timeSlots.map(slot =>
          supabase
            .from('interventions')
            .update({ selected_slot_id: slot.id })
            .eq('id', slot.intervention_id)
        )
      )
    }

    // Bulk INSERT all assignments at once
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

    // Notifications deferred to after() — non-blocking
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate UUID format
    if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return { success: false, error: 'Invalid intervention ID format' }
    }

    const supabase = await createServerActionSupabaseClient()

    // Fetch intervention
    const { data: intervention, error } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !intervention) {
      logger.error('❌ [SERVER-ACTION] Error fetching intervention:', { error, id })
      return { success: false, error: error?.message || 'Intervention not found' }
    }

    logger.info('✅ [SERVER-ACTION] Intervention fetched:', { id, status: intervention.status })

    return { success: true, data: intervention }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching intervention:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Update an existing intervention
 * Handles updating basic info, participants (assignments), and time slots
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
      id?: string  // ✅ Optionnel - présent pour slots existants, absent pour nouveaux
      slot_date: string
      start_time: string
      end_time: string
    }>
    // Mode d'assignation et confirmation
    assignment_mode?: 'single' | 'group'
    requires_participant_confirmation?: boolean
    confirmationRequiredUserIds?: string[]
    // Documents à supprimer (soft delete)
    documentsToDelete?: string[]
    // Planification
    scheduling_type?: 'fixed' | 'flexible' | 'slots'
    scheduled_date?: string | null
  }
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate UUID format
    if (!interventionId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(interventionId)) {
      return { success: false, error: 'Invalid intervention ID format' }
    }

    const supabase = await createServerActionSupabaseClient()

    // Verify intervention exists and user has access
    const { data: existingIntervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*, team_id')
      .eq('id', interventionId)
      .single()

    if (fetchError || !existingIntervention) {
      return { success: false, error: 'Intervention not found' }
    }

    // Subscription restriction: block updates on locked lots
    const lotLocked = await checkLotLockedBySubscription(existingIntervention.lot_id, existingIntervention.team_id)
    if (lotLocked) return { success: false, error: lotLocked }

    // Update basic intervention data
    const updateData: Record<string, unknown> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.description !== undefined) updateData.description = data.description
    if (data.type !== undefined) updateData.type = data.type as InterventionType
    if (data.urgency !== undefined) updateData.urgency = data.urgency as InterventionUrgency
    if (data.provider_guidelines !== undefined) updateData.provider_guidelines = data.provider_guidelines
    if (data.requires_quote !== undefined) updateData.requires_quote = data.requires_quote
    // Mode d'assignation et confirmation
    if (data.assignment_mode !== undefined) updateData.assignment_mode = data.assignment_mode
    if (data.requires_participant_confirmation !== undefined) {
      updateData.requires_participant_confirmation = data.requires_participant_confirmation
    }
    // Planification
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
      // Get current assignments
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

      // Delete old assignments (except tenant assignments)
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

      // Insert new assignments
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
      // Get current tenant assignments
      const { data: currentTenantAssignments } = await supabase
        .from('intervention_assignments')
        .select('id, user_id')
        .eq('intervention_id', interventionId)
        .eq('role', 'locataire')

      const currentTenantIds = new Set(
        currentTenantAssignments?.map(a => a.user_id) || []
      )
      const newTenantIds = new Set(data.assignedTenantIds)

      // Delete removed tenants
      const tenantsToDelete = currentTenantAssignments?.filter(
        a => !newTenantIds.has(a.user_id)
      ) || []

      if (tenantsToDelete.length > 0) {
        await supabase
          .from('intervention_assignments')
          .delete()
          .in('id', tenantsToDelete.map(a => a.id))
      }

      // Insert new tenants
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
          logger.info({ created: threadResult.data.created }, '✅ Conversation threads ensured')
        } else {
          logger.warn({ error: threadResult.error }, 'Failed to ensure conversation threads (non-blocking)')
        }
      } catch (error) {
        logger.warn({ error }, 'Error ensuring conversation threads (non-blocking)')
      }
    }

    // Update time slots if provided - Intelligent upsert with change tracking
    if (data.timeSlots !== undefined) {
      logger.info({ count: data.timeSlots.length }, '📅 Processing time slots update')

      // 1. Récupérer les slots existants pour cette intervention
      const { data: existingSlots } = await supabase
        .from('intervention_time_slots')
        .select('id, slot_date, start_time, end_time, status')
        .eq('intervention_id', interventionId)

      // Type explicite pour éviter les erreurs TS avec Map iteration
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

      // 2. Catégoriser les slots incoming
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

      // Identifier les slots à supprimer (existants non présents dans incoming)
      existingMap.forEach((existingSlot, existingId) => {
        if (!incomingIds.has(existingId)) {
          // Ne supprimer que les slots modifiables (pending, proposed, requested)
          // Les slots 'selected', 'cancelled', 'rejected' sont des états finaux
          if (['pending', 'proposed', 'requested'].includes(existingSlot.status)) {
            slotsToDelete.push(existingId)
          }
        }
      })

      // Identifier les slots à insérer ou mettre à jour
      for (const slot of data.timeSlots) {
        if (slot.id && existingMap.has(slot.id)) {
          // Slot existant - vérifier si modifié
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
          // Si non modifié, on ne fait rien (SKIP)
        } else {
          // Nouveau slot (pas d'ID ou ID non trouvé)
          slotsToInsert.push(slot)
        }
      }

      // 3. Exécuter les opérations DB

      // DELETE - Supprimer les slots retirés
      if (slotsToDelete.length > 0) {
        await supabase
          .from('intervention_time_slots')
          .delete()
          .in('id', slotsToDelete)
        logger.info({ count: slotsToDelete.length }, '🗑️ Deleted time slots')
      }

      // UPDATE - Mettre à jour les slots modifiés
      if (slotsToUpdate.length > 0) {
        await Promise.all(slotsToUpdate.map(update =>
          supabase
            .from('intervention_time_slots')
            .update(update.data)
            .eq('id', update.id)
        ))
        logger.info({ count: slotsToUpdate.length, changes: slotsToUpdate }, '✏️ Updated time slots')
      }

      // INSERT - Insérer les nouveaux slots
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
          logger.error({ error: insertError }, '❌ Error inserting time slots')
        } else {
          logger.info({ count: slotsToInsert.length }, '➕ Inserted new time slots')
        }
      }

      // 4. Résumé des modifications (pour notifications futures)
      const slotChanges = {
        deleted: slotsToDelete.length,
        updated: slotsToUpdate.length,
        inserted: slotsToInsert.length,
        unchanged: data.timeSlots.length - slotsToInsert.length - slotsToUpdate.length,
        details: slotsToUpdate // Contient old vs new pour chaque slot modifié
      }
      logger.info(slotChanges, '📊 Time slots changes summary')
    }

    // Update requires_confirmation per assignment
    if (data.confirmationRequiredUserIds !== undefined) {
      // Reset all assignments to not require confirmation
      await supabase
        .from('intervention_assignments')
        .update({ requires_confirmation: false })
        .eq('intervention_id', interventionId)

      // Set requires_confirmation to true for selected users
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
        logger.info({ interventionId, providerCount: data.assignedProviderIds.length }, '💰 Creating quote requests for providers')

        // Check for existing active quotes to avoid duplicates
        const { data: existingQuotes } = await supabase
          .from('intervention_quotes')
          .select('id, provider_id, status')
          .eq('intervention_id', interventionId)
          .in('status', ['pending', 'sent'])

        // Build set of provider IDs that already have active quotes
        const existingProviderIds = new Set(
          (existingQuotes || []).map(q => q.provider_id)
        )

        // Filter out providers who already have active quotes
        const newProviderIds = data.assignedProviderIds.filter(
          providerId => !existingProviderIds.has(providerId)
        )

        // Only create quotes for NEW providers
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

          logger.info({ newQuotesCount: newProviderIds.length }, '✅ Quote requests created for new providers')
        } else {
          logger.info({}, '⏭️ Skipped quote creation - all providers already have active quotes')
        }
      } catch (quoteError) {
        logger.error({ error: quoteError }, '❌ Error creating quote requests')
        // Don't fail the whole operation if quote creation fails
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
          logger.error({ error: deleteDocsError }, '❌ Error soft-deleting documents')
          // Don't fail the whole operation if document deletion fails
        } else {
          logger.info({ count: data.documentsToDelete.length }, '✅ Documents soft-deleted')
        }
      } catch (docDeleteError) {
        logger.error({ error: docDeleteError }, '❌ Unexpected error soft-deleting documents')
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate filters if provided
    const validatedFilters = filters ? InterventionFiltersSchema.parse(filters) : undefined

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getByTeam(user.team_id, validatedFilters)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch interventions' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching interventions:', error)
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
 * ASSIGNMENT OPERATIONS
 */

/**
 * Assign user to intervention
 */
export async function assignUserAction(
  interventionId: string,
  userId: string,
  role: 'gestionnaire' | 'prestataire' | 'locataire'
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can assign users
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can assign users to interventions' }
    }

    logger.info('👤 [SERVER-ACTION] Assigning user to intervention:', {
      interventionId,
      assignedUserId: userId,
      role,
      assignedBy: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.assignUser(interventionId, userId, role, user.id)

    if (result.success) {
      // Send system message to group thread
      try {
        await sendParticipantAddedSystemMessage(interventionId, userId, role, user)
      } catch (msgError) {
        // Don't fail the assignment if system message fails
        logger.error('⚠️ [SERVER-ACTION] Failed to send system message:', msgError)
      }

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to assign user' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error assigning user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Unassign user from intervention
 */
export async function unassignUserAction(
  interventionId: string,
  userId: string,
  role: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can unassign users
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can unassign users from interventions' }
    }

    logger.info('👤 [SERVER-ACTION] Unassigning user from intervention:', {
      interventionId,
      unassignedUserId: userId,
      role,
      unassignedBy: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.unassignUser(interventionId, userId, role, user.id)

    if (result.success) {
      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to unassign user' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error unassigning user:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * WORKFLOW STATUS TRANSITIONS (11 status transitions)
 */

/**
 * Approve intervention
 */
export async function approveInterventionAction(
  id: string,
  comment?: string
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can approve
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can approve interventions' }
    }

    // Subscription restriction: block status changes on locked lots
    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('✅ [SERVER-ACTION] Approving intervention:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.approveIntervention(id, user.id, comment)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to approve intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error approving intervention:', error)
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Subscription restriction: block status changes on locked lots
    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    // Only managers can reject
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can reject interventions' }
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Rejection reason must be at least 10 characters' }
    }

    logger.info('❌ [SERVER-ACTION] Rejecting intervention:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.rejectIntervention(id, user.id, reason)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to reject intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error rejecting intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Request quote from provider
 */
export async function requestQuoteAction(
  id: string,
  providerId: string
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can request quotes
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can request quotes' }
    }

    logger.info('💰 [SERVER-ACTION] Requesting quote:', {
      id,
      providerId,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.requestQuote(id, user.id, providerId)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to request quote' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error requesting quote:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Cancel a quote request (change status from 'pending' to 'cancelled')
 * Only managers can cancel quote requests, and only if the quote is still pending
 */
export async function cancelQuoteAction(
  quoteId: string,
  interventionId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can cancel quote requests
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Seuls les gestionnaires peuvent annuler une demande d\'estimation' }
    }

    logger.info('❌ [SERVER-ACTION] Cancelling quote request:', {
      quoteId,
      interventionId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Verify the quote exists and is pending
    const { data: quote, error: fetchError } = await supabase
      .from('intervention_quotes')
      .select('id, status, intervention_id')
      .eq('id', quoteId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !quote) {
      return { success: false, error: 'Estimation non trouvée' }
    }

    if (quote.status !== 'pending') {
      return { success: false, error: 'Seules les demandes en attente peuvent être annulées' }
    }

    // Update the quote status to cancelled
    const { error: updateError } = await supabase
      .from('intervention_quotes')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', quoteId)

    if (updateError) {
      logger.error('❌ [SERVER-ACTION] Error cancelling quote:', updateError)
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error cancelling quote:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' }
  }
}

/**
 * Start planning
 */
export async function startPlanningAction(id: string): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can start planning
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can start planning' }
    }

    // Subscription restriction: block status changes on locked lots
    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('📅 [SERVER-ACTION] Starting planning:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.startPlanning(id, user.id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to start planning' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error starting planning:', error)
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('📆 [SERVER-ACTION] Confirming schedule:', {
      id,
      slotId,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.confirmSchedule(id, user.id, slotId)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to confirm schedule' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error confirming schedule:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Start intervention
 * @deprecated The 'en_cours' status is deprecated. Use completeByProviderAction() instead.
 * Interventions now go directly from 'planifiee' to 'cloturee_par_prestataire'.
 * This action now delegates to completeByProviderAction for backward compatibility.
 */
export async function startInterventionAction(id: string): Promise<ActionResult<Intervention>> {
  // DEPRECATED: Log warning and delegate to completeByProvider
  logger.warn('⚠️ [DEPRECATED] startInterventionAction is deprecated. Use completeByProviderAction instead.')

  // Delegate to completeByProvider for backward compatibility
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only providers can complete
    if (user.role !== 'prestataire') {
      return { success: false, error: 'Only providers can complete interventions' }
    }

    logger.info('🏁 [SERVER-ACTION] Provider completing intervention:', {
      id,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.completeByProvider(id, user.id, report)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to complete intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error completing intervention:', error)
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only tenants can validate
    if (user.role !== 'locataire') {
      return { success: false, error: 'Only tenants can validate interventions' }
    }

    // Validate satisfaction score
    if (satisfaction !== undefined && (satisfaction < 1 || satisfaction > 5)) {
      return { success: false, error: 'Satisfaction score must be between 1 and 5' }
    }

    logger.info('✔️ [SERVER-ACTION] Tenant validating intervention:', {
      id,
      userId: user.id,
      satisfaction
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.validateByTenant(id, user.id, satisfaction)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to validate intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error validating intervention:', error)
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can finalize
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can finalize interventions' }
    }

    // Subscription restriction: block status changes on locked lots
    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    // Validate final cost
    if (finalCost !== undefined && finalCost < 0) {
      return { success: false, error: 'Final cost cannot be negative' }
    }

    logger.info('🎯 [SERVER-ACTION] Manager finalizing intervention:', {
      id,
      userId: user.id,
      finalCost
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.finalizeByManager(id, user.id, finalCost)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to finalize intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error finalizing intervention:', error)
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
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Cancellation reason must be at least 10 characters' }
    }

    // Subscription restriction: block status changes on locked lots
    if (authContext?.team?.id) {
      const lotLocked = await checkInterventionLotLocked(id, authContext.team.id)
      if (lotLocked) return { success: false, error: lotLocked }
    }

    logger.info('[SERVER-ACTION] Cancelling intervention:', {
      id,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.cancelIntervention(id, user.id, reason)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to cancel intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error cancelling intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * TIME SLOT OPERATIONS
 */

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

    logger.info('⏰ [SERVER-ACTION] Proposing time slots:', {
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
    logger.error('❌ [SERVER-ACTION] Error proposing time slots:', error)
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

    logger.info('⏰ [SERVER-ACTION] Selecting time slot:', {
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
      logger.error('❌ Error checking slot validation:', validationError)
      return {
        success: false,
        error: 'Erreur lors de la validation du créneau'
      }
    }

    if (!canFinalize) {
      logger.warn('⚠️ Slot validation requirements not met')
      return {
        success: false,
        error: 'Validation incomplète : au moins 1 locataire ET le prestataire doivent accepter ce créneau'
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
    logger.error('❌ [SERVER-ACTION] Error selecting time slot:', error)
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

    logger.info('🚫 [SERVER-ACTION] Cancelling time slot:', {
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
      logger.error('❌ Time slot not found:', fetchError)
      return { success: false, error: 'Créneau introuvable' }
    }

    // Check permissions (RLS already verified access via the slot fetch above)
    const isProposer = slot.proposed_by === user.id
    const isAdmin = user.role === 'admin'
    const isManager = user.role === 'gestionnaire'

    if (!isProposer && !isManager && !isAdmin) {
      logger.warn('⚠️ Permission denied: User cannot cancel this time slot')
      return {
        success: false,
        error: 'Vous n\'avez pas la permission d\'annuler ce créneau'
      }
    }

    // Check if slot is already cancelled or selected
    if (slot.status === 'cancelled') {
      return { success: false, error: 'Ce créneau est déjà annulé' }
    }

    if (slot.status === 'selected') {
      return {
        success: false,
        error: 'Impossible d\'annuler un créneau sélectionné. Veuillez d\'abord le désélectionner.'
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
      logger.error('❌ Error cancelling time slot:', updateError)
      return { success: false, error: 'Erreur lors de l\'annulation du créneau' }
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

    logger.success('✅ Time slot cancelled successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error cancelling time slot:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * TIME SLOT RESPONSE ACTIONS - Granular Accept/Reject Tracking
 */

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
  supabase: any,
  slotId: string,
  interventionId: string
): Promise<boolean> {
  try {
    logger.info('🔍 [AUTO-CONFIRM] Checking if slot can be auto-confirmed:', {
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
      logger.warn('⚠️ [AUTO-CONFIRM] Intervention not found')
      return false
    }

    if (intervention.status !== 'planification') {
      logger.info('⏳ [AUTO-CONFIRM] Cannot auto-confirm: intervention not in planification status', {
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
      logger.error('❌ [AUTO-CONFIRM] Error checking pending responses:', pendingError)
      return false
    }

    if (pendingResponses && pendingResponses.length > 0) {
      // Still has pending responses - cannot auto-confirm
      logger.info('⏳ [AUTO-CONFIRM] Cannot auto-confirm: pending responses exist', {
        pendingCount: pendingResponses.length,
        pendingRoles: pendingResponses.map((r: any) => r.user_role)
      })
      return false
    }

    // 3. Use SQL function to check validation requirements (at least 1 tenant + provider accepted)
    const { data: canFinalize, error: validateError } = await supabase.rpc(
      'check_timeslot_can_be_finalized',
      { slot_id_param: slotId }
    )

    if (validateError) {
      logger.error('❌ [AUTO-CONFIRM] Error calling validation function:', validateError)
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

      logger.info('⏳ [AUTO-CONFIRM] Cannot auto-confirm: validation requirements not met', {
        slotStatus: slot?.status,
        summary: {
          selected_by_manager: slot?.selected_by_manager,
          selected_by_provider: slot?.selected_by_provider,
          selected_by_tenant: slot?.selected_by_tenant
        },
        assignedRoles: assignments?.map(a => a.role) || [],
        responses: responses?.map(r => ({ role: r.user_role, response: r.response })) || []
      })
      return false
    }

    logger.info('✅ [AUTO-CONFIRM] Slot meets all auto-confirmation criteria')
    return true
  } catch (error) {
    logger.error('❌ [AUTO-CONFIRM] Exception checking auto-confirmation:', error)
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

    logger.info('✅ [SERVER-ACTION] Accepting time slot:', {
      slotId,
      interventionId,
      userId: user.id,
      userRole: user.role
    })

    const supabase = await createServerActionSupabaseClient()

    // RLS already enforces access — if the user can fetch the slot, they have permission
    // 🔍 Get the time slot
    const { data: slot, error: fetchError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !slot) {
      logger.error('❌ Time slot not found:', {
        error: fetchError,
        slotId,
        interventionId,
        errorCode: fetchError?.code,
        errorMessage: fetchError?.message
      })
      return { success: false, error: 'Créneau introuvable' }
    }

    // Cannot accept own slot
    if (slot.proposed_by === user.id) {
      return {
        success: false,
        error: 'Vous ne pouvez pas accepter votre propre créneau'
      }
    }

    // Cannot accept if slot is cancelled
    if (slot.status === 'cancelled' || slot.status === 'rejected') {
      return {
        success: false,
        error: 'Ce créneau a été annulé ou rejeté'
      }
    }

    // 🔍 STEP 4: Check if response already exists
    const { data: existingResponse } = await supabase
      .from('time_slot_responses')
      .select('*')
      .eq('time_slot_id', slotId)
      .eq('user_id', user.id)
      .maybeSingle()

    logger.info('📊 Existing response:', {
      exists: !!existingResponse,
      currentStatus: existingResponse?.response,
      willUpdate: !!existingResponse
    })

    // 🔍 STEP 5: Upsert response with detailed error handling
    const { error: upsertError, data: upsertData } = await supabase
      .from('time_slot_responses')
      .upsert({
        time_slot_id: slotId,
        user_id: user.id,
        user_role: user.role,
        response: 'accepted',
        notes: null, // Optional for acceptance
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'time_slot_id,user_id'
      })
      .select()

    if (upsertError) {
      logger.error('❌ Error creating/updating response:', {
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
        error: `Erreur lors de l'enregistrement de votre réponse: ${upsertError.message} (Code: ${upsertError.code})`
      }
    }

    logger.info('✅ Response upserted successfully:', {
      responseId: upsertData?.[0]?.id,
      wasCreated: !existingResponse,
      wasUpdated: !!existingResponse
    })

    // 🔍 STEP 6: Verify the PostgreSQL trigger updated the selected_by_X column
    logger.info('🔄 [STEP 6] Verifying trigger updated selected_by_X field...')

    const { data: updatedSlot } = await supabase
      .from('intervention_time_slots')
      .select('selected_by_manager, selected_by_provider, selected_by_tenant')
      .eq('id', slotId)
      .single()

    // Determine which field should have been updated based on user role
    const expectedField =
      user.role === 'gestionnaire' || user.role === 'admin' ? 'selected_by_manager' :
        user.role === 'prestataire' ? 'selected_by_provider' :
          'selected_by_tenant'

    const wasUpdatedByTrigger = updatedSlot?.[expectedField] === true

    logger.info('📊 [STEP 6] Trigger verification result:', {
      userRole: user.role,
      expectedField: expectedField,
      fieldValue: updatedSlot?.[expectedField],
      wasUpdatedByTrigger: wasUpdatedByTrigger,
      allFields: {
        selected_by_manager: updatedSlot?.selected_by_manager,
        selected_by_provider: updatedSlot?.selected_by_provider,
        selected_by_tenant: updatedSlot?.selected_by_tenant
      }
    })

    if (!wasUpdatedByTrigger) {
      logger.error('❌ [STEP 6] CRITICAL: Trigger did NOT update the expected field!', {
        expectedField,
        slotId,
        userRole: user.role
      })
      // Continue anyway but this indicates a database trigger issue
    } else {
      logger.info(`✅ [STEP 6] Trigger correctly updated ${expectedField} to TRUE`)
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

    logger.info('✅ [SERVER-ACTION] Time slot accepted successfully')

    // 🔍 STEP 7: Check if slot can be auto-confirmed
    const shouldAutoConfirm = await checkIfSlotCanBeAutoConfirmed(
      supabase,
      slotId,
      interventionId
    )

    if (shouldAutoConfirm) {
      logger.info('🎯 [AUTO-CONFIRM] Auto-confirming slot (all conditions met)')

      try {
        // Call confirmSchedule to finalize the slot
        // Use service role to bypass RLS (system operation)
        const interventionService = await createServerActionInterventionService()
        const confirmResult = await interventionService.confirmSchedule(
          interventionId,
          user.id,
          slotId,
          { useServiceRole: true }
        )

        if (confirmResult.success) {
          logger.info('✅ [AUTO-CONFIRM] Slot auto-confirmed successfully', {
            interventionId,
            slotId,
            userId: user.id
          })

          // Log auto-confirmation activity (use service role to bypass RLS)
          try {
            const { createServiceRoleSupabaseClient } = await import('@/lib/services/core/supabase-client')
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

            logger.info('✅ [AUTO-CONFIRM] Activity logged successfully')
          } catch (logError) {
            // Don't fail auto-confirm if activity log fails
            logger.warn('⚠️ [AUTO-CONFIRM] Failed to log activity:', logError)
          }
        } else {
          // Log detailed error information
          logger.warn('⚠️ [AUTO-CONFIRM] Auto-confirmation failed:', {
            errorMessage: confirmResult.error,
            errorType: typeof confirmResult.error,
            errorDetails: confirmResult.error instanceof Error
              ? {
                name: confirmResult.error.name,
                message: confirmResult.error.message,
                stack: confirmResult.error.stack
              }
              : confirmResult.error,
            context: {
              interventionId,
              slotId,
              userId: user.id,
              userRole: user.role
            }
          })
        }
      } catch (confirmError) {
        logger.error('❌ [AUTO-CONFIRM] Exception during auto-confirmation:', {
          error: confirmError,
          errorType: typeof confirmError,
          errorMessage: confirmError instanceof Error ? confirmError.message : String(confirmError),
          errorStack: confirmError instanceof Error ? confirmError.stack : undefined,
          context: {
            interventionId,
            slotId,
            userId: user.id,
            userRole: user.role
          }
        })
        // Don't fail the accept action if auto-confirm fails
        // The slot is still accepted, just not auto-confirmed
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error accepting time slot:', {
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
 * Note: If rejecting a slot proposed by same role group → auto-cancels slot (handled by trigger)
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
        error: 'Une raison est requise pour rejeter un créneau'
      }
    }

    logger.info('❌ [SERVER-ACTION] Rejecting time slot:', {
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
      logger.error('❌ Time slot not found:', fetchError)
      return { success: false, error: 'Créneau introuvable' }
    }

    // Cannot reject own slot
    if (slot.proposed_by === user.id) {
      return {
        success: false,
        error: 'Vous ne pouvez pas rejeter votre propre créneau'
      }
    }

    // Cannot reject if already cancelled
    if (slot.status === 'cancelled') {
      return {
        success: false,
        error: 'Ce créneau est déjà annulé'
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
      logger.error('❌ Error creating/updating rejection:', upsertError)
      return { success: false, error: 'Erreur lors de l\'enregistrement de votre réponse' }
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

    logger.info('✅ [SERVER-ACTION] Time slot rejected successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error rejecting time slot:', error)
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

    logger.info('🔄 [SERVER-ACTION] Withdrawing response:', {
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
        error: 'Aucune réponse à retirer'
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
      logger.error('❌ Error updating response to pending:', updateError)
      return { success: false, error: 'Erreur lors du retrait de votre réponse' }
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

    logger.info('✅ [SERVER-ACTION] Response withdrawn successfully')

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error withdrawing response:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * STATS AND DASHBOARDS
 */

/**
 * Get dashboard statistics
 */
export async function getDashboardStatsAction(): Promise<ActionResult<DashboardStats>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getDashboardStats(user.team_id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch dashboard stats' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching dashboard stats:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get my interventions
 */
export async function getMyInterventionsAction(): Promise<ActionResult<Intervention[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getMyInterventions(user.id, user.role)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch interventions' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching my interventions:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Program intervention with 3 modes: direct, propose, organize
 * 🔥 FIX AUTH BUG: This Server Action maintains auth context
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
    // Quote request data
    requireQuote?: boolean
    selectedProviders?: string[]
    instructions?: string
    // Assignment mode
    assignmentMode?: string
    // Confirmation participants
    confirmationRequired?: string[]
    requiresConfirmation?: boolean
    // Assignment sync (merged from updateInterventionAction to avoid 2nd roundtrip)
    assignedManagerIds?: string[]
    assignedProviderIds?: string[]
    assignedTenantIds?: string[]
  }
): Promise<ActionResult<Intervention>> {
  try {
    // ── Phase A: Auth + fetch intervention (sequential, needed by everything) ──
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
      logger.error('❌ [programIntervention] Intervention not found:', {
        error: interventionError, interventionId
      })
      return {
        success: false,
        error: interventionError?.message || 'Intervention non trouvée'
      }
    }

    if (!['approuvee', 'planification', 'planifiee'].includes(intervention.status)) {
      return {
        success: false,
        error: `L'intervention ne peut pas être planifiée (statut actuel: ${intervention.status})`
      }
    }

    const { option, directSchedule, proposedSlots } = planningData
    const requiresConfirmation = !!(planningData.requiresConfirmation || (planningData.confirmationRequired && planningData.confirmationRequired.length > 0))

    // ── Validate inputs ──
    if (option === 'direct') {
      if (!directSchedule || !directSchedule.date || !directSchedule.startTime) {
        return { success: false, error: 'Date et heure sont requises pour fixer le rendez-vous' }
      }
    } else if (option === 'propose') {
      if (!proposedSlots || proposedSlots.length === 0) {
        return { success: false, error: 'Des créneaux proposés sont requis pour la planification avec choix' }
      }
    }

    // ── Phase B: Sync assignments (must complete before confirmation flags) ──
    const hasAssignmentChanges = planningData.assignedManagerIds !== undefined
      || planningData.assignedProviderIds !== undefined
      || planningData.assignedTenantIds !== undefined

    if (hasAssignmentChanges) {
      const { data: currentAssignments } = await supabase
        .from('intervention_assignments')
        .select('id, user_id, role')
        .eq('intervention_id', interventionId)

      // Sync manager + provider assignments
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

      // Sync tenant assignments
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

      // Ensure conversation threads exist (non-blocking, don't await)
      ensureInterventionConversationThreads(interventionId).catch(err =>
        logger.warn({ error: err }, '[programIntervention] Non-blocking thread creation failed')
      )
    }

    // ── Phase C: Parallel independent operations ──
    // Time slots, provider guidelines, and per-provider instructions are independent
    const parallelOps: Promise<unknown>[] = []

    // Time slots
    if (option === 'direct' && directSchedule) {
      parallelOps.push(
        createFixedSlot(supabase, interventionId, directSchedule.date, directSchedule.startTime,
          directSchedule.endTime || undefined, user.id, requiresConfirmation)
          .then(result => {
            if (result.error) throw new Error('Erreur lors de la création du rendez-vous')
          })
      )
    } else if (option === 'propose' && proposedSlots) {
      parallelOps.push(
        createProposedSlots(supabase, interventionId, proposedSlots, user.id)
          .then(result => {
            if (result.error) throw new Error('Erreur lors de la création des créneaux')
          })
      )
    } else if (option === 'organize') {
      parallelOps.push(clearTimeSlots(supabase, interventionId))
    }

    if (parallelOps.length > 0) await Promise.all(parallelOps)

    // ── Phase D: Single merged UPDATE on interventions row ──
    const newStatus = determineInterventionStatus(option, directSchedule, requiresConfirmation, planningData.requireQuote)

    const updateData: Record<string, unknown> = {
      status: newStatus,
      scheduling_type: mapOptionToSchedulingType(option),
      updated_at: new Date().toISOString(),
    }

    if (option === 'direct' && directSchedule?.date && directSchedule?.startTime) {
      updateData.scheduled_date = computeScheduledDate(directSchedule.date, directSchedule.startTime)
    }
    if (planningData.assignmentMode) {
      updateData.assignment_mode = planningData.assignmentMode
    }
    // Merge provider_guidelines into the same UPDATE (was a separate query)
    if (planningData.instructions?.trim()) {
      updateData.provider_guidelines = planningData.instructions.trim()
    }
    // Merge requires_participant_confirmation into the same UPDATE
    updateData.requires_participant_confirmation = requiresConfirmation
    // Merge requires_quote flag into the same UPDATE
    if (planningData.requireQuote !== undefined) {
      updateData.requires_quote = planningData.requireQuote
    }

    const { data: updatedIntervention, error: updateError } = await supabase
      .from('interventions')
      .update(updateData)
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ [programIntervention] Error updating intervention:', updateError)
      return { success: false, error: 'Erreur lors de la mise à jour de l\'intervention' }
    }

    // ── Phase E: Post-update parallel ops ──
    const postUpdateOps: Promise<unknown>[] = []

    // Confirmation requirements (needs assignments to exist from Phase B)
    postUpdateOps.push(
      updateConfirmationRequirements(supabase, interventionId, planningData.confirmationRequired || [], requiresConfirmation)
    )

    // Quote handling
    let quoteStats: { totalSelected: number; skipped: number; created: number } | null = null

    if (planningData.requireQuote && planningData.selectedProviders && planningData.selectedProviders.length > 0) {
      postUpdateOps.push(
        (async () => {
          // Check existing quotes + eligible providers in parallel
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
        })().catch(err => logger.error('❌ [programIntervention] Quote creation error:', err))
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
        })().catch(err => logger.error('❌ [programIntervention] Quote cancellation error:', err))
      )
    }

    await Promise.all(postUpdateOps)

    logger.info('✅ [programIntervention] Intervention programmed successfully', { status: newStatus })

    return {
      success: true,
      data: {
        intervention: updatedIntervention,
        quoteStats
      }
    }
  } catch (error) {
    logger.error('❌ [programIntervention] Error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
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

    logger.info('🎯 [SERVER-ACTION] Manager choosing time slot:', {
      slotId,
      interventionId,
      userId: user.id,
      userRole: user.role
    })

    const supabase = await createServerActionSupabaseClient()

    // 1. Verify user is gestionnaire or admin
    if (user.role !== 'gestionnaire' && user.role !== 'admin') {
      logger.warn('⚠️ Permission denied: User is not a manager or admin')
      return {
        success: false,
        error: 'Seuls les gestionnaires et administrateurs peuvent choisir un créneau'
      }
    }

    // 2. Get the intervention
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, status, team_id')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error('❌ Intervention not found:', interventionError)
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
      logger.error('❌ Time slot not found:', slotError)
      return { success: false, error: 'Créneau introuvable' }
    }

    // 4. Verify slot is not already cancelled or selected
    if (slot.status === 'cancelled') {
      return {
        success: false,
        error: 'Ce créneau a été annulé et ne peut pas être sélectionné'
      }
    }

    if (slot.status === 'selected') {
      return {
        success: false,
        error: 'Ce créneau est déjà sélectionné'
      }
    }

    // 5. Check for active quotes
    const { data: quotes, error: quotesError } = await supabase
      .from('intervention_quotes')
      .select('id, status')
      .eq('intervention_id', interventionId)
      .in('status', ['pending', 'sent'])

    const hasActiveQuotes = (quotes && quotes.length > 0) || false

    logger.info('📊 Active quotes check:', {
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
      logger.error('❌ Error updating chosen slot:', updateSlotError)
      return { success: false, error: 'Erreur lors de la sélection du créneau' }
    }

    logger.info('✅ Chosen slot updated to selected')

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
      logger.error('❌ Error rejecting other slots:', rejectOthersError)
      // Don't fail the entire operation, just log the error
    } else {
      logger.info('✅ Other slots updated to rejected')
    }

    // 8. Calculate scheduled date-time (slot_date + start_time)
    // Ensure start_time has proper format (HH:MM:SS)
    let timeWithSeconds = slot.start_time
    const timeParts = timeWithSeconds.split(':')
    if (timeParts.length === 2) {
      // If time is HH:MM, add :00 for seconds
      timeWithSeconds = `${timeWithSeconds}:00`
    }
    // Format: YYYY-MM-DDTHH:MM:SS (ISO 8601 without timezone for PostgreSQL TIMESTAMPTZ)
    const scheduledDateTime = `${slot.slot_date}T${timeWithSeconds}`

    logger.info('📅 Scheduled date-time constructed:', {
      slot_date: slot.slot_date,
      start_time: slot.start_time,
      timeWithSeconds,
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
      logger.error('❌ Error updating intervention:', {
        error: updateInterventionError,
        code: updateInterventionError.code,
        message: updateInterventionError.message,
        details: updateInterventionError.details,
        hint: updateInterventionError.hint,
        scheduledDateTime
      })
      return { 
        success: false, 
        error: `Erreur lors de la mise à jour de l'intervention: ${updateInterventionError.message || 'erreur inconnue'}` 
      }
    }

    logger.info('✅ Intervention updated to planifiee')

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
      logger.warn('⚠️ Could not log activity (non-critical):', activityLogError)
    }

    logger.info('✅ Time slot chosen successfully by manager')

    return {
      success: true, 
      data: { hasActiveQuotes }
    }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error choosing time slot as manager:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Update Provider Guidelines Action
 * Allows gestionnaires to update the general instructions for providers
 */
export async function updateProviderGuidelinesAction(
  interventionId: string,
  guidelines: string | null
): Promise<ActionResult<Intervention>> {
  try {
    logger.info('📝 [SERVER-ACTION] Updating provider guidelines', {
      interventionId,
      guidelinesLength: guidelines?.length || 0
    })

    const { supabase, user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Validate guidelines length
    if (guidelines && guidelines.length > 5000) {
      return {
        success: false,
        error: 'Les instructions ne doivent pas dépasser 5000 caractères'
      }
    }

    // Get intervention to verify permissions
    const { data: intervention, error: fetchError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (fetchError || !intervention) {
      logger.error('❌ Intervention not found', { interventionId, error: fetchError })
      return { success: false, error: 'Intervention non trouvée' }
    }

    // Update provider guidelines
    const { data: updated, error: updateError } = await supabase
      .from('interventions')
      .update({ provider_guidelines: guidelines?.trim() || null })
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError || !updated) {
      logger.error('❌ Failed to update provider guidelines', { error: updateError })
      return {
        success: false,
        error: 'Erreur lors de la mise à jour des instructions'
      }
    }

    logger.info('✅ Provider guidelines updated successfully', {
      interventionId,
      hasGuidelines: !!updated.provider_guidelines
    })

    return { success: true, data: updated }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error updating provider guidelines:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

// =============================================================================
// MULTI-PROVIDER ASSIGNMENT ACTIONS
// =============================================================================

// Types for multi-provider assignments
type AssignmentMode = 'single' | 'group'

interface MultiProviderAssignmentInput {
  interventionId: string
  providerIds: string[]
  mode: AssignmentMode
}

interface TimeSlotInput {
  date: string
  start_time: string
  end_time: string
}

/**
 * Assign Multiple Providers Action
 * Assigns multiple providers to an intervention with a specific assignment mode
 * Mode: 'single' (1 provider), 'group' (shared info)
 */
export async function assignMultipleProvidersAction(
  input: MultiProviderAssignmentInput
): Promise<ActionResult<{ assignments: any[]; mode: AssignmentMode; providerCount: number }>> {
  try {
    logger.info('👥 [SERVER-ACTION] Assigning multiple providers', {
      interventionId: input.interventionId,
      providerCount: input.providerIds.length,
      mode: input.mode
    })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    // Validate input
    if (!input.providerIds || input.providerIds.length === 0) {
      return { success: false, error: 'Au moins un prestataire doit être sélectionné' }
    }

    if (input.providerIds.length === 1 && input.mode !== 'single') {
      return { success: false, error: 'Un seul prestataire doit utiliser le mode "single"' }
    }

    if (input.providerIds.length > 1 && input.mode === 'single') {
      return { success: false, error: 'Plusieurs prestataires nécessitent le mode "group"' }
    }

    const service = await createServerActionInterventionService()

    const result = await service.assignMultipleProviders({
      interventionId: input.interventionId,
      providerIds: input.providerIds,
      mode: input.mode,
      assignedBy: user.id
    })

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de l\'assignation des prestataires'
      }
    }

    logger.info('✅ Multiple providers assigned successfully', {
      interventionId: input.interventionId,
      providerCount: input.providerIds.length,
      mode: input.mode
    })

    return { success: true, data: result.data! }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error assigning multiple providers:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get Linked Interventions Action
 * Retrieves parent/child intervention links for a given intervention
 */
export async function getLinkedInterventionsAction(
  interventionId: string
): Promise<ActionResult<any[]>> {
  try {
    logger.info('🔗 [SERVER-ACTION] Getting linked interventions', { interventionId })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const service = await createServerActionInterventionService()
    const result = await service.getLinkedInterventions(interventionId)

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de la récupération des interventions liées'
      }
    }

    return { success: true, data: result.data || [] }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error getting linked interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Update Provider Instructions Action
 * Updates specific instructions for a provider in an intervention
 */
export async function updateProviderInstructionsAction(
  interventionId: string,
  providerId: string,
  instructions: string
): Promise<ActionResult<any>> {
  try {
    logger.info('📝 [SERVER-ACTION] Updating provider instructions', {
      interventionId,
      providerId,
      instructionsLength: instructions.length
    })

    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    if (instructions.length > 5000) {
      return {
        success: false,
        error: 'Les instructions ne doivent pas dépasser 5000 caractères'
      }
    }

    const service = await createServerActionInterventionService()
    const result = await service.updateProviderInstructions(
      interventionId,
      providerId,
      instructions,
      user.id
    )

    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || 'Erreur lors de la mise à jour des instructions'
      }
    }

    return { success: true, data: result.data }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error updating provider instructions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get Assignment Mode Action
 * Retrieves the assignment mode for an intervention
 */
export async function getAssignmentModeAction(
  interventionId: string
): Promise<ActionResult<AssignmentMode>> {
  try {
    const { user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const service = await createServerActionInterventionService()
    const mode = await service.getAssignmentMode(interventionId)

    return { success: true, data: mode }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error getting assignment mode:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Get intervention count for a property (lot or building)
 * Used for generating default intervention titles
 */
export async function getInterventionCountByPropertyAction(
  propertyType: 'lot' | 'building',
  propertyId: string
): Promise<ActionResult<number>> {
  try {
    const { supabase, user } = await createServerActionSupabaseClient()

    if (!user) {
      return { success: false, error: 'Non authentifié' }
    }

    const column = propertyType === 'lot' ? 'lot_id' : 'building_id'
    const { count, error } = await supabase
      .from('interventions')
      .select('*', { count: 'exact', head: true })
      .eq(column, propertyId)
      .is('deleted_at', null)

    if (error) {
      logger.error('❌ [SERVER-ACTION] Error counting interventions:', error)
      return { success: false, error: error.message }
    }

    return { success: true, data: count || 0 }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error counting interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}

/**
 * Load interventions with pagination support
 *
 * ✅ NEW (2026-02-08): Pagination support for large intervention lists
 * - Returns { data, total, hasMore } for efficient "Load More" navigation
 * - Default limit: 50 items per page
 *
 * @param teamId - Team ID to filter by
 * @param options.limit - Number of items per page (default: 50)
 * @param options.offset - Number of items to skip (default: 0)
 * @param options.filters - Additional filters (status, urgency, type, etc.)
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
      return { success: false, error: 'Non authentifié' }
    }

    // Security: Verify user belongs to this team
    if (authContext.team.id !== teamId && !authContext.activeTeamIds.includes(teamId)) {
      return { success: false, error: 'Accès non autorisé à cette équipe' }
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
    logger.error('❌ [SERVER-ACTION] Error loading paginated interventions:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}