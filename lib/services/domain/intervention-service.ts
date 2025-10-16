/**
 * Intervention Service - Phase 3
 * Business logic layer for intervention management with complex workflow and permissions
 * Orchestrates multiple repositories and handles the 11-status workflow
 */

import {
  InterventionRepository,
  createInterventionRepository,
  createServerInterventionRepository,
  createServerActionInterventionRepository
} from '../repositories/intervention-repository'
import {
  QuoteRepository,
  createQuoteRepository,
  createServerQuoteRepository,
  createServerActionQuoteRepository
} from '../repositories/quote-repository'
import {
  NotificationRepository,
  createNotificationRepository,
  createServerNotificationRepository,
  createServerActionNotificationRepository
} from '../repositories/notification-repository'
import {
  ConversationRepository,
  createConversationRepository,
  createServerConversationRepository,
  createServerActionConversationRepository
} from '../repositories/conversation-repository'
import {
  UserService,
  createUserService,
  createServerUserService,
  createServerActionUserService
} from './user.service'
import type {
  Intervention,
  InterventionInsert,
  InterventionUpdate,
  InterventionStatus,
  User
} from '../core/service-types'
import type { Database } from '@/lib/database.types'
import { logger, logError } from '@/lib/logger'
import {
  ValidationException,
  ConflictException,
  PermissionException,
  NotFoundException,
  handleError,
  createErrorResponse,
  createSuccessResponse
} from '../core/error-handler'
import { isSuccessResponse, isErrorResponse } from '../core/type-guards'

// Type aliases
type InterventionUrgency = Database['public']['Enums']['intervention_urgency']
type InterventionType = Database['public']['Enums']['intervention_type']
type ConversationThreadType = Database['public']['Enums']['conversation_thread_type']

// Input types
interface InterventionCreateInput {
  lot_id?: string | null
  building_id?: string | null
  title: string
  description: string
  urgency?: InterventionUrgency
  type?: InterventionType
  team_id: string
  specific_location?: string | null
  tenant_comment?: string | null
}

interface InterventionUpdateInput {
  title?: string
  description?: string
  urgency?: InterventionUrgency
  type?: InterventionType
  specific_location?: string | null
  tenant_comment?: string | null
  manager_comment?: string | null
  provider_comment?: string | null
  estimated_cost?: number | null
  final_cost?: number | null
}

interface InterventionFilters {
  status?: InterventionStatus
  urgency?: InterventionUrgency
  type?: InterventionType
  building_id?: string
  lot_id?: string
  assigned_to?: string
  date_from?: string
  date_to?: string
}

interface TimeSlotInput {
  date: string
  start_time: string
  end_time: string
  duration_minutes?: number
}

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
 * Valid status transitions mapping
 */
const VALID_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  'demande': ['rejetee', 'approuvee'],
  'rejetee': [], // Terminal state
  'approuvee': ['demande_de_devis', 'planification', 'annulee'],
  'demande_de_devis': ['planification', 'annulee'],
  'planification': ['planifiee', 'annulee'],
  'planifiee': ['en_cours', 'annulee'],
  'en_cours': ['cloturee_par_prestataire', 'annulee'],
  'cloturee_par_prestataire': ['cloturee_par_locataire', 'en_cours'], // Can reopen if contested
  'cloturee_par_locataire': ['cloturee_par_gestionnaire'],
  'cloturee_par_gestionnaire': [], // Terminal state
  'annulee': [] // Terminal state
}

/**
 * Intervention Service
 * Handles business logic for intervention management with Phase 3 schema support
 */
export class InterventionService {
  constructor(
    private interventionRepo: InterventionRepository,
    private quoteRepo: QuoteRepository,
    private notificationRepo: NotificationRepository,
    private conversationRepo?: ConversationRepository,
    private userService?: UserService
  ) {}

  /**
   * CRUD OPERATIONS
   */

  /**
   * Get intervention by ID with permission check
   */
  async getById(id: string, userId: string) {
    try {
      // Get intervention with all relations
      const result = await this.interventionRepo.findWithAssignments(id)
      if (!result.success || !result.data) {
        return result
      }

      // Check user permissions
      const hasAccess = await this.checkInterventionAccess(result.data, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have permission to view this intervention',
          'interventions',
          'read',
          userId
        )
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getById'))
    }
  }

