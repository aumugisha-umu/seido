/**
 * Lot Service - Phase 2
 * Business logic layer for lot management with Building relations
 */

import {
  LotRepository,
  createLotRepository,
  createServerLotRepository
} from '../repositories/lot.repository'
import {
  BuildingService,
  createBuildingService,
  createServerBuildingService
} from './building.service'
import type {
  Lot,
  LotInsert,
  LotUpdate
} from '../core/service-types'
import { logger, logError } from '@/lib/logger'
import {
  ValidationException,
  ConflictException,
  NotFoundException
} from '../core/error-handler'

/**
 * Lot Service
 * Handles business logic for lot management with Building relations
 */
export class LotService {
  constructor(
    private repository: LotRepository,
    private buildingService?: BuildingService
  ) {}

  /**
   * Get all lots
   */
  async getAll(options?: { page?: number; limit?: number }) {
    return this.repository.findAllWithRelations(options)
  }

  /**
   * Get lot by ID
   */
  async getById(id: string) {
    const result = await this.repository.findById(id)
    if (!result.success) return result

    if (!result.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `Lot with ID ${id} not found`
        }
      }
    }

    return result
  }

  /**
   * Get lot with full relations
   */
  async getByIdWithRelations(id: string) {
    return this.repository.findByIdWithRelations(id)
  }

  /**
   * Get lot with contact statistics
   */
  async getByIdWithContacts(id: string) {
    return this.repository.findByIdWithContacts(id)
  }

  /**
   * Create new lot with validation
   */
  async create(lotData: LotInsert) {
    // Validate input data
    this.validateLotData(lotData)

    // Validate building exists
    if (this.buildingService) {
      const buildingResult = await this.buildingService.getById(lotData.building_id)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException(
          'Building not found',
          'buildings',
          lotData.building_id
        )
      }
    }

    // Check if reference already exists for this building
    const referenceCheck = await this.repository.referenceExists(
      lotData.reference,
      lotData.building_id
    )
    if (!referenceCheck.success) return referenceCheck

    if (referenceCheck.exists) {
      throw new ConflictException(
        `A lot with reference "${lotData.reference}" already exists in this building`,
        'lots',
        'reference',
        lotData.reference
      )
    }

    // Set default values (Phase 2: no is_occupied, use tenant_id)
    const processedData = {
      ...lotData,
      floor: lotData.floor ?? 0,
      created_at: lotData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.create(processedData)

    // Log activity
    if (result.success && result.data) {
      await this.logLotCreation(result.data)
    }

    return result
  }

  /**
   * Update lot with validation
   */
  async update(id: string, updates: LotUpdate) {
    // Check if lot exists
    const existingLot = await this.repository.findById(id)
    if (!existingLot.success) return existingLot

    if (!existingLot.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `Lot with ID ${id} not found`
        }
      }
    }

    // Check reference uniqueness if changing reference
    if (
      updates.reference &&
      updates.reference !== existingLot.data.reference &&
      existingLot.data.building_id
    ) {
      const referenceCheck = await this.repository.referenceExists(
        updates.reference,
        existingLot.data.building_id,
        id
      )
      if (!referenceCheck.success) return referenceCheck

      if (referenceCheck.exists) {
        throw new ConflictException(
          `A lot with reference "${updates.reference}" already exists in this building`,
          'lots',
          'reference',
          updates.reference
        )
      }
    }

    // Validate new building if changing building
    if (updates.building_id && updates.building_id !== existingLot.data.building_id) {
      if (this.buildingService) {
        const buildingResult = await this.buildingService.getById(updates.building_id)
        if (!buildingResult.success || !buildingResult.data) {
          throw new NotFoundException(
            'Building not found',
            'buildings',
            updates.building_id
          )
        }
      }

      // Check reference uniqueness in new building
      const reference = updates.reference || existingLot.data.reference
      const referenceCheck = await this.repository.referenceExists(
        reference,
        updates.building_id,
        id
      )
      if (!referenceCheck.success) return referenceCheck

      if (referenceCheck.exists) {
        throw new ConflictException(
          `A lot with reference "${reference}" already exists in the target building`,
          'lots',
          'reference',
          reference
        )
      }
    }

    // Update timestamp
    const processedUpdates = {
      ...updates,
      updated_at: new Date().toISOString()
    }

    const result = await this.repository.update(id, processedUpdates)

    // Log activity
    if (result.success && result.data) {
      await this.logLotUpdate(result.data, updates)
    }

    return result
  }

  /**
   * Delete lot with validation
   */
  async delete(id: string) {
    // Check if lot exists with relations
    const existingLot = await this.repository.findByIdWithRelations(id)
    if (!existingLot.success) return existingLot

    if (!existingLot.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `Lot with ID ${id} not found`
        }
      }
    }

    // Check if lot is occupied (Phase 2: check tenant_id presence)
    if (existingLot.data.tenant_id || (existingLot.data.tenants && existingLot.data.tenants.length > 0)) {
      throw new ValidationException(
        'Cannot delete an occupied lot. Please remove all tenants first.',
        'tenant_id',
        existingLot.data.tenant_id
      )
    }

    const result = await this.repository.delete(id)

    // Log activity
    if (result.success) {
      await this.logLotDeletion(existingLot.data)
    }

    return result
  }

  /**
   * Get lots by building
   */
  async getLotsByBuilding(buildingId: string) {
    // Validate building exists
    if (this.buildingService) {
      const buildingResult = await this.buildingService.getById(buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', buildingId)
      }
    }

    return this.repository.findByBuilding(buildingId)
  }

  /**
   * Get lots by category
   */
  async getLotsByCategory(
    category: Lot['category'],
    options?: { buildingId?: string; teamId?: string }
  ) {
    // Validate building exists if provided
    if (options?.buildingId && this.buildingService) {
      const buildingResult = await this.buildingService.getById(options.buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', options.buildingId)
      }
    }

    return this.repository.findByCategory(category, options)
  }

  /**
   * Get occupied lots
   */
  async getOccupiedLots(buildingId?: string) {
    if (buildingId && this.buildingService) {
      const buildingResult = await this.buildingService.getById(buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', buildingId)
      }
    }

    return this.repository.findOccupied(buildingId)
  }

  /**
   * Get vacant lots
   */
  async getVacantLots(buildingId?: string) {
    if (buildingId && this.buildingService) {
      const buildingResult = await this.buildingService.getById(buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', buildingId)
      }
    }

    return this.repository.findVacant(buildingId)
  }

  /**
   * Update lot tenant (Phase 2: replaces updateOccupancy)
   * @param lotId - Lot ID
   * @param tenantId - Tenant user ID (null to mark vacant)
   */
  async updateTenantAssignment(lotId: string, tenantId: string | null) {
    // Check if lot exists
    const lot = await this.repository.findById(lotId)
    if (!lot.success || !lot.data) {
      return {
        success: false as const,
        error: {
          code: 'NOT_FOUND',
          message: `Lot with ID ${lotId} not found`
        }
      }
    }

    return this.repository.updateTenant(lotId, tenantId)
  }

  /**
   * Get lots by floor
   */
  async getLotsByFloor(buildingId: string, floor: number) {
    // Validate building exists
    if (this.buildingService) {
      const buildingResult = await this.buildingService.getById(buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', buildingId)
      }
    }

    if (floor < -5 || floor > 100) {
      throw new ValidationException(
        'Floor must be between -5 and 100',
        'floor',
        floor
      )
    }

    return this.repository.findByFloor(buildingId, floor)
  }

  /**
   * Search lots
   */
  async searchLots(query: string, options?: { buildingId?: string; category?: Lot['category'] }) {
    if (!query || query.trim().length < 1) {
      throw new ValidationException(
        'Search query must be at least 1 character',
        'query',
        query
      )
    }

    // Validate building exists if provided
    if (options?.buildingId && this.buildingService) {
      const buildingResult = await this.buildingService.getById(options.buildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Building not found', 'buildings', options.buildingId)
      }
    }

    return this.repository.search(query.trim(), options)
  }

  /**
   * Move lots to another building
   */
  async moveToBuilding(lotIds: string[], targetBuildingId: string) {
    if (!lotIds.length) {
      throw new ValidationException(
        'At least one lot ID must be provided',
        'lotIds',
        lotIds
      )
    }

    // Validate target building exists
    if (this.buildingService) {
      const buildingResult = await this.buildingService.getById(targetBuildingId)
      if (!buildingResult.success || !buildingResult.data) {
        throw new NotFoundException('Target building not found', 'buildings', targetBuildingId)
      }
    }

    // Verify all lots exist and check for reference conflicts
    const lotsToMove = []
    for (const lotId of lotIds) {
      const lot = await this.repository.findById(lotId)
      if (!lot.success || !lot.data) {
        return {
          success: false as const,
          error: {
            code: 'NOT_FOUND',
            message: `Lot with ID ${lotId} not found`
          }
        }
      }

      // Check if reference would conflict in target building
      const referenceCheck = await this.repository.referenceExists(
        lot.data.reference,
        targetBuildingId
      )
      if (!referenceCheck.success) return referenceCheck

      if (referenceCheck.exists) {
        throw new ConflictException(
          `Lot reference "${lot.data.reference}" already exists in the target building`,
          'lots',
          'reference',
          lot.data.reference
        )
      }

      lotsToMove.push(lot.data)
    }

    return this.repository.updateBuildingBulk(lotIds, targetBuildingId)
  }

  /**
   * Get lot statistics by category for a team
   */
  async getLotStatsByCategory(teamId: string) {
    return this.repository.getCountByCategory(teamId)
  }

  /**
   * Assign tenant to lot (Phase 2: uses tenant_id field)
   */
  async assignTenant(lotId: string, tenantId: string) {
    // Check if lot exists
    const lot = await this.repository.findById(lotId)
    if (!lot.success || !lot.data) {
      throw new NotFoundException('Lot not found', 'lots', lotId)
    }

    // Phase 2: Update tenant_id field directly
    return this.repository.updateTenant(lotId, tenantId)
  }

  /**
   * Remove tenant from lot (Phase 2: clears tenant_id)
   */
  async removeTenant(lotId: string, tenantId: string) {
    // Check if lot exists
    const lot = await this.repository.findByIdWithRelations(lotId)
    if (!lot.success || !lot.data) {
      throw new NotFoundException('Lot not found', 'lots', lotId)
    }

    // Verify the tenant is actually assigned
    if (lot.data.tenant_id !== tenantId) {
      throw new ValidationException(
        'This tenant is not assigned to this lot',
        'tenant_id',
        tenantId
      )
    }

    // Phase 2: Clear tenant_id to mark as vacant
    return this.repository.updateTenant(lotId, null)
  }

  /**
   * Calculate rent total for lot
   */
  async calculateRentTotal(lotId: string) {
    const lot = await this.repository.findById(lotId)
    if (!lot.success || !lot.data) {
      throw new NotFoundException('Lot not found', 'lots', lotId)
    }

    const monthlyRent = lot.data.monthly_rent || 0
    const monthlyCharges = lot.data.monthly_charges || 0
    const total = monthlyRent + monthlyCharges

    return {
      success: true as const,
      data: {
        monthly_rent: monthlyRent,
        monthly_charges: monthlyCharges,
        total_monthly: total,
        total_annual: total * 12
      }
    }
  }

  /**
   * Get lot statistics
   */
  async getLotStats(buildingId?: string) {
    let lots
    if (buildingId) {
      lots = await this.repository.findByBuilding(buildingId)
    } else {
      lots = await this.repository.findAll()
    }

    if (!lots.success) {
      return {
        success: false as const,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to calculate lot statistics'
        }
      }
    }

    const stats = lots.data.reduce(
      (acc, lot) => {
        acc.total++
        // Phase 2: occupied = tenant_id IS NOT NULL
        const isOccupied = lot.tenant_id !== null

        if (isOccupied) {
          acc.occupied++
        } else {
          acc.vacant++
        }

        // Count by category
        if (!acc.by_category[lot.category]) {
          acc.by_category[lot.category] = { total: 0, occupied: 0, vacant: 0 }
        }
        acc.by_category[lot.category].total++
        if (isOccupied) {
          acc.by_category[lot.category].occupied++
        } else {
          acc.by_category[lot.category].vacant++
        }

        // Sum surface area
        if (lot.surface_area) {
          acc.total_surface += lot.surface_area
        }

        // Sum rent
        if (lot.monthly_rent) {
          acc.total_monthly_rent += lot.monthly_rent
          if (isOccupied) {
            acc.actual_monthly_rent += lot.monthly_rent
          }
        }

        return acc
      },
      {
        total: 0,
        occupied: 0,
        vacant: 0,
        by_category: {} as Record<string, { total: number; occupied: number; vacant: number }>,
        total_surface: 0,
        total_monthly_rent: 0,
        actual_monthly_rent: 0
      }
    )

    return {
      success: true as const,
      data: {
        ...stats,
        occupancy_rate: stats.total > 0 ? (stats.occupied / stats.total) * 100 : 0,
        potential_annual_rent: stats.total_monthly_rent * 12,
        actual_annual_rent: stats.actual_monthly_rent * 12,
        lost_rent: (stats.total_monthly_rent - stats.actual_monthly_rent) * 12
      }
    }
  }

  /**
   * Get lot with detailed contact relationships
   */
  async getLotWithContacts(lotId: string) {
    const lotResult = await this.repository.findByIdWithContacts(lotId)
    if (!lotResult.success || !lotResult.data) {
      return lotResult
    }

    // Enhance with building information
    let building = null
    if (this.buildingService && lotResult.data.building_id) {
      const buildingResult = await this.buildingService.getById(lotResult.data.building_id)
      if (buildingResult.success) {
        building = buildingResult.data
      }
    }

    return {
      success: true as const,
      data: {
        ...lotResult.data,
        building: building
      }
    }
  }

  /**
   * Assign multiple contacts to lot (tenant, owner, etc.)
   * Phase 2: Uses tenant_id for primary tenant
   */
  async assignContacts(lotId: string, contacts: Array<{ contactId: string; type: 'tenant' | 'owner' | 'emergency' }>) {
    const lotResult = await this.repository.findById(lotId)
    if (!lotResult.success || !lotResult.data) {
      return lotResult
    }

    // TODO: Implement actual contact assignment using ContactService when available
    // For now, update tenant_id for primary tenant
    const primaryTenant = contacts.find(c => c.type === 'tenant')
    const wasOccupied = lotResult.data.tenant_id !== null

    if (primaryTenant && lotResult.data.tenant_id !== primaryTenant.contactId) {
      const updateResult = await this.repository.updateTenant(lotId, primaryTenant.contactId)
      if (!updateResult.success) return updateResult
    } else if (!primaryTenant && lotResult.data.tenant_id) {
      // No tenant in contacts, clear tenant_id
      const updateResult = await this.repository.updateTenant(lotId, null)
      if (!updateResult.success) return updateResult
    }

    return {
      success: true as const,
      data: {
        lotId,
        contacts: contacts,
        occupancy_updated: wasOccupied !== (primaryTenant !== undefined)
      }
    }
  }

  /**
   * Remove contact from lot (Phase 2: clears tenant_id if removing tenant)
   */
  async removeContact(lotId: string, contactId: string, contactType: 'tenant' | 'owner' | 'emergency') {
    const lotResult = await this.repository.findById(lotId)
    if (!lotResult.success || !lotResult.data) {
      return lotResult
    }

    // TODO: Implement actual contact removal using ContactService when available
    // Phase 2: If removing tenant, clear tenant_id
    if (contactType === 'tenant') {
      const updateResult = await this.repository.updateTenant(lotId, null)
      if (!updateResult.success) return updateResult
    }

    return {
      success: true as const,
      data: {
        lotId,
        contactId,
        contactType,
        action: 'removed'
      }
    }
  }

  /**
   * Get lot rental history and contracts
   */
  async getLotRentalHistory(lotId: string) {
    const lotResult = await this.repository.findById(lotId)
    if (!lotResult.success || !lotResult.data) {
      return lotResult
    }

    // TODO: Implement rental history tracking when available
    // For now, return basic information
    return {
      success: true as const,
      data: {
        lotId,
        current_tenant: null, // Will be populated from contacts
        rental_history: [], // Will be populated from rental records
        current_rent: lotResult.data.rent || 0,
        lease_start: null,
        lease_end: null
      }
    }
  }

  /**
   * Calculate lot profitability metrics
   */
  async getLotProfitability(lotId: string) {
    const lotResult = await this.repository.findById(lotId)
    if (!lotResult.success || !lotResult.data) {
      return lotResult
    }

    const lot = lotResult.data

    // Basic profitability calculation
    const monthlyRent = lot.rent || 0
    const annualRent = monthlyRent * 12

    // TODO: Include maintenance costs from intervention service
    const estimatedMaintenanceCosts = annualRent * 0.1 // 10% estimate

    // Phase 2: occupancy based on tenant_id presence
    const isOccupied = lot.tenant_id !== null

    const profitability = {
      lotId,
      monthly_rent: monthlyRent,
      annual_rent: annualRent,
      estimated_maintenance: estimatedMaintenanceCosts,
      net_annual_income: annualRent - estimatedMaintenanceCosts,
      profitability_ratio: annualRent > 0 ? ((annualRent - estimatedMaintenanceCosts) / annualRent) * 100 : 0,
      occupancy_rate: isOccupied ? 100 : 0
    }

    return {
      success: true as const,
      data: profitability
    }
  }

  // Private helper methods

  /**
   * Log lot creation activity
   */
  private async logLotCreation(lot: Lot) {
    // In production, this would use the activity-logger service
    logger.info('Lot created:', lot.id, lot.reference)
  }

  /**
   * Log lot update activity
   */
  private async logLotUpdate(lot: Lot, changes: LotUpdate) {
    // In production, this would use the activity-logger service
    logger.info('Lot updated:', lot.id, changes)
  }

  /**
   * Log lot deletion activity
   */
  private async logLotDeletion(lot: Lot) {
    // In production, this would use the activity-logger service
    logger.info('Lot deleted:', lot.id, lot.reference)
  }

  /**
   * Validate lot data for creation
   */
  private validateLotData(data: LotInsert) {
    // Validate required fields
    if (!data.building_id || data.building_id.trim() === '') {
      throw new ValidationException('Building ID is required', 'lots', 'building_id')
    }

    if (!data.reference || data.reference.trim() === '') {
      throw new ValidationException('Reference is required', 'lots', 'reference')
    }

    // Validate data types and ranges (Phase 2: surface_area instead of size)
    if (data.surface_area !== undefined && data.surface_area < 0) {
      throw new ValidationException('Surface area must be positive', 'lots', 'surface_area')
    }

    // Validate category if provided (must match PostgreSQL enum lot_category)
    if (data.category && !['appartement', 'collocation', 'maison', 'garage', 'local_commercial', 'parking', 'autre'].includes(data.category)) {
      throw new ValidationException(`Invalid lot category: "${data.category}". Must be one of: appartement, collocation, maison, garage, local_commercial, parking, autre`, 'lots', 'category')
    }
  }

  /**
   * Alias methods for test compatibility
   */

  /**
   * Get lots by type (alias for getLotsByCategory)
   */
  async getByType(type: Lot['category']) {
    return this.getLotsByCategory(type)
  }

  /**
   * Get lots by building (alias)
   */
  async getByBuilding(buildingId: string) {
    return this.getLotsByBuilding(buildingId)
  }

  /**
   * Get available lots (alias for getVacantLots)
   */
  async getAvailable() {
    return this.getVacantLots()
  }

  /**
   * Get occupied lots (alias)
   */
  async getOccupied() {
    return this.getOccupiedLots()
  }

  /**
   * Get occupancy statistics (Phase 2: uses tenant_id for occupancy)
   */
  async getOccupancyStats() {
    try {
      const [occupiedResult, vacantResult] = await Promise.all([
        this.repository.findOccupied(),
        this.repository.findVacant()
      ])

      if (!occupiedResult.success || !vacantResult.success) {
        return {
          success: false as const,
          error: {
            code: 'STATS_ERROR',
            message: 'Failed to fetch occupancy statistics'
          }
        }
      }

      const occupied = occupiedResult.data || []
      const vacant = vacantResult.data || []
      const total = occupied.length + vacant.length
      const occupancyRate = total > 0 ? (occupied.length / total) * 100 : 0

      return {
        success: true as const,
        data: {
          total,
          occupied: occupied.length,
          vacant: vacant.length,
          occupancy_rate: Math.round(occupancyRate * 100) / 100
        }
      }
    } catch (error) {
      logger.error({ error }, '❌ [LOT-SERVICE] getOccupancyStats error')
      return {
        success: false as const,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to calculate occupancy statistics'
        }
      }
    }
  }

  /**
   * Count total lots
   */
  async count() {
    try {
      const result = await this.repository.count()
      return { success: true as const, data: result }
    } catch (error) {
      logger.error({ error }, '❌ [LOT-SERVICE] count error')
      return {
        success: false as const,
        error: {
          code: 'COUNT_ERROR',
          message: 'Failed to count lots'
        }
      }
    }
  }
}

// Factory functions for creating service instances
export const createLotService = (
  repository?: LotRepository,
  buildingService?: BuildingService
) => {
  const repo = repository || createLotRepository()
  const buildings = buildingService || createBuildingService()
  return new LotService(repo, buildings)
}

export const createServerLotService = async () => {
  const [repository, buildingService] = await Promise.all([
    createServerLotRepository(),
    createServerBuildingService()
  ])
  return new LotService(repository, buildingService)
}
