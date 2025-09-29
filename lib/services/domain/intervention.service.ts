/**
 * Intervention Service - Phase 3.3
 * Business logic for intervention management with complex workflow and permissions
 */

import { InterventionRepository, createInterventionRepository, createServerInterventionRepository } from '../repositories/intervention.repository'
import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import { ValidationException, NotFoundException } from '../core/error-handler'
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
    // Validate lot exists
    if (this.lotService) {
      const lotResult = await this.lotService.getById(interventionData.lot_id)
      if (!lotResult.success || !lotResult.data) {
        throw new NotFoundException('Lot not found', 'lots', interventionData.lot_id)
      }
    }

    // Validate requesting user exists
    if (this.userService && interventionData.requested_by) {
      const userResult = await this.userService.getById(interventionData.requested_by)
      if (!userResult.success || !userResult.data) {
        throw new NotFoundException('Requesting user not found', 'users', interventionData.requested_by)
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
        console.error('❌ Error in auto-assignment or logging:', assignmentError)
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
      const result = await this.repository.findByLot(_lotId)
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
      const result = await this.repository.findByBuilding(_buildingId)
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
        console.log('Auto-assigning manager:', primaryManager.user_id, 'to intervention:', interventionId)
      }
    } catch (error) {
      console.error('Error in auto-assignment:', error)
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
    if (intervention.assigned_to !== user.id) {
      throw new ValidationException('Provider is not assigned to this intervention', 'interventions', 'permissions')
    }
  }

  /**
   * Validate scheduling permissions
   */
  private validateSchedulingPermissions(intervention: Intervention, user: User) {
    const isManager = this.isManager(user)
    const isAssignedProvider = this.isProvider(user) && intervention.assigned_to === user.id

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
   * Logging methods (in production, these would use the activity-logger service)
   */
  private async logInterventionCreation(intervention: Intervention, createdBy?: User) {
    console.log('Intervention created:', intervention.id, 'by:', createdBy?.name || 'system')
  }

  private async logInterventionUpdate(intervention: Intervention, changes: InterventionUpdate, updatedBy?: User) {
    console.log('Intervention updated:', intervention.id, changes, 'by:', updatedBy?.name || 'system')
  }

  private async logInterventionDeletion(intervention: Intervention, deletedBy?: User) {
    console.log('Intervention deleted:', intervention.id, 'by:', deletedBy?.name || 'system')
  }

  private async logApprovalAction(intervention: Intervention, approvalData: ApprovalData, approvedBy: User) {
    console.log('Intervention approved:', intervention.id, 'by:', approvedBy.name)
  }

  private async logRejectionAction(intervention: Intervention, approvalData: ApprovalData, rejectedBy: User) {
    console.log('Intervention rejected:', intervention.id, 'reason:', approvalData.rejectionReason, 'by:', rejectedBy.name)
  }

  private async logSchedulingAction(intervention: Intervention, planningData: PlanningData, scheduledBy: User) {
    console.log('Intervention scheduled:', intervention.id, 'option:', planningData.option, 'by:', scheduledBy.name)
  }

  private async logExecutionAction(intervention: Intervention, executionData: ExecutionData, actionBy: User) {
    console.log('Intervention execution:', intervention.id, 'action:', executionData.action, 'by:', actionBy.name)
  }

  private async logCompletionAction(intervention: Intervention, executionData: ExecutionData, completedBy: User) {
    console.log('Intervention completed:', intervention.id, 'by:', completedBy.name)
  }

  private async logFinalizationAction(intervention: Intervention, finalizationData: FinalizationData, finalizedBy: User) {
    console.log('Intervention finalized:', intervention.id, 'amount:', finalizationData.finalAmount, 'by:', finalizedBy.name)
  }

  private async logProviderAssignment(interventionId: string, providerId: string, assignedBy: User) {
    console.log('Provider assigned:', providerId, 'to intervention:', interventionId, 'by:', assignedBy.name)
  }

  private async logProviderRemoval(interventionId: string, providerId: string, removedBy: User) {
    console.log('Provider removed:', providerId, 'from intervention:', interventionId, 'by:', removedBy.name)
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
