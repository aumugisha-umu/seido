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
  tenant_comment: z.string().optional().nullable(),
  manager_comment: z.string().optional().nullable(),
  provider_comment: z.string().optional().nullable(),
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

  if (!userData) {
    return null
  }

  // If team_id is null, query from team_members table (multi-team support)
  if (!userData.team_id) {
    const { data: teamMember } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userData.id)
      .is('left_at', null)
      .limit(1)
      .single()

    // Populate team_id from team_members
    return {
      ...userData,
      team_id: teamMember?.team_id || null
    }
  }

  return userData
}

/**
 * CRUD OPERATIONS
 */

/**
 * Create new intervention
 */
export async function createInterventionAction(
  data: z.infer<typeof InterventionCreateSchema>
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedData = InterventionCreateSchema.parse(data)

    logger.info('📝 [SERVER-ACTION] Creating intervention:', {
      title: validatedData.title,
      userId: user.id,
      teamId: validatedData.team_id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.create({
      ...validatedData,
      tenant_id: user.role === 'locataire' ? user.id : null
    }, user.id)

    if (result.success && result.data) {
      // Revalidate all intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath('/locataire/interventions')
      revalidatePath('/prestataire/interventions')

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to create intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error creating intervention:', error)
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
 * Update intervention
 */
export async function updateInterventionAction(
  id: string,
  data: z.infer<typeof InterventionUpdateSchema>
): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validatedData = InterventionUpdateSchema.parse(data)

    logger.info('✏️ [SERVER-ACTION] Updating intervention:', {
      id,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.update(id, validatedData, user.id)

    if (result.success && result.data) {
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')
      revalidatePath(`/gestionnaire/interventions/${id}`)
      revalidatePath('/locataire/interventions')
      revalidatePath(`/locataire/interventions/${id}`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to update intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error updating intervention:', error)
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
 * Delete intervention
 */
export async function deleteInterventionAction(id: string): Promise<ActionResult<void>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can delete
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    logger.info('🗑️ [SERVER-ACTION] Deleting intervention:', {
      id,
      userId: user.id
    })

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.delete(id, user.id)

    if (result.success) {
      // Revalidate intervention pages
      revalidatePath('/gestionnaire/interventions')

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to delete intervention' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error deleting intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get single intervention
 */
export async function getInterventionAction(id: string): Promise<ActionResult<Intervention>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Create service and execute
    const interventionService = await createServerActionInterventionService()
    const result = await interventionService.getById(id, user.id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Intervention not found' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching intervention:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
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
    if (!['approuvee', 'planification'].includes(intervention.status)) {
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

    // Update intervention status to 'planification'
    const updateData: any = {
      status: 'planification' as InterventionStatus,
      updated_at: new Date().toISOString()
    }

    if (managerCommentParts.length > 0) {
      const existingComment = intervention.manager_comment || ''
      updateData.manager_comment = existingComment + (existingComment ? ' | ' : '') + managerCommentParts.join(' | ')
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

    logger.info('✅ [SERVER-ACTION] Intervention programmed successfully')

    // Revalidate intervention pages
    revalidatePath('/gestionnaire/interventions')
    revalidatePath(`/gestionnaire/interventions/${interventionId}`)
    revalidatePath('/locataire/interventions')
    revalidatePath(`/locataire/interventions/${interventionId}`)
    revalidatePath('/prestataire/interventions')
    revalidatePath(`/prestataire/interventions/${interventionId}`)

    return { success: true, data: updatedIntervention }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error programming intervention:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}