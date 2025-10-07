/**
 * Intervention Service - Phase 3.3
 * Business logic for intervention management with complex workflow and permissions
 */

import { InterventionRepository, createInterventionRepository, createServerInterventionRepository } from '../repositories/intervention.repository'
import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import { ValidationException, NotFoundException } from '../core/error-handler'
import { logger, logError } from '@/lib/logger'
import type {
  Intervention,
  InterventionInsert,
  InterventionUpdate,
  User
} from '../core/service-types'

/**
 * Workflow actions data types (from legacy InterventionActionsService)
 */
export interface ApprovalData {
  action: "approve" | "reject"
  rejectionReason?: string
  internalComment?: string
}

export interface PlanningData {
  option: "direct" | "propose" | "organize"
  directSchedule?: {
    date: string
    startTime: string
    endTime: string
  }
  proposedSlots?: Array<{
    date: string
    startTime: string
    endTime: string
  }>
}

export interface ExecutionData {
  action: "start" | "complete" | "cancel"
  comment: string
  internalComment?: string
  files?: File[]
  actualDuration?: number
}

export interface FinalizationData {
  finalAmount?: number
  paymentComment?: string
  managerComment?: string
}

export interface TenantValidationData {
  satisfaction: 'satisfied' | 'unsatisfied'
  comment?: string
  rating?: number
}

export interface TenantContestData {
  reason: string
  requestedAction?: string
  photos?: string[]
}

export interface CancellationData {
  reason: string
  internalComment?: string
  cancelledBy?: string
}

export interface SlotConfirmationData {
  scheduledDate: string
  estimatedDuration?: number
  note?: string
}

export interface ProviderCompletionData {
  completionReport: string
  actualDuration?: number
  materials?: string
  photos?: string[]
}

/**
 * Intervention Service
 * Manages intervention lifecycle with complex workflow and role-based permissions
 */
export class InterventionService {
  constructor(
    private repository: InterventionRepository,
    private userService?: UserService,
    private lotService?: LotService,
    private contactService?: ContactService
  ) {}

  /**
   * Get all interventions with pagination and filtering
   */
  async getAll(options?: { page?: number; limit?: number; status?: Intervention['status'] }) {
    try {
      const result = await this.repository.findAllWithRelations(options)
      return { success: true as const, data: result.data }
    } catch (error) {
      throw error
    }
  }

