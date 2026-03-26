'use server'

/**
 * Shared types, schemas, and helpers for intervention actions.
 * Used by all intervention action modules.
 */

import {
  createServiceRoleSupabaseClient
} from '@/lib/services'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

// Type aliases
export type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
export type InterventionType = Database['public']['Enums']['intervention_type']
export type InterventionStatus = Database['public']['Enums']['intervention_status']
export type Intervention = Database['public']['Tables']['interventions']['Row']
export type UserRole = Database['public']['Enums']['user_role']

// Action result type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Dashboard stats type
export interface DashboardStats {
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

// Validation schemas
// NOTE: type uses z.string() to accept all intervention types from intervention_types table
// (bien, bail, locataire categories - 36+ types) instead of hardcoded enum
export const InterventionCreateSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().min(10),
  type: z.string().min(1, "Le type d'intervention est obligatoire"),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional().default('normale'),
  lot_id: z.string().uuid().optional().nullable(),
  building_id: z.string().uuid().optional().nullable(),
  team_id: z.string().uuid(),
  contract_id: z.string().uuid().optional().nullable()
})

export const InterventionUpdateSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().min(10).optional(),
  type: z.string().min(1).optional(),
  urgency: z.enum(['basse', 'normale', 'haute', 'urgente'] as const).optional(),
  provider_guidelines: z.string().max(5000).optional().nullable(),
  estimated_cost: z.number().positive().optional().nullable(),
  final_cost: z.number().positive().optional().nullable(),
  contract_id: z.string().uuid().optional().nullable()
})

export const TimeSlotSchema = z.object({
  date: z.string().refine(val => !isNaN(Date.parse(val)), 'Invalid date'),
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format HH:MM'),
  duration_minutes: z.number().positive().optional()
})

export const InterventionFiltersSchema = z.object({
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

/**
 * Check if a lot is locked by subscription restriction.
 * Returns error message if locked, null if accessible.
 * Fail-open: returns null on any error (doesn't block users on service failures).
 */
export async function checkLotLockedBySubscription(lotId: string | null | undefined, teamId: string): Promise<string | null> {
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
    return 'Lot verrouille — souscrivez pour y acceder'
  } catch (error) {
    logger.warn('[INTERVENTION] Subscription check failed, allowing access (fail-open)', { lotId, teamId, error })
    return null
  }
}

/**
 * Check if an intervention's lot is locked by looking up the intervention first.
 * Used by status change actions where we have intervention ID but not lot_id.
 */
export async function checkInterventionLotLocked(interventionId: string, teamId: string): Promise<string | null> {
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

/**
 * Helper: Send system message when a participant is added to an intervention
 * Message is sent to the GROUP thread so all participants see it
 */
export async function sendParticipantAddedSystemMessage(
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
    logger.error('[SYSTEM-MESSAGE] Could not find added user:', userError)
    return
  }
  if (threadError || !groupThread) {
    logger.error('[SYSTEM-MESSAGE] Could not find group thread:', threadError)
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

  const content = `${addedUser.name} (${roleLabel}) a ete ajoute a l'intervention par ${addedByUser.name}`

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
    logger.error('[SYSTEM-MESSAGE] Failed to insert message:', msgError)
    return
  }

  logger.info('[SYSTEM-MESSAGE] Participant added message sent:', {
    threadId: groupThread.id,
    addedUser: addedUser.name,
    addedBy: addedByUser.name
  })
}
