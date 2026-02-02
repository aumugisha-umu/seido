'use server'

/**
 * Conversation Server Actions
 * Server-side operations for intervention conversations with real-time messaging
 * Handles team transparency, thread management, and notifications
 *
 * ✅ REFACTORED (Jan 2026): Uses centralized getServerActionAuthContextOrNull()
 *    instead of duplicated local auth helper
 */

import {
  createServerActionConversationService,
  createServerActionSupabaseClient
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { sendConversationNotifications } from './conversation-notification-actions'
import { getThreadWelcomeMessage } from '@/lib/utils/thread-welcome-messages'

// Type aliases
type ConversationThread = Database['public']['Tables']['conversation_threads']['Row']
type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row']
type ConversationThreadType = Database['public']['Enums']['conversation_thread_type']

// Action result type
export type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }

// Extended types for responses
interface ThreadWithDetails extends ConversationThread {
  messages?: MessageWithUser[]
  participants?: ParticipantWithUser[]
  intervention?: Database['public']['Tables']['interventions']['Row']
  unread_count?: number
}

interface MessageWithUser extends ConversationMessage {
  user?: Database['public']['Tables']['users']['Row']
  attachments?: string[]
}

interface ParticipantWithUser {
  user_id: string
  joined_at: string
  last_read_message_id?: string
  user?: Database['public']['Tables']['users']['Row']
}

// Validation schemas
const CreateThreadSchema = z.object({
  interventionId: z.string().uuid(),
  type: z.enum(['group', 'tenant_to_managers', 'provider_to_managers'] as const)
})

const SendMessageSchema = z.object({
  threadId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  attachments: z.array(z.string().uuid()).optional().default([])
})

const PaginationSchema = z.object({
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().max(100).optional().default(50)
})

// ✅ REFACTORED: Auth helper removed - now using centralized getServerActionAuthContextOrNull()
// from lib/server-context.ts

/**
 * SYSTEM MESSAGES
 * Note: Welcome messages are now centralized in lib/utils/thread-welcome-messages.ts
 */

/**
 * Send a welcome system message when a thread is created
 * This helps users understand the purpose of each conversation thread
 *
 * @param threadId - The ID of the newly created thread
 * @param threadType - The type of thread (group, tenant_to_managers, provider_to_managers)
 * @param createdByUserId - The ID of the user who created the thread (used as message author)
 * @param participantName - Optional name of the tenant/provider for personalized message
 */
export async function sendThreadWelcomeMessage(
  threadId: string,
  threadType: ConversationThreadType,
  createdByUserId: string,
  participantName?: string
): Promise<void> {
  try {
    const supabase = await createServerActionSupabaseClient()

    const welcomeMessage = getThreadWelcomeMessage(threadType, participantName)
    if (!welcomeMessage) {
      logger.warn('⚠️ [SYSTEM-MESSAGE] No welcome message configured for thread type:', threadType)
      return
    }

    const { error } = await supabase
      .from('conversation_messages')
      .insert({
        thread_id: threadId,
        user_id: createdByUserId,
        content: welcomeMessage,
        metadata: {
          source: 'system',
          action: 'thread_created',
          thread_type: threadType
        }
      })

    if (error) {
      logger.error('❌ [SYSTEM-MESSAGE] Failed to insert welcome message:', error)
      return
    }

    logger.info('✅ [SYSTEM-MESSAGE] Welcome message sent for thread:', {
      threadId,
      threadType,
      participantName
    })
  } catch (error) {
    logger.error('❌ [SYSTEM-MESSAGE] Error sending welcome message:', error)
    // Don't throw - this is non-critical
  }
}

/**
 * THREAD MANAGEMENT
 */

/**
 * Get threads by intervention
 */
