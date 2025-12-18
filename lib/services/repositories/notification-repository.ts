/**
 * Notification Repository - Phase 3
 * Handles all database operations for user notifications
 * Supports multiple notification types with polymorphic relations
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
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
type Notification = Database['public']['Tables']['notifications']['Row']
type NotificationInsert = Database['public']['Tables']['notifications']['Insert']
type NotificationUpdate = Database['public']['Tables']['notifications']['Update']
type NotificationType = Database['public']['Enums']['notification_type']

// Extended types (reserved for future use)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
interface _NotificationWithRelations extends Notification {
  created_by_user?: Database['public']['Tables']['users']['Row']
  related_entity?: unknown // Polymorphic, could be intervention, quote, etc.
}

// Filter interface
interface NotificationFilters {
  type?: NotificationType
  read?: boolean
  archived?: boolean
  date_from?: string
  date_to?: string
}

// Input types
interface NotificationCreateInput extends Omit<NotificationInsert, 'metadata'> {
  metadata?: Record<string, any>
}

interface BulkNotificationData {
  user_ids: string[]
  title: string
  message: string
  type: NotificationType
  is_personal?: boolean
  related_entity_type?: string
  related_entity_id?: string
  metadata?: Record<string, any>
  team_id?: string
  created_by?: string
}

/**
 * Notification Repository
 * Manages all database operations for notifications
 */
