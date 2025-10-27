/**
 * Conversation Repository - Phase 3
 * Handles all database operations for intervention conversations
 * Supports real-time messaging with Supabase Realtime
 */

import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  NotFoundException,
  ValidationException,
  handleError,
  createErrorResponse,
  createSuccessResponse,
  validateRequired,
  validateUUID
} from '../core/error-handler'
import { validateLength } from '../core/service-types'

// Type aliases from database
type ConversationThread = Database['public']['Tables']['conversation_threads']['Row']
type ConversationThreadInsert = Database['public']['Tables']['conversation_threads']['Insert']
type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row']
type ConversationMessageInsert = Database['public']['Tables']['conversation_messages']['Insert']
type ConversationParticipant = Database['public']['Tables']['conversation_participants']['Row']
type ThreadType = Database['public']['Enums']['conversation_thread_type']

// Extended types
interface ThreadWithMessages extends ConversationThread {
  messages?: ConversationMessage[]
  participants?: Array<{
    user_id: string
    joined_at: string
    last_read_message_id?: string
    user?: Database['public']['Tables']['users']['Row']
  }>
  intervention?: Database['public']['Tables']['interventions']['Row']
}

interface MessageWithUser extends ConversationMessage {
  user?: Database['public']['Tables']['users']['Row']
}

// Input types
interface ThreadCreateInput {
  intervention_id: string
  thread_type: ThreadType
  title?: string
  created_by: string
  team_id: string
}

interface MessageCreateInput {
  thread_id: string
  user_id: string
  content: string
  metadata?: any
}

interface PaginationOptions {
  page?: number
  limit?: number
}

/**
 * Conversation Repository
 * Manages all database operations for conversation threads and messages
 */
export class ConversationRepository {
  protected readonly supabase: SupabaseClient<Database>
  private activeSubscriptions: Map<string, RealtimeChannel> = new Map()

  constructor(supabase: SupabaseClient<Database>) {
    this.supabase = supabase
  }

  /**
   * THREADS
   */

  /**
   * Find thread by ID with messages and participants
   */
  async findThreadById(id: string): Promise<{ success: boolean; data?: ThreadWithMessages; error?: any }> {
    try {
      validateUUID(id)

      const { data, error } = await this.supabase
        .from('conversation_threads')
        .select(`
          *,
          intervention:intervention_id(
            id,
            reference,
            title,
            status
          ),
          participants:conversation_participants(
            user_id,
            joined_at,
            last_read_message_id,
            user:user_id(id, name, email, avatar_url)
          ),
          messages:conversation_messages(
            id,
            content,
            created_at,
            user_id,
            metadata,
            deleted_at,
            user:user_id(id, name, email, avatar_url)
          )
        `)
        .eq('id', id)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('ConversationThread', id)
        }
        return createErrorResponse(handleError(error, 'conversation:findThreadById'))
      }

      // Sort messages by created_at
      if (data?.messages) {
        data.messages.sort((a: any, b: any) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        )
      }

