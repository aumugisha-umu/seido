'use server'

/**
 * Conversation Server Actions
 * Server-side operations for intervention conversations with real-time messaging
 * Handles team transparency, thread management, and notifications
 */

import {
  createServerActionConversationService,
  createServerActionSupabaseClient
} from '@/lib/services'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import type { Database } from '@/lib/database.types'

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
  attachments: z.array(z.string()).optional()
})

const PaginationSchema = z.object({
  page: z.number().positive().optional().default(1),
  limit: z.number().positive().max(100).optional().default(50)
})

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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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
  try {
    // Auth check
    const user = await getAuthenticatedUser()
    if (!user) {
      return { success: false, error: 'Authentication required' }
    }

    // Validate input
    const validated = SendMessageSchema.parse({ threadId, content, attachments })

    logger.info('✉️ [SERVER-ACTION] Sending message:', {
      threadId: validated.threadId,
      userId: user.id,
      contentLength: validated.content.length,
      hasAttachments: !!(validated.attachments?.length)
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.sendMessage(
      validated.threadId,
      validated.content,
      user.id,
      validated.attachments
    )

    if (result.success && result.data) {
      // Get thread to find intervention ID
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
    const user = await getAuthenticatedUser()
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
 */
export async function addParticipantAction(
  threadId: string,
  userId: string
): Promise<ActionResult<void>> {
  try {
    // Auth check
    const user = await getAuthenticatedUser()
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

    logger.info('👤 [SERVER-ACTION] Adding participant:', {
      threadId,
      participantId: userId,
      addedBy: user.id
    })

    // Create service and execute
    const conversationService = await createServerActionConversationService()
    const result = await conversationService.addParticipant(threadId, userId, user.id)

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

    return { success: false, error: result.error || 'Failed to add participant' }
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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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
    const user = await getAuthenticatedUser()
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