export class NotificationRepository extends BaseRepository<Notification, NotificationInsert, NotificationUpdate> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase as any, 'notifications')
  }

  /**
   * Validation hook for notification data
   */
  protected async validate(data: NotificationInsert | NotificationUpdate): Promise<void> {
    if ('title' in data && data.title !== undefined) {
      validateLength(data.title, 1, 200, 'title')
    }

    if ('message' in data && data.message !== undefined) {
      validateLength(data.message, 1, 1000, 'message')
    }

    if ('type' in data && data.type !== undefined) {
      const validTypes: NotificationType[] = [
        'intervention',
        'chat',
        'document',
        'system',
        'team_invite',
        'assignment',
        'status_change',
        'reminder',
        'deadline'
      ]
      if (!validTypes.includes(data.type)) {
        throw new ValidationException(
          `Invalid notification type. Must be one of: ${validTypes.join(', ')}`,
          'notifications',
          'type'
        )
      }
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['user_id', 'title', 'message', 'type'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: NotificationInsert | NotificationUpdate): data is NotificationInsert {
    return 'user_id' in data && 'title' in data && 'message' in data && 'type' in data
  }

  /**
   * Find notification by ID
   */
  async findById(id: string): Promise<{ success: boolean; data?: Notification; error?: any }> {
    try {
      validateUUID(id)
      return await super.findById(id)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:findById'))
    }
  }

  /**
   * Find notifications by user with filters
   */
  async findByUser(userId: string, filters?: NotificationFilters) {
    try {
      validateUUID(userId)

      let query = this.supabase
        .from('notifications')
        .select(`
          *,
          created_by_user:created_by(id, name)
        `)
        .eq('user_id', userId)

      // Apply filters
      if (filters?.type) {
        query = query.eq('type', filters.type)
      }
      if (filters?.read !== undefined) {
        query = query.eq('read', filters.read)
      }
      if (filters?.archived !== undefined) {
        query = query.eq('archived', filters.archived)
      }
      if (filters?.date_from) {
        query = query.gte('created_at', filters.date_from)
      }
      if (filters?.date_to) {
        query = query.lte('created_at', filters.date_to)
      }

      // Order by read status and date
      query = query
        .order('read', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(100)

      const { data, error } = await query

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:findByUser'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:findByUser'))
    }
  }

  /**
   * Find unread notifications for a user
   */
  async findUnread(userId: string) {
    try {
      validateUUID(userId)

      const { data, error } = await this.supabase
        .from('notifications')
        .select(`
          *,
          created_by_user:created_by(id, name)
        `)
        .eq('user_id', userId)
        .eq('read', false)
        .eq('archived', false)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:findUnread'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:findUnread'))
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<{ success: boolean; data?: number; error?: any }> {
    try {
      validateUUID(userId)

      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false)
        .eq('archived', false)

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:getUnreadCount'))
      }

      return createSuccessResponse(count || 0)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:getUnreadCount'))
    }
  }

  /**
   * Create notification with proper defaults
   */
  async create(data: NotificationCreateInput) {
    try {
      const insertData: NotificationInsert = {
        ...data,
        read: false,
        archived: false,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null
      }

      return await super.create(insertData)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:create'))
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string) {
    try {
      validateUUID(id)

      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Notification', id)
        }
        return createErrorResponse(handleError(error, 'notifications:markAsRead'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:markAsRead'))
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string) {
    try {
      validateUUID(userId)

      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('read', false)
        .select()

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:markAllAsRead'))
      }

      return createSuccessResponse({
        updated: data?.length || 0,
        notifications: data || []
      })
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:markAllAsRead'))
    }
  }

  /**
   * Archive notification
   */
  async archive(id: string) {
    try {
      validateUUID(id)

      const { data, error } = await this.supabase
        .from('notifications')
        .update({
          archived: true
        })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Notification', id)
        }
        return createErrorResponse(handleError(error, 'notifications:archive'))
      }

      return createSuccessResponse(data)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:archive'))
    }
  }

  /**
   * Delete notification (hard delete)
   */
  async delete(id: string) {
    try {
      validateUUID(id)

      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', id)

      if (error) {
        if (error.code === 'PGRST116') {
          throw new NotFoundException('Notification', id)
        }
        return createErrorResponse(handleError(error, 'notifications:delete'))
      }

      return createSuccessResponse(true)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:delete'))
    }
  }

  /**
   * Create bulk notifications for multiple users
   */
  async createBulk(data: BulkNotificationData) {
    try {
      validateRequired(data, ['user_ids', 'title', 'message', 'type'])

      if (!Array.isArray(data.user_ids) || data.user_ids.length === 0) {
        throw new ValidationException('user_ids must be a non-empty array', 'notifications', 'user_ids')
      }

      // Validate all user IDs
      data.user_ids.forEach(id => validateUUID(id))

      // Create notification for each user
      const notifications: NotificationInsert[] = data.user_ids.map(userId => ({
        user_id: userId,
        title: data.title,
        message: data.message,
        type: data.type,
        is_personal: data.is_personal ?? false,
        related_entity_type: data.related_entity_type || null,
        related_entity_id: data.related_entity_id || null,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        team_id: data.team_id || null,
        created_by: data.created_by || null,
        read: false,
        archived: false
      }))

      const { data: created, error } = await this.supabase
        .from('notifications')
        .insert(notifications)
        .select()

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:createBulk'))
      }

      return createSuccessResponse({
        created: created?.length || 0,
        notifications: created || []
      })
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:createBulk'))
    }
  }

  /**
   * Delete notifications older than specified days
   */
  async deleteOlderThan(days: number): Promise<{ success: boolean; data?: number; error?: any }> {
    try {
      if (days < 1) {
        throw new ValidationException('Days must be at least 1', 'notifications', 'days')
      }

      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      // First get count of notifications to delete
      const { count, error: countError } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', true) // Only delete archived notifications

      if (countError) {
        return createErrorResponse(handleError(countError, 'notifications:deleteOlderThan:count'))
      }

      // Delete the notifications
      const { error: deleteError } = await this.supabase
        .from('notifications')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
        .eq('archived', true)

      if (deleteError) {
        return createErrorResponse(handleError(deleteError, 'notifications:deleteOlderThan:delete'))
      }

      return createSuccessResponse(count || 0)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:deleteOlderThan'))
    }
  }

  /**
   * Create notification for intervention status change
   */
  async createInterventionNotification(
    userId: string,
    interventionId: string,
    title: string,
    message: string,
    isPersonal: boolean = false,
    createdBy?: string
  ) {
    return this.create({
      user_id: userId,
      title,
      message,
      type: 'intervention',
      is_personal: isPersonal,
      related_entity_type: 'interventions',
      related_entity_id: interventionId,
      created_by: createdBy
    })
  }

  /**
   * Create notification for new chat message
   */
  async createChatNotification(
    userId: string,
    threadId: string,
    senderName: string,
    messagePreview: string,
    createdBy?: string
  ) {
    return this.create({
      user_id: userId,
      title: `Nouveau message de ${senderName}`,
      message: messagePreview.length > 100 ? messagePreview.substring(0, 100) + '...' : messagePreview,
      type: 'chat',
      is_personal: false,
      related_entity_type: 'conversation_threads',
      related_entity_id: threadId,
      created_by: createdBy
    })
  }

  /**
   * Create notification for quote status
   */
  async createQuoteNotification(
    userId: string,
    quoteId: string,
    title: string,
    message: string,
    isPersonal: boolean = false,
    createdBy?: string
  ) {
    return this.create({
      user_id: userId,
      title,
      message,
      type: 'intervention',
      is_personal: isPersonal,
      related_entity_type: 'intervention_quotes',
      related_entity_id: quoteId,
      created_by: createdBy
    })
  }

  /**
   * Get notification statistics for a user
   */
  async getUserStats(userId: string) {
    try {
      validateUUID(userId)

      const { data: notifications, error } = await this.supabase
        .from('notifications')
        .select('type, is_personal, read, archived')
        .eq('user_id', userId)

      if (error) {
        return createErrorResponse(handleError(error, 'notifications:getUserStats'))
      }

      const stats = {
        total: notifications?.length || 0,
        unread: 0,
        archived: 0,
        personal: 0,
        by_type: {} as Record<NotificationType, number>
      }

      // Initialize counters
      const types: NotificationType[] = ['intervention', 'chat', 'document', 'system', 'team_invite', 'assignment', 'status_change', 'reminder', 'deadline']

      types.forEach(t => stats.by_type[t] = 0)

      // Calculate stats
      notifications?.forEach(notification => {
        if (!notification.read) stats.unread++
        if (notification.archived) stats.archived++
        if (notification.is_personal) stats.personal++
        if (notification.type) stats.by_type[notification.type]++
      })

      return createSuccessResponse(stats)
    } catch (error) {
      return createErrorResponse(handleError(error, 'notifications:getUserStats'))
    }
  }
  /**
   * Get intervention with all managers and assigned users (optimized JOIN query)
   * Used by NotificationService to determine recipients for intervention notifications
   */
  async getInterventionWithManagers(interventionId: string) {
    validateUUID(interventionId)

    const { data, error } = await this.supabase
      .from('interventions')
      .select(`
        id,
        title,
        reference,
        lot_id,
        building_id,
        team_id,
        created_by,
        lot:lot_id(
          reference,
          building:building_id(
            name,
            building_contacts!building_contacts_building_id_fkey(
              user_id,
              is_primary,
              user:user_id(role)
            )
          ),
          lot_contacts!lot_contacts_lot_id_fkey(
            user_id,
            is_primary,
            user:user_id(role)
          )
        ),
        building:building_id(
          name,
          building_contacts!building_contacts_building_id_fkey(
            user_id,
            is_primary,
            user:user_id(role)
          )
        ),
        intervention_assignments!intervention_assignments_intervention_id_fkey(
          user_id,
          role,
          is_primary
        ),
        team:team_id(
          id,
          team_members(
            user_id,
            user:user_id(id, name, role)
          )
        )
      `)
      .eq('id', interventionId)
      .single()

    if (error) throw handleError(error, 'notifications:getInterventionWithManagers')

    return {
      ...data,
      // Extract IDs from intervention_assignments by role
      interventionAssignedManagers: data.intervention_assignments
        ?.filter(a => a.role === 'gestionnaire')
        ?.map(a => a.user_id) || [],
      interventionAssignedProviders: data.intervention_assignments
        ?.filter(a => a.role === 'prestataire')
        ?.map(a => a.user_id) || [],
      interventionAssignedTenants: data.intervention_assignments
        ?.filter(a => a.role === 'locataire')
        ?.map(a => a.user_id) || [],
      // Extract building managers from lot or direct building
      buildingManagers: (data.lot?.building?.building_contacts || data.building?.building_contacts || [])
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.map(c => c.user_id) || [],
      // Extract lot managers
      lotManagers: data.lot?.lot_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.map(c => c.user_id) || [],
      // Extract team members
      teamMembers: data.team?.team_members
        ?.filter(tm => tm.user)
        ?.map(tm => ({
          id: tm.user_id,
          role: tm.user.role,
          name: tm.user.name
        })) || []
    }
  }

  /**
   * Get building with all managers (optimized JOIN query)
   */
  async getBuildingWithManagers(buildingId: string) {
    validateUUID(buildingId)

    const { data, error } = await this.supabase
      .from('buildings')
      .select(`
        id,
        name,
        address,
        team_id,
        building_contacts!building_contacts_building_id_fkey(
          user_id,
          is_primary,
          user:user_id(role)
        ),
        team:team_id(
          id,
          team_members(
            user_id,
            user:user_id(id, name, role)
          )
        )
      `)
      .eq('id', buildingId)
      .single()

    if (error) throw handleError(error, 'notifications:getBuildingWithManagers')

    return {
      ...data,
      buildingManagers: data.building_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.map(c => c.user_id) || [],
      teamMembers: data.team?.team_members
        ?.filter(tm => tm.user)
        ?.map(tm => ({
          id: tm.user_id,
          role: tm.user.role,
          name: tm.user.name
        })) || []
    }
  }

  /**
   * Get lot with all managers (optimized JOIN query)
   */
  async getLotWithManagers(lotId: string) {
    validateUUID(lotId)

    const { data, error } = await this.supabase
      .from('lots')
      .select(`
        id,
        reference,
        building_id,
        team_id,
        building:building_id(
          name,
          building_contacts!building_contacts_building_id_fkey(
            user_id,
            is_primary,
            user:user_id(role)
          )
        ),
        lot_contacts!lot_contacts_lot_id_fkey(
          user_id,
          is_primary,
          user:user_id(role)
        ),
        team:team_id(
          id,
          team_members(
            user_id,
            user:user_id(id, name, role)
          )
        )
      `)
      .eq('id', lotId)
      .single()

    if (error) throw handleError(error, 'notifications:getLotWithManagers')

    return {
      ...data,
      lotManagers: data.lot_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.map(c => c.user_id) || [],
      buildingManagers: data.building?.building_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.map(c => c.user_id) || [],
      teamMembers: data.team?.team_members
        ?.filter(tm => tm.user)
        ?.map(tm => ({
          id: tm.user_id,
          role: tm.user.role,
          name: tm.user.name
        })) || []
    }
  }

  /**
   * Get contact with all related building managers (optimized JOIN query)
   */
  async getContactWithManagers(contactId: string) {
    validateUUID(contactId)

    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select(`
        id,
        first_name,
        last_name,
        type,
        team_id,
        building_contacts:building_contacts!building_contacts_user_id_fkey(
          building:building_id(
            id,
            building_contacts!building_contacts_building_id_fkey(
              user_id,
              is_primary,
              user:user_id(role)
            )
          )
        ),
        lot_contacts:lot_contacts!lot_contacts_user_id_fkey(
          lot:lot_id(
            building:building_id(
              id,
              building_contacts!building_contacts_building_id_fkey(
                user_id,
                is_primary,
                user:user_id(role)
              )
            )
          )
        ),
        team:team_id(
          id,
          team_members(
            user_id,
            user:user_id(id, name, role)
          )
        )
      `)
      .eq('id', contactId)
      .single()

    if (userError) throw handleError(userError, 'notifications:getContactWithManagers')

    // Collect all unique building managers
    const buildingManagersSet = new Set<string>()

    user.building_contacts?.forEach(bc => {
      bc.building?.building_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.forEach(c => buildingManagersSet.add(c.user_id))
    })

    user.lot_contacts?.forEach(lc => {
      lc.lot?.building?.building_contacts
        ?.filter(c => c.is_primary && c.user?.role === 'gestionnaire')
        ?.forEach(c => buildingManagersSet.add(c.user_id))
    })

    return {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      type: user.type,
      team_id: user.team_id,
      relatedBuildingManagers: Array.from(buildingManagersSet),
      teamMembers: user.team?.team_members
        ?.filter(tm => tm.user)
        ?.map(tm => ({
          id: tm.user_id,
          role: tm.user.role,
          name: tm.user.name
        })) || []
    }
  }
}

// Factory functions for creating repository instances
export const createNotificationRepository = (client?: SupabaseClient<Database>) => {
  const supabase = client || createBrowserSupabaseClient()
  return new NotificationRepository(supabase as SupabaseClient<Database>)
}

export const createServerNotificationRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new NotificationRepository(supabase as SupabaseClient<Database>)
}

export const createServerActionNotificationRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new NotificationRepository(supabase as SupabaseClient<Database>)
}