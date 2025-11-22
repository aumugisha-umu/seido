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
} from '../repositories/intervention.repository'
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
import { createEmailNotificationService } from './email-notification.service'
import { createServerNotificationService } from './notification.service'
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
import { createServiceRoleSupabaseClient } from '../core/supabase-client'

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
  status?: InterventionStatus  // Optional: allows API routes to set status explicitly
}

interface InterventionUpdateInput {
  title?: string
  description?: string
  urgency?: InterventionUrgency
  type?: InterventionType
  specific_location?: string | null
  tenant_comment?: string | null
  provider_guidelines?: string | null
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
   * Get intervention by ID
   * ✅ SIMPLE: RLS policies handle ALL permission checks automatically
   * Pattern identique à Lots/Immeubles: pas de check custom, RLS uniquement
   */
  async getById(id: string, userId: string) {
    try {
      // Get intervention with basic data
      const result = await this.interventionRepo.findById(id)
      if (!result.success || !result.data) {
        return result
      }

      // ✅ NO CUSTOM PERMISSION CHECK - RLS handles it
      // If user doesn't have access, Supabase RLS policies would have blocked findById()
      // This matches the Lots/Immeubles pattern exactly

      return result
    } catch (error) {
      return createErrorResponse(handleError(error, 'interventions:getById'))
    }
  }