  /**
   * Get all interventions for the authenticated user's team
   * This is the primary method used by the interventions page
   */
  async getAll(options?: { limit?: number; filters?: InterventionFilters }) {
    try {
      // Get the current user's team from the service context
      if (!this.userService) {
        throw new ValidationException(
          'User service not available',
          'interventions',
          'service'
        )
      }

      // Get the authenticated user from Supabase auth
      const { data: { user: authUser }, error: authError } = await this.interventionRepo.supabase.auth.getUser()

      if (authError || !authUser) {
        throw new PermissionException(
          'User not authenticated',
          'interventions',
          'read',
          'unknown'
        )
      }

      // Get the user from our database using auth_user_id
      const { data: dbUser, error: userError } = await this.interventionRepo.supabase
        .from('users')
        .select('id, team_id, role')
        .eq('auth_user_id', authUser.id)
        .single()

      if (userError || !dbUser || !dbUser.team_id) {
        throw new NotFoundException('User or team', authUser.id)
      }

      // Use the existing getByTeam method with the user's team
      return this.interventionRepo.findByTeam(dbUser.team_id, options?.filters)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getAll'))
    }
  }

  /**
   * Get interventions by team with filters
   */
  async getByTeam(teamId: string, filters?: InterventionFilters) {
    return this.interventionRepo.findByTeam(teamId, filters)
  }

