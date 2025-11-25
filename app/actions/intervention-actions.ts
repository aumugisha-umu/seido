'use server'

/**
 * Intervention Server Actions
 * Server-side operations for intervention management with proper auth context
 * Handles the complete 11-status workflow
 */

import {
  createServerActionInterventionService,
  createServerActionSupabaseClient
} from '@/lib/services'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { createQuoteRequestsForProviders } from '@/app/api/create-manager-intervention/create-quote-requests'
import { createInterventionNotification } from './notification-actions'

// Type aliases
type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
type InterventionType = Database['public']['Enums']['intervention_type']
type InterventionStatus = Database['public']['Enums']['intervention_status']
type Intervention = Database['public']['Tables']['interventions']['Row']

// Action result type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Validation schemas
const InterventionCreateSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  type: z.enum(['plomberie', 'electricite', 'menuiserie', 'peinture', 'chauffage', 'climatisation', 'serrurerie', 'vitrerie', 'nettoyage', 'jardinage', 'autre'] as const),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional().default('normale'),
  lot_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  specific_location: z.string().optional().nullable(),
  tenant_comment: z.string().optional().nullable(),
  team_id: z.string().uuid()
})

const InterventionUpdateSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  type: z.enum(['plomberie', 'electricite', 'menuiserie', 'peinture', 'chauffage', 'climatisation', 'serrurerie', 'vitrerie', 'nettoyage', 'jardinage', 'autre'] as const).optional(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional(),
  specific_location: z.string().optional().nullable(),
  provider_guidelines: z.string().max(5000).optional().nullable(),
  estimated_cost: z.number().positive().optional().nullable(),
  final_cost: z.number().positive().optional().nullable()
})

const TimeSlotSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  duration_minutes: z.number().positive().optional()
})