export async function getThreadsByInterventionAction(
  interventionId: string
): Promise<ActionResult<ThreadWithDetails[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate intervention ID
    if (!z.string().uuid().safeParse(interventionId).success) {
      return { success: false, error: 'Invalid intervention ID' }
    }

    logger.info('💬 [SERVER-ACTION] Getting threads for intervention:', {
      interventionId,
      userId: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getThreadsByIntervention(interventionId, user.id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch threads' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching threads:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Create a new thread
 */
export async function createThreadAction(
  interventionId: string,
  type: ConversationThreadType
): Promise<ActionResult<ConversationThread>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validated = CreateThreadSchema.parse({ interventionId, type })

    logger.info('➕ [SERVER-ACTION] Creating conversation thread:', {
      interventionId: validated.interventionId,
      type: validated.type,
      userId: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.createThread(
      validated.interventionId,
      validated.type,
      user.id
    )

    if (result.success && result.data) {
      // Revalidate intervention chat pages
      revalidatePath(`/gestionnaire/interventions/${interventionId}/chat`)
      revalidatePath(`/locataire/interventions/${interventionId}/chat`)
      revalidatePath(`/prestataire/interventions/${interventionId}/chat`)

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to create thread' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error creating thread:', error)
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
 * Get a single thread by ID
 */
export async function getThreadAction(
  threadId: string
): Promise<ActionResult<ThreadWithDetails>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate thread ID
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    logger.info('🧵 [SERVER-ACTION] Getting thread:', {
      threadId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Get thread with basic details
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      return { success: false, error: 'Thread not found' }
    }

    // Verify user has access to this thread (via RLS helper function)
    const { data: hasAccess, error: accessError } = await supabase.rpc('can_view_conversation', {
      p_thread_id: threadId
    })

    if (accessError || !hasAccess) {
      logger.warn('⚠️ [SERVER-ACTION] Access denied to thread:', {
        threadId,
        userId: user.id,
        error: accessError?.message
      })
      return { success: false, error: 'Access denied to this conversation' }
    }

    return { success: true, data: thread as ThreadWithDetails }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching thread:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get participants of a thread with user details
 */
export async function getThreadParticipantsAction(
  threadId: string
): Promise<ActionResult<ParticipantWithUser[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    logger.info('👥 [SERVER-ACTION] Getting thread participants:', {
      threadId,
      userId: user.id
    })

    const supabase = await createServerActionSupabaseClient()

    // Verify user has access to this thread
    const { data: hasAccess, error: accessError } = await supabase.rpc('can_view_conversation', {
      p_thread_id: threadId
    })

    if (accessError || !hasAccess) {
      logger.warn('⚠️ [SERVER-ACTION] Access denied to thread participants:', {
        threadId,
        userId: user.id
      })
      return { success: false, error: 'Access denied to this conversation' }
    }

    // Get participants with user details
    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select(`
        user_id,
        joined_at,
        last_read_message_id,
        user:users!conversation_participants_user_id_fkey (
          id,
          name,
          first_name,
          last_name,
          email,
          role,
          avatar_url
        )
      `)
      .eq('thread_id', threadId)
      .order('joined_at', { ascending: true })

    if (participantsError) {
      logger.error('❌ [SERVER-ACTION] Error fetching participants:', participantsError)
      return { success: false, error: 'Failed to fetch participants' }
    }

    return { success: true, data: participants as ParticipantWithUser[] }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching thread participants:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * MESSAGES
 */

/**
 * Get messages from a thread
 */
export async function getMessagesAction(
  threadId: string,
  options?: { page?: number; limit?: number }
): Promise<ActionResult<MessageWithUser[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    const validatedOptions = options ? PaginationSchema.parse(options) : undefined

    logger.info('📨 [SERVER-ACTION] Getting messages:', {
      threadId,
      userId: user.id,
      page: validatedOptions?.page,
      limit: validatedOptions?.limit
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getMessages(threadId, user.id, validatedOptions)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch messages' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching messages:', error)
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
 * Send a message to a thread
 */
export async function sendMessageAction(
  threadId: string,
  content: string,
  attachments?: string[]
): Promise<ActionResult<ConversationMessage>> {
  // Log BEFORE try-catch to ensure it always appears
  console.log('🚀 [CONVERSATION-ACTION] ENTRY POINT - sendMessageAction called')
  console.log('📥 [CONVERSATION-ACTION] Raw arguments received:', {
    threadId,
    threadIdType: typeof threadId,
    content,
    contentType: typeof content,
    contentLength: content?.length,
    attachments,
    attachmentsType: typeof attachments,
    attachmentsIsArray: Array.isArray(attachments),
    attachmentsLength: attachments?.length
  })

  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    console.log('🔧 [CONVERSATION-ACTION] sendMessageAction received:', {
      threadId,
      content,
      attachments,
      attachmentsLength: attachments?.length
    })

    const validated = SendMessageSchema.parse({ threadId, content, attachments })

    console.log('✅ [CONVERSATION-ACTION] After validation:', {
      threadId: validated.threadId,
      contentLength: validated.content.length,
      attachments: validated.attachments,
      attachmentsLength: validated.attachments?.length
    })

    logger.info('✉️ [SERVER-ACTION] Sending message:', {
      threadId: validated.threadId,
      userId: user.id,
      contentLength: validated.content.length,
      hasAttachments: !!(validated.attachments?.length)
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()

    console.log('📡 [CONVERSATION-ACTION] Calling conversationService.sendMessage with:', {
      threadId: validated.threadId,
      userId: user.id,
      attachments: validated.attachments,
      attachmentsLength: validated.attachments?.length
    })

    const result = await conversationService.sendMessage(
      validated.threadId,
      validated.content,
      user.id,
      validated.attachments
    )

    if (result.success && result.data) {
      // Get thread to find intervention ID and team_id
      const supabase = await createServerActionSupabaseClient()
      const { data: thread } = await supabase
        .from('conversation_threads')
        .select('intervention_id, team_id')
        .eq('id', threadId)
        .single()

      if (thread?.intervention_id) {
        // Revalidate intervention chat pages
        revalidatePath(`/gestionnaire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/locataire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/prestataire/interventions/${thread.intervention_id}/chat`)

        // Send push and email notifications (async, non-blocking)
        sendConversationNotifications({
          messageId: result.data.id,
          messageContent: result.data.content,
          messageCreatedAt: result.data.created_at,
          messageUserId: result.data.user_id,
          threadId,
          teamId: thread.team_id,
          interventionId: thread.intervention_id
        }).catch(err => {
          logger.warn({ err }, '⚠️ [CONVERSATION-ACTION] Push/email notifications failed (non-blocking)')
        })
      }

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to send message' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error sending message:', error)
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
 * Delete a message
 */
export async function deleteMessageAction(messageId: string): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate message ID
    if (!z.string().uuid().safeParse(messageId).success) {
      return { success: false, error: 'Invalid message ID' }
    }

    logger.info('🗑️ [SERVER-ACTION] Deleting message:', {
      messageId,
      userId: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.deleteMessage(messageId, user.id)

    if (result.success) {
      // Get message thread to find intervention ID for revalidation
      const supabase = await createServerActionSupabaseClient()
      const { data: message } = await supabase
        .from('conversation_messages')
        .select('thread_id')
        .eq('id', messageId)
        .single()

      if (message?.thread_id) {
        const { data: thread } = await supabase
          .from('conversation_threads')
          .select('intervention_id')
          .eq('id', message.thread_id)
          .single()

        if (thread?.intervention_id) {
          // Revalidate intervention chat pages
          revalidatePath(`/gestionnaire/interventions/${thread.intervention_id}/chat`)
          revalidatePath(`/locataire/interventions/${thread.intervention_id}/chat`)
          revalidatePath(`/prestataire/interventions/${thread.intervention_id}/chat`)
        }
      }

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to delete message' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error deleting message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * PARTICIPANTS
 */

/**
 * Add participant to thread
 * Enhanced version with team verification and provider thread auto-creation
 */
export async function addParticipantAction(
  threadId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const currentUser = authContext?.profile
    if (!currentUser) {
      return { success: false, error: 'Authentication required' }
    }

    // Only gestionnaires can add participants
    if (currentUser.role !== 'gestionnaire') {
      return { success: false, error: 'Only managers can add participants to conversations' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }
    if (!z.string().uuid().safeParse(userId).success) {
      return { success: false, error: 'Invalid user ID' }
    }

    const supabase = await createServerActionSupabaseClient()

    // Get thread with intervention details
    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select(`
        id,
        intervention_id,
        team_id,
        thread_type,
        intervention:intervention_id(
          id,
          team_id
        )
      `)
      .eq('id', threadId)
      .single()

    if (threadError || !thread) {
      return { success: false, error: 'Thread not found' }
    }

    // Verify current user is team manager
    const { data: membership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', thread.team_id)
      .eq('user_id', currentUser.id)
      .single()

    if (!membership) {
      return { success: false, error: 'You are not a member of this team' }
    }

    // Get user to add and verify they're in the same team
    // ✅ FIX 2026-02-01: Include auth_id to check if user is invited (has account)
    const { data: userToAdd, error: userError } = await supabase
      .from('users')
      .select('id, role, name, auth_user_id')
      .eq('id', userId)
      .single()

    if (userError || !userToAdd) {
      return { success: false, error: 'User not found' }
    }

    // Verify user is member of the same team
    const { data: userMembership } = await supabase
      .from('team_members')
      .select('user_id')
      .eq('team_id', thread.team_id)
      .eq('user_id', userId)
      .single()

    if (!userMembership) {
      return { success: false, error: 'User is not a member of this team' }
    }

    logger.info('👤 [SERVER-ACTION] Adding participant:', {
      threadId,
      threadType: thread.thread_type,
      participantId: userId,
      participantRole: userToAdd.role,
      addedBy: currentUser.id
    })

    // Add participant to the thread
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.addParticipant(threadId, userId, currentUser.id)

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to add participant' }
    }

    // If adding a prestataire or locataire to 'group' thread, create/ensure individual thread exists
    // ✅ FIX 2026-02-01: Only create individual threads for invited users (with auth_id)
    // Users without auth_id are informational contacts - they can't log in or use conversations
    if ((userToAdd.role === 'prestataire' || userToAdd.role === 'locataire') && thread.thread_type === 'group') {
      // Check if user is invited (has auth account)
      if (!userToAdd.auth_user_id) {
        logger.info('ℹ️ [SERVER-ACTION] Skipping individual thread creation for non-invited user', {
          userId,
          role: userToAdd.role,
          reason: 'no auth_user_id - informational contact only'
        })
      } else {
        const threadType = userToAdd.role === 'prestataire' ? 'provider_to_managers' : 'tenant_to_managers'
        logger.info('🔧 [SERVER-ACTION] Creating individual thread for invited user', { role: userToAdd.role, threadType })

        // Check if individual thread already exists for this specific user (with participant_id)
        const { data: existingIndividualThread } = await supabase
          .from('conversation_threads')
          .select('id')
          .eq('intervention_id', thread.intervention_id)
          .eq('thread_type', threadType)
          .eq('participant_id', userId)
          .single()

        if (!existingIndividualThread) {
          // Create individual thread for this user
          const { data: newThread, error: createError } = await supabase
            .from('conversation_threads')
            .insert({
              intervention_id: thread.intervention_id,
              thread_type: threadType,
              title: `Conversation avec ${userToAdd.name || (userToAdd.role === 'prestataire' ? 'le prestataire' : 'le locataire')}`,
              created_by: currentUser.id,
              team_id: thread.team_id,
              participant_id: userId  // Individual thread for this specific user
            })
            .select()
            .single()

          if (!createError && newThread) {
            // Send welcome message with user's name
            await sendThreadWelcomeMessage(
              newThread.id,
              threadType,
              currentUser.id,
              userToAdd.name || undefined
            )

            // Add the user as participant to the new thread
            await conversationService.addParticipant(
              newThread.id,
              userId,
              currentUser.id
            )

            logger.info('✅ [SERVER-ACTION] Created individual thread', {
              threadId: newThread.id,
              participantId: userId,
              threadType
            })
          } else {
            logger.error('❌ [SERVER-ACTION] Failed to create individual thread', { error: createError })
          }
        } else {
          // Individual thread exists, ensure user is participant
          await conversationService.addParticipant(
            existingIndividualThread.id,
            userId,
            currentUser.id
          )
          logger.info('✅ [SERVER-ACTION] User already has individual thread', { threadId: existingIndividualThread.id })
        }
      }
    }

    // Revalidate intervention chat pages
    if (thread.intervention_id) {
      revalidatePath(`/gestionnaire/interventions/${thread.intervention_id}/chat`)
      revalidatePath(`/locataire/interventions/${thread.intervention_id}/chat`)
      revalidatePath(`/prestataire/interventions/${thread.intervention_id}/chat`)
    }

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error adding participant:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Remove participant from thread
 */
export async function removeParticipantAction(
  threadId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }
    if (!z.string().uuid().safeParse(userId).success) {
      return { success: false, error: 'Invalid user ID' }
    }

    logger.info('👤 [SERVER-ACTION] Removing participant:', {
      threadId,
      participantId: userId,
      removedBy: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.removeParticipant(threadId, userId, user.id)

    if (result.success) {
      // Get thread to find intervention ID for revalidation
      const supabase = await createServerActionSupabaseClient()
      const { data: thread } = await supabase
        .from('conversation_threads')
        .select('intervention_id')
        .eq('id', threadId)
        .single()

      if (thread?.intervention_id) {
        // Revalidate intervention chat pages
        revalidatePath(`/gestionnaire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/locataire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/prestataire/interventions/${thread.intervention_id}/chat`)
      }

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to remove participant' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error removing participant:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * READ TRACKING
 */

/**
 * Mark thread as read
 */
export async function markThreadAsReadAction(threadId: string): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate thread ID
    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    logger.info('✓ [SERVER-ACTION] Marking thread as read:', {
      threadId,
      userId: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.markThreadAsRead(threadId, user.id)

    if (result.success) {
      // Get thread to find intervention ID for revalidation
      const supabase = await createServerActionSupabaseClient()
      const { data: thread } = await supabase
        .from('conversation_threads')
        .select('intervention_id')
        .eq('id', threadId)
        .single()

      if (thread?.intervention_id) {
        // Revalidate intervention chat pages
        revalidatePath(`/gestionnaire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/locataire/interventions/${thread.intervention_id}/chat`)
        revalidatePath(`/prestataire/interventions/${thread.intervention_id}/chat`)
      }

      return { success: true, data: undefined }
    }

    return { success: false, error: result.error || 'Failed to mark thread as read' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error marking thread as read:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get unread count
 */
export async function getUnreadCountAction(): Promise<ActionResult<number>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const count = await conversationService.getUnreadCount(user.id)

    return { success: true, data: count }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error getting unread count:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Add provider to group thread when intervention status changes to planning
 * This is called when intervention transitions to 'planification' or 'planifiee'
 */
export async function addProviderToGroupThreadAction(
  interventionId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate intervention ID
    if (!z.string().uuid().safeParse(interventionId).success) {
      return { success: false, error: 'Invalid intervention ID' }
    }

    const supabase = await createServerActionSupabaseClient()

    logger.info('🔄 [SERVER-ACTION] Adding provider to group thread:', {
      interventionId,
      triggeredBy: user.id
    })

    // Get intervention with provider assignment
    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select(`
        id,
        team_id,
        status,
        assignments:intervention_assignments!inner(
          user_id,
          role,
          user:user_id(id, role)
        )
      `)
      .eq('id', interventionId)
      .eq('assignments.role', 'prestataire')
      .single()

    if (interventionError || !intervention) {
      return { success: false, error: 'Intervention or provider assignment not found' }
    }

    // Verify intervention is in planning status
    if (!['planification', 'planifiee'].includes(intervention.status)) {
      return {
        success: false,
        error: 'Intervention must be in planning status to add provider to group'
      }
    }

    // Get the group thread
    const { data: groupThread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('thread_type', 'group')
      .single()

    if (threadError || !groupThread) {
      return { success: false, error: 'Group conversation not found' }
    }

    // Get provider user ID (first prestataire in assignments)
    const providerAssignment = intervention.assignments?.[0]
    if (!providerAssignment) {
      return { success: false, error: 'No provider assigned' }
    }

    const providerId = providerAssignment.user_id

    // Check if provider is already a participant
    const { data: existingParticipant } = await supabase
      .from('conversation_participants')
      .select('user_id')
      .eq('thread_id', groupThread.id)
      .eq('user_id', providerId)
      .single()

    if (existingParticipant) {
      logger.info('ℹ️ [SERVER-ACTION] Provider already in group thread')
      return { success: true, data: undefined }
    }

    // Add provider to group thread
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.addParticipant(
      groupThread.id,
      providerId,
      user.id
    )

    if (!result.success) {
      return { success: false, error: result.error || 'Failed to add provider to group' }
    }

    logger.info('✅ [SERVER-ACTION] Provider added to group thread')

    // Revalidate chat pages
    revalidatePath(`/gestionnaire/interventions/${interventionId}/chat`)
    revalidatePath(`/locataire/interventions/${interventionId}/chat`)
    revalidatePath(`/prestataire/interventions/${interventionId}/chat`)

    return { success: true, data: undefined }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error adding provider to group thread:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * TEAM TRANSPARENCY
 */

/**
 * Get all threads accessible to a manager (team transparency)
 */
export async function getManagerAccessibleThreadsAction(
  interventionId: string
): Promise<ActionResult<ThreadWithDetails[]>> {
  try {
    // Auth check
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Only managers can use this action
    if (!['gestionnaire', 'admin'].includes(user.role)) {
      return { success: false, error: 'Only managers can access all intervention conversations' }
    }

    // Validate intervention ID
    if (!z.string().uuid().safeParse(interventionId).success) {
      return { success: false, error: 'Invalid intervention ID' }
    }

    logger.info('👁️ [SERVER-ACTION] Manager accessing all threads:', {
      interventionId,
      managerId: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getManagerAccessibleThreads(interventionId, user.id)

    if (result.success && result.data) {
      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to fetch threads' }
  } catch (error) {
    logger.error('❌ [SERVER-ACTION] Error fetching manager threads:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}