  /**
   * Get interventions by building
   */
  async getByBuilding(buildingId: string) {
    try {
      const { data, error } = await this.interventionRepo.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(id, name, address),
          lot:lot_id(id, reference, category)
        `)
        .eq('building_id', buildingId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:getByBuilding'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getByBuilding'))
    }
  }

  /**
   * Get interventions by lot
   */
  async getByLot(lotId: string) {
    try {
      const { data, error } = await this.interventionRepo.supabase
        .from('interventions')
        .select(`
          *,
          building:building_id(id, name, address),
          lot:lot_id(id, reference, category)
        `)
        .eq('lot_id', lotId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:getByLot'))
      }

      return createSuccessResponse(data || [])
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getByLot'))
    }
  }

  /**
   * Get documents for an intervention
   */
  async getDocuments(interventionId: string) {
    try {
      return await this.interventionRepo.getDocuments(interventionId)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getDocuments'))
    }
  }

  /**
   * Create new intervention
   */
  async create(data: InterventionCreateInput, userId: string) {
    try {
      // Validate user exists and has permission
      if (this.userService) {
        const userResult = await this.userService.getById(userId)
        if (!userResult.success || !userResult.data) {
          throw new NotFoundException('User', userId)
        }

        // Only tenants and managers can create interventions
        if (!['locataire', 'gestionnaire', 'admin'].includes(userResult.data.role)) {
          throw new PermissionException(
            'You do not have permission to create interventions',
            'interventions',
            'create',
            userId
          )
        }
      }

      // Create the intervention
      const interventionData: InterventionInsert = {
        ...data,
        status: 'demande',
        requested_date: new Date().toISOString()
      }

      const result = await this.interventionRepo.create(interventionData)
      if (!result.success || !result.data) {
        return result
      }

      // Auto-create conversation threads
      if (this.conversationRepo) {
        await this.createInitialConversationThreads(result.data.id, data.team_id, userId)
      }

      // Send notification
      await this.notifyInterventionCreated(result.data, userId)

      // Log activity
      await this.logActivity('intervention_created', result.data.id, userId, {
        title: data.title,
        urgency: data.urgency
      })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:create'))
    }
  }

  /**
   * Update intervention
   */
  async update(id: string, data: InterventionUpdateInput, userId: string) {
    try {
      // Get current intervention
      const current = await this.interventionRepo.findById(id)
      if (!current.success || !current.data) {
        return current
      }

      // Check permissions
      const hasAccess = await this.checkInterventionModifyAccess(current.data, userId)
      if (!hasAccess) {
        throw new PermissionException(
          'You do not have permission to update this intervention',
          'interventions',
          'update',
          userId
        )
      }

      // Update the intervention
      const result = await this.interventionRepo.update(id, data)
      if (!result.success || !result.data) {
        return result
      }

      // Log activity
      await this.logActivity('intervention_updated', id, userId, data)

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:update'))
    }
  }

  /**
   * Delete intervention (soft delete)
   */
  async delete(id: string, userId: string) {
    try {
      // Get current intervention
      const current = await this.interventionRepo.findById(id)
      if (!current.success || !current.data) {
        return current
      }

      // Only managers can delete
      if (this.userService) {
        const userResult = await this.userService.getById(userId)
        if (!userResult.success || !userResult.data) {
          throw new NotFoundException('User', userId)
        }

        if (!['gestionnaire', 'admin'].includes(userResult.data.role)) {
          throw new PermissionException(
            'Only managers can delete interventions',
            'interventions',
            'delete',
            userId
          )
        }
      }

      // Cannot delete certain statuses
      if (['en_cours', 'cloturee_par_gestionnaire'].includes(current.data.status)) {
        throw new ValidationException(
          `Cannot delete intervention with status: ${current.data.status}`,
          'interventions',
          'status'
        )
      }

      // Soft delete
      const result = await this.interventionRepo.softDelete(id, userId)
      if (!result.success) {
        return result
      }

      // Log activity
      await this.logActivity('intervention_deleted', id, userId, { status: current.data.status })

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:delete'))
    }
  }

  /**
   * ASSIGNMENT MANAGEMENT
   */

  /**
   * Assign user to intervention
   */
  async assignUser(interventionId: string, userId: string, role: 'gestionnaire' | 'prestataire', assignedBy: string) {
    try {
      // Validate intervention exists
      const intervention = await this.interventionRepo.findById(interventionId)
      if (!intervention.success || !intervention.data) {
        return intervention
      }

      // Validate assigner has permission (must be manager)
      if (this.userService) {
        const assignerResult = await this.userService.getById(assignedBy)
        if (!assignerResult.success || !assignerResult.data) {
          throw new NotFoundException('User', assignedBy)
        }

        if (!['gestionnaire', 'admin'].includes(assignerResult.data.role)) {
          throw new PermissionException(
            'Only managers can assign users to interventions',
            'interventions',
            'assign',
            assignedBy
          )
        }

        // Validate assignee exists and has correct role
        const assigneeResult = await this.userService.getById(userId)
        if (!assigneeResult.success || !assigneeResult.data) {
          throw new NotFoundException('User', userId)
        }

        if (role === 'prestataire' && assigneeResult.data.role !== 'prestataire') {
          throw new ValidationException(
            'User must have provider role to be assigned as provider',
            'interventions',
            'role'
          )
        }
      }

      // Create assignment in intervention_assignments table
      const { data: assignment, error } = await this.interventionRepo.supabase
        .from('intervention_assignments')
        .insert({
          intervention_id: interventionId,
          user_id: userId,
          role,
          assigned_by: assignedBy
        })
        .select()
        .single()

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:assignUser'))
      }

      // Create provider conversation thread if assigning provider
      if (role === 'prestataire' && this.conversationRepo) {
        await this.conversationRepo.createThread({
          intervention_id: interventionId,
          thread_type: 'provider_to_managers',
          title: 'Communication avec le prestataire',
          created_by: assignedBy,
          team_id: intervention.data.team_id
        })
      }

      // Send notification
      await this.notifyUserAssigned(intervention.data, userId, role, assignedBy)

      // Log activity
      await this.logActivity('user_assigned', interventionId, assignedBy, {
        assigned_user: userId,
        role
      })

      return createSuccessResponse(assignment)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:assignUser'))
    }
  }

  /**
   * Unassign user from intervention
   */
  async unassignUser(interventionId: string, userId: string, role: string, unassignedBy: string) {
    try {
      // Validate permissions (must be manager)
      if (this.userService) {
        const unassignerResult = await this.userService.getById(unassignedBy)
        if (!unassignerResult.success || !unassignerResult.data) {
          throw new NotFoundException('User', unassignedBy)
        }

        if (!['gestionnaire', 'admin'].includes(unassignerResult.data.role)) {
          throw new PermissionException(
            'Only managers can unassign users from interventions',
            'interventions',
            'unassign',
            unassignedBy
          )
        }
      }

      // Remove assignment
      const { error } = await this.interventionRepo.supabase
        .from('intervention_assignments')
        .delete()
        .eq('intervention_id', interventionId)
        .eq('user_id', userId)

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:unassignUser'))
      }

      // Log activity
      await this.logActivity('user_unassigned', interventionId, unassignedBy, {
        unassigned_user: userId,
        role
      })

      return createSuccessResponse({ message: 'User unassigned successfully' })
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:unassignUser'))
    }
  }

  /**
   * STATUS WORKFLOW METHODS (11 status transitions)
   */

  /**
   * Request intervention (tenant creates)
   */
  async requestIntervention(data: InterventionCreateInput, tenantId: string) {
    // This is essentially the create method with tenant validation
    return this.create(data, tenantId)
  }

  /**
   * Approve intervention (manager approves)
   */
  async approveIntervention(id: string, managerId: string, comment?: string) {
    try {
      // Validate transition
      const result = await this.validateAndUpdateStatus(
        id,
        'approuvee',
        managerId,
        { manager_comment: comment }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'approuvee', managerId)

        // Log activity
        await this.logActivity('intervention_approved', id, managerId, { comment })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:approve'))
    }
  }

  /**
   * Reject intervention (manager rejects)
   */
  async rejectIntervention(id: string, managerId: string, reason: string) {
    try {
      // Validate transition
      const result = await this.validateAndUpdateStatus(
        id,
        'rejetee',
        managerId,
        { manager_comment: reason }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'rejetee', managerId)

        // Log activity
        await this.logActivity('intervention_rejected', id, managerId, { reason })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:reject'))
    }
  }

  /**
   * Request quote from provider
   */
  async requestQuote(id: string, managerId: string, providerId: string) {
    try {
      // First assign the provider if not already assigned
      await this.assignUser(id, providerId, 'prestataire', managerId)

      // Update status
      const result = await this.validateAndUpdateStatus(
        id,
        'demande_de_devis',
        managerId,
        { requires_quote: true }
      )

      if (result.success && result.data) {
        // Create quote request in quotes table
        if (this.quoteRepo) {
          await this.quoteRepo.create({
            intervention_id: id,
            provider_id: providerId,
            status: 'demande',
            requested_by: managerId,
            team_id: result.data.team_id
          })
        }

        // Send notifications
        await this.notifyQuoteRequested(result.data, providerId, managerId)

        // Log activity
        await this.logActivity('quote_requested', id, managerId, { provider: providerId })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:requestQuote'))
    }
  }

  /**
   * Start planning (manager starts scheduling)
   */
  async startPlanning(id: string, managerId: string) {
    try {
      const result = await this.validateAndUpdateStatus(
        id,
        'planification',
        managerId,
        {}
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'planification', managerId)

        // Log activity
        await this.logActivity('planning_started', id, managerId)
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:startPlanning'))
    }
  }

  /**
   * Confirm schedule
   */
  async confirmSchedule(id: string, userId: string, slotId: string) {
    try {
      // Get the time slot details
      const { data: slot, error: slotError } = await this.interventionRepo.supabase
        .from('intervention_time_slots')
        .select('*')
        .eq('id', slotId)
        .single()

      if (slotError || !slot) {
        throw new NotFoundException('intervention_time_slots', slotId)
      }

      // Update intervention with scheduled date
      const result = await this.validateAndUpdateStatus(
        id,
        'planifiee',
        userId,
        {
          scheduled_date: slot.start_time,
          selected_slot_id: slotId
        }
      )

      if (result.success && result.data) {
        // Mark slot as selected
        await this.interventionRepo.supabase
          .from('intervention_time_slots')
          .update({ is_selected: true })
          .eq('id', slotId)

        // Send notifications
        await this.notifyScheduleConfirmed(result.data, slot, userId)

        // Log activity
        await this.logActivity('schedule_confirmed', id, userId, { slot_id: slotId })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:confirmSchedule'))
    }
  }

  /**
   * Start intervention
   */
  async startIntervention(id: string, providerId: string) {
    try {
      const result = await this.validateAndUpdateStatus(
        id,
        'en_cours',
        providerId,
        { started_at: new Date().toISOString() }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'en_cours', providerId)

        // Log activity
        await this.logActivity('intervention_started', id, providerId)
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:startIntervention'))
    }
  }

  /**
   * Complete by provider
   */
  async completeByProvider(id: string, providerId: string, report?: string) {
    try {
      const result = await this.validateAndUpdateStatus(
        id,
        'cloturee_par_prestataire',
        providerId,
        {
          provider_comment: report,
          completed_date: new Date().toISOString()
        }
      )

      if (result.success && result.data) {
        // Send notifications to tenant for validation
        await this.notifyProviderCompleted(result.data, providerId)

        // Log activity
        await this.logActivity('completed_by_provider', id, providerId, { report })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:completeByProvider'))
    }
  }

  /**
   * Validate by tenant
   */
  async validateByTenant(id: string, tenantId: string, satisfaction?: number) {
    try {
      const result = await this.validateAndUpdateStatus(
        id,
        'cloturee_par_locataire',
        tenantId,
        {
          tenant_satisfaction: satisfaction,
          validated_at: new Date().toISOString()
        }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyTenantValidated(result.data, tenantId, satisfaction)

        // Log activity
        await this.logActivity('validated_by_tenant', id, tenantId, { satisfaction })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:validateByTenant'))
    }
  }

  /**
   * Finalize by manager
   */
  async finalizeByManager(id: string, managerId: string, finalCost?: number) {
    try {
      const result = await this.validateAndUpdateStatus(
        id,
        'cloturee_par_gestionnaire',
        managerId,
        {
          final_cost: finalCost,
          finalized_at: new Date().toISOString()
        }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyInterventionFinalized(result.data, managerId)

        // Log activity
        await this.logActivity('finalized_by_manager', id, managerId, { final_cost: finalCost })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:finalizeByManager'))
    }
  }

  /**
   * Cancel intervention
   */
  async cancelIntervention(id: string, userId: string, reason: string) {
    try {
      // Get current intervention
      const current = await this.interventionRepo.findById(id)
      if (!current.success || !current.data) {
        return current
      }

      // Check if can be cancelled
      if (['cloturee_par_gestionnaire', 'rejetee'].includes(current.data.status)) {
        throw new ValidationException(
          `Cannot cancel intervention with status: ${current.data.status}`,
          'interventions',
          'status'
        )
      }

      const result = await this.validateAndUpdateStatus(
        id,
        'annulee',
        userId,
        { cancellation_reason: reason }
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyCancellation(result.data, userId, reason)

        // Log activity
        await this.logActivity('intervention_cancelled', id, userId, { reason })
      }

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:cancelIntervention'))
    }
  }

  /**
   * TIME SLOTS
   */

  /**
   * Propose time slots
   */
  async proposeTimeSlots(interventionId: string, slots: TimeSlotInput[], proposedBy: string) {
    try {
      // Validate intervention exists and is in correct status
      const intervention = await this.interventionRepo.findById(interventionId)
      if (!intervention.success || !intervention.data) {
        return intervention
      }

      if (intervention.data.status !== 'planification') {
        throw new ValidationException(
          'Can only propose time slots during planning phase',
          'interventions',
          'status'
        )
      }

      // Create time slots
      const slotInserts = slots.map(slot => ({
        intervention_id: interventionId,
        proposed_by: proposedBy,
        start_time: `${slot.date}T${slot.start_time}`,
        end_time: `${slot.date}T${slot.end_time}`,
        duration_minutes: slot.duration_minutes || 60
      }))

      const { data: createdSlots, error } = await this.interventionRepo.supabase
        .from('intervention_time_slots')
        .insert(slotInserts)
        .select()

      if (error) {
        return createErrorResponse(handleError(error, 'interventions:proposeTimeSlots'))
      }

      // Send notifications
      await this.notifyTimeSlotsProposed(intervention.data, createdSlots, proposedBy)

      // Log activity
      await this.logActivity('time_slots_proposed', interventionId, proposedBy, {
        slots_count: slots.length
      })

      return createSuccessResponse(createdSlots)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:proposeTimeSlots'))
    }
  }

  /**
   * Select time slot
   */
  async selectTimeSlot(interventionId: string, slotId: string, selectedBy: string) {
    // This calls confirmSchedule internally
    return this.confirmSchedule(interventionId, selectedBy, slotId)
  }

  /**
   * DASHBOARD AND STATS
   */

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(teamId: string): Promise<{ success: boolean; data?: DashboardStats; error?: any }> {
    try {
      const stats = await this.interventionRepo.findDashboardStats(teamId)
      if (!stats.success || !stats.data) {
        return stats
      }

      // Add additional calculated stats
      const enhancedStats: DashboardStats = {
        ...stats.data,
        upcoming: await this.getUpcomingCount(teamId),
        completed_this_month: await this.getCompletedThisMonthCount(teamId)
      }

      return createSuccessResponse(enhancedStats)
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getDashboardStats'))
    }
  }

  /**
   * Get upcoming interventions
   */
  async getUpcomingInterventions(teamId: string) {
    return this.interventionRepo.findUpcoming(teamId, 10)
  }

  /**
   * Get interventions for a specific user based on their role
   */
  async getMyInterventions(userId: string, role: User['role']) {
    try {
      switch (role) {
        case 'locataire':
          return this.interventionRepo.findByTenant(userId)
        case 'prestataire':
          // Get interventions where user is assigned as provider
          const { data, error } = await this.interventionRepo.supabase
            .from('intervention_assignments')
            .select(`
              intervention:intervention_id(*)
            `)
            .eq('user_id', userId)
            .eq('role', 'prestataire')

          if (error) {
            return createErrorResponse(handleError(error, 'interventions:getMyInterventions'))
          }

          const interventions = data?.map(a => a.intervention).filter(Boolean) || []
          return createSuccessResponse(interventions)
        case 'gestionnaire':
        case 'admin':
          // Get all team interventions for managers
          if (this.userService) {
            const userResult = await this.userService.getById(userId)
            if (userResult.success && userResult.data?.team_id) {
              return this.interventionRepo.findByTeam(userResult.data.team_id)
            }
          }
          return createSuccessResponse([])
        default:
          return createSuccessResponse([])
      }
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getMyInterventions'))
    }
  }

  /**
   * HELPER METHODS
   */

  /**
   * Get all tenant user IDs assigned to an intervention
   * Replaces direct access to deprecated intervention.tenant_id field
   * @param interventionId - The intervention ID
   * @returns Array of tenant user IDs (locataires assigned to this intervention)
   */
  private async getInterventionTenants(interventionId: string): Promise<string[]> {
    try {
      const { data, error } = await this.interventionRepo.supabase
        .from('intervention_assignments')
        .select('user_id')
        .eq('intervention_id', interventionId)
        .eq('role', 'locataire')

      if (error) {
        logger.error('Failed to fetch intervention tenants', error)
        return []
      }

      return data?.map(a => a.user_id) || []
    } catch (error) {
      logger.error('Error in getInterventionTenants', error)
      return []
    }
  }

  /**
   * Validate status transition and update
   */
  private async validateAndUpdateStatus(
    id: string,
    newStatus: InterventionStatus,
    userId: string,
    additionalUpdates: Partial<InterventionUpdate> = {}
  ) {
    // Get current intervention
    const current = await this.interventionRepo.findById(id)
    if (!current.success || !current.data) {
      return current
    }

    // Validate transition
    const validNextStatuses = VALID_TRANSITIONS[current.data.status]
    if (!validNextStatuses.includes(newStatus)) {
      throw new ValidationException(
        `Invalid status transition from '${current.data.status}' to '${newStatus}'`,
        'interventions',
        'status'
      )
    }

    // Validate user permissions for this transition
    await this.validateTransitionPermissions(current.data, newStatus, userId)

    // Update intervention
    const updates: InterventionUpdate = {
      ...additionalUpdates,
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    return this.interventionRepo.update(id, updates)
  }

  /**
   * Validate user has permission for status transition
   */
  private async validateTransitionPermissions(
    intervention: Intervention,
    newStatus: InterventionStatus,
    userId: string
  ) {
    if (!this.userService) return

    const userResult = await this.userService.getById(userId)
    if (!userResult.success || !userResult.data) {
      throw new NotFoundException('User', userId)
    }

    const user = userResult.data

    // Define which roles can perform which transitions
    const transitionPermissions: Record<InterventionStatus, User['role'][]> = {
      'approuvee': ['gestionnaire', 'admin'],
      'rejetee': ['gestionnaire', 'admin'],
      'demande_de_devis': ['gestionnaire', 'admin'],
      'planification': ['gestionnaire', 'admin'],
      'planifiee': ['gestionnaire', 'admin', 'prestataire'],
      'en_cours': ['prestataire'],
      'cloturee_par_prestataire': ['prestataire'],
      'cloturee_par_locataire': ['locataire'],
      'cloturee_par_gestionnaire': ['gestionnaire', 'admin'],
      'annulee': ['gestionnaire', 'admin', 'prestataire', 'locataire'],
      'demande': ['locataire'] // Initial creation
    }

    const allowedRoles = transitionPermissions[newStatus] || []
    if (!allowedRoles.includes(user.role)) {
      throw new PermissionException(
        `Role '${user.role}' cannot transition intervention to status '${newStatus}'`,
        'interventions',
        'status_transition',
        userId
      )
    }

    // Additional checks for specific roles
    if (user.role === 'prestataire') {
      // Check if provider is assigned to this intervention
      const { data: assignment } = await this.interventionRepo.supabase
        .from('intervention_assignments')
        .select('id')
        .eq('intervention_id', intervention.id)
        .eq('user_id', userId)
        .eq('role', 'prestataire')
        .single()

      if (!assignment) {
        throw new PermissionException(
          'Provider must be assigned to intervention to perform this action',
          'interventions',
          'provider_assignment',
          userId
        )
      }
    }

    if (user.role === 'locataire' && newStatus === 'cloturee_par_locataire') {
      // Check if tenant is assigned to this intervention
      const tenants = await this.getInterventionTenants(intervention.id)
      if (!tenants.includes(userId)) {
        throw new PermissionException(
          'Only the tenant assigned to the intervention can validate it',
          'interventions',
          'tenant_validation',
          userId
        )
      }
    }
  }

  /**
   * Check if user has access to view intervention
   */
  private async checkInterventionAccess(intervention: any, userId: string): Promise<boolean> {
    if (!this.userService) return true

    const userResult = await this.userService.getById(userId)
    if (!userResult.success || !userResult.data) {
      return false
    }

    const user = userResult.data

    // Admins and managers can see all interventions in their team
    if (['admin', 'gestionnaire'].includes(user.role)) {
      return intervention.team_id === user.team_id
    }

    // Tenants can see their own interventions
    if (user.role === 'locataire') {
      const tenants = await this.getInterventionTenants(intervention.id)
      return tenants.includes(userId)
    }

    // Providers can see interventions they're assigned to
    if (user.role === 'prestataire') {
      const assignments = intervention.intervention_assignments || []
      return assignments.some((a: any) => a.user_id === userId)
    }

    return false
  }

  /**
   * Check if user has access to modify intervention
   */
  private async checkInterventionModifyAccess(intervention: Intervention, userId: string): Promise<boolean> {
    if (!this.userService) return true

    const userResult = await this.userService.getById(userId)
    if (!userResult.success || !userResult.data) {
      return false
    }

    const user = userResult.data

    // Admins and managers can modify all interventions in their team
    if (['admin', 'gestionnaire'].includes(user.role)) {
      return intervention.team_id === user.team_id
    }

    // Tenants can only modify interventions in 'demande' status that they created
    if (user.role === 'locataire') {
      const tenants = await this.getInterventionTenants(intervention.id)
      return tenants.includes(userId) && intervention.status === 'demande'
    }

    // Providers cannot directly modify interventions (they use workflow actions)
    return false
  }

  /**
   * Create initial conversation threads for intervention
   */
  private async createInitialConversationThreads(
    interventionId: string,
    teamId: string,
    createdBy: string
  ) {
    if (!this.conversationRepo) return

    try {
      // Create group thread (all participants)
      await this.conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'group',
        title: 'Discussion générale',
        created_by: createdBy,
        team_id: teamId
      })

      // Create tenant to managers thread
      await this.conversationRepo.createThread({
        intervention_id: interventionId,
        thread_type: 'tenant_to_managers',
        title: 'Communication avec les gestionnaires',
        created_by: createdBy,
        team_id: teamId
      })

      logger.info('Created initial conversation threads for intervention', interventionId)
    } catch (error) {
      logger.error('Failed to create conversation threads', error)
      // Don't fail intervention creation if conversations fail
    }
  }

  /**
   * Get upcoming interventions count
   */
  private async getUpcomingCount(teamId: string): Promise<number> {
    const upcoming = await this.interventionRepo.findUpcoming(teamId, 100)
    return upcoming.success ? (upcoming.data?.length || 0) : 0
  }

  /**
   * Get completed this month count
   */
  private async getCompletedThisMonthCount(teamId: string): Promise<number> {
    const firstDayOfMonth = new Date()
    firstDayOfMonth.setDate(1)
    firstDayOfMonth.setHours(0, 0, 0, 0)

    const completed = await this.interventionRepo.findByTeam(teamId, {
      status: 'cloturee_par_gestionnaire',
      date_from: firstDayOfMonth.toISOString()
    })

    return completed.success ? (completed.data?.length || 0) : 0
  }

  /**
   * NOTIFICATION METHODS
   */

  private async notifyInterventionCreated(intervention: Intervention, createdBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'intervention_created',
        title: 'Nouvelle intervention créée',
        message: `L'intervention "${intervention.title}" a été créée`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: createdBy,
        target_roles: ['gestionnaire']
      })
    } catch (error) {
      logger.error('Failed to send intervention created notification', error)
    }
  }

  private async notifyStatusChange(intervention: Intervention, newStatus: InterventionStatus, changedBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'status_changed',
        title: 'Changement de statut',
        message: `Le statut de l'intervention "${intervention.title}" est passé à "${newStatus}"`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: changedBy,
        target_roles: ['gestionnaire', 'locataire', 'prestataire']
      })
    } catch (error) {
      logger.error('Failed to send status change notification', error)
    }
  }

  private async notifyUserAssigned(intervention: Intervention, userId: string, role: string, assignedBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'user_assigned',
        title: 'Nouvelle assignation',
        message: `Vous avez été assigné à l'intervention "${intervention.title}"`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: assignedBy,
        target_users: [userId]
      })
    } catch (error) {
      logger.error('Failed to send user assigned notification', error)
    }
  }

  private async notifyQuoteRequested(intervention: Intervention, providerId: string, requestedBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'quote_requested',
        title: 'Devis demandé',
        message: `Un devis est demandé pour l'intervention "${intervention.title}"`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: requestedBy,
        target_users: [providerId]
      })
    } catch (error) {
      logger.error('Failed to send quote requested notification', error)
    }
  }

  private async notifyScheduleConfirmed(intervention: Intervention, slot: any, confirmedBy: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'schedule_confirmed',
        title: 'Planification confirmée',
        message: `L'intervention "${intervention.title}" est planifiée pour le ${new Date(slot.start_time).toLocaleDateString('fr-FR')}`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: confirmedBy,
        target_roles: ['locataire', 'prestataire']
      })
    } catch (error) {
      logger.error('Failed to send schedule confirmed notification', error)
    }
  }

  private async notifyProviderCompleted(intervention: Intervention, providerId: string) {
    if (!this.notificationRepo) return

    try {
      const tenants = await this.getInterventionTenants(intervention.id)
      await this.notificationRepo.create({
        type: 'provider_completed',
        title: 'Intervention terminée par le prestataire',
        message: `L'intervention "${intervention.title}" a été marquée comme terminée. Veuillez valider les travaux.`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: providerId,
        target_users: tenants.length > 0 ? tenants : undefined
      })
    } catch (error) {
      logger.error('Failed to send provider completed notification', error)
    }
  }

  private async notifyTenantValidated(intervention: Intervention, tenantId: string, satisfaction?: number) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'tenant_validated',
        title: 'Intervention validée par le locataire',
        message: `Le locataire a validé l'intervention "${intervention.title}"${satisfaction ? ` avec une satisfaction de ${satisfaction}/5` : ''}`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: tenantId,
        target_roles: ['gestionnaire']
      })
    } catch (error) {
      logger.error('Failed to send tenant validated notification', error)
    }
  }

  private async notifyInterventionFinalized(intervention: Intervention, managerId: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'intervention_finalized',
        title: 'Intervention finalisée',
        message: `L'intervention "${intervention.title}" a été finalisée par le gestionnaire`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: managerId,
        target_roles: ['locataire', 'prestataire']
      })
    } catch (error) {
      logger.error('Failed to send intervention finalized notification', error)
    }
  }

  private async notifyCancellation(intervention: Intervention, cancelledBy: string, reason: string) {
    if (!this.notificationRepo) return

    try {
      await this.notificationRepo.create({
        type: 'intervention_cancelled',
        title: 'Intervention annulée',
        message: `L'intervention "${intervention.title}" a été annulée. Raison: ${reason}`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: cancelledBy,
        target_roles: ['gestionnaire', 'locataire', 'prestataire']
      })
    } catch (error) {
      logger.error('Failed to send cancellation notification', error)
    }
  }

  private async notifyTimeSlotsProposed(intervention: Intervention, slots: any[], proposedBy: string) {
    if (!this.notificationRepo) return

    try {
      const tenants = await this.getInterventionTenants(intervention.id)
      await this.notificationRepo.create({
        type: 'time_slots_proposed',
        title: 'Créneaux proposés',
        message: `${slots.length} créneaux ont été proposés pour l'intervention "${intervention.title}"`,
        team_id: intervention.team_id,
        intervention_id: intervention.id,
        created_by: proposedBy,
        target_users: tenants.length > 0 ? tenants : undefined
      })
    } catch (error) {
      logger.error('Failed to send time slots proposed notification', error)
    }
  }

  /**
   * ACTIVITY LOGGING
   */

  private async logActivity(
    action: string,
    interventionId: string,
    userId: string,
    metadata?: any
  ) {
    try {
      await this.interventionRepo.supabase
        .from('activity_logs')
        .insert({
          table_name: 'interventions',
          record_id: interventionId,
          action,
          user_id: userId,
          metadata,
          created_at: new Date().toISOString()
        })

      logger.info(`Activity logged: ${action} on intervention ${interventionId} by user ${userId}`)
    } catch (error) {
      logger.error('Failed to log activity', error)
    }
  }
}

