/**
 * Tenant Service - Phase 5.1
 * Handles tenant-specific data and operations
 */

import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import type { ServiceResult, User, Lot, Intervention } from '../core/service-types'
import { logger, logError } from '@/lib/logger'
/**
 * Tenant data with related information
 */
export interface TenantData {
  user: User
  lots: Array<{
    lot: Lot
    is_primary: boolean
    start_date?: string
    end_date?: string
  }>
  interventions: unknown[]
  teamData?: unknown
}

/**
 * Tenant Service
 * Specialized service for tenant-related operations and data retrieval
 */
export class TenantService {
  constructor(
    private userService: UserService,
    private lotService: LotService,
    private contactService: ContactService
  ) {}

  /**
   * Get comprehensive tenant data by user ID
   */
  async getTenantData(_userId: string): Promise<TenantData | null> {
    logger.info("👤 getTenantData called for userId:", _userId)

    try {
      // Handle JWT-only IDs
      let actualUserId = _userId
      if (_userId.startsWith('jwt_')) {
        const authUserId = _userId.replace('jwt_', '')
        const userResult = await this.userService.getByAuthUserId?.(authUserId)

        if (userResult?.success && userResult.data) {
          actualUserId = userResult.data.id
          logger.info("🔄 [TENANT-SERVICE] Resolved JWT user ID:", {
            original: _userId,
            authUserId,
            actualUserId: actualUserId
          })
        } else {
          logger.error("❌ [TENANT-SERVICE] Could not resolve JWT user ID:", _userId)
          return null
        }
      }

      // Get user data
      const userResult = await this.userService.getById(actualUserId)
      if (!userResult.success) {
        logger.error("❌ [TENANT-SERVICE] User not found:", actualUserId)
        return null
      }

      const user = userResult.data

      // Get lots associated with this tenant
      const lots = await this.getTenantLots(actualUserId)

      // Get interventions for this tenant
      const interventions = await this.getTenantInterventions(actualUserId)

      // Get team data if user is part of a team
      let teamData = null
      if (user.team_id) {
        // This would require team service integration
        // For now, we'll leave it as null and can implement later
        teamData = { id: user.team_id, name: 'Team' }
      }

      return {
        user,
        lots,
        interventions,
        teamData
      }

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant data:", error)
      return null
    }
  }

  /**
   * Get lots associated with a tenant
   */
  private async getTenantLots(_userId: string): Promise<Array<{
    lot: Lot
    is_primary: boolean
    start_date?: string
    end_date?: string
  }>> {
    try {
      // This would require integration with contact service to get lot_contacts
      // For now, we'll return an empty array and implement proper logic later
      logger.info("🏠 [TENANT-SERVICE] Getting lots for tenant:", _userId)

      // Get all lots and filter by tenant assignments
      const lotsResult = await this.lotService.getAll()
      if (!lotsResult.success) {
        return []
      }

      // Filter lots where this user is assigned as tenant
      // This is a simplified implementation - in reality we'd query lot_contacts
      const tenantLots = lotsResult.data
        .filter(lot => lot.tenant_id === _userId)
        .map(lot => ({
          lot,
          is_primary: true,
          start_date: lot.created_at,
          end_date: undefined
        }))

      logger.info("✅ [TENANT-SERVICE] Found tenant lots:", tenantLots.length)
      return tenantLots

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant lots:", error)
      return []
    }
  }

  /**
   * Get interventions for a tenant
   */
  private async getTenantInterventions(_userId: string): Promise<Intervention[]> {
    try {
      logger.info("🔧 [TENANT-SERVICE] Getting interventions for tenant:", _userId)

      // This would require intervention service integration
      // For now, return empty array and implement proper logic later
      return []

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant interventions:", error)
      return []
    }
  }

  /**
   * Validate if user is a tenant
   */
  async validateTenant(_userId: string): Promise<boolean> {
    try {
      const userResult = await this.userService.getById(_userId)
      if (!userResult.success) {
        return false
      }

      const user = userResult.data
      return user.role === 'locataire' || user.role === 'tenant'

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error validating tenant:", error)
      return false
    }
  }

  /**
   * Get tenant summary data
   */
  async getTenantSummary(_userId: string): Promise<ServiceResult<{
    user: User
    lotCount: number
    interventionCount: number
    activeStatus: boolean
  }>> {
    try {
      const tenantData = await this.getTenantData(_userId)

      if (!tenantData) {
        return {
          success: false,
          error: 'Tenant not found'
        }
      }

      return {
        success: true,
        data: {
          user: tenantData.user,
          lotCount: tenantData.lots.length,
          interventionCount: tenantData.interventions.length,
          activeStatus: tenantData.user.is_active || false
        }
      }

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}

// Factory functions for creating service instances
export const createTenantService = (
  userService?: UserService,
  lotService?: LotService,
  contactService?: ContactService
) => {
  const users = userService || createUserService()
  const lots = lotService || createLotService()
  const contacts = contactService || createContactService()

  return new TenantService(users, lots, contacts)
}

export const createServerTenantService = async () => {
  const [userService, lotService, contactService] = await Promise.all([
    createServerUserService(),
    createServerLotService(),
    createServerContactService()
  ])

  return new TenantService(userService, lotService, contactService)
}