      return createSuccessResponse(data as ThreadWithMessages)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:findThreadById'))
    }
  }

  /**
   * Find threads by intervention
   */
  async findThreadsByIntervention(interventionId: string) {
    try {
      validateUUID(interventionId)

      const { data, error } = await this.supabase
        .from('conversation_threads')
        .select(`
          *,
          participants:conversation_participants(count)
        `)
        .eq('intervention_id', interventionId)
        .order('last_message_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'conversation:findThreadsByIntervention'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:findThreadsByIntervention'))
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(input: ThreadCreateInput) {
    try {
      validateRequired(input, ['intervention_id', 'thread_type', 'created_by', 'team_id'])
      validateUUID(input.intervention_id)
      validateUUID(input.created_by)
      validateUUID(input.team_id)

      // Validate thread type
      const validTypes: ThreadType[] = ['group', 'tenant_to_managers', 'provider_to_managers']
      if (!validTypes.includes(input.thread_type)) {
        throw new ValidationException(
          `Invalid thread type. Must be one of: ${validTypes.join(', ')}`,
          'conversation_threads',
          'thread_type'
        )
      }

      // Create the thread
      const { data: thread, error: threadError } = await this.supabase
        .from('conversation_threads')
        .insert({
          intervention_id: input.intervention_id,
          thread_type: input.thread_type,
          title: input.title || null,
          created_by: input.created_by,
          team_id: input.team_id
        })
        .select()
        .single()

      if (threadError) {
        return createErrorResponse(handleError(threadError, 'conversation:createThread'))
      }

      // Add creator as first participant
      const { error: participantError } = await this.supabase
        .from('conversation_participants')
        .insert({
          thread_id: thread.id,
          user_id: input.created_by
        })

      if (participantError) {
        // Rollback thread creation
        await this.supabase.from('conversation_threads').delete().eq('id', thread.id)
        return createErrorResponse(handleError(participantError, 'conversation:createThread:participant'))
      }

      return createSuccessResponse(thread)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:createThread'))
    }
  }

  /**
   * MESSAGES
   */

  /**
   * Find messages by thread with pagination
   */
  async findMessagesByThread(
    threadId: string,
    options: PaginationOptions = {}
  ): Promise<{ success: boolean; data?: MessageWithUser[]; pagination?: any; error?: any }> {
    try {
      validateUUID(threadId)

      const page = options.page || 1
      const limit = options.limit || 50
      const offset = (page - 1) * limit

      // Get total count
      const { count, error: countError } = await this.supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', threadId)
        .is('deleted_at', null)

      if (countError) {
        return createErrorResponse(handleError(countError, 'conversation:findMessagesByThread:count'))
      }

      // Get messages with user info and attachments
      const { data, error } = await this.supabase
        .from('conversation_messages')
        .select(`
          *,
          user:user_id(id, name, email, avatar_url, role),
          attachments:intervention_documents!message_id(
            id,
            filename,
            original_filename,
            mime_type,
            file_size,
            storage_path,
            document_type
          )
        `)
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        return createErrorResponse(handleError(error, 'conversation:findMessagesByThread'))
      }

      // Reverse to show oldest first
      const messages = (data || []).reverse()

      return {
        success: true,
        data: messages as MessageWithUser[],
        pagination: {
          page,
          limit,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / limit),
          hasNext: page * limit < (count || 0),
          hasPrev: page > 1
        }
      }
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:findMessagesByThread'))
    }
  }

  /**
   * Create a new message
   */
  async createMessage(input: MessageCreateInput) {
    try {
      validateRequired(input, ['thread_id', 'user_id', 'content'])
      validateUUID(input.thread_id)
      validateUUID(input.user_id)
      validateLength(input.content, 1, 5000, 'content')

      // Check if user is participant
      const { data: participant, error: participantCheckError } = await this.supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('thread_id', input.thread_id)
        .eq('user_id', input.user_id)
        .single()

      if (participantCheckError || !participant) {
        // Add user as participant if not already
        await this.supabase
          .from('conversation_participants')
          .insert({
            thread_id: input.thread_id,
            user_id: input.user_id
          })
      }

      // Create the message
      const { data: message, error: messageError } = await this.supabase
        .from('conversation_messages')
        .insert({
          thread_id: input.thread_id,
          user_id: input.user_id,
          content: input.content,
          metadata: input.metadata || null
        })
        .select(`
          *,
          user:user_id(id, name, email, avatar_url)
        `)
        .single()

      if (messageError) {
        return createErrorResponse(handleError(messageError, 'conversation:createMessage'))
      }

      // Update thread's last_message_at and message_count
      // First, get current message_count
      const { data: currentThread } = await this.supabase
        .from('conversation_threads')
        .select('message_count')
        .eq('id', input.thread_id)
        .single()

      const newCount = (currentThread?.message_count || 0) + 1

      const { error: updateError } = await this.supabase
        .from('conversation_threads')
        .update({
          last_message_at: new Date().toISOString(),
          message_count: newCount,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.thread_id)

      if (updateError) {
        console.error('Failed to update thread metadata:', updateError)
      }

      return createSuccessResponse(message as MessageWithUser)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:createMessage'))
    }
  }

  /**
   * Soft delete a message
   */
  async softDeleteMessage(messageId: string, deletedBy: string) {
    try {
      validateUUID(messageId)
      validateUUID(deletedBy)

      const { data, error } = await this.supabase
        .from('conversation_messages')
        .update({
          deleted_at: new Date().toISOString(),
          deleted_by: deletedBy,
          content: '[Message supprimé]'
        })
        .eq('id', messageId)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('ConversationMessage', messageId)
        }
        return createErrorResponse(handleError(error, 'conversation:softDeleteMessage'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:softDeleteMessage'))
    }
  }

  /**
   * PARTICIPANTS
   */

  /**
   * Add participant to thread
   */
  async addParticipant(threadId: string, userId: string) {
    try {
      validateUUID(threadId)
      validateUUID(userId)

      // Check if already participant
      const { data: existing } = await this.supabase
        .from('conversation_participants')
        .select('user_id')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .single()

      if (existing) {
        return createSuccessResponse({ message: 'User is already a participant' })
      }

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .insert({
          thread_id: threadId,
          user_id: userId
        })
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'conversation:addParticipant'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:addParticipant'))
    }
  }

  /**
   * Remove participant from thread
   */
  async removeParticipant(threadId: string, userId: string) {
    try {
      validateUUID(threadId)
      validateUUID(userId)

      const { error } = await this.supabase
        .from('conversation_participants')
        .delete()
        .eq('thread_id', threadId)
        .eq('user_id', userId)

      if (error) {
        return createErrorResponse(handleError(error, 'conversation:removeParticipant'))
      }

      return createSuccessResponse({ message: 'Participant removed successfully' })
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:removeParticipant'))
    }
  }

  /**
   * Mark message as read
   */
  async markAsRead(threadId: string, userId: string, messageId: string) {
    try {
      validateUUID(threadId)
      validateUUID(userId)
      validateUUID(messageId)

      const { data, error } = await this.supabase
        .from('conversation_participants')
        .update({
          last_read_message_id: messageId
        })
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'conversation:markAsRead'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:markAsRead'))
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<{ success: boolean; data?: number; error?: any }> {
    try {
      validateUUID(userId)

      // Get all threads user participates in
      const { data: participations, error: participationError } = await this.supabase
        .from('conversation_participants')
        .select(`
          thread_id,
          last_read_message_id,
          thread:thread_id(
            message_count
          )
        `)
        .eq('user_id', userId)

      if (participationError) {
        return createErrorResponse(handleError(participationError, 'conversation:getUnreadCount'))
      }

      let totalUnread = 0

      // Calculate unread for each thread
      for (const participation of participations || []) {
        if (!participation.last_read_message_id) {
          // Never read any messages in this thread
          totalUnread += participation.thread?.message_count || 0
        } else {
          // Count messages after last read
          const { count, error } = await this.supabase
            .from('conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('thread_id', participation.thread_id)
            .is('deleted_at', null)
            .gt('created_at', (
              await this.supabase
                .from('conversation_messages')
                .select('created_at')
                .eq('id', participation.last_read_message_id)
                .single()
            ).data?.created_at || '')

          if (!error && count) {
            totalUnread += count
          }
        }
      }

      return createSuccessResponse(totalUnread)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversation:getUnreadCount'))
    }
  }

  /**
   * REAL-TIME
   */

  /**
   * Subscribe to thread messages (real-time)
   */
  subscribeToThread(
    threadId: string,
    callback: (message: ConversationMessage) => void
  ): RealtimeChannel {
    // Clean up existing subscription if any
    this.unsubscribeFromThread(threadId)

    const channel = this.supabase
      .channel(`conversation:${threadId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_messages',
          filter: `thread_id=eq.${threadId}`
        },
        (payload) => {
          callback(payload.new as ConversationMessage)
        }
      )
      .subscribe()

    this.activeSubscriptions.set(threadId, channel)
    return channel
  }

  /**
   * Unsubscribe from thread
   */
  unsubscribeFromThread(threadId: string) {
    const channel = this.activeSubscriptions.get(threadId)
    if (channel) {
      this.supabase.removeChannel(channel)
      this.activeSubscriptions.delete(threadId)
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanupSubscriptions() {
    this.activeSubscriptions.forEach((channel, threadId) => {
      this.supabase.removeChannel(channel)
    })
    this.activeSubscriptions.clear()
  }
}

// Factory functions for creating repository instances
export const createConversationRepository = (client?: SupabaseClient<Database>) => {
  const supabase = client || createBrowserSupabaseClient()
  return new ConversationRepository(supabase as SupabaseClient<Database>)
}

export const createServerConversationRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new ConversationRepository(supabase as SupabaseClient<Database>)
}

export const createServerActionConversationRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new ConversationRepository(supabase as SupabaseClient<Database>)
}