// Factory functions for creating service instances
export const createInterventionService = (
  interventionRepo?: InterventionRepository,
  quoteRepo?: QuoteRepository,
  notificationRepo?: NotificationRepository,
  conversationRepo?: ConversationRepository,
  userService?: UserService
) => {
  const intervention = interventionRepo || createInterventionRepository()
  const quote = quoteRepo || createQuoteRepository()
  const notification = notificationRepo || createNotificationRepository()
  const conversation = conversationRepo || createConversationRepository()
  const user = userService || createUserService()
  return new InterventionService(intervention, quote, notification, conversation, user)
}

export const createServerInterventionService = async () => {
  const [intervention, quote, notification, conversation, user] = await Promise.all([
    createServerInterventionRepository(),
    createServerQuoteRepository(),
    createServerNotificationRepository(),
    createServerConversationRepository(),
    createServerUserService()
  ])
  return new InterventionService(intervention, quote, notification, conversation, user)
}

export const createServerActionInterventionService = async () => {
  const [intervention, quote, notification, conversation, user] = await Promise.all([
    createServerActionInterventionRepository(),
    createServerActionQuoteRepository(),
    createServerActionNotificationRepository(),
    createServerActionConversationRepository(),
    createServerActionUserService()
  ])
  return new InterventionService(intervention, quote, notification, conversation, user)
}