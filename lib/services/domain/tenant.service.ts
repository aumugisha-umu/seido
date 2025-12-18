/**
 * Tenant Service - Phase 5.1 (Updated for Contract-based tenant-lot linkage)
 * Handles tenant-specific data and operations
 *
 * ✅ UPDATE 2025-12-11: Tenants are now linked to lots via contracts (contract_contacts)
 * instead of the old lot_contacts table.
 */

import { UserService, createUserService, createServerUserService } from './user.service'
import { LotService, createLotService, createServerLotService } from './lot.service'
import { ContactService, createContactService, createServerContactService } from './contact.service'
import { InterventionService, createInterventionService, createServerInterventionService } from './intervention-service'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { ServiceResult, User, Lot, Intervention } from '../core/service-types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { logger, logError } from '@/lib/logger'

/**
 * Contract status for tenant UX
 */
export type TenantContractStatus = 'none' | 'a_venir' | 'actif'

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
    contractStatus?: TenantContractStatus  // Status of the contract for this lot
  }>
  interventions: unknown[]
  teamData?: unknown
  contractStatus: TenantContractStatus  // Overall contract status
}

/**
 * Tenant Service
 * Specialized service for tenant-related operations and data retrieval
 */
export class TenantService {
  private supabase: SupabaseClient | null = null

  constructor(
    private userService: UserService,
    private lotService: LotService,
    private contactService: ContactService,
    private interventionService: InterventionService,
    supabase?: SupabaseClient
  ) {
    this.supabase = supabase || null
  }

  /**
   * Get Supabase client (lazy initialization for browser)
   */
  private getSupabaseClient(): SupabaseClient {
    if (!this.supabase) {
      this.supabase = createBrowserSupabaseClient()
    }
    return this.supabase
  }

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

      // Determine overall contract status:
      // - 'none' if no contracts
      // - 'actif' if at least one active contract
      // - 'a_venir' if only upcoming contracts
      let contractStatus: TenantContractStatus = 'none'
      if (lots.length > 0) {
        const hasActiveContract = lots.some(l => l.contractStatus === 'actif')
        contractStatus = hasActiveContract ? 'actif' : 'a_venir'
      }

      // Get interventions for this tenant (filtered by team for multi-tenant isolation)
      // Only fetch interventions if tenant has at least one contract
      const interventions = contractStatus !== 'none'
        ? await this.getTenantInterventions(actualUserId, user.team_id)
        : []

      // Get team data if user is part of a team
      let teamData = null
      if (user.team_id) {
        teamData = { id: user.team_id, name: 'Team' }
      }

      logger.info("✅ [TENANT-SERVICE] getTenantData complete:", {
        userId: actualUserId,
        lotsCount: lots.length,
        contractStatus,
        interventionsCount: interventions.length
      })

      return {
        user,
        lots,
        interventions,
        teamData,
        contractStatus
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
   * Get lots associated with a tenant via CONTRACTS (contract_contacts table)
   * ✅ UPDATE 2025-12-11: Changed from lot_contacts to contract_contacts
   *
   * Only returns lots from ACTIVE contracts (status = 'actif')
   */
  private async getTenantLots(userId: string): Promise<Array<{
    lot: Lot
    is_primary: boolean
    start_date?: string
    end_date?: string
  }>> {
    try {
      logger.info("🏠 [TENANT-SERVICE] Getting lots for tenant via contracts:", userId)

      const supabase = this.getSupabaseClient()

      // Query contract_contacts to find tenant's active contracts with lot data
      // Note: Only using columns that exist in the lots table schema
      const { data, error } = await supabase
        .from('contract_contacts')
        .select(`
          id,
          role,
          is_primary,
          contract:contract_id(
            id,
            title,
            status,
            start_date,
            end_date,
            lot:lot_id(
              id,
              reference,
              floor,
              category,
              street,
              city,
              postal_code,
              building:building_id(
                id,
                name,
                address,
                city,
                postal_code,
                description
              )
            )
          )
        `)
        .eq('user_id', userId)
        .in('role', ['locataire', 'colocataire'])

      if (error) {
        logger.warn("⚠️ [TENANT-SERVICE] Could not get tenant contracts:", error.message)
        return []
      }

      if (!data || data.length === 0) {
        logger.info("ℹ️ [TENANT-SERVICE] No contracts found for tenant:", userId)
        return []
      }


      // Filter to only ACTIVE or UPCOMING contracts
      const validStatuses = ['actif', 'a_venir']
      const activeContracts = data.filter(
        (item: any) => {
          const status = item.contract?.status?.toLowerCase()
          const hasLot = !!item.contract?.lot
          return validStatuses.includes(status) && hasLot
        }
      )

      if (activeContracts.length === 0) {
        logger.info("ℹ️ [TENANT-SERVICE] No active contracts found for tenant:", userId)
        return []
      }

      // Map contract data to the expected format with contractStatus
      const lotsWithDetails = activeContracts.map((item: any) => {
        const status = item.contract?.status?.toLowerCase() as TenantContractStatus
        return {
          lot: item.contract.lot as Lot,
          is_primary: item.is_primary || false,
          start_date: item.contract.start_date || undefined,
          end_date: item.contract.end_date || undefined,
          contractStatus: status === 'actif' ? 'actif' : 'a_venir' as TenantContractStatus
        }
      })

      logger.info("✅ [TENANT-SERVICE] Found tenant lots from active contracts:", {
        totalContracts: data.length,
        activeContracts: activeContracts.length,
        lots: lotsWithDetails.length
      })

      return lotsWithDetails

    } catch (error) {
      logger.error("❌ [TENANT-SERVICE] Error getting tenant lots:", error)
      return []
    }
  }

  /**
   * Get interventions for a tenant
   * ✅ FIX 2025-10-24: Use getMyInterventions with teamId for multi-tenant isolation
   */
  private async getTenantInterventions(userId: string, teamId?: string): Promise<Intervention[]> {
    try {
      logger.info("🔧 [TENANT-SERVICE] Getting interventions for tenant:", { userId, teamId })

      const result = await this.interventionService.getMyInterventions(userId, 'locataire', teamId)
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
  // Browser client will be created lazily in getTenantLots()
  return new TenantService(users, lots, contacts, interventions)
}

export const createServerTenantService = async () => {
  const [userService, lotService, contactService, interventionService, supabase] = await Promise.all([
    createServerUserService(),
    createServerLotService(),
    createServerContactService(),
    createServerInterventionService(),
    createServerSupabaseClient()
  ])

  return new TenantService(userService, lotService, contactService, interventionService, supabase)
}
