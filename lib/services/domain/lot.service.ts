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
  LotUpdate,
  RepositoryResponse
} from '../core/service-types'
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

    // Set default values
    const processedData = {
      ...lotData,
      is_occupied: lotData.is_occupied ?? false,
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

    // Check if lot is occupied
    if (existingLot.data.is_occupied || (existingLot.data.tenants && existingLot.data.tenants.length > 0)) {
      throw new ValidationException(
        'Cannot delete an occupied lot. Please remove all tenants first.',
        'is_occupied',
        true
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
   * Update lot occupancy
   */
  async updateOccupancy(lotId: string, isOccupied: boolean) {
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

    return this.repository.updateOccupancy(lotId, isOccupied)
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
   * Assign tenant to lot
   */
  async assignTenant(lotId: string, tenantId: string) {
    // Check if lot exists
    const lot = await this.repository.findById(lotId)
    if (!lot.success || !lot.data) {
      throw new NotFoundException('Lot not found', 'lots', lotId)
    }

    // This would typically update lot_contacts table
    // For now, we update the occupancy status
    return this.repository.updateOccupancy(lotId, true)
  }

  /**
   * Remove tenant from lot
   */
  async removeTenant(lotId: string, tenantId: string) {
    // Check if lot exists
    const lot = await this.repository.findByIdWithRelations(lotId)
    if (!lot.success || !lot.data) {
      throw new NotFoundException('Lot not found', 'lots', lotId)
    }

    // Check if this is the last tenant
    const remainingTenants = lot.data.tenants?.filter(t => t.id !== tenantId) || []

    // Update occupancy if no tenants remain
    if (remainingTenants.length === 0) {
      return this.repository.updateOccupancy(lotId, false)
    }

    return { success: true as const, data: lot.data }
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
        if (lot.is_occupied) {
          acc.occupied++
        } else {
          acc.vacant++
        }

        // Count by category
        if (!acc.by_category[lot.category]) {
          acc.by_category[lot.category] = { total: 0, occupied: 0, vacant: 0 }
        }
        acc.by_category[lot.category].total++
        if (lot.is_occupied) {
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
          if (lot.is_occupied) {
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

  // Private helper methods

  /**
   * Log lot creation activity
   */
  private async logLotCreation(lot: Lot) {
    // In production, this would use the activity-logger service
    console.log('Lot created:', lot.id, lot.reference)
  }

  /**
   * Log lot update activity
   */
  private async logLotUpdate(lot: Lot, changes: LotUpdate) {
    // In production, this would use the activity-logger service
    console.log('Lot updated:', lot.id, changes)
  }

  /**
   * Log lot deletion activity
   */
  private async logLotDeletion(lot: Lot) {
    // In production, this would use the activity-logger service
    console.log('Lot deleted:', lot.id, lot.reference)
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