  // ✅ Méthode custom complexe supprimée
  // La page utilisera getById() + queries Supabase directes (pattern Lots/Immeubles)

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
  async create(data: InterventionCreateInput, userId: string, options?: { skipInitialSelect?: boolean }) {
    try {
      // Prepare intervention data with proper initial status
      let interventionData: InterventionInsert

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

        // Determine initial status based on creator role
        // Managers/admins pre-approve their own interventions
        // Tenants need manager approval
        // Note: If status is already provided in data (e.g., from API routes with business logic),
        // use that status instead of the default
        const initialStatus: InterventionStatus = ['gestionnaire', 'admin'].includes(userResult.data.role)
          ? 'approuvee'
          : 'demande'

        interventionData = {
          ...data,
          status: data.status || initialStatus,  // Use provided status or default
          requested_date: new Date().toISOString()
        }
      } else {
        // Fallback if userService not available - default to 'demande'
        interventionData = {
          ...data,
          status: data.status || 'demande',  // Use provided status or default
          requested_date: new Date().toISOString()
        }
      }

      // ✅ Pass skipInitialSelect option to repository
      const result = await this.interventionRepo.create(interventionData, options)
      if (!result.success || !result.data) {
        return result
      }

      // If we skipped SELECT, we only have the ID
      // Caller must fetch complete intervention later and handle post-creation tasks
      if (options?.skipInitialSelect) {
        logger.info({ interventionId: result.data.id }, "✅ Intervention created (ID only, caller will fetch later)")
        return result  // Contains { id: string }
      }

      // Auto-create conversation threads (only if we have complete data)
      if (this.conversationRepo) {
        await this.createInitialConversationThreads(result.data.id, data.team_id, userId)
      }

      // Notification will be handled by the API route via NotificationService
      // No longer calling legacy notifyInterventionCreated()

      // Send email (if created by tenant)
      if (interventionData.status === 'demande') {
        await this.sendInterventionCreatedEmail(result.data, userId)
      }

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
  async update(id: string, data: InterventionUpdateInput, userId?: string) {
    try {
      // Get current intervention
      const current = await this.interventionRepo.findById(id)
      if (!current.success || !current.data) {
        return current
      }

      // ✅ NO CUSTOM PERMISSION CHECK - RLS handles it
      // If user doesn't have modify access, Supabase RLS policies will block the update
      // This matches the Lots/Immeubles pattern exactly

      // Update the intervention
      const result = await this.interventionRepo.update(id, data)
      if (!result.success || !result.data) {
        return result
      }

      // Log activity (only if userId provided)
      if (userId) {
        await this.logActivity('intervention_updated', id, userId, data)
      }

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

      // Notification will be handled by NotificationService when needed
      // No longer calling legacy notifyUserAssigned()

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
        {} // Comments are now stored in intervention_comments table
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'approuvee', managerId)

        // Send email to tenant
        await this.sendInterventionApprovedEmail(result.data, managerId, comment)

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
        {} // Comments are now stored in intervention_comments table
      )

      if (result.success && result.data) {
        // Send notifications
        await this.notifyStatusChange(result.data, 'rejetee', managerId)

        // Send email to tenant
        await this.sendInterventionRejectedEmail(result.data, managerId, reason)

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

        // Send email to provider
        await this.sendQuoteRequestEmail(result.data, providerId, managerId)

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
   * Confirm schedule - Sequential and simple approach
   * Each step is independent and won't rollback previous successful steps
   */
  async confirmSchedule(
    id: string,
    userId: string,
    slotId: string,
    options?: { useServiceRole?: boolean }
  ) {
    // Use service role client for all operations if requested
    const supabase = options?.useServiceRole
      ? createServiceRoleSupabaseClient()
      : this.interventionRepo.supabase

    // ============================================================================
    // STEP 1: Validation
    // ============================================================================
    const { data: slot, error: slotError } = await supabase
      .from('intervention_time_slots')
      .select('*')
      .eq('id', slotId)
      .single()

    if (slotError || !slot) {
      return createErrorResponse(handleError(
        slotError || new Error('Slot not found'),
        'interventions:confirmSchedule'
      ))
    }

    const { data: intervention, error: interventionError } = await supabase
      .from('interventions')
      .select('id, status, title, team_id')
      .eq('id', id)
      .single()

    if (interventionError || !intervention) {
      return createErrorResponse(handleError(
        interventionError || new Error('Intervention not found'),
        'interventions:confirmSchedule'
      ))
    }

    // ============================================================================
    // STEP 2: Update slot
    // ============================================================================
    const { error: slotUpdateError } = await supabase
      .from('intervention_time_slots')
      .update({
        is_selected: true,
        status: 'selected'
      })
      .eq('id', slotId)

    if (slotUpdateError) {
      return createErrorResponse(handleError(slotUpdateError, 'interventions:updateSlot'))
    }

    logger.info('✅ [STEP 2] Slot updated successfully')

    // ============================================================================
    // STEP 3: Update intervention
    // ============================================================================
    const scheduledTimestamp = `${slot.slot_date}T${slot.start_time}`

    const { data: updatedIntervention, error: interventionUpdateError } = await supabase
      .from('interventions')
      .update({
        scheduled_date: scheduledTimestamp,
        selected_slot_id: slotId,
        status: 'planifiee'
      })
      .eq('id', id)
      .select()
      .single()

    if (interventionUpdateError) {
      throw new Error(`Failed to update intervention: ${interventionUpdateError.message}`)
    }

    // ============================================================================
    // STEP 4: Log activity
    // ============================================================================
    try {
      await this.logActivity(
        'schedule_confirmed',
        id,
        userId,
        {
          slot_id: slotId,
          slot_date: slot.slot_date,
          start_time: slot.start_time
        },
        options?.useServiceRole ? supabase : undefined
      )
    } catch (logError) {
      // Non-critical, continue
    }

    // ============================================================================
    // STEP 5: Send notifications
    // ============================================================================
    try {
      if (updatedIntervention) {
        await this.notifyScheduleConfirmed(updatedIntervention, slot, userId)

        // Send email to tenant + provider
        await this.sendInterventionScheduledEmail(updatedIntervention, slot)
      }
    } catch (notifError) {
      // Non-critical, continue
    }

    return createSuccessResponse(updatedIntervention)
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
      // Note: Provider report should be saved in intervention_comments table
      const result = await this.validateAndUpdateStatus(
        id,
        'cloturee_par_prestataire',
        providerId,
        {
          completed_date: new Date().toISOString()
        }
      )

      if (result.success && result.data) {
        // Send notifications to tenant for validation
        await this.notifyProviderCompleted(result.data, providerId)

        // Send email to tenant + manager
        await this.sendInterventionCompletedEmail(result.data, providerId, report)

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
  async getMyInterventions(userId: string, role: User['role'], teamId?: string) {
    try {
      switch (role) {
        case 'locataire':
          return this.interventionRepo.findByTenant(userId, teamId)
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

  private async getInterventionPrestataires(interventionId: string): Promise<string[]> {
    try {
      const { data, error } = await this.interventionRepo.supabase
        .from('intervention_assignments')
        .select('user_id')
        .eq('intervention_id', interventionId)
        .eq('role', 'prestataire')
        .is('deleted_at', null)

      if (error) {
        logger.error('Failed to fetch intervention prestataires', error)
        return []
      }

      return data?.map(a => a.user_id) || []
    } catch (error) {
      logger.error('Error in getInterventionPrestataires', error)
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
    additionalUpdates: Partial<InterventionUpdate> = {},
    overrideClient?: any
  ) {
    logger.info('🔍 [VALIDATE-UPDATE] Starting validation and update', {
      interventionId: id,
      newStatus: newStatus,
      userId: userId,
      hasOverrideClient: !!overrideClient,
      additionalUpdates: additionalUpdates
    })

    // Get current intervention
    // If override client provided, use it for fetching too (to bypass RLS)
    let current
    if (overrideClient) {
      logger.info('🔑 [VALIDATE-UPDATE] Using override client for fetching current state')
      const { data, error } = await overrideClient
        .from('interventions')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        logger.error('❌ [VALIDATE-UPDATE] Failed to fetch intervention with override client:', {
          interventionId: id,
          error: error,
          errorMessage: error?.message,
          errorCode: error?.code,
          fullError: error ? JSON.stringify(error, null, 2) : 'No error object'
        })
        return createErrorResponse(handleError(error || new Error('Intervention not found'), 'interventions:fetch'))
      }

      current = { success: true, data, error: null }
      logger.info('✅ [VALIDATE-UPDATE] Fetched intervention with override client', {
        interventionId: id,
        currentStatus: data.status
      })
    } else {
      current = await this.interventionRepo.findById(id)
    }

    if (!current.success || !current.data) {
      logger.error('❌ [VALIDATE-UPDATE] Failed to fetch current intervention', {
        interventionId: id,
        success: current.success,
        hasData: !!current.data,
        error: current.error
      })
      return current
    }

    // Validate transition
    logger.info('🔄 [VALIDATE-UPDATE] Validating status transition', {
      currentStatus: current.data.status,
      newStatus: newStatus,
      validTransitions: VALID_TRANSITIONS[current.data.status]
    })

    const validNextStatuses = VALID_TRANSITIONS[current.data.status]
    if (!validNextStatuses.includes(newStatus)) {
      logger.error('❌ [VALIDATE-UPDATE] Invalid status transition', {
        from: current.data.status,
        to: newStatus,
        validOptions: validNextStatuses
      })
      throw new ValidationException(
        `Invalid status transition from '${current.data.status}' to '${newStatus}'`,
        'interventions',
        'status'
      )
    }

    logger.info('✅ [VALIDATE-UPDATE] Status transition is valid')

    // Validate user permissions for this transition
    logger.info('🔐 [VALIDATE-UPDATE] Validating user permissions', {
      userId: userId,
      transition: `${current.data.status} → ${newStatus}`
    })

    await this.validateTransitionPermissions(current.data, newStatus, userId)

    logger.info('✅ [VALIDATE-UPDATE] User permissions validated')

    // Update intervention
    const updates: InterventionUpdate = {
      ...additionalUpdates,
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // If override client provided (e.g., service role), use it directly
    if (overrideClient) {
      logger.info('🔑 [VALIDATE-UPDATE] Using override client for update (RLS bypass)', {
        interventionId: id,
        updates: updates,
        updatesJson: JSON.stringify(updates, null, 2)
      })

      const { data, error } = await overrideClient
        .from('interventions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) {
        logger.error('❌ [VALIDATE-UPDATE] Update failed with override client:', {
          interventionId: id,
          updates: updates,
          error: error,
          errorMessage: error.message,
          errorCode: error.code,
          errorDetails: error.details,
          errorHint: error.hint,
          fullError: JSON.stringify(error, null, 2)
        })
        return createErrorResponse(handleError(error, 'interventions:update'))
      }

      logger.info('✅ [VALIDATE-UPDATE] Update successful with override client', {
        interventionId: id,
        newStatus: data.status,
        updatedFields: Object.keys(updates)
      })
      return createSuccessResponse(data)
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

  // ✅ SUPPRIMÉ: checkInterventionAccess() et checkInterventionModifyAccess()
  // Pattern Lots/Immeubles: RLS policies gèrent TOUTES les permissions automatiquement
  // Pas besoin de checks custom qui dupliquent (et cassent) la logique RLS

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

  // LEGACY METHOD - REMOVED
  // Notifications are now handled by NotificationService in API routes
  // This prevents duplicate notifications and uses the new email-based system

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

  // LEGACY METHOD - REMOVED
  // User assignment notifications are now handled by:
  // 1. NotificationService for manual assignments
  // 2. The trigger was creating duplicates, so it has been disabled

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
   * EMAIL NOTIFICATIONS
   * Send emails for critical intervention events
   */

  /**
   * Helper: Send intervention created email to manager
   */
  private async sendInterventionCreatedEmail(intervention: Intervention, tenantId: string) {
    try {
      const emailService = createEmailNotificationService()

      // Fetch tenant details
      const tenantResult = await this.userService?.getById(tenantId)
      if (!tenantResult?.success || !tenantResult.data) {
        logger.warn({ tenantId }, '⚠️ Cannot send intervention created email - tenant not found')
        return
      }

      // Fetch managers from team
      const { data: teamMembers } = await this.interventionRepo.supabase
        .from('team_members')
        .select('users(id, email, first_name, last_name)')
        .eq('team_id', intervention.team_id)
        .eq('role', 'gestionnaire')

      if (!teamMembers || teamMembers.length === 0) {
        logger.warn({ teamId: intervention.team_id }, '⚠️ No managers found for team')
        return
      }

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('reference, buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          lotReference = lot.reference || undefined
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Send email to first manager (or all managers in future)
      const manager = (teamMembers[0].users as any)
      if (manager) {
        await emailService.sendInterventionCreated({
          intervention,
          property: { address: propertyAddress, lotReference },
          manager,
          tenant: tenantResult.data,
        })
        logger.info({ interventionId: intervention.id }, '📧 Intervention created email sent')
      }
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send intervention created email')
    }
  }

  /**
   * Helper: Send intervention approved email to tenant
   */
  private async sendInterventionApprovedEmail(intervention: Intervention, managerId: string, approvalNotes?: string) {
    try {
      const emailService = createEmailNotificationService()

      // Fetch manager and tenant
      const managerResult = await this.userService?.getById(managerId)
      if (!managerResult?.success || !managerResult.data) return

      const tenants = await this.getInterventionTenants(intervention.id)
      if (tenants.length === 0) return

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('reference, buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          lotReference = lot.reference || undefined
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Send to first tenant
      await emailService.sendInterventionApproved({
        intervention,
        property: { address: propertyAddress, lotReference },
        manager: managerResult.data,
        tenant: tenants[0],
        approvalNotes,
      })
      logger.info({ interventionId: intervention.id }, '📧 Intervention approved email sent')
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send intervention approved email')
    }
  }

  /**
   * Helper: Send intervention rejected email to tenant
   */
  private async sendInterventionRejectedEmail(intervention: Intervention, managerId: string, rejectionReason: string) {
    try {
      const emailService = createEmailNotificationService()

      // Fetch manager and tenant
      const managerResult = await this.userService?.getById(managerId)
      if (!managerResult?.success || !managerResult.data) return

      const tenants = await this.getInterventionTenants(intervention.id)
      if (tenants.length === 0) return

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('reference, buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          lotReference = lot.reference || undefined
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Send to first tenant
      await emailService.sendInterventionRejected({
        intervention,
        property: { address: propertyAddress, lotReference },
        manager: managerResult.data,
        tenant: tenants[0],
        rejectionReason,
      })
      logger.info({ interventionId: intervention.id }, '📧 Intervention rejected email sent')
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send intervention rejected email')
    }
  }

  /**
   * Helper: Send intervention scheduled emails to tenant + provider
   */
  private async sendInterventionScheduledEmail(intervention: Intervention, slot: any) {
    try {
      const emailService = createEmailNotificationService()

      // Get tenant, provider, property
      const tenants = await this.getInterventionTenants(intervention.id)
      if (tenants.length === 0) {
        logger.warn({ interventionId: intervention.id }, '⚠️ No tenant found for scheduled email')
        return
      }

      // Get provider (assigned_to field)
      if (!intervention.assigned_to) {
        logger.warn({ interventionId: intervention.id }, '⚠️ No provider assigned for scheduled email')
        return
      }

      const providerResult = await this.userService?.getById(intervention.assigned_to)
      if (!providerResult?.success || !providerResult.data) {
        logger.warn({ interventionId: intervention.id }, '⚠️ Provider not found for scheduled email')
        return
      }

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('reference, buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          lotReference = lot.reference || undefined
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Parse scheduled date from slot
      const scheduledDate = new Date(`${slot.slot_date}T${slot.start_time}`)
      const estimatedDuration = slot.estimated_duration || undefined

      // Send emails
      await emailService.sendInterventionScheduled({
        intervention,
        property: { address: propertyAddress, lotReference },
        tenant: tenants[0],
        provider: providerResult.data,
        scheduledDate,
        estimatedDuration,
      })
      logger.info({ interventionId: intervention.id }, '📧 Intervention scheduled emails sent')
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send intervention scheduled emails')
    }
  }

  /**
   * Helper: Send intervention completed emails to tenant + manager
   */
  private async sendInterventionCompletedEmail(intervention: Intervention, providerId: string, completionNotes?: string) {
    try {
      const emailService = createEmailNotificationService()

      // Get provider, tenant, manager
      const providerResult = await this.userService?.getById(providerId)
      if (!providerResult?.success || !providerResult.data) return

      const tenants = await this.getInterventionTenants(intervention.id)
      if (tenants.length === 0) return

      // Get managers
      const { data: teamMembers } = await this.interventionRepo.supabase
        .from('team_members')
        .select('users(id, email, first_name, last_name)')
        .eq('team_id', intervention.team_id)
        .eq('role', 'gestionnaire')

      if (!teamMembers || teamMembers.length === 0) return

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'
      let lotReference: string | undefined

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('reference, buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          lotReference = lot.reference || undefined
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Check if documents exist
      const { data: documents } = await this.interventionRepo.supabase
        .from('intervention_documents')
        .select('id')
        .eq('intervention_id', intervention.id)
        .limit(1)

      const hasDocuments = !!documents && documents.length > 0
      const manager = (teamMembers[0].users as any)

      // Send emails
      await emailService.sendInterventionCompleted({
        intervention,
        property: { address: propertyAddress, lotReference },
        tenant: tenants[0],
        manager,
        provider: providerResult.data,
        completionNotes,
        hasDocuments,
      })
      logger.info({ interventionId: intervention.id }, '📧 Intervention completed emails sent')
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send intervention completed emails')
    }
  }

  /**
   * Helper: Send quote request email to provider
   */
  private async sendQuoteRequestEmail(intervention: Intervention, providerId: string, managerId: string) {
    try {
      const emailService = createEmailNotificationService()

      // Get manager and provider
      const managerResult = await this.userService?.getById(managerId)
      if (!managerResult?.success || !managerResult.data) return

      const providerResult = await this.userService?.getById(providerId)
      if (!providerResult?.success || !providerResult.data) return

      // Get quote from database
      const { data: quote } = await this.interventionRepo.supabase
        .from('intervention_quotes')
        .select('*')
        .eq('intervention_id', intervention.id)
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!quote) {
        logger.warn({ interventionId: intervention.id }, '⚠️ No quote found for request email')
        return
      }

      // Get property address
      let propertyAddress = 'Adresse non spécifiée'

      if (intervention.lot_id) {
        const { data: lot } = await this.interventionRepo.supabase
          .from('lots')
          .select('buildings(address, city)')
          .eq('id', intervention.lot_id)
          .single()

        if (lot) {
          const building = (lot.buildings as any)
          propertyAddress = building ? `${building.address}, ${building.city}` : propertyAddress
        }
      } else if (intervention.building_id) {
        const { data: building } = await this.interventionRepo.supabase
          .from('buildings')
          .select('address, city')
          .eq('id', intervention.building_id)
          .single()

        if (building) {
          propertyAddress = `${building.address}, ${building.city}`
        }
      }

      // Send email
      await emailService.sendQuoteRequest({
        quote,
        intervention,
        property: { address: propertyAddress },
        manager: managerResult.data,
        provider: providerResult.data,
      })
      logger.info({ quoteId: quote.id }, '📧 Quote request email sent')
    } catch (error) {
      logger.error({ error, interventionId: intervention.id }, '❌ Failed to send quote request email')
    }
  }

  /**
   * ACTIVITY LOGGING
   */

  private async logActivity(
    action: string,
    interventionId: string,
    userId: string,
    metadata?: any,
    overrideClient?: any
  ) {
    try {
      // Use override client (e.g., service role) if provided, otherwise use repository client
      const client = overrideClient || this.interventionRepo.supabase

      await client
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