  /**
   * Get intervention by ID
   */
  async getById(id: string) {
    try {
      const result = await this.repository.findById(id)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get intervention by ID with full relations
   */
  async getByIdWithRelations(id: string) {
    try {
      const result = await this.repository.findByIdWithRelations(id)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Create new intervention with validation and auto-assignment
   */
  async create(interventionData: InterventionInsert, requestedBy?: User) {
    // Validate lot exists only when a lot_id is provided (building-wide interventions won't have one)
    if (this.lotService && interventionData.lot_id) {
      const lotResult = await this.lotService.getById(interventionData.lot_id)
      if (!lotResult.success || !lotResult.data) {
        throw new NotFoundException('Lot not found', 'lots', interventionData.lot_id)
      }
    }

    // Validate tenant user exists
    if (this.userService && interventionData.tenant_id) {
      const userResult = await this.userService.getById(interventionData.tenant_id)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('Tenant user not found', 'users', interventionData.tenant_id)
      }
    }

    // Set default values
    const processedData = {
      ...interventionData,
      status: (interventionData.status || 'pending') as Intervention['status'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.create(processedData)

    // Auto-assign managers and notify if intervention created successfully
    if (result.success && result.data) {
      try {
        await this.autoAssignManagers(result.data.id, result.data.lot_id)
        await this.logInterventionCreation(result.data, requestedBy)
      } catch (assignmentError) {
        logger.error('❌ Error in auto-assignment or logging:', assignmentError)
        // Don't fail the creation for assignment errors
      }
    }

    return result
  }

  /**
   * Update intervention with validation
   */
  async update(id: string, updates: InterventionUpdate, updatedBy?: User) {
    // Check if intervention exists
    const existingIntervention = await this.repository.findById(id)
    if (!existingIntervention.success) return existingIntervention

    if (!existingIntervention.data) {
      return {
        success: false as const,
        error: { code: 'NOT_FOUND', message: 'Intervention not found' }
      }
    }

    // Validate status transitions if status is being updated
    if (updates.status && updates.status !== existingIntervention.data.status) {
      this.validateStatusTransition(existingIntervention.data.status, updates.status, _updatedBy)
    }

    // Update timestamp
    const processedUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.update(id, processedUpdates)

    // Log activity
    if (result.success && result.data) {
      await this.logInterventionUpdate(result.data, updates, _updatedBy)
    }

    return result
  }

  /**
   * Delete intervention with validation
   */
  async delete(id: string, deletedBy?: User) {
    // Check if intervention exists and can be deleted
    const existingIntervention = await this.repository.findById(id)
    if (!existingIntervention.success) return existingIntervention

    if (!existingIntervention.data) {
      throw new NotFoundException('Intervention not found', 'interventions', id)
    }

    // Validate deletion permissions
    if (existingIntervention.data.status === 'in_progress') {
      throw new ValidationException('Cannot delete intervention in progress', 'interventions', 'status')
    }

    if (existingIntervention.data.status === 'completed') {
      throw new ValidationException('Cannot delete completed intervention', 'interventions', 'status')
    }

    const result = await this.repository.delete(id)

    // Log activity
    if (result.success) {
      await this.logInterventionDeletion(existingIntervention.data, deletedBy)
    }

    return result
  }

  /**
   * Get interventions by tenant (user who requested)
   */
  async getByTenant(tenantId: string) {
    try {
      const result = await this.repository.findByTenant(_tenantId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get interventions by lot
   */
  async getByLot(lotId: string) {
    try {
      const result = await this.repository.findByLot(lotId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get interventions by building (all lots in building)
   */
  async getByBuilding(buildingId: string) {
    try {
      const result = await this.repository.findByBuilding(buildingId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get interventions assigned to provider
   */
  async getByProvider(providerId: string) {
    try {
      const result = await this.repository.findByProvider(providerId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get interventions by status
   */
  async getByStatus(status: Intervention['status']) {
    try {
      const result = await this.repository.findByStatus(status)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Workflow action: Approve intervention
   */
  async approveIntervention(id: string, approvalData: ApprovalData, approvedBy: User) {
    if (approvalData.action !== 'approve') {
      throw new ValidationException('Invalid approval action', 'interventions', 'action')
    }

    // Validate user permissions
    this.validateManagerPermissions(approvedBy)

    // Update status to approved
    const result = await this.repository.updateStatus(id, 'approved')

    if (result.success && result.data) {
      await this.logApprovalAction(result.data, approvalData, approvedBy)
    }

    return result
  }

  /**
   * Workflow action: Reject intervention
   */
  async rejectIntervention(id: string, approvalData: ApprovalData, rejectedBy: User) {
    if (approvalData.action !== 'reject') {
      throw new ValidationException('Invalid rejection action', 'interventions', 'action')
    }

    if (!approvalData.rejectionReason) {
      throw new ValidationException('Rejection reason is required', 'interventions', 'rejectionReason')
    }

    // Validate user permissions
    this.validateManagerPermissions(rejectedBy)

    // Update status to cancelled with rejection reason
    const updates: InterventionUpdate = {
      status: 'cancelled',
      notes: approvalData.rejectionReason
    }

    const result = await this.repository.update(id, updates)

    if (result.success && result.data) {
      await this.logRejectionAction(result.data, approvalData, rejectedBy)
    }

    return result
  }

  /**
   * Workflow action: Schedule intervention
   */
  async scheduleIntervention(id: string, planningData: PlanningData, scheduledBy: User) {
    // Validate current status
    const intervention = await this.repository.findById(id)
    if (!intervention.success || !intervention.data) {
      throw new NotFoundException('Intervention not found', 'interventions', id)
    }

    if (intervention.data.status !== 'approved') {
      throw new ValidationException('Intervention must be approved before scheduling', 'interventions', 'status')
    }

    // Validate user permissions (manager or assigned provider)
    this.validateSchedulingPermissions(intervention.data, scheduledBy)

    let updates: InterventionUpdate = {}

    if (planningData.option === 'direct' && planningData.directSchedule) {
      // Direct scheduling
      const scheduledDateTime = new Date(`${planningData.directSchedule.date}T${planningData.directSchedule.startTime}`)
      updates = {
        status: 'in_progress',
        scheduled_date: scheduledDateTime.toISOString()
      }
    } else {
      // Propose slots or organize later
      updates = {
        status: 'approved', // Keep approved until final scheduling
        notes: `Planning option: ${planningData.option}`
      }
    }

    const result = await this.repository.update(id, updates)

    if (result.success && result.data) {
      await this.logSchedulingAction(result.data, planningData, scheduledBy)
    }

    return result
  }

  /**
   * Workflow action: Start intervention execution
   */
  async startExecution(id: string, executionData: ExecutionData, startedBy: User) {
    if (executionData.action !== 'start') {
      throw new ValidationException('Invalid execution action', 'interventions', 'action')
    }

    // Validate current status and permissions
    const intervention = await this.repository.findById(id)
    if (!intervention.success || !intervention.data) {
      throw new NotFoundException('Intervention not found', 'interventions', id)
    }

    this.validateProviderPermissions(intervention.data, startedBy)

    if (!['approved', 'in_progress'].includes(intervention.data.status)) {
      throw new ValidationException('Intervention must be approved before starting', 'interventions', 'status')
    }

    const updates: InterventionUpdate = {
      status: 'in_progress',
      notes: executionData.comment
    }

    const result = await this.repository.update(id, updates)

    if (result.success && result.data) {
      await this.logExecutionAction(result.data, executionData, startedBy)
    }

    return result
  }

  /**
   * Workflow action: Complete intervention execution
   */
  async completeExecution(id: string, executionData: ExecutionData, completedBy: User) {
    if (executionData.action !== 'complete') {
      throw new ValidationException('Invalid execution action', 'interventions', 'action')
    }

    // Validate current status and permissions
    const intervention = await this.repository.findById(id)
    if (!intervention.success || !intervention.data) {
      throw new NotFoundException('Intervention not found', 'interventions', id)
    }

    this.validateProviderPermissions(intervention.data, completedBy)

    if (intervention.data.status !== 'in_progress') {
      throw new ValidationException('Intervention must be in progress to complete', 'interventions', 'status')
    }

    const updates: InterventionUpdate = {
      status: 'completed',
      completed_date: new Date().toISOString(),
      actual_duration: executionData.actualDuration,
      notes: executionData.comment
    }

    const result = await this.repository.update(id, updates)

    if (result.success && result.data) {
      await this.logCompletionAction(result.data, executionData, completedBy)
    }

    return result
  }

  /**
   * Workflow action: Finalize intervention (manager approval of completion)
   */
  async finalizeIntervention(id: string, finalizationData: FinalizationData, finalizedBy: User) {
    // Validate current status and permissions
    const intervention = await this.repository.findById(id)
    if (!intervention.success || !intervention.data) {
      throw new NotFoundException('Intervention not found', 'interventions', id)
    }

    this.validateManagerPermissions(finalizedBy)

    if (intervention.data.status !== 'completed') {
      throw new ValidationException('Intervention must be completed before finalization', 'interventions', 'status')
    }

    const updates: InterventionUpdate = {
      final_amount: finalizationData.finalAmount,
      notes: finalizationData.managerComment || intervention.data.notes
    }

    const result = await this.repository.update(id, updates)

    if (result.success && result.data) {
      await this.logFinalizationAction(result.data, finalizationData, finalizedBy)
    }

    return result
  }

  /**
   * Assign provider to intervention
   */
  async assignProvider(interventionId: string, providerId: string, assignedBy: User, isPrimary: boolean = true) {
    // Validate permissions
    this.validateManagerPermissions(assignedBy)

    // Validate provider exists and has correct role
    if (this.userService) {
      const providerResult = await this.userService.getById(providerId)
      if (!providerResult.success || !providerResult.data) {
        throw new NotFoundException('Provider not found', 'users', providerId)
      }

      if (providerResult.data.role !== 'prestataire') {
        throw new ValidationException('User is not a provider', 'users', 'role')
      }
    }

    const result = await this.repository.assignToProvider(interventionId, providerId, _isPrimary)

    if (result.success) {
      await this.logProviderAssignment(interventionId, providerId, assignedBy)
    }

    return result
  }

  /**
   * Remove provider assignment
   */
  async removeProviderAssignment(interventionId: string, providerId: string, removedBy: User) {
    // Validate permissions
    this.validateManagerPermissions(removedBy)

    const result = await this.repository.removeProviderAssignment(interventionId, providerId)

    if (result.success) {
      await this.logProviderRemoval(interventionId, providerId, removedBy)
    }

    return result
  }

  /**
   * Get intervention statistics
   */
  async getStats() {
    try {
      const result = await this.repository.getInterventionStats()
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Get documents for intervention
   */
  async getDocuments(interventionId: string) {
    try {
      const result = await this.repository.getDocuments(interventionId)
      return result
    } catch (error) {
      throw error
    }
  }

  /**
   * Count total interventions
   */
  async count() {
    try {
      const result = await this.repository.count()
      return { success: true as const, data: result }
    } catch (error) {
      throw error
    }
  }

  /**
   * Auto-assign managers to intervention based on lot's building
   */
  private async autoAssignManagers(interventionId: string, lotId: string) {
    if (!this.contactService || !this.lotService) return

    try {
      // Get lot with building information
      const lotResult = await this.lotService.getById(lotId)
      if (!lotResult || !lotResult.success || !lotResult.data?.building_id) return

      // Get managers assigned to this building
      const managersResult = await this.contactService.getBuildingContacts(lotResult.data.building_id, 'manager')
      if (!managersResult || !managersResult.success || !managersResult.data) return

      // Assign primary manager to intervention
      const primaryManager = managersResult.data.find(contact => contact.is_primary) || managersResult.data[0]
      if (primaryManager?.user_id) {
        // This would require intervention_contacts assignment - simplified for now
        logger.info('Auto-assigning manager:', primaryManager.user_id, 'to intervention:', interventionId)
      }
    } catch (error) {
      logger.error('Error in auto-assignment:', error)
    }
  }

  /**
   * Validate status transitions with business rules
   */
  private validateStatusTransition(currentStatus: Intervention['status'], newStatus: Intervention['status'], user?: User) {
    const validTransitions: Record<Intervention['status'], Intervention['status'][]> = {
      'pending': ['approved', 'cancelled'],
      'approved': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'cancelled'],
      'completed': [], // No transitions from completed
      'cancelled': [] // No transitions from cancelled
    }

    const allowedNextStatuses = validTransitions[currentStatus]
    if (!allowedNextStatuses.includes(newStatus)) {
      throw new ValidationException(
        `Invalid status transition from '${currentStatus}' to '${newStatus}'`,
        'interventions',
        'status'
      )
    }

    // Additional business rules
    if (newStatus === 'approved' && user && !this.isManager(user)) {
      throw new ValidationException('Only managers can approve interventions', 'interventions', 'permissions')
    }

    if (newStatus === 'completed' && user && !this.isProvider(user)) {
      throw new ValidationException('Only providers can complete interventions', 'interventions', 'permissions')
    }
  }

  /**
   * Validate manager permissions
   */
  private validateManagerPermissions(user: User) {
    if (!this.isManager(user)) {
      throw new ValidationException('User does not have manager permissions', 'interventions', 'permissions')
    }
  }

  /**
   * Validate provider permissions for intervention
   */
  private validateProviderPermissions(intervention: Intervention, user: User) {
    if (!this.isProvider(user)) {
      throw new ValidationException('User does not have provider permissions', 'interventions', 'permissions')
    }

    // Additional check: provider should be assigned to this intervention
    // NOTE: assigned_to no longer exists in DB, assignments are handled via intervention_contacts
    // This check is temporarily disabled until the service is fully migrated to use intervention_contacts
    // TODO: Check if user.id exists in intervention_contacts with role='prestataire'
  }

  /**
   * Validate scheduling permissions
   */
  private validateSchedulingPermissions(intervention: Intervention, user: User) {
    const isManager = this.isManager(user)
    // NOTE: assigned_to no longer exists, need to check intervention_contacts
    // Temporarily allow any provider for scheduling until migration is complete
    const isAssignedProvider = this.isProvider(user)  // TODO: Check intervention_contacts

    if (!isManager && !isAssignedProvider) {
      throw new ValidationException('User does not have scheduling permissions', 'interventions', 'permissions')
    }
  }

  /**
   * Check if user is manager
   */
  private isManager(user: User): boolean {
    return ['gestionnaire', 'admin'].includes(user.role)
  }

  /**
   * Check if user is provider
   */
  private isProvider(user: User): boolean {
    return user.role === 'prestataire'
  }

  /**
   * Tenant validates completed work
   */
  async validateByTenant(
    interventionId: string,
    validationData: TenantValidationData,
    userId: string
  ): Promise<ServiceResult<Intervention>> {
    try {
      // Fetch intervention with relations
      const interventionResult = await this.repository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        throw new NotFoundException('Intervention', interventionId)
      }

      const intervention = interventionResult.data

      // Fetch user for permissions
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User', userId)
      }

      const user = userResult.data

      // Validate tenant permissions
      if (user.role !== 'locataire') {
        throw new ValidationException('Only tenants can validate interventions', 'interventions', 'permissions')
      }

      // Validate status transition
      if (intervention.status !== 'provider_completed') {
        throw new ValidationException(
          `Cannot validate intervention in status: ${intervention.status}. Expected: provider_completed`,
          'interventions',
          'status'
        )
      }

      // Update intervention status
      const updateData: InterventionUpdate = {
        status: 'tenant_validated',
        notes: intervention.notes
          ? `${intervention.notes}\n\n[Validation locataire] Satisfaction: ${validationData.satisfaction}${validationData.comment ? ` - ${validationData.comment}` : ''}`
          : `[Validation locataire] Satisfaction: ${validationData.satisfaction}${validationData.comment ? ` - ${validationData.comment}` : ''}`
      }

      const updateResult = await this.repository.update(interventionId, updateData)
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to update intervention')
      }

      await this.logTenantValidation(updateResult.data, validationData, user)

      return {
        success: true,
        data: updateResult.data,
        error: null
      }
    } catch (error) {
      return this.handleError(error, 'validateByTenant')
    }
  }

  /**
   * Tenant contests completed work
   */
  async contestByTenant(
    interventionId: string,
    contestData: TenantContestData,
    userId: string
  ): Promise<ServiceResult<Intervention>> {
    try {
      // Fetch intervention with relations
      const interventionResult = await this.repository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        throw new NotFoundException('Intervention', interventionId)
      }

      const intervention = interventionResult.data

      // Fetch user for permissions
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User', userId)
      }

      const user = userResult.data

      // Validate tenant permissions
      if (user.role !== 'locataire') {
        throw new ValidationException('Only tenants can contest interventions', 'interventions', 'permissions')
      }

      // Validate status transition
      if (intervention.status !== 'provider_completed') {
        throw new ValidationException(
          `Cannot contest intervention in status: ${intervention.status}. Expected: provider_completed`,
          'interventions',
          'status'
        )
      }

      // Reopen intervention for provider to fix issues
      const updateData: InterventionUpdate = {
        status: 'in_progress',
        notes: intervention.notes
          ? `${intervention.notes}\n\n[Contestation locataire] ${contestData.reason}${contestData.requestedAction ? ` - Action demandée: ${contestData.requestedAction}` : ''}`
          : `[Contestation locataire] ${contestData.reason}${contestData.requestedAction ? ` - Action demandée: ${contestData.requestedAction}` : ''}`
      }

      const updateResult = await this.repository.update(interventionId, updateData)
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to update intervention')
      }

      await this.logTenantContestation(updateResult.data, contestData, user)

      return {
        success: true,
        data: updateResult.data,
        error: null
      }
    } catch (error) {
      return this.handleError(error, 'contestByTenant')
    }
  }

  /**
   * Cancel intervention with reason
   */
  async cancelIntervention(
    interventionId: string,
    cancellationData: CancellationData,
    userId: string
  ): Promise<ServiceResult<Intervention>> {
    try {
      // Fetch intervention with relations
      const interventionResult = await this.repository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        throw new NotFoundException('Intervention', interventionId)
      }

      const intervention = interventionResult.data

      // Fetch user for permissions
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User', userId)
      }

      const user = userResult.data

      // Validate cancellation permissions (managers and assigned providers can cancel)
      // NOTE: assigned_to no longer exists, need to check intervention_contacts
      // Temporarily allow any provider to cancel until migration is complete
      const canCancel = this.isManager(user) || this.isProvider(user)  // TODO: Check intervention_contacts

      if (!canCancel) {
        throw new ValidationException('User does not have permission to cancel this intervention', 'interventions', 'permissions')
      }

      // Cannot cancel already completed or cancelled interventions
      if (['completed', 'cancelled'].includes(intervention.status)) {
        throw new ValidationException(
          `Cannot cancel intervention in status: ${intervention.status}`,
          'interventions',
          'status'
        )
      }

      // Update intervention status
      const updateData: InterventionUpdate = {
        status: 'cancelled',
        notes: intervention.notes
          ? `${intervention.notes}\n\n[Annulation par ${user.role}] ${cancellationData.reason}${cancellationData.internalComment ? ` (Note interne: ${cancellationData.internalComment})` : ''}`
          : `[Annulation par ${user.role}] ${cancellationData.reason}${cancellationData.internalComment ? ` (Note interne: ${cancellationData.internalComment})` : ''}`
      }

      const updateResult = await this.repository.update(interventionId, updateData)
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to update intervention')
      }

      await this.logCancellation(updateResult.data, cancellationData, user)

      return {
        success: true,
        data: updateResult.data,
        error: null
      }
    } catch (error) {
      return this.handleError(error, 'cancelIntervention')
    }
  }

  /**
   * Confirm scheduling slot
   */
  async confirmSlot(
    interventionId: string,
    slotData: SlotConfirmationData,
    userId: string
  ): Promise<ServiceResult<Intervention>> {
    try {
      // Fetch intervention with relations
      const interventionResult = await this.repository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        throw new NotFoundException('Intervention', interventionId)
      }

      const intervention = interventionResult.data

      // Fetch user for permissions
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User', userId)
      }

      const user = userResult.data

      // Validate scheduling permissions
      this.validateSchedulingPermissions(intervention, user)

      // Validate status transition
      if (!['scheduling', 'approved'].includes(intervention.status)) {
        throw new ValidationException(
          `Cannot confirm slot for intervention in status: ${intervention.status}. Expected: scheduling or approved`,
          'interventions',
          'status'
        )
      }

      // Update intervention with scheduled details
      const updateData: InterventionUpdate = {
        status: 'scheduled',
        scheduled_date: slotData.scheduledDate,
        estimated_duration: slotData.estimatedDuration,
        notes: intervention.notes
          ? `${intervention.notes}\n\n[Planification confirmée] Date: ${slotData.scheduledDate}, Durée estimée: ${slotData.estimatedDuration}h${slotData.note ? ` - ${slotData.note}` : ''}`
          : `[Planification confirmée] Date: ${slotData.scheduledDate}, Durée estimée: ${slotData.estimatedDuration}h${slotData.note ? ` - ${slotData.note}` : ''}`
      }

      const updateResult = await this.repository.update(interventionId, updateData)
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to update intervention')
      }

      await this.logSlotConfirmation(updateResult.data, slotData, user)

      return {
        success: true,
        data: updateResult.data,
        error: null
      }
    } catch (error) {
      return this.handleError(error, 'confirmSlot')
    }
  }

  /**
   * Provider marks intervention as completed
   */
  async completeByProvider(
    interventionId: string,
    completionData: ProviderCompletionData,
    userId: string
  ): Promise<ServiceResult<Intervention>> {
    try {
      // Fetch intervention with relations
      const interventionResult = await this.repository.findById(interventionId)
      if (!interventionResult.success || !interventionResult.data) {
        throw new NotFoundException('Intervention', interventionId)
      }

      const intervention = interventionResult.data

      // Fetch user for permissions
      const userResult = await this.userService.getById(userId)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('User', userId)
      }

      const user = userResult.data

      // Validate provider permissions
      this.validateProviderPermissions(intervention, user)

      // Validate status transition
      if (intervention.status !== 'in_progress') {
        throw new ValidationException(
          `Cannot complete intervention in status: ${intervention.status}. Expected: in_progress`,
          'interventions',
          'status'
        )
      }

      // Update intervention with completion details
      const updateData: InterventionUpdate = {
        status: 'provider_completed',
        actual_duration: completionData.actualDuration,
        notes: intervention.notes
          ? `${intervention.notes}\n\n[Travaux terminés par prestataire] Durée réelle: ${completionData.actualDuration}h${completionData.completionReport ? ` - ${completionData.completionReport}` : ''}`
          : `[Travaux terminés par prestataire] Durée réelle: ${completionData.actualDuration}h${completionData.completionReport ? ` - ${completionData.completionReport}` : ''}`
      }

      const updateResult = await this.repository.update(interventionId, updateData)
      if (!updateResult.success || !updateResult.data) {
        throw new Error('Failed to update intervention')
      }

      await this.logProviderCompletion(updateResult.data, completionData, user)

      return {
        success: true,
        data: updateResult.data,
        error: null
      }
    } catch (error) {
      return this.handleError(error, 'completeByProvider')
    }
  }

  /**
   * Logging methods (in production, these would use the activity-logger service)
   */
  private async logInterventionCreation(intervention: Intervention, createdBy?: User) {
    logger.info('Intervention created:', intervention.id, 'by:', createdBy?.name || 'system')
  }

  private async logInterventionUpdate(intervention: Intervention, changes: InterventionUpdate, updatedBy?: User) {
    logger.info('Intervention updated:', intervention.id, changes, 'by:', updatedBy?.name || 'system')
  }

  private async logInterventionDeletion(intervention: Intervention, deletedBy?: User) {
    logger.info('Intervention deleted:', intervention.id, 'by:', deletedBy?.name || 'system')
  }

  private async logApprovalAction(intervention: Intervention, approvalData: ApprovalData, approvedBy: User) {
    logger.info('Intervention approved:', intervention.id, 'by:', approvedBy.name)
  }

  private async logRejectionAction(intervention: Intervention, approvalData: ApprovalData, rejectedBy: User) {
    logger.info('Intervention rejected:', intervention.id, 'reason:', approvalData.rejectionReason, 'by:', rejectedBy.name)
  }

  private async logSchedulingAction(intervention: Intervention, planningData: PlanningData, scheduledBy: User) {
    logger.info('Intervention scheduled:', intervention.id, 'option:', planningData.option, 'by:', scheduledBy.name)
  }

  private async logExecutionAction(intervention: Intervention, executionData: ExecutionData, actionBy: User) {
    logger.info('Intervention execution:', intervention.id, 'action:', executionData.action, 'by:', actionBy.name)
  }

  /**
   * Get all interventions for a specific tenant
   * Handles JWT-prefixed IDs by resolving them to actual user IDs
   *
   * @param tenantId - Tenant user ID (can be `jwt_xxxxx` or actual UUID)
   * @returns Array of interventions for the tenant
   */
  async getByTenantId(tenantId: string): Promise<Intervention[]> {
    try {
      // Handle JWT-only IDs (from auth timeout fallback)
      let actualTenantId = tenantId

      if (tenantId.startsWith('jwt_')) {
        const authUserId = tenantId.replace('jwt_', '')
        logger.info('🔄 [INTERVENTION-SERVICE] Resolving JWT tenant ID', {
          jwtId: tenantId,
          authUserId
        })

        if (this.userService) {
          const userResult = await this.userService.getByAuthUserId?.(authUserId)

          if (userResult?.success && userResult.data) {
            actualTenantId = userResult.data.id
            logger.info('✅ [INTERVENTION-SERVICE] JWT tenant ID resolved', {
              jwtId: tenantId,
              authUserId,
              actualTenantId
            })
          } else {
            logger.error('❌ [INTERVENTION-SERVICE] Failed to resolve JWT tenant ID', {
              jwtId: tenantId,
              authUserId,
              error: userResult?.error
            })
            throw new NotFoundException('Tenant user not found for JWT ID', 'users', tenantId)
          }
        }
      }

      logger.debug('📋 [INTERVENTION-SERVICE] Fetching interventions for tenant', {
        originalId: tenantId,
        actualId: actualTenantId
      })

      // Fetch interventions using the resolved tenant ID
      const result = await this.repository.findAll({
        filters: {
          tenant_id: actualTenantId
        }
      })

      if (!result.success) {
        logger.error('❌ [INTERVENTION-SERVICE] Failed to fetch tenant interventions', {
          tenantId: actualTenantId,
          error: result.error
        })
        return []
      }

      logger.info('✅ [INTERVENTION-SERVICE] Fetched tenant interventions', {
        tenantId: actualTenantId,
        count: result.data?.length || 0
      })

      return result.data || []
    } catch (error) {
      logger.error('❌ [INTERVENTION-SERVICE] Exception fetching tenant interventions', {
        tenantId,
        error: error instanceof Error ? error.message : String(error)
      })
      throw error
    }
  }

  private async logCompletionAction(intervention: Intervention, executionData: ExecutionData, completedBy: User) {
    logger.info('Intervention completed:', intervention.id, 'by:', completedBy.name)
  }

  private async logFinalizationAction(intervention: Intervention, finalizationData: FinalizationData, finalizedBy: User) {
    logger.info('Intervention finalized:', intervention.id, 'amount:', finalizationData.finalAmount, 'by:', finalizedBy.name)
  }

  private async logProviderAssignment(interventionId: string, providerId: string, assignedBy: User) {
    logger.info('Provider assigned:', providerId, 'to intervention:', interventionId, 'by:', assignedBy.name)
  }

  private async logProviderRemoval(interventionId: string, providerId: string, removedBy: User) {
    logger.info('Provider removed:', providerId, 'from intervention:', interventionId, 'by:', removedBy.name)
  }

  private async logTenantValidation(intervention: Intervention, validationData: TenantValidationData, validatedBy: User) {
    logger.info('Intervention validated by tenant:', intervention.id, 'satisfaction:', validationData.satisfaction, 'by:', validatedBy.name)
  }

  private async logTenantContestation(intervention: Intervention, contestData: TenantContestData, contestedBy: User) {
    logger.info('Intervention contested by tenant:', intervention.id, 'reason:', contestData.reason, 'by:', contestedBy.name)
  }

  private async logCancellation(intervention: Intervention, cancellationData: CancellationData, cancelledBy: User) {
    logger.info('Intervention cancelled:', intervention.id, 'reason:', cancellationData.reason, 'by:', cancelledBy.name)
  }

  private async logSlotConfirmation(intervention: Intervention, slotData: SlotConfirmationData, confirmedBy: User) {
    logger.info('Intervention slot confirmed:', intervention.id, 'date:', slotData.scheduledDate, 'by:', confirmedBy.name)
  }

  private async logProviderCompletion(intervention: Intervention, completionData: ProviderCompletionData, completedBy: User) {
    logger.info('Intervention completed by provider:', intervention.id, 'duration:', completionData.actualDuration, 'by:', completedBy.name)
  }
}

// Factory functions for creating service instances
export const createInterventionService = (
  repository?: InterventionRepository,
  userService?: UserService,
  lotService?: LotService,
  contactService?: ContactService
) => {
  const repo = repository || createInterventionRepository()
  const users = userService || createUserService()
  const lots = lotService || createLotService()
  const contacts = contactService || createContactService()
  return new InterventionService(repo, users, lots, contacts)
}

export const createServerInterventionService = async () => {
  const [repository, userService, lotService, contactService] = await Promise.all([
    createServerInterventionRepository(),
    createServerUserService(),
    createServerLotService(),
    createServerContactService()
  ])
  return new InterventionService(repository, userService, lotService, contactService)
}
