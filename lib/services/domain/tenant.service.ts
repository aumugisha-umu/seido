/**
 * Tenant Service - Phase 5.1
 * Handles tenant-specific data and operations
 */

import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import { InterventionService, createInterventionService, createServerInterventionService } from './intervention-service'
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
    private contactService: ContactService,
    private interventionService: InterventionService
  ) {}

  /**
   * Get comprehensive tenant data by user ID
   */
  async getTenantData(userId: string): Promise<TenantData | null> {
    logger.info("👤 getTenantData called for userId:", userId)

    try {
      // Handle JWT-only IDs
      let actualUserId = userId
      if (userId.startsWith('jwt_')) {
        const authUserId = userId.replace('jwt_', '')
        const userResult = await this.userService.getByAuthUserId?.(authUserId)

        if (userResult?.success && userResult.data) {
          actualUserId = userResult.data.id
          logger.info("🔄 [TENANT-SERVICE] Resolved JWT user ID:", {
            original: userId,
            authUserId,
            actualUserId: actualUserId
          })
        } else {
          logger.error("❌ [TENANT-SERVICE] Could not resolve JWT user ID:", userId)
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
   * Get tenant lots in simple format (for forms/selection)
   * PUBLIC method for Server Actions and Client Components
   *
   * @param userId - The tenant user ID
   * @returns Array of Lot objects without metadata
   */
  async getSimpleTenantLots(userId: string): Promise<Lot[]> {
    const lotsWithMetadata = await this.getTenantLots(userId)
    return lotsWithMetadata.map(item => item.lot)
  }

  /**
   * Get lots associated with a tenant via lot_contacts junction table
   * ✅ CORRECTIF (2025-10-07): Use ContactService to query lot_contacts properly
   */
  private async getTenantLots(userId: string): Promise<Array<{
    lot: Lot
    is_primary: boolean
    start_date?: string
    end_date?: string
  }>> {
    try {
      logger.info("🏠 [TENANT-SERVICE] Getting lots for tenant via lot_contacts:", userId)

      // Get all contacts for this user (queries lot_contacts table)
      const contactsResult = await this.contactService.getUserContacts(userId)
      if (!contactsResult.success) {
        logger.warn("⚠️ [TENANT-SERVICE] Could not get user contacts:", contactsResult.error)
        return []
      }

      // Filter contacts that are linked to lots (not just buildings)
      const contactsWithLots = contactsResult.data.filter(contact => contact.lot_id)

      if (contactsWithLots.length === 0) {
        logger.info("ℹ️ [TENANT-SERVICE] No lot contacts found for user:", userId)
        return []
      }

      // Fetch full lot details for each contact
      const lotPromises = contactsWithLots.map(async (contact) => {
        const lotResult = await this.lotService.getById(contact.lot_id!)
        if (lotResult.success && lotResult.data) {
          return {
            lot: lotResult.data,
            is_primary: contact.is_primary || false,
            start_date: contact.start_date || undefined,
            end_date: contact.end_date || undefined
          }
        }
        return null
      })

      const lotsWithDetails = (await Promise.all(lotPromises)).filter(Boolean) as Array<{
        lot: Lot
        is_primary: boolean
        start_date?: string
        end_date?: string
      }>

      logger.info("✅ [TENANT-SERVICE] Found tenant lots:", lotsWithDetails.length)
      return lotsWithDetails

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant lots:", error)
      return []
    }
  }

  /**
   * Get interventions for a tenant
   * ✅ CORRECTIF (2025-10-07): Use InterventionService.getByTenant() to get tenant's interventions
   */
  private async getTenantInterventions(userId: string): Promise<Intervention[]> {
    try {
      logger.info("🔧 [TENANT-SERVICE] Getting interventions for tenant:", userId)

      const result = await this.interventionService.getByTenant(userId)
      if (result.success && result.data) {
        logger.info("✅ [TENANT-SERVICE] Found tenant interventions:", result.data.length)
        return result.data
      }

      logger.info("ℹ️ [TENANT-SERVICE] No interventions found for tenant:", userId)
      return []

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant interventions:", error)
      return []
    }
  }

  /**
   * Validate if user is a tenant
   */
  async validateTenant(userId: string): Promise<boolean> {
    try {
      const userResult = await this.userService.getById(userId)
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
  async getTenantSummary(userId: string): Promise<ServiceResult<{
    user: User
    lotCount: number
    interventionCount: number
    activeStatus: boolean
  }>> {
    try {
      const tenantData = await this.getTenantData(userId)

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
  contactService?: ContactService,
  interventionService?: InterventionService
) => {
  const users = userService || createUserService()
  const lots = lotService || createLotService()
  const contacts = contactService || createContactService()
  const interventions = interventionService || createInterventionService()

  return new TenantService(users, lots, contacts, interventions)
}

export const createServerTenantService = async () => {
  const [userService, lotService, contactService, interventionService] = await Promise.all([
    createServerUserService(),
    createServerLotService(),
    createServerContactService(),
    createServerInterventionService()
  ])

  return new TenantService(userService, lotService, contactService, interventionService)
}
