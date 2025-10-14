/**
 * Conversation Service - Phase 3
 * Business logic layer for intervention conversations with real-time messaging
 * Handles team transparency, thread management, and notifications
 */

import {
  ConversationRepository,
  createConversationRepository,
  createServerConversationRepository,
  createServerActionConversationRepository
} from '../repositories/conversation-repository'
import {
  InterventionRepository,
  createInterventionRepository,
  createServerInterventionRepository,
  createServerActionInterventionRepository
} from '../repositories/intervention-repository'
import {
  NotificationRepository,
  createNotificationRepository,
  createServerNotificationRepository,
  createServerActionNotificationRepository
} from '../repositories/notification-repository'
import {
  UserService,
  createUserService,
  createServerUserService,
  createServerActionUserService
} from './user.service'
import type { Database } from '@/lib/database.types'
import type { User } from '../core/service-types'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'
import {
  ValidationException,
  PermissionException,
  NotFoundException,
  handleError,
  createErrorResponse,
  createSuccessResponse
} from '../core/error-handler'
import { isSuccessResponse, isErrorResponse } from '../core/type-guards'

// Type aliases
type ConversationThread = Database['public']['Tables']['conversation_threads']['Row']
type ConversationMessage = Database['public']['Tables']['conversation_messages']['Row']
type ConversationThreadType = Database['public']['Enums']['conversation_thread_type']

// Extended types
interface ThreadWithDetails extends ConversationThread {
  messages?: MessageWithUser[]
  participants?: ParticipantWithUser[]
  intervention?: Database['public']['Tables']['interventions']['Row']
  unread_count?: number
}

interface MessageWithUser extends ConversationMessage {
  user?: Database['public']['Tables']['users']['Row']
  attachments?: string[]
  reactions?: MessageReaction[]
}

interface ParticipantWithUser {
  user_id: string
  joined_at: string
  last_read_message_id?: string
  user?: Database['public']['Tables']['users']['Row']
}

interface MessageReaction {
  user_id: string
  emoji: string
  created_at: string
}

// Input types
interface MessageSendInput {
  content: string
  attachments?: string[]
  metadata?: any
}

interface PaginationOptions {
  page?: number
  limit?: number
}

// Callback type for real-time messages
type MessageCallback = (message: MessageWithUser) => void

/**
 * Conversation Service
 * Manages intervention conversations with team transparency and real-time features
 */
export class ConversationService {
  private activeSubscriptions: Map<string, RealtimeChannel> = new Map()

  constructor(
    private conversationRepo: ConversationRepository,
    private interventionRepo: InterventionRepository,
    private notificationRepo: NotificationRepository,
    private userService?: UserService
  ) {}

  /**
   * THREAD MANAGEMENT
   */

