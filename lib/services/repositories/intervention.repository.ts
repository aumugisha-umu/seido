/**
 * Intervention Repository - Phase 3.3
 * Handles all database operations for interventions with complex relations and workflow
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  Intervention,
  InterventionInsert,
  InterventionUpdate,
  User
} from '../core/service-types'
import { ValidationException, NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import {
  validateRequired,
  validateLength,
  validateEnum
} from '../core/service-types'

// Types for intervention relations
interface InterventionContact {
  role: 'gestionnaire' | 'prestataire' | 'superviseur'
  is_primary: boolean
  individual_message?: string
  user?: User
}

interface LotContact {
  is_primary?: boolean
  user?: User
}

interface EnrichedIntervention extends Intervention {
  lot?: {
    lot_contacts?: LotContact[]
  }
  intervention_assignments?: InterventionContact[]
  tenant?: User | null
  assigned_managers?: (User & { is_primary: boolean; individual_message?: string })[]
  assigned_providers?: (User & { is_primary: boolean; individual_message?: string })[]
  assigned_supervisors?: (User & { is_primary: boolean; individual_message?: string })[]
  assigned_contact?: User | null
  manager?: User | null
}

/**
 * Intervention Repository
 * Manages all database operations for interventions with advanced workflow and relations
 */
export class InterventionRepository extends BaseRepository<Intervention, InterventionInsert, InterventionUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'interventions')
  }

  /**
   * Validation hook for intervention data
   */
  protected async validate(data: InterventionInsert | InterventionUpdate): Promise<void> {
    if ('lot_id' in data && data.lot_id) {
      validateRequired({ lot_id: data.lot_id }, ['lot_id'])
    }

    if ('title' in data && data.title) {
      validateLength(data.title, 'title', 3, 200)
    }

    if ('description' in data && data.description) {
      validateLength(data.description, 'description', 10, 2000)
    }

    if ('status' in data && data.status) {
      validateEnum(data.status, ['pending', 'approved', 'in_progress', 'completed', 'cancelled'], 'status')
    }

    if ('priority' in data && data.priority) {
      validateEnum(data.priority, ['low', 'medium', 'high', 'urgent'], 'priority')
    }

    // ✅ FIX 2025-10-15: tenant_id validation REMOVED
  }

  /**
   * Get intervention with all relations (lot, building, users, contacts, documents)
   */
  async findByIdWithRelations(_id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference, building_id,
          building:building_id(id, name, address, city, team_id),
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        intervention_assignments(
          role,
          is_primary,
          notes,
          user:user_id(id, name, email, phone, role, provider_category)
        ),
        documents:intervention_documents(
          id,
          filename,
          original_filename,
          file_size,
          mime_type,
          document_type,
          uploaded_at,
          uploaded_by
        )
      `)
      .eq('id', _id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, _id)
      }
      return createErrorResponse(handleError(error, 'intervention:findByIdWithRelations'))
    }

    // Post-process to enrich with computed fields
    const enrichedData = this.enrichInterventionData(data)
    return { success: true as const, data: enrichedData }
  }

  /**
   * Get all interventions with basic relations
   */
  async findAllWithRelations(options?: { page?: number; limit?: number; status?: Intervention['status'] }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference,
          building:building_id(id, name, address, team_id)
        ),
        intervention_assignments(
          id,
          role,
          is_primary,
          notes,
          user:user_id(id, name, email, role, provider_category)
        )
      `)

    if (options?.status) {
      queryBuilder = queryBuilder.eq('status', options.status)
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false })

    if (options?.limit) {
      const offset = ((options.page || 1) - 1) * options.limit
      queryBuilder = queryBuilder.range(offset, offset + options.limit - 1)
    }

    const { data, error } = await queryBuilder

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findAllWithRelations'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get interventions by tenant (user who requested)
   * ✅ FIX 2025-10-15: Query via intervention_assignments instead of tenant_id column
   */
  async findByTenant(tenantId: string) {
    const { data, error } = await this.supabase
      .from('intervention_assignments')
      .select(`
        intervention_id,
        intervention:intervention_id(
          *,
          lot:lot_id(
            id, reference,
            building:building_id(id, name, address, team_id)
          ),
          intervention_assignments(
            role,
            is_primary,
            user:user_id(id, name, email, role, provider_category)
          )
        )
      `)
      .eq('user_id', tenantId)
      .eq('role', 'locataire')
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByTenant'))
    }

    // Extract interventions from the assignment relationships
    const interventions = (data || [])
      .map(item => item.intervention)
      .filter(Boolean)

    return { success: true as const, data: interventions }
  }

  /**
   * Get interventions by lot
   */
  async findByLot(lotId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference,
          building:building_id(id, name, address, team_id)
        ),
        intervention_assignments(
          role,
          is_primary,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .eq('lot_id', lotId)
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByLot'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get interventions assigned to a provider
   */
  async findByProvider(providerId: string) {
    // Find interventions assigned via intervention_assignments (no direct assignment field anymore)
    const { data, error } = await this.supabase
      .from('intervention_assignments')
      .select(`
        intervention_id,
        intervention:intervention_id(
          *,
          lot:lot_id(
            id, reference,
            building:building_id(id, name, address, team_id)
          ),
          intervention_assignments(
            role,
            is_primary,
            user:user_id(id, name, email, role, provider_category)
          )
        )
      `)
      .eq('user_id', providerId)
      .eq('role', 'prestataire')

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByProvider'))
    }

    // Extract interventions from the contact relationships
    const interventions = (data || [])
      .map(item => item.intervention)
      .filter(Boolean)

    return { success: true as const, data: interventions }
  }

  /**
   * Get interventions by status
   */
  async findByStatus(status: Intervention['status']) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference,
          building:building_id(id, name, address, team_id)
        ),
        intervention_assignments(
          role,
          is_primary,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByStatus'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get interventions for a building (all lots in the building)
   */
  async findByBuilding(buildingId: string) {
    // First get all lots for this building
    const { data: lots, error: lotsError } = await this.supabase
      .from('lots')
      .select('id')
      .eq('building_id', buildingId)

    if (lotsError) {
      return createErrorResponse(handleError(lotsError, 'intervention:findByBuilding'))
    }

    if (!lots || lots.length === 0) {
      return { success: true as const, data: [] }
    }

    const lotIds = lots.map(lot => lot.id)

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference,
          building:building_id(id, name, address, team_id)
        ),
        intervention_assignments(
          role,
          is_primary,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .in('lot_id', lotIds)
      .order('created_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByBuilding'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get interventions by team
   */
  async findByTeam(teamId: string, filters?: any) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot:lot_id(
          id, reference,
          building:building_id(id, name, address, team_id)
        ),
        intervention_assignments(
          role,
          is_primary,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)

    // Apply filters if provided
    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status)
    }
    if (filters?.urgency) {
      queryBuilder = queryBuilder.eq('urgency', filters.urgency)
    }
    if (filters?.type) {
      queryBuilder = queryBuilder.eq('type', filters.type)
    }
    if (filters?.building_id) {
      queryBuilder = queryBuilder.eq('building_id', filters.building_id)
    }
    if (filters?.lot_id) {
      queryBuilder = queryBuilder.eq('lot_id', filters.lot_id)
    }

    queryBuilder = queryBuilder.order('created_at', { ascending: false })

    const { data, error } = await queryBuilder

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:findByTeam'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Update intervention status with validation
   */
  async updateStatus(id: string, newStatus: Intervention['status'], _updatedBy?: string) {
    // Validate status transition
    const existingResult = await this.findById(id)
    if (!existingResult.success || !existingResult.data) {
      throw new NotFoundException(this.tableName, id)
    }

    const currentStatus = existingResult.data.status
    this.validateStatusTransition(currentStatus, newStatus)

    const updates: InterventionUpdate = {
      status: newStatus,
      updated_at: new Date().toISOString()
    }

    // Set completion date if status is completed
    if (newStatus === 'completed') {
      updates.completed_date = new Date().toISOString()
    }

    return this.update(id, updates)
  }

  /**
   * Assign intervention to provider
   */
  async assignToProvider(interventionId: string, providerId: string, isPrimary: boolean = true) {
    // First check if provider is already assigned
    const { data: existingAssignment, error: checkError } = await this.supabase
      .from('intervention_assignments')
      .select('id')
      .eq('intervention_id', interventionId)
      .eq('user_id', providerId)
      .eq('role', 'prestataire')
      .single()

    if (checkError && checkError.code !== 'PGRST116') {
      return createErrorResponse(handleError(checkError, 'intervention:assignToProvider'))
    }

    if (existingAssignment) {
      throw new ValidationException('Provider is already assigned to this intervention', 'intervention_assignments', 'user_id')
    }

    // Add assignment via intervention_assignments
    const { data, error } = await this.supabase
      .from('intervention_assignments')
      .insert({
        intervention_id: interventionId,
        user_id: providerId,
        role: 'prestataire',
        is_primary: isPrimary
      })
      .select()
      .single()

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:assignToProvider'))
    }

    // Note: assigned_to field no longer exists in database
    // Assignment is now handled entirely through intervention_assignments table

    return { success: true as const, data }
  }

  /**
   * Remove provider assignment
   */
  async removeProviderAssignment(interventionId: string, providerId: string) {
    const { data, error } = await this.supabase
      .from('intervention_assignments')
      .delete()
      .eq('intervention_id', interventionId)
      .eq('user_id', providerId)
      .eq('role', 'prestataire')
      .select()

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:removeProviderAssignment'))
    }

    if (!data || data.length === 0) {
      throw new NotFoundException('intervention_assignments', `${interventionId}-${providerId}`)
    }

    // Note: assigned_to field no longer exists in database
    // Assignment removal is handled entirely through intervention_assignments table

    return { success: true as const, data: data[0] }
  }

  /**
   * Get intervention statistics
   */
  async getInterventionStats() {
    const { data: statusStats, error: statusError } = await this.supabase
      .from(this.tableName)
      .select('status, priority')

    if (statusError) {
      return createErrorResponse(handleError(statusError, 'intervention:getInterventionStats'))
    }

    // Calculate statistics
    const stats = {
      total: statusStats?.length || 0,
      byStatus: {
        pending: 0,
        approved: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0
      },
      byPriority: {
        low: 0,
        medium: 0,
        high: 0,
        urgent: 0
      }
    }

    statusStats?.forEach(intervention => {
      if (intervention.status) {
        stats.byStatus[intervention.status as keyof typeof stats.byStatus]++
      }
      if (intervention.priority) {
        stats.byPriority[intervention.priority as keyof typeof stats.byPriority]++
      }
    })

    return { success: true as const, data: stats }
  }

  /**
   * Get documents for an intervention
   */
  async getDocuments(_interventionId: string) {
    const { data, error } = await this.supabase
      .from('intervention_documents')
      .select(`
        *,
        uploaded_by_user:uploaded_by(name, email),
        validated_by_user:validated_by(name, email)
      `)
      .eq('intervention_id', _interventionId)
      .order('uploaded_at', { ascending: false })

    if (error) {
      return createErrorResponse(handleError(error, 'intervention:getDocuments'))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Private helper to enrich intervention data with computed fields
   */
  private enrichInterventionData(intervention: EnrichedIntervention): EnrichedIntervention {
    if (!intervention) return intervention

    // Extract tenant from lot contacts
    if (intervention.lot?.lot_contacts) {
      const tenants = intervention.lot.lot_contacts.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      )
      intervention.tenant = tenants.find((c: LotContact) => c.is_primary)?.user || tenants[0]?.user || null
    }

    // Extract assigned users by role from intervention_assignments
    if (intervention.intervention_assignments) {
      intervention.assigned_managers = intervention.intervention_assignments
        .filter((ic: InterventionContact) => ic.role === 'gestionnaire')
        .map((ic: InterventionContact) => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))

      intervention.assigned_providers = intervention.intervention_assignments
        .filter((ic: InterventionContact) => ic.role === 'prestataire')
        .map((ic: InterventionContact) => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))

      intervention.assigned_supervisors = intervention.intervention_assignments
        .filter((ic: InterventionContact) => ic.role === 'superviseur')
        .map((ic: InterventionContact) => ({ ...ic.user, is_primary: ic.is_primary, individual_message: ic.individual_message }))

      // For backwards compatibility, set primary assigned contact
      intervention.assigned_contact = intervention.intervention_assignments?.find((ic: InterventionContact) =>
        ic.role === 'prestataire' && ic.is_primary
      )?.user || null

      // Set manager for backwards compatibility
      intervention.manager = intervention.assigned_managers?.find((m) => m.is_primary) ||
                             intervention.assigned_managers?.[0] || null
    }

    return intervention
  }

  /**
   * Private helper to validate status transitions
   */
  private validateStatusTransition(currentStatus: Intervention['status'], newStatus: Intervention['status']) {
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
  }
}

// Factory functions for creating repository instances
export const createInterventionRepository = () => {
  const supabase = createBrowserSupabaseClient()
  return new InterventionRepository(supabase)
}

export const createServerInterventionRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new InterventionRepository(supabase)
}

/**
 * Create Intervention Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionInterventionRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new InterventionRepository(supabase)
}
