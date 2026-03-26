'use server'

/**
 * Conversation CRUD Actions
 *
 * Thread creation, message sending, deletion, and basic read operations.
 */

import {
  createServerActionConversationService,
  createServerActionSupabaseClient,
} from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'
import { sendConversationNotifications } from '../conversation-notification-actions'
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

// ============================================================================
// SYSTEM MESSAGES
// ============================================================================

/**
 * Send a welcome system message when a thread is created
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
      logger.warn('[SYSTEM-MESSAGE] No welcome message configured for thread type:', threadType)
      return
    }

    const { data: msg, error } = await supabase
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
      .select('id')
      .single()

    if (error || !msg) {
      logger.error('[SYSTEM-MESSAGE] Failed to insert welcome message:', error)
      return
    }

    await supabase
      .from('conversation_participants')
      .update({ last_read_message_id: msg.id })
      .eq('thread_id', threadId)

    logger.info({ threadId, threadType, participantName }, '[SYSTEM-MESSAGE] Welcome message sent (pre-read)')
  } catch (error) {
    logger.error('[SYSTEM-MESSAGE] Error sending welcome message:', error)
  }
}

// ============================================================================
// THREAD OPERATIONS
// ============================================================================

/**
 * Get threads by intervention
 */
export async function getThreadsByInterventionAction(
  interventionId: string
): Promise<ActionResult<ThreadWithDetails[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(interventionId).success) {
      return { success: false, error: 'Invalid intervention ID' }
    }

    logger.info({ interventionId, userId: user.id }, '[SERVER-ACTION] Getting threads for intervention')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getThreadsByIntervention(interventionId, user.id)

    if (result.success && result.data) return { success: true, data: result.data }
    return { success: false, error: result.error || 'Failed to fetch threads' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching threads:', error)
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
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    const validated = CreateThreadSchema.parse({ interventionId, type })

    logger.info({ interventionId: validated.interventionId, type: validated.type, userId: user.id }, '[SERVER-ACTION] Creating conversation thread')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.createThread(validated.interventionId, validated.type, user.id)

    if (result.success && result.data) return { success: true, data: result.data }
    return { success: false, error: result.error || 'Failed to create thread' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error creating thread:', error)
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validation error: ${error.errors[0].message}`
        : error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Get a single thread by ID
 */
export async function getThreadAction(threadId: string): Promise<ActionResult<ThreadWithDetails>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    logger.info({ threadId, userId: user.id }, '[SERVER-ACTION] Getting thread')

    const supabase = await createServerActionSupabaseClient()

    const { data: thread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('*')
      .eq('id', threadId)
      .single()

    if (threadError || !thread) return { success: false, error: 'Thread not found' }

    const { data: hasAccess, error: accessError } = await supabase.rpc('can_view_conversation', { p_thread_id: threadId })

    if (accessError || !hasAccess) {
      logger.warn({ threadId, userId: user.id, error: accessError?.message }, '[SERVER-ACTION] Access denied to thread')
      return { success: false, error: 'Access denied to this conversation' }
    }

    return { success: true, data: thread as ThreadWithDetails }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching thread:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// MESSAGES
// ============================================================================

/**
 * Get messages from a thread
 */
export async function getMessagesAction(
  threadId: string,
  options?: { page?: number; limit?: number }
): Promise<ActionResult<MessageWithUser[]>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(threadId).success) {
      return { success: false, error: 'Invalid thread ID' }
    }

    const validatedOptions = options ? PaginationSchema.parse(options) : undefined

    logger.info({ threadId, userId: user.id, page: validatedOptions?.page, limit: validatedOptions?.limit }, '[SERVER-ACTION] Getting messages')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.getMessages(threadId, user.id, validatedOptions)

    if (result.success && result.data) return { success: true, data: result.data }
    return { success: false, error: result.error || 'Failed to fetch messages' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error fetching messages:', error)
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validation error: ${error.errors[0].message}`
        : error instanceof Error ? error.message : 'Unknown error occurred'
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
  logger.debug({ threadId, contentLength: content?.length, attachmentsLength: attachments?.length }, '[CONVERSATION-ACTION] sendMessageAction called')

  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    const validated = SendMessageSchema.parse({ threadId, content, attachments })

    logger.info({ threadId: validated.threadId, userId: user.id, contentLength: validated.content.length, hasAttachments: !!(validated.attachments?.length) }, '[SERVER-ACTION] Sending message')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.sendMessage(validated.threadId, validated.content, user.id, validated.attachments)

    if (result.success && result.data) {
      const supabase = await createServerActionSupabaseClient()
      const { data: thread } = await supabase
        .from('conversation_threads')
        .select('intervention_id, team_id')
        .eq('id', threadId)
        .single()

      if (thread?.intervention_id) {
        sendConversationNotifications({
          messageId: result.data.id,
          messageContent: result.data.content,
          messageCreatedAt: result.data.created_at,
          messageUserId: result.data.user_id,
          threadId,
          teamId: thread.team_id,
          interventionId: thread.intervention_id
        }).catch(err => {
          logger.warn({ err }, '[CONVERSATION-ACTION] Push/email notifications failed (non-blocking)')
        })
      }

      return { success: true, data: result.data }
    }

    return { success: false, error: result.error || 'Failed to send message' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error sending message:', error)
    return {
      success: false,
      error: error instanceof z.ZodError
        ? `Validation error: ${error.errors[0].message}`
        : error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

/**
 * Delete a message
 */
export async function deleteMessageAction(messageId: string): Promise<ActionResult<void>> {
  try {
    const authContext = await getServerActionAuthContextOrNull()
    const user = authContext?.profile
    if (!user) return { success: false, error: 'Authentication required' }

    if (!z.string().uuid().safeParse(messageId).success) {
      return { success: false, error: 'Invalid message ID' }
    }

    logger.info({ messageId, userId: user.id }, '[SERVER-ACTION] Deleting message')

    const conversationService = await createServerActionConversationService()
    const result = await conversationService.deleteMessage(messageId, user.id)

    if (result.success) return { success: true, data: undefined }
    return { success: false, error: result.error || 'Failed to delete message' }
  } catch (error) {
    logger.error('[SERVER-ACTION] Error deleting message:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