  /**
   * Get threads by intervention with user access check
   */
  async getThreadsByIntervention(interventionId: string, userId: string) {
    try {
      // Check user has access to intervention
      const hasAccess = await this.checkInterventionAccess(interventionId, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have access to this intervention',
          'conversations',
          'read',
          userId
        )
      }

      // Get threads
      const result = await this.conversationRepo.findThreadsByIntervention(interventionId)
      if (!result.success || !result.data) {
        return result
      }

      // Filter threads based on user role and participation
      const user = await this.getUserWithRole(userId)
      const filteredThreads = await this.filterThreadsByAccess(result.data, user)

      // Add unread counts for each thread
      const threadsWithUnread = await Promise.all(
        filteredThreads.map(async (thread) => ({
          ...thread,
          unread_count: await this.getThreadUnreadCount(thread.id, userId)
        }))
      )

      return createSuccessResponse(threadsWithUnread)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:getThreadsByIntervention'))
    }
  }

  /**
   * Create a new conversation thread
   */
  async createThread(interventionId: string, type: ConversationThreadType, createdBy: string) {
    try {
      // Validate intervention exists
      const intervention = await this.interventionRepo.findById(interventionId)
      if (!intervention.success || !intervention.data) {
        throw new NotFoundException('Intervention not found', 'interventions', interventionId)
      }

      // Validate user has permission to create thread
      const hasPermission = await this.checkThreadCreatePermission(intervention.data, type, createdBy)
      if (!hasPermission) {
        throw new PermissionException(
          'You do not have permission to create this type of thread',
          'conversations',
          'create',
          createdBy
        )
      }

      // Check if thread type already exists for this intervention
      const existingThreads = await this.conversationRepo.findThreadsByIntervention(interventionId)
      if (existingThreads.success && existingThreads.data) {
        const duplicate = existingThreads.data.find(t => t.thread_type === type)
        if (duplicate) {
          throw new ValidationException(
            `A ${type} thread already exists for this intervention`,
            'conversations',
            'thread_type'
          )
        }
      }

      // Create the thread
      const title = this.generateThreadTitle(type)
      const result = await this.conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: type,
        title,
        created_by: createdBy,
        team_id: intervention.data.team_id
      })

      if (!result.success || !result.data) {
        return result
      }

      // Add initial participants based on thread type
      await this.addInitialParticipants(result.data, intervention.data, createdBy)

      // Send notifications
      await this.notifyThreadCreated(result.data, intervention.data, createdBy)

      // Log activity
      await this.logActivity('thread_created', interventionId, createdBy, {
        thread_id: result.data.id,
        thread_type: type
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:createThread'))
    }
  }

  /**
   * MESSAGES
   */

  /**
   * Get messages from a thread with pagination
   */
  async getMessages(threadId: string, userId: string, options?: PaginationOptions) {
    try {
      // Check user has access to thread
      const hasAccess = await this.checkThreadAccess(threadId, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have access to this conversation',
          'conversations',
          'read',
          userId
        )
      }

      // Get messages
      const result = await this.conversationRepo.findMessagesByThread(threadId, options)
      if (!result.success || !result.data) {
        return result
      }

      // Mark as read automatically when fetching messages
      await this.markThreadAsRead(threadId, userId)

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:getMessages'))
    }
  }

  /**
   * Send a message to a thread
   */
  async sendMessage(threadId: string, content: string, userId: string, attachments?: string[]) {
    try {
      // Check user has access to send in this thread
      const hasAccess = await this.checkThreadSendAccess(threadId, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have permission to send messages in this conversation',
          'conversations',
          'send',
          userId
        )
      }

      // Validate content
      if (!content || content.trim().length === 0) {
        throw new ValidationException(
          'Message content cannot be empty',
          'conversations',
          'content'
        )
      }

      if (content.length > 5000) {
        throw new ValidationException(
          'Message content exceeds maximum length of 5000 characters',
          'conversations',
          'content'
        )
      }

      // Create the message (optimistic for better UX)
      const messageInput = {
        thread_id: threadId,
        user_id: userId,
        content: content.trim(),
        metadata: attachments ? { attachments } : null
      }

      const result = await this.conversationRepo.createMessage(messageInput)
      if (!result.success || !result.data) {
        return result
      }

      // Handle attachments if provided
      if (attachments && attachments.length > 0) {
        await this.linkMessageAttachments(result.data.id, attachments)
      }

      // Send notifications to other participants
      await this.notifyNewMessage(result.data, threadId, userId)

      // Log activity
      await this.logMessageActivity('message_sent', threadId, userId, {
        message_id: result.data.id,
        has_attachments: !!attachments?.length
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:sendMessage'))
    }
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string) {
    try {
      // Get message to check ownership
      const { data: message, error } = await this.conversationRepo.supabase
        .from('conversation_messages')
        .select('user_id, thread_id')
        .eq('id', messageId)
        .single()

      if (error || !message) {
        throw new NotFoundException('Message not found', 'conversation_messages', messageId)
      }

      // Only message author or managers can delete
      const user = await this.getUserWithRole(userId)
      if (message.user_id !== userId && !['gestionnaire', 'admin'].includes(user?.role || '')) {
        throw new PermissionException(
          'You can only delete your own messages',
          'conversations',
          'delete',
          userId
        )
      }

      // Soft delete the message
      const result = await this.conversationRepo.softDeleteMessage(messageId, userId)

      // Log activity
      await this.logMessageActivity('message_deleted', message.thread_id, userId, {
        message_id: messageId
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:deleteMessage'))
    }
  }

  /**
   * PARTICIPANTS
   */

  /**
   * Add participant to thread
   */
  async addParticipant(threadId: string, userId: string, addedBy: string) {
    try {
      // Check if adder has permission
      const hasPermission = await this.checkParticipantManagePermission(threadId, addedBy)
      if (!hasPermission) {
        throw new PermissionException(
          'You do not have permission to add participants to this conversation',
          'conversations',
          'manage_participants',
          addedBy
        )
      }

      // Add the participant
      const result = await this.conversationRepo.addParticipant(threadId, userId)
      if (!result.success) {
        return result
      }

      // Send notification to added user
      await this.notifyParticipantAdded(threadId, userId, addedBy)

      // Log activity
      await this.logMessageActivity('participant_added', threadId, addedBy, {
        added_user: userId
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:addParticipant'))
    }
  }

  /**
   * Remove participant from thread
   */
  async removeParticipant(threadId: string, userId: string, removedBy: string) {
    try {
      // Check if remover has permission
      const hasPermission = await this.checkParticipantManagePermission(threadId, removedBy)
      if (!hasPermission) {
        throw new PermissionException(
          'You do not have permission to remove participants from this conversation',
          'conversations',
          'manage_participants',
          removedBy
        )
      }

      // Prevent removing the last participant
      const thread = await this.conversationRepo.findThreadById(threadId)
      if (thread.success && thread.data?.participants && thread.data.participants.length <= 1) {
        throw new ValidationException(
          'Cannot remove the last participant from a conversation',
          'conversations',
          'participants'
        )
      }

      // Remove the participant
      const result = await this.conversationRepo.removeParticipant(threadId, userId)
      if (!result.success) {
        return result
      }

      // Send notification to removed user
      await this.notifyParticipantRemoved(threadId, userId, removedBy)

      // Log activity
      await this.logMessageActivity('participant_removed', threadId, removedBy, {
        removed_user: userId
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:removeParticipant'))
    }
  }

  /**
   * READ TRACKING
   */

  /**
   * Mark thread as read for user
   */
  async markThreadAsRead(threadId: string, userId: string) {
    try {
      // Get latest message in thread
      const messages = await this.conversationRepo.findMessagesByThread(threadId, { limit: 1 })
      if (!messages.success || !messages.data || messages.data.length === 0) {
        return createSuccessResponse({ message: 'No messages to mark as read' })
      }

      const latestMessage = messages.data[0]
      return this.conversationRepo.markAsRead(threadId, userId, latestMessage.id)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:markThreadAsRead'))
    }
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.conversationRepo.getUnreadCount(userId)
      return result.success ? (result.data || 0) : 0
    } catch (error) {
      logger.error('Failed to get unread count', error)
      return 0
    }
  }

  /**
   * TEAM TRANSPARENCY
   */

  /**
   * Get all threads accessible to a manager (team transparency)
   */
  async getManagerAccessibleThreads(interventionId: string, managerId: string) {
    try {
      // Verify manager role
      const user = await this.getUserWithRole(managerId)
      if (!user || !['gestionnaire', 'admin'].includes(user.role)) {
        throw new PermissionException(
          'Only managers can access all intervention conversations',
          'conversations',
          'manager_access',
          managerId
        )
      }

      // Verify intervention belongs to manager's team
      const intervention = await this.interventionRepo.findById(interventionId)
      if (!intervention.success || !intervention.data) {
        throw new NotFoundException('Intervention not found', 'interventions', interventionId)
      }

      if (intervention.data.team_id !== user.team_id) {
        throw new PermissionException(
          'You can only access conversations for interventions in your team',
          'conversations',
          'team_access',
          managerId
        )
      }

      // Get all threads for the intervention (managers see everything)
      const threads = await this.conversationRepo.findThreadsByIntervention(interventionId)
      if (!threads.success || !threads.data) {
        return threads
      }

      // Add unread counts and participant info
      const enrichedThreads = await Promise.all(
        threads.data.map(async (thread) => {
          const threadDetails = await this.conversationRepo.findThreadById(thread.id)
          return {
            ...thread,
            participants: threadDetails.data?.participants || [],
            message_count: thread.message_count || 0,
            last_message_at: thread.last_message_at,
            manager_viewing: true // Flag for UI to show manager view
          }
        })
      )

      return createSuccessResponse(enrichedThreads)
    } catch (error) {
      return createErrorResponse(handleError(error, 'conversations:getManagerAccessibleThreads'))
    }
  }

  /**
   * NOTIFICATIONS
   */

  /**
   * Send notification for new message
   */
  async notifyNewMessage(message: ConversationMessage, threadId: string) {
    try {
      if (!this.notificationRepo) return

      // Get thread details
      const thread = await this.conversationRepo.findThreadById(threadId)
      if (!thread.success || !thread.data) return

      // Get all participants except sender
      const participants = thread.data.participants || []
      const recipientIds = participants
        .filter(p => p.user_id !== message.user_id)
        .map(p => p.user_id)

      // Also notify all team managers (team transparency)
      const intervention = await this.interventionRepo.findById(thread.data.intervention_id)
      if (intervention.success && intervention.data) {
        // Get all team managers
        const { data: managers } = await this.conversationRepo.supabase
          .from('users')
          .select('id')
          .eq('team_id', intervention.data.team_id)
          .in('role', ['gestionnaire', 'admin'])

        if (managers) {
          // Add managers who aren't already participants
          managers.forEach(manager => {
            if (!recipientIds.includes(manager.id)) {
              recipientIds.push(manager.id)
            }
          })
        }
      }

      // Send notification to all recipients
      if (recipientIds.length > 0) {
        await this.notificationRepo.create({
          type: 'new_message',
          title: 'Nouveau message',
          message: `Nouveau message dans la conversation "${thread.data.title || 'Sans titre'}"`,
          team_id: thread.data.team_id,
          intervention_id: thread.data.intervention_id,
          created_by: message.user_id,
          target_users: recipientIds,
          metadata: {
            thread_id: threadId,
            message_id: message.id,
            preview: message.content.substring(0, 100)
          }
        })
      }
    } catch (error) {
      logger.error('Failed to send new message notification', error)
    }
  }

  /**
   * REAL-TIME
   */

  /**
   * Subscribe to real-time messages for a thread
   */
  async subscribeToThread(threadId: string, userId: string, callback: MessageCallback): Promise<RealtimeChannel> {
    try {
      // Check access
      const hasAccess = await this.checkThreadAccess(threadId, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have access to subscribe to this conversation',
          'conversations',
          'subscribe',
          userId
        )
      }

      // Clean up any existing subscription
      this.unsubscribeFromThread(threadId)

      // Create new subscription
      const channel = this.conversationRepo.subscribeToThread(threadId, async (message) => {
        // Enhance message with user info before callback
        const { data: user } = await this.conversationRepo.supabase
          .from('users')
          .select('id, name, email, avatar_url')
          .eq('id', message.user_id)
          .single()

        const enhancedMessage: MessageWithUser = {
          ...message,
          user
        }

        callback(enhancedMessage)
      })

      this.activeSubscriptions.set(threadId, channel)
      return channel
    } catch (error) {
      throw handleError(error, 'conversations:subscribeToThread')
    }
  }

  /**
   * Unsubscribe from thread
   */
  unsubscribeFromThread(threadId: string) {
    const channel = this.activeSubscriptions.get(threadId)
    if (channel) {
      this.conversationRepo.unsubscribeFromThread(threadId)
      this.activeSubscriptions.delete(threadId)
    }
  }

  /**
   * Clean up all subscriptions
   */
  cleanupSubscriptions() {
    this.activeSubscriptions.forEach((_, threadId) => {
      this.unsubscribeFromThread(threadId)
    })
    this.conversationRepo.cleanupSubscriptions()
  }

  /**
   * HELPER METHODS
   */

  /**
   * Check if user has access to intervention
   */
  private async checkInterventionAccess(interventionId: string, userId: string): Promise<boolean> {
    try {
      const intervention = await this.interventionRepo.findWithAssignments(interventionId)
      if (!intervention.success || !intervention.data) {
        return false
      }

      const user = await this.getUserWithRole(userId)
      if (!user) return false

      // Managers can access all interventions in their team
      if (['gestionnaire', 'admin'].includes(user.role)) {
        return intervention.data.team_id === user.team_id
      }

      // Tenants can access their own interventions
      if (user.role === 'locataire') {
        return intervention.data.tenant_id === userId
      }

      // Providers can access assigned interventions
      if (user.role === 'prestataire') {
        const assignments = intervention.data.intervention_assignments || []
        return assignments.some(a => a.user_id === userId)
      }

      return false
    } catch (error) {
      logger.error('Error checking intervention access', error)
      return false
    }
  }

  /**
   * Check if user has access to thread
   */
  private async checkThreadAccess(threadId: string, userId: string): Promise<boolean> {
    try {
      const thread = await this.conversationRepo.findThreadById(threadId)
      if (!thread.success || !thread.data) {
        return false
      }

      const user = await this.getUserWithRole(userId)
      if (!user) return false

      // Managers have access to all threads in their team interventions
      if (['gestionnaire', 'admin'].includes(user.role)) {
        const intervention = await this.interventionRepo.findById(thread.data.intervention_id)
        return intervention.success && intervention.data?.team_id === user.team_id
      }

      // Check if user is a participant
      const participants = thread.data.participants || []
      const isParticipant = participants.some(p => p.user_id === userId)

      // Special case for tenant_to_managers thread - tenant always has access
      if (thread.data.thread_type === 'tenant_to_managers' && user.role === 'locataire') {
        const intervention = await this.interventionRepo.findById(thread.data.intervention_id)
        if (intervention.success && intervention.data?.tenant_id === userId) {
          return true
        }
      }

      return isParticipant
    } catch (error) {
      logger.error('Error checking thread access', error)
      return false
    }
  }

  /**
   * Check if user can send messages in thread
   */
  private async checkThreadSendAccess(threadId: string, userId: string): Promise<boolean> {
    // First check basic read access
    const hasReadAccess = await this.checkThreadAccess(threadId, userId)
    if (!hasReadAccess) return false

    // Additional checks for specific thread types
    const thread = await this.conversationRepo.findThreadById(threadId)
    if (!thread.success || !thread.data) return false

    const user = await this.getUserWithRole(userId)
    if (!user) return false

    // Provider_to_managers thread: only providers and managers can send
    if (thread.data.thread_type === 'provider_to_managers') {
      return ['prestataire', 'gestionnaire', 'admin'].includes(user.role)
    }

    // All participants can send in other thread types
    return true
  }

  /**
   * Check if user can create thread type
   */
  private async checkThreadCreatePermission(
    intervention: any,
    type: ConversationThreadType,
    userId: string
  ): Promise<boolean> {
    const user = await this.getUserWithRole(userId)
    if (!user) return false

    switch (type) {
      case 'group':
        // Anyone involved in intervention can create group thread
        return true
      case 'tenant_to_managers':
        // Only tenant or managers can create
        return user.role === 'locataire' || ['gestionnaire', 'admin'].includes(user.role)
      case 'provider_to_managers':
        // Only managers can create (when assigning provider)
        return ['gestionnaire', 'admin'].includes(user.role)
      default:
        return false
    }
  }

  /**
   * Check if user can manage participants
   */
  private async checkParticipantManagePermission(threadId: string, userId: string): Promise<boolean> {
    const thread = await this.conversationRepo.findThreadById(threadId)
    if (!thread.success || !thread.data) return false

    const user = await this.getUserWithRole(userId)
    if (!user) return false

    // Only managers and thread creator can manage participants
    return ['gestionnaire', 'admin'].includes(user.role) || thread.data.created_by === userId
  }

  /**
   * Filter threads by user access
   */
  private async filterThreadsByAccess(threads: ConversationThread[], user: any): Promise<ConversationThread[]> {
    // Managers see all threads
    if (['gestionnaire', 'admin'].includes(user?.role)) {
      return threads
    }

    // Others only see threads they participate in
    const accessibleThreads: ConversationThread[] = []
    for (const thread of threads) {
      const hasAccess = await this.checkThreadAccess(thread.id, user.id)
      if (hasAccess) {
        accessibleThreads.push(thread)
      }
    }

    return accessibleThreads
  }

  /**
   * Get user with role information
   */
  private async getUserWithRole(userId: string): Promise<User | null> {
    if (!this.userService) return null

    const result = await this.userService.getById(userId)
    return result.success ? result.data : null
  }

  /**
   * Generate thread title based on type
   */
  private generateThreadTitle(type: ConversationThreadType): string {
    switch (type) {
      case 'group':
        return 'Discussion générale'
      case 'tenant_to_managers':
        return 'Communication avec les gestionnaires'
      case 'provider_to_managers':
        return 'Communication avec le prestataire'
      default:
        return 'Conversation'
    }
  }

  /**
   * Add initial participants to thread based on type
   */
  private async addInitialParticipants(
    thread: ConversationThread,
    intervention: any,
    createdBy: string
  ) {
    try {
      const participantIds: string[] = []

      switch (thread.thread_type) {
        case 'group':
          // Add tenant if exists
          if (intervention.tenant_id) {
            participantIds.push(intervention.tenant_id)
          }
          // Add all assigned users
          if (intervention.intervention_assignments) {
            intervention.intervention_assignments.forEach((a: any) => {
              if (!participantIds.includes(a.user_id)) {
                participantIds.push(a.user_id)
              }
            })
          }
          break

        case 'tenant_to_managers':
          // Add tenant
          if (intervention.tenant_id) {
            participantIds.push(intervention.tenant_id)
          }
          // Add all managers in team
          const { data: managers } = await this.conversationRepo.supabase
            .from('users')
            .select('id')
            .eq('team_id', intervention.team_id)
            .in('role', ['gestionnaire', 'admin'])

          if (managers) {
            managers.forEach(m => participantIds.push(m.id))
          }
          break

        case 'provider_to_managers':
          // Add assigned providers
          if (intervention.intervention_assignments) {
            intervention.intervention_assignments
              .filter((a: any) => a.role === 'prestataire')
              .forEach((a: any) => participantIds.push(a.user_id))
          }
          // Add managers
          const { data: mgrs } = await this.conversationRepo.supabase
            .from('users')
            .select('id')
            .eq('team_id', intervention.team_id)
            .in('role', ['gestionnaire', 'admin'])

          if (mgrs) {
            mgrs.forEach(m => participantIds.push(m.id))
          }
          break
      }

      // Add all unique participants
      const uniqueParticipants = [...new Set(participantIds)]
      for (const participantId of uniqueParticipants) {
        if (participantId !== createdBy) { // Creator is already added
          await this.conversationRepo.addParticipant(thread.id, participantId)
        }
      }
    } catch (error) {
      logger.error('Failed to add initial participants', error)
    }
  }

  /**
   * Link message attachments to intervention documents
   */
  private async linkMessageAttachments(messageId: string, attachmentIds: string[]) {
    try {
      // Create links in intervention_documents table
      const links = attachmentIds.map(attachmentId => ({
        message_id: messageId,
        document_id: attachmentId
      }))

      const { error } = await this.conversationRepo.supabase
        .from('message_attachments')
        .insert(links)

      if (error) {
        logger.error('Failed to link message attachments', error)
      }
    } catch (error) {
      logger.error('Error linking message attachments', error)
    }
  }

  /**
   * Get thread unread count for user
   */
  private async getThreadUnreadCount(threadId: string, userId: string): Promise<number> {
    try {
      // Get participant's last read message
      const { data: participant } = await this.conversationRepo.supabase
        .from('conversation_participants')
        .select('last_read_message_id')
        .eq('thread_id', threadId)
        .eq('user_id', userId)
        .single()

      if (!participant || !participant.last_read_message_id) {
        // User hasn't read any messages, return total count
        const { count } = await this.conversationRepo.supabase
          .from('conversation_messages')
          .select('*', { count: 'exact', head: true })
          .eq('thread_id', threadId)
          .is('deleted_at', null)

        return count || 0
      }

      // Count messages after last read
      const { data: lastRead } = await this.conversationRepo.supabase
        .from('conversation_messages')
        .select('created_at')
        .eq('id', participant.last_read_message_id)
        .single()

      if (!lastRead) return 0

      const { count } = await this.conversationRepo.supabase
        .from('conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('thread_id', threadId)
        .is('deleted_at', null)
        .gt('created_at', lastRead.created_at)

      return count || 0
    } catch (error) {
      logger.error('Error getting thread unread count', error)
      return 0
    }
  }

  /**
   * NOTIFICATION HELPERS
   */

  private async notifyThreadCreated(thread: ConversationThread, intervention: any, createdBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'thread_created',
        title: 'Nouvelle conversation créée',
        message: `Une nouvelle conversation "${thread.title}" a été créée pour l'intervention`,
        team_id: thread.team_id,
        intervention_id: thread.intervention_id,
        created_by: createdBy,
        metadata: { thread_id: thread.id }
      })
    } catch (error) {
      logger.error('Failed to send thread created notification', error)
    }
  }

  private async notifyParticipantAdded(threadId: string, userId: string, addedBy: string) {
    if (!this.notificationRepo) return

    try {
      const thread = await this.conversationRepo.findThreadById(threadId)
      if (!thread.success || !thread.data) return

      await this.notificationRepo.create({
        type: 'participant_added',
        title: 'Ajouté à une conversation',
        message: `Vous avez été ajouté à la conversation "${thread.data.title}"`,
        team_id: thread.data.team_id,
        intervention_id: thread.data.intervention_id,
        created_by: addedBy,
        target_users: [userId],
        metadata: { thread_id: threadId }
      })
    } catch (error) {
      logger.error('Failed to send participant added notification', error)
    }
  }

  private async notifyParticipantRemoved(threadId: string, userId: string, removedBy: string) {
    if (!this.notificationRepo) return

    try {
      const thread = await this.conversationRepo.findThreadById(threadId)
      if (!thread.success || !thread.data) return

      await this.notificationRepo.create({
        type: 'participant_removed',
        title: 'Retiré d\'une conversation',
        message: `Vous avez été retiré de la conversation "${thread.data.title}"`,
        team_id: thread.data.team_id,
        intervention_id: thread.data.intervention_id,
        created_by: removedBy,
        target_users: [userId],
        metadata: { thread_id: threadId }
      })
    } catch (error) {
      logger.error('Failed to send participant removed notification', error)
    }
  }

  /**
   * ACTIVITY LOGGING
   */

  private async logActivity(action: string, interventionId: string, userId: string, metadata?: any) {
    try {
      await this.conversationRepo.supabase
        .from('activity_logs')
        .insert({
          table_name: 'conversation_threads',
          record_id: interventionId,
          action,
          user_id: userId,
          metadata,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      logger.error('Failed to log activity', error)
    }
  }

  private async logMessageActivity(action: string, threadId: string, userId: string, metadata?: any) {
    try {
      await this.conversationRepo.supabase
        .from('activity_logs')
        .insert({
          table_name: 'conversation_messages',
          record_id: threadId,
          action,
          user_id: userId,
          metadata,
          created_at: new Date().toISOString()
        })
    } catch (error) {
      logger.error('Failed to log message activity', error)
    }
  }
}

// Factory functions for creating service instances
export const createConversationService = (
  conversationRepo?: ConversationRepository,
  interventionRepo?: InterventionRepository,
  notificationRepo?: NotificationRepository,
  userService?: UserService
) => {
  const conversation = conversationRepo || createConversationRepository()
  const intervention = interventionRepo || createInterventionRepository()
  const notification = notificationRepo || createNotificationRepository()
  const user = userService || createUserService()
  return new ConversationService(conversation, intervention, notification, user)
}

export const createServerConversationService = async () => {
  const [conversation, intervention, notification, user] = await Promise.all([
    createServerConversationRepository(),
    createServerInterventionRepository(),
    createServerNotificationRepository(),
    createServerUserService()
  ])
  return new ConversationService(conversation, intervention, notification, user)
}

export const createServerActionConversationService = async () => {
  const [conversation, intervention, notification, user] = await Promise.all([
    createServerActionConversationRepository(),
    createServerActionInterventionRepository(),
    createServerActionNotificationRepository(),
    createServerActionUserService()
  ])
  return new ConversationService(conversation, intervention, notification, user)
}