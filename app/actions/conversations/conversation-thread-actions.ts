'use server'

/**
 * Conversation Thread Actions
 *
 * Thread management: participants, read tracking, ensure threads, team transparency.
 */

import {
  createServerActionConversationService,
  createServerActionSupabaseClient,
  createServiceRoleSupabaseClient,
  ConversationRepository
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { sendThreadWelcomeMessage as sendThreadWelcomeMessageWithClient } from '@/lib/utils/thread-welcome-messages'
import { sendThreadWelcomeMessage } from './conversation-crud-actions'
import type { ActionResult } from './conversation-crud-actions'

// Type aliases
type ConversationThread = Database['public']['Tables']['conversation_threads']['Row']

interface ThreadWithDetails extends ConversationThread {
  messages?: Array<Database['public']['Tables']['conversation_messages']['Row'] & { user?: Database['public']['Tables']['users']['Row'] }>
  participants?: ParticipantWithUser[]
  intervention?: Database['public']['Tables']['interventions']['Row']
  unread_count?: number
}

interface ParticipantWithUser {
  user_id: string
  joined_at: string
  last_read_message_id?: string
  user?: Database['public']['Tables']['users']['Row']
}

// ============================================================================
// PARTICIPANTS
// ============================================================================

/**
 * Get participants of a thread with user details
 */
export async function getThreadParticipantsAction(threadId: string): Promise<ActionResult<ParticipantWithUser[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    logger.info({ threadId, userId: user.id }, '[SERVER-ACTION] Getting thread participants')

    const supabase = await createServerActionSupabaseClient()

    const { data: hasAccess, error: accessError } = await supabase.rpc('can_view_conversation', { p_thread_id: threadId })
    if (accessError || !hasAccess) {
      logger.warn({ threadId, userId: user.id }, '[SERVER-ACTION] Access denied to thread participants')
      return { success: false, error: 'Access denied to this conversation' }
    }

    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select(`
        user_id, joined_at, last_read_message_id,
        user:users!conversation_participants_user_id_fkey (id, name, first_name, last_name, email, role, avatar_url)
      `)
      .eq('thread_id', threadId)
      .order('joined_at', { ascending: true })

    if (participantsError) {
      logger.error('[SERVER-ACTION] Error fetching participants:', participantsError)
      return { success: false, error: 'Failed to fetch participants' }
    }

    return { success: true, data: participants as ParticipantWithUser[] }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching thread participants:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Add participant to thread
 */
export async function addParticipantAction(threadId: string, userId: string): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const currentUser = authContext?.profile
    if (!currentUser) return { success: false, error: 'Authentication required' }

    if (currentUser.role !== 'gestionnaire') {
      return { success: false, error: 'Only managers can add participants to conversations' }
    }

    if (!z.string().uuid().safeParse(threadId).success) return { success: false, error: 'Invalid thread ID' }
    if (!z.string().uuid().safeParse(userId).success) return { success: false, error: 'Invalid user ID' }

    const supabase = await createServerActionSupabaseClient()

    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id, intervention_id, team_id, thread_type, intervention:intervention_id(id, team_id)')
      .eq('id', threadId)
      .single()

    if (threadError || !thread) return { success: false, error: 'Thread not found' }

    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', thread.team_id)
      .eq('user_id', currentUser.id)
      .single()

    if (!membership) return { success: false, error: 'You are not a member of this team' }

    const { data: userToAdd, error: userError } = await supabase
      .from('users')
      .select('id, role, name, auth_user_id')
      .eq('id', userId)
      .single()

    if (userError || !userToAdd) return { success: false, error: 'User not found' }

    const { data: userMembership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', thread.team_id)
      .eq('user_id', userId)
      .single()

    if (!userMembership) return { success: false, error: 'User is not a member of this team' }

    logger.info({ threadId, threadType: thread.thread_type, participantId: userId, participantRole: userToAdd.role, addedBy: currentUser.id }, '[SERVER-ACTION] Adding participant')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.addParticipant(threadId, userId, currentUser.id)

    if (!result.success) return { success: false, error: result.error || 'Failed to add participant' }

    // Create individual thread for invited users (prestataire/locataire) when added to group
    if ((userToAdd.role === 'prestataire' || userToAdd.role === 'locataire') && thread.thread_type === 'group') {
      if (!userToAdd.auth_user_id) {
        logger.info({ userId, role: userToAdd.role, reason: 'no auth_user_id' }, '[SERVER-ACTION] Skipping individual thread for non-invited user')
      } else {
        const threadType = userToAdd.role === 'prestataire' ? 'provider_to_managers' : 'tenant_to_managers'
        logger.info({ role: userToAdd.role, threadType }, '[SERVER-ACTION] Creating individual thread for invited user')

        const { data: existingIndividualThread } = await supabase
          .from('conversation_threads')
          .select('id')
          .eq('intervention_id', thread.intervention_id)
          .eq('thread_type', threadType)
          .eq('participant_id', userId)
          .single()

        if (!existingIndividualThread) {
          const { data: newThread, error: createError } = await supabase
            .from('conversation_threads')
            .insert({
              intervention_id: thread.intervention_id,
              thread_type: threadType,
              title: `Conversation avec ${userToAdd.name || (userToAdd.role === 'prestataire' ? 'le prestataire' : 'le locataire')}`,
              created_by: currentUser.id,
              team_id: thread.team_id,
              participant_id: userId
            })
            .select()
            .single()

          if (!createError && newThread) {
            await sendThreadWelcomeMessage(newThread.id, threadType, currentUser.id, userToAdd.name || undefined)
            await conversationService.addParticipant(newThread.id, userId, currentUser.id)
            logger.info({ threadId: newThread.id, participantId: userId, threadType }, '[SERVER-ACTION] Created individual thread')
          } else {
            logger.error({ error: createError }, '[SERVER-ACTION] Failed to create individual thread')
          }
        } else {
          await conversationService.addParticipant(existingIndividualThread.id, userId, currentUser.id)
          logger.info({ threadId: existingIndividualThread.id }, '[SERVER-ACTION] User already has individual thread')
        }
      }
    }

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error adding participant:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Ensure all required conversation threads exist for an intervention
 */
export async function ensureInterventionConversationThreads(
  interventionId: string
): Promise<ActionResult<{ created: number }>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const currentUser = authContext?.profile
    if (!currentUser) return { success: false, error: 'Authentication required' }
    if (!['gestionnaire', 'admin'].includes(currentUser.role)) {
      return { success: false, error: 'Only managers/admins can ensure conversation threads' }
    }

    if (!z.string().uuid().safeParse(interventionId).success) {
      return { success: false, error: 'Invalid intervention ID' }
    }

    const serviceClient = createServiceRoleSupabaseClient()
    const conversationRepo = new ConversationRepository(serviceClient)

    const { data: intervention, error: interventionError } = await serviceClient
      .from('interventions')
      .select('id, team_id, assignment_mode')
      .eq('id', interventionId)
      .single()

    if (interventionError || !intervention) return { success: false, error: 'Intervention not found' }

    const { data: assignments } = await serviceClient
      .from('intervention_assignments')
      .select('user_id, role, user:users!intervention_assignments_user_id_fkey(id, name, auth_user_id, role)')
      .eq('intervention_id', interventionId)

    if (!assignments || assignments.length === 0) return { success: true, data: { created: 0 } }

    const { data: existingThreads } = await serviceClient
      .from('conversation_threads')
      .select('id, thread_type, participant_id')
      .eq('intervention_id', interventionId)

    const threads = existingThreads || []
    let created = 0
    let groupThreadId: string | null = null

    // 1. Ensure GROUP thread
    const existingGroup = threads.find(t => t.thread_type === 'group')
    if (existingGroup) {
      groupThreadId = existingGroup.id
    } else {
      const result = await conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'group',
        title: 'Discussion generale',
        created_by: currentUser.id,
        team_id: intervention.team_id
      })
      if (result.success && result.data?.id) {
        await sendThreadWelcomeMessageWithClient(serviceClient, result.data.id, 'group', currentUser.id)
        groupThreadId = result.data.id
        created++
        logger.info({ threadId: result.data.id }, '[ENSURE-THREADS] Created group thread')
      }
    }

    type AssignmentUser = { id: string; name: string; auth_user_id: string | null; role: string }
    const providers: AssignmentUser[] = []
    const tenants: AssignmentUser[] = []

    for (const assignment of assignments) {
      const user = assignment.user as unknown as AssignmentUser | null
      if (!user || !user.auth_user_id) continue
      if (assignment.role === 'prestataire') providers.push(user)
      else if (assignment.role === 'locataire') tenants.push(user)
    }

    // 2. Per PROVIDER
    for (const provider of providers) {
      const existing = threads.find(t => t.thread_type === 'provider_to_managers' && t.participant_id === provider.id)
      if (!existing) {
        const result = await conversationRepo.createThread({
          intervention_id: interventionId,
          thread_type: 'provider_to_managers',
          title: `Conversation avec ${provider.name || 'le prestataire'}`,
          created_by: currentUser.id,
          team_id: intervention.team_id,
          participant_id: provider.id
        })
        if (result.success && result.data?.id) {
          await conversationRepo.addParticipant(result.data.id, provider.id)
          await sendThreadWelcomeMessageWithClient(serviceClient, result.data.id, 'provider_to_managers', currentUser.id, provider.name || undefined)
          created++
          logger.info({ threadId: result.data.id, participantId: provider.id }, '[ENSURE-THREADS] Created provider_to_managers thread')
        }
      } else {
        await conversationRepo.addParticipant(existing.id, provider.id)
      }
      if (groupThreadId) await conversationRepo.addParticipant(groupThreadId, provider.id)
    }

    // 3. Per TENANT
    for (const tenant of tenants) {
      const existing = threads.find(t => t.thread_type === 'tenant_to_managers' && t.participant_id === tenant.id)
      if (!existing) {
        const result = await conversationRepo.createThread({
          intervention_id: interventionId,
          thread_type: 'tenant_to_managers',
          title: `${tenant.name || 'Locataire'}`,
          created_by: currentUser.id,
          team_id: intervention.team_id,
          participant_id: tenant.id
        })
        if (result.success && result.data?.id) {
          await conversationRepo.addParticipant(result.data.id, tenant.id)
          await sendThreadWelcomeMessageWithClient(serviceClient, result.data.id, 'tenant_to_managers', currentUser.id, tenant.name || undefined)
          created++
          logger.info({ threadId: result.data.id, participantId: tenant.id }, '[ENSURE-THREADS] Created tenant_to_managers thread')
        }
      } else {
        await conversationRepo.addParticipant(existing.id, tenant.id)
      }
      if (groupThreadId) await conversationRepo.addParticipant(groupThreadId, tenant.id)
    }

    // 4. TENANTS GROUP thread
    if (tenants.length > 1) {
      const existingTenantsGroup = threads.find(t => t.thread_type === 'tenants_group')
      if (!existingTenantsGroup) {
        const result = await conversationRepo.createThread({
          intervention_id: interventionId, thread_type: 'tenants_group', title: 'Groupe locataires',
          created_by: currentUser.id, team_id: intervention.team_id
        })
        if (result.success && result.data?.id) {
          await sendThreadWelcomeMessageWithClient(serviceClient, result.data.id, 'tenants_group', currentUser.id)
          for (const tenant of tenants) await conversationRepo.addParticipant(result.data.id, tenant.id)
          created++
        }
      } else {
        for (const tenant of tenants) await conversationRepo.addParticipant(existingTenantsGroup.id, tenant.id)
      }
    }

    // 5. PROVIDERS GROUP thread
    if (intervention.assignment_mode === 'grouped' && providers.length > 1) {
      const existingProvidersGroup = threads.find(t => t.thread_type === 'providers_group')
      if (!existingProvidersGroup) {
        const result = await conversationRepo.createThread({
          intervention_id: interventionId, thread_type: 'providers_group', title: 'Groupe prestataires',
          created_by: currentUser.id, team_id: intervention.team_id
        })
        if (result.success && result.data?.id) {
          await sendThreadWelcomeMessageWithClient(serviceClient, result.data.id, 'providers_group', currentUser.id)
          for (const provider of providers) await conversationRepo.addParticipant(result.data.id, provider.id)
          created++
        }
      } else {
        for (const provider of providers) await conversationRepo.addParticipant(existingProvidersGroup.id, provider.id)
      }
    }

    logger.info({ interventionId, created }, '[ENSURE-THREADS] Conversation threads ensured')
    return { success: true, data: { created } }
  } catch (error) {
    logger.error({ error, interventionId }, '[ENSURE-THREADS] Error ensuring conversation threads')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Remove participant from thread
 */
export async function removeParticipantAction(threadId: string, userId: string): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(threadId).success) return { success: false, error: 'Invalid thread ID' }
    if (!z.string().uuid().safeParse(userId).success) return { success: false, error: 'Invalid user ID' }

    logger.info({ threadId, participantId: userId, removedBy: user.id }, '[SERVER-ACTION] Removing participant')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.removeParticipant(threadId, userId, user.id)

    if (result.success) return { success: true, data: undefined }
    return { success: false, error: result.error || 'Failed to remove participant' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error removing participant:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// READ TRACKING
// ============================================================================

/**
 * Mark thread as read
 */
export async function markThreadAsReadAction(threadId: string): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(threadId).success) return { success: false, error: 'Invalid thread ID' }

    logger.info({ threadId, userId: user.id }, '[SERVER-ACTION] Marking thread as read')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.markThreadAsRead(threadId, user.id)

    if (result.success) return { success: true, data: undefined }
    return { success: false, error: result.error || 'Failed to mark thread as read' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error marking thread as read:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get unread count
 */
export async function getUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    const conversationService = await createServerActionConversationService()
    const count = await conversationService.getUnreadCount(user.id)

    return { success: true, data: count }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error getting unread count:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Mark all conversation threads as read for the current user
 */
export async function markAllThreadsAsReadAction(): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    const supabase = await createServerActionSupabaseClient()

    const { data: participations, error: pError } = await supabase
      .from('conversation_participants')
      .select('thread_id')
      .eq('user_id', user.id)

    if (pError || !participations?.length) return { success: true, data: undefined }

    const threadIds = participations.map(p => p.thread_id)

    const { data: latestMessages } = await supabase
      .from('conversation_messages')
      .select('thread_id, id, created_at')
      .in('thread_id', threadIds)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    const latestByThread = new Map<string, string>()
    for (const msg of latestMessages || []) {
      if (!latestByThread.has(msg.thread_id)) latestByThread.set(msg.thread_id, msg.id)
    }

    const updates = participations
      .filter(p => latestByThread.has(p.thread_id))
      .map(p =>
        supabase
          .from('conversation_participants')
          .update({ last_read_message_id: latestByThread.get(p.thread_id)! })
          .eq('thread_id', p.thread_id)
          .eq('user_id', user.id)
      )

    await Promise.all(updates)

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error marking all threads as read:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Add provider to group thread when intervention status changes to planning
 */
export async function addProviderToGroupThreadAction(interventionId: string): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(interventionId).success) return { success: false, error: 'Invalid intervention ID' }

    const supabase = await createServerActionSupabaseClient()

    logger.info({ interventionId, triggeredBy: user.id }, '[SERVER-ACTION] Adding provider to group thread')

    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, team_id, status, assignments:intervention_assignments!inner(user_id, role, user:user_id(id, role))')
      .eq('id', interventionId)
      .eq('assignments.role', 'prestataire')
      .single()

    if (interventionError || !intervention) return { success: false, error: 'Intervention or provider assignment not found' }

    if (!['planification', 'planifiee'].includes(intervention.status)) {
      return { success: false, error: 'Intervention must be in planning status to add provider to group' }
    }

    const { data: groupThread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('thread_type', 'group')
      .single()

    if (threadError || !groupThread) return { success: false, error: 'Group conversation not found' }

    const providerAssignment = intervention.assignments?.[0]
    if (!providerAssignment) return { success: false, error: 'No provider assigned' }

    const providerId = providerAssignment.user_id

    const { data: existingParticipant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('thread_id', groupThread.id)
      .eq('user_id', providerId)
      .single()

    if (existingParticipant) {
      logger.info('[SERVER-ACTION] Provider already in group thread')
      return { success: true, data: undefined }
    }

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.addParticipant(groupThread.id, providerId, user.id)

    if (!result.success) return { success: false, error: result.error || 'Failed to add provider to group' }

    logger.info('[SERVER-ACTION] Provider added to group thread')
    return { success: true, data: undefined }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error adding provider to group thread:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// TEAM TRANSPARENCY
// ============================================================================

/**
 * Get all threads accessible to a manager (team transparency)
 */
export async function getManagerAccessibleThreadsAction(interventionId: string): Promise<ActionResult<ThreadWithDetails[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can access all intervention conversations' }
    }

    if (!z.string().uuid().safeParse(interventionId).success) return { success: false, error: 'Invalid intervention ID' }

    logger.info({ interventionId, managerId: user.id }, '[SERVER-ACTION] Manager accessing all threads')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getManagerAccessibleThreads(interventionId, user.id)

    if (result.success && result.data) return { success: true, data: result.data }
    return { success: false, error: result.error || 'Failed to fetch threads' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching manager threads:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