const InterventionFiltersSchema = z.object({
  status: z.enum(['demande', 'rejetee', 'approuvee', 'demande_de_devis', 'planification', 'planifiee', 'en_cours', 'cloturee_par_prestataire', 'cloturee_par_locataire', 'cloturee_par_gestionnaire', 'annulee'] as const).optional(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional(),
  type: z.enum(['plomberie', 'electricite', 'menuiserie', 'peinture', 'chauffage', 'climatisation', 'serrurerie', 'vitrerie', 'nettoyage', 'jardinage', 'autre'] as const).optional(),
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

/**
 * Helper to get auth session and user ID
 */
async function getAuthenticatedUser() {
  const supabase = await createServerActionSupabaseClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (!session || error) {
    return null
  }

  // Get database user ID from auth user ID
  const { data: userData } = await supabase
    .from('users')
    .select('id, role, team_id')
    .eq('auth_user_id', session.user.id)
    .single()

  return userData
}

/**
 * Get interventions with filters
 */
export async function getInterventionsAction(
  filters?: z.infer<typeof InterventionFiltersSchema>
): Promise<ActionResult<Intervention[]>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
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
  role: 'gestionnaire' | 'prestataire'
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath(`/gestionnaire/interventions/${interventionId}`)
      revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath(`/gestionnaire/interventions/${interventionId}`)
      revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can approve
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can approve interventions' }
    }

    logger.info('✅ [SERVER-ACTION] Approving intervention:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.approveIntervention(id, user.id, comment)

    if (result.success && result.data) {
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
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
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to request quote' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error requesting quote:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Start planning
 */
export async function startPlanningAction(id: string): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can start planning
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can start planning' }
    }

    logger.info('📅 [SERVER-ACTION] Starting planning:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.startPlanning(id, user.id)

    if (result.success && result.data) {
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate all intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)

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
 */
export async function startInterventionAction(id: string): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only providers can start interventions
    if (user.role !== 'prestataire') {
      return { success: false, error: 'Only providers can start interventions' }
    }

    logger.info('▶️ [SERVER-ACTION] Starting intervention:', { id, userId: user.id })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.startIntervention(id, user.id)

    if (result.success && result.data) {
      // Revalidate intervention pages
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to start intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error starting intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can finalize
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can finalize interventions' }
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
      // Revalidate all intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    if (!reason || reason.trim().length < 10) {
      return { success: false, error: 'Cancellation reason must be at least 10 characters' }
    }

    logger.info('🚫 [SERVER-ACTION] Cancelling intervention:', {
      id,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.cancelIntervention(id, user.id, reason)

    if (result.success && result.data) {
      // Revalidate all intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)
      revalidatePath('/prestataire/interventions')
      revalidatePath(`/prestataire/interventions/${id}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath(`/gestionnaire/interventions/${interventionId}`)
      revalidatePath(`/locataire/interventions/${interventionId}`)
      revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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
      // Revalidate intervention pages
      revalidatePath(`/gestionnaire/interventions/${interventionId}`)
      revalidatePath(`/locataire/interventions/${interventionId}`)
      revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    logger.info('🚫 [SERVER-ACTION] Cancelling time slot:', {
      slotId,
      interventionId,
      userId: user.id
    })

    const supabase = await createServerSupabaseClient()

    // Get the time slot with intervention info
    const { data: slot, error: fetchError } = await supabase
      .from('intervention_time_slots')
      .select(`
        *,
        intervention:interventions (
          id,
          team_id
        )
      `)
      .eq('id', slotId)
      .eq('intervention_id', interventionId)
      .single()

    if (fetchError || !slot) {
      logger.error('❌ Time slot not found:', fetchError)
      return { success: false, error: 'Créneau introuvable' }
    }

    // Check permissions
    const isProposer = slot.proposed_by === user.id
    const isAdmin = user.role === 'admin'

    // Check if user is a manager in the intervention's team
    let isTeamManager = false
    if (slot.intervention && 'team_id' in slot.intervention) {
      const { data: teamMember } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', slot.intervention.team_id)
        .eq('user_id', user.id)
        .single()

      isTeamManager = teamMember?.role === 'gestionnaire' || teamMember?.role === 'admin'
    }

    if (!isProposer && !isTeamManager && !isAdmin) {
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

    // Revalidate intervention pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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

    // 🔍 STEP 1: Get the intervention and check user assignment
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, team_id')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error('❌ Intervention not found:', interventionError)
      return { success: false, error: 'Intervention introuvable' }
    }

    // 🔍 STEP 2: Verify user has permission (via team_members OR intervention_assignments)
    const [
      { data: teamMembership },
      { data: assignment }
    ] = await Promise.all([
      supabase
        .from('team_members')
        .select('id, role')
        .eq('team_id', intervention.team_id)
        .eq('user_id', user.id)
        .is('left_at', null)
        .maybeSingle(),
      supabase
        .from('intervention_assignments')
        .select('id, role')
        .eq('intervention_id', interventionId)
        .eq('user_id', user.id)
        .maybeSingle()
    ])

    const hasPermission = !!(teamMembership || assignment)

    if (!hasPermission) {
      logger.warn('⚠️ User not authorized to accept this time slot:', {
        userId: user.id,
        interventionId,
        hasTeamMembership: !!teamMembership,
        hasAssignment: !!assignment
      })
      return {
        success: false,
        error: 'Vous n\'êtes pas autorisé à accepter ce créneau. Vous devez être assigné à cette intervention.'
      }
    }

    logger.info('✅ Permission verified:', {
      hasTeamMembership: !!teamMembership,
      hasAssignment: !!assignment,
      assignmentRole: assignment?.role || teamMembership?.role
    })

    // 🔍 STEP 3: Get the time slot
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

    // Revalidate intervention pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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

    // Revalidate intervention pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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

    // Revalidate intervention pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath(`/prestataire/interventions/${interventionId}`)

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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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
  }
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can program interventions
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      logger.warn('⚠️ [SERVER-ACTION] Non-manager tried to program intervention:', {
        userId: user.id,
        userRole: user.role
      })
      return { success: false, error: 'Seuls les gestionnaires peuvent planifier les interventions' }
    }

    logger.info('📅 [SERVER-ACTION] Programming intervention:', {
      interventionId,
      planningMode: planningData.option,
      userId: user.id
    })

    // Get Supabase client
    const supabase = await createServerActionSupabaseClient()

    // Get intervention details - SIMPLIFIED query to avoid RLS issues
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('*')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) {
      logger.error('❌ [SERVER-ACTION] Intervention not found:', {
        error: interventionError,
        interventionId,
        errorCode: interventionError?.code,
        errorMessage: interventionError?.message,
        errorDetails: interventionError?.details
      })
      return {
        success: false,
        error: interventionError?.message || 'Intervention non trouvée'
      }
    }

    logger.info('✅ [SERVER-ACTION] Intervention found:', {
      id: intervention.id,
      status: intervention.status,
      team_id: intervention.team_id
    })

    // Check if intervention can be scheduled
    // Allow 'demande_de_devis' to enable planning while waiting for quote
    if (!['approuvee', 'planification', 'demande_de_devis'].includes(intervention.status)) {
      return {
        success: false,
        error: `L'intervention ne peut pas être planifiée (statut actuel: ${intervention.status})`
      }
    }

    // Check if user belongs to intervention team
    if (intervention.team_id && user.team_id !== intervention.team_id) {
      return {
        success: false,
        error: 'Vous n\'êtes pas autorisé à modifier cette intervention'
      }
    }

    // Check for active quote requests (pending or sent)
    // This determines if we should keep 'demande_de_devis' status or transition to 'planification'
    const { data: activeQuotes, error: quotesError } = await supabase
      .from('intervention_quotes')
      .select('id, status')
      .eq('intervention_id', interventionId)
      .in('status', ['pending', 'sent'])

    if (quotesError) {
      logger.error('❌ [SERVER-ACTION] Error checking active quotes:', quotesError)
    }

    const hasActiveQuotes = activeQuotes && activeQuotes.length > 0

    logger.info(`📊 [SERVER-ACTION] Active quotes check: ${hasActiveQuotes ? 'YES' : 'NO'} (${activeQuotes?.length || 0} quotes)`)

    const { option, directSchedule, proposedSlots } = planningData

    // Handle different planning types
    switch (option) {
      case 'direct': {
        // Direct appointment - create time slot, wait for confirmation
        if (!directSchedule || !directSchedule.date || !directSchedule.startTime) {
          return {
            success: false,
            error: 'Date et heure sont requises pour fixer le rendez-vous'
          }
        }

        // Calculate end_time: use provided endTime or add 1 hour by default
        // This respects the DB constraint: end_time > start_time
        let calculatedEndTime = directSchedule.endTime
        if (!calculatedEndTime || calculatedEndTime === directSchedule.startTime) {
          // Add 1 hour to start_time as default duration
          const [hours, minutes] = directSchedule.startTime.split(':').map(Number)
          const endHours = (hours + 1) % 24
          calculatedEndTime = `${String(endHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
        }

        // Delete any existing slots first
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)

        // Create ONE time slot for the fixed appointment
        const { error: insertSlotError } = await supabase
          .from('intervention_time_slots')
          .insert([{
            intervention_id: interventionId,
            slot_date: directSchedule.date,
            start_time: directSchedule.startTime,
            end_time: calculatedEndTime, // ✅ end_time > start_time (constraint respected)
            is_selected: false, // Not yet confirmed by tenant/provider
            proposed_by: user.id, // Gestionnaire who proposed it
            notes: 'Rendez-vous fixé par le gestionnaire'
          }])

        if (insertSlotError) {
          logger.error('❌ [SERVER-ACTION] Error creating appointment slot:', insertSlotError)
          return { success: false, error: 'Erreur lors de la création du rendez-vous' }
        }

        logger.info('📅 [SERVER-ACTION] Direct appointment slot created:', {
          start: directSchedule.startTime,
          end: calculatedEndTime
        })
        break
      }

      case 'propose': {
        // Propose multiple slots for tenant/provider selection
        if (!proposedSlots || proposedSlots.length === 0) {
          return {
            success: false,
            error: 'Des créneaux proposés sont requis pour la planification avec choix'
          }
        }

        // Delete any existing slots first
        await supabase
          .from('intervention_time_slots')
          .delete()
          .eq('intervention_id', interventionId)

        // Store proposed time slots with proposed_by field
        const timeSlots = proposedSlots.map((slot) => ({
          intervention_id: interventionId,
          slot_date: slot.date,
          start_time: slot.startTime,
          end_time: slot.endTime,
          is_selected: false, // Not yet confirmed
          proposed_by: user.id // Gestionnaire who proposed these slots
        }))

        const { error: insertSlotsError } = await supabase
          .from('intervention_time_slots')
          .insert(timeSlots)

        if (insertSlotsError) {
          logger.error('❌ [SERVER-ACTION] Error inserting time slots:', insertSlotsError)
          return { success: false, error: 'Erreur lors de la création des créneaux' }
        }

        logger.info('📅 [SERVER-ACTION] Proposed slots created:', { slotsCount: timeSlots.length })
        break
      }

      case 'organize': {
        // Autonomous organization - tenant and provider coordinate directly
        logger.info('📅 [SERVER-ACTION] Organization mode - autonomous coordination')

        // Save scheduling method as 'flexible'
        const { error: updateError } = await supabase
          .from('interventions')
          .update({ scheduling_method: 'flexible' })
          .eq('id', interventionId)

        if (updateError) {
          logger.error('❌ [SERVER-ACTION] Error updating scheduling_method:', updateError)
          throw updateError
        }

        logger.info('✅ [SERVER-ACTION] Scheduling method set to flexible')
        break
      }

      default:
        return {
          success: false,
          error: 'Type de planification non reconnu'
        }
    }

    // Build manager comment
    const managerCommentParts = []
    if (option === 'direct' && directSchedule) {
      managerCommentParts.push(`Rendez-vous proposé pour le ${directSchedule.date} à ${directSchedule.startTime}`)
    } else if (option === 'propose' && proposedSlots) {
      managerCommentParts.push(`${proposedSlots.length} créneaux proposés`)
    } else if (option === 'organize') {
      managerCommentParts.push(`Planification autonome activée`)
    }

    // Update intervention status
    // Keep 'demande_de_devis' if active quotes exist, otherwise transition to 'planification'
    // Note: Manager comments are now stored in intervention_comments table
    const newStatus = (intervention.status === 'demande_de_devis' && hasActiveQuotes)
      ? 'demande_de_devis' as InterventionStatus
      : 'planification' as InterventionStatus

    logger.info(`📅 [SERVER-ACTION] Status decision: ${intervention.status} → ${newStatus} (hasActiveQuotes: ${hasActiveQuotes})`)

    const updateData: any = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Add scheduling_method based on option (for direct and propose modes)
    // Note: 'organize' mode already set scheduling_method in its case block
    if (option === 'direct') {
      updateData.scheduling_method = 'direct'
    } else if (option === 'propose') {
      updateData.scheduling_method = 'slots'
    }

    const { data: updatedIntervention, error: updateError } = await supabase
      .from('interventions')
      .update(updateData)
      .eq('id', interventionId)
      .select()
      .single()

    if (updateError) {
      logger.error('❌ [SERVER-ACTION] Error updating intervention:', updateError)
      return { success: false, error: 'Erreur lors de la mise à jour de l\'intervention' }
    }

    // Create quote requests if requireQuote is enabled and providers are selected
    let quoteStats: { totalSelected: number; skipped: number; created: number } | null = null

    if (planningData.requireQuote && planningData.selectedProviders && planningData.selectedProviders.length > 0) {
      logger.info('📋 [SERVER-ACTION] Creating quote requests for selected providers', {
        interventionId,
        providerCount: planningData.selectedProviders.length
      })

      try {
        // Check for existing active quotes (pending or sent)
        // to avoid creating duplicates
        const { data: existingQuotes, error: quotesCheckError } = await supabase
          .from('intervention_quotes')
          .select('id, provider_id, status')
          .eq('intervention_id', interventionId)
          .in('status', ['pending', 'sent'])

        if (quotesCheckError) {
          logger.error('❌ [SERVER-ACTION] Error checking existing quotes:', quotesCheckError)
          throw quotesCheckError
        }

        // Build set of provider IDs that already have active quotes
        const existingProviderIds = new Set(
          (existingQuotes || []).map(q => q.provider_id)
        )

        // Filter out providers who already have active quotes
        const newProviderIds = planningData.selectedProviders.filter(
          providerId => !existingProviderIds.has(providerId)
        )

        const skippedCount = existingProviderIds.size
        const newCount = newProviderIds.length

        quoteStats = {
          totalSelected: planningData.selectedProviders.length,
          skipped: skippedCount,
          created: newCount
        }

        logger.info('📊 [SERVER-ACTION] Quote creation analysis:', {
          totalSelected: planningData.selectedProviders.length,
          alreadyHaveQuotes: skippedCount,
          willCreateNew: newCount,
          existingQuoteDetails: existingQuotes?.map(q => ({
            id: q.id,
            provider: q.provider_id,
            status: q.status
          }))
        })

        // Only create quotes for NEW providers
        if (newProviderIds.length > 0) {
          await createQuoteRequestsForProviders({
            interventionId,
            teamId: intervention.team_id,
            providerIds: newProviderIds,
            createdBy: user.id,
            messageType: 'global',
            globalMessage: planningData.instructions || undefined,
            supabase
          })

          logger.info('✅ [SERVER-ACTION] Created quote requests for NEW providers only', {
            newQuotesCount: newProviderIds.length
          })
        } else {
          logger.info('⏭️ [SERVER-ACTION] Skipped quote creation - all selected providers already have active quotes')
        }

        // Update intervention status to 'demande_de_devis' after creating quote requests
        const { error: statusUpdateError } = await supabase
          .from('interventions')
          .update({ status: 'demande_de_devis' })
          .eq('id', interventionId)

        if (statusUpdateError) {
          logger.error('❌ [SERVER-ACTION] Error updating intervention status to demande_de_devis:', statusUpdateError)
        } else {
          logger.info('✅ [SERVER-ACTION] Intervention status updated to demande_de_devis')
          // Update the returned intervention status
          if (updatedIntervention) {
            updatedIntervention.status = 'demande_de_devis'
          }
        }

      } catch (quoteError) {
        logger.error('❌ [SERVER-ACTION] Error creating quote requests:', quoteError)
        // Don't fail the whole operation if quote creation fails
        // The intervention is still programmed, just without the quote requests
      }
    }

    const finalStatus = planningData.requireQuote && planningData.selectedProviders?.length > 0
      ? 'demande_de_devis'
      : (planningData.option === 'organize' ? 'planification' : 'planifiee')

    logger.info('✅ [SERVER-ACTION] Intervention programmed successfully', { finalStatus })

    // Revalidate intervention pages
    revalidatePath('/gestionnaire/interventions')
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath('/locataire/interventions')
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath('/prestataire/interventions')
    revalidatePath(`/prestataire/interventions/${interventionId}`)

    return {
      success: true,
      data: {
        intervention: updatedIntervention,
        quoteStats
      }
    }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error programming intervention:', error)
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
    const user = await getAuthenticatedUser()
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

    // 10. Log activity
    await supabase.from('activity_logs').insert({
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

    logger.success('✅ Time slot chosen successfully by manager')

    // 11. Revalidate intervention pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath(`/prestataire/interventions/${interventionId}`)

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

    // Revalidate all relevant paths
    revalidatePath('/gestionnaire/interventions')
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath('/prestataire/interventions')
    revalidatePath(`/prestataire/interventions/${interventionId}`)

    return { success: true, data: updated }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error updating provider guidelines:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    }
  }
}