'use server'

/**
 * Contract Workflow Actions
 *
 * Status changes, recurrence, scheduling, overlap validation, tenant queries.
 */

import { createServerActionContractService } from '@/lib/services/domain/contract.service'
import { createServerActionSupabaseClient } from '@/lib/services'
import { getServerActionAuthContextOrNull } from '@/lib/server-context'
import { logger } from '@/lib/logger'
import type {
  Contract,
  ContractInsert,
  ContractStatus,
  ContractContactRole,
} from '@/lib/types/contract.types'
import type { BuildingTenantsResult } from './contract-crud-actions'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface ActionResult<T> {
  success: boolean
  data?: T
  error?: string
}

export interface OverlappingContractInfo {
  id: string
  title: string
  start_date: string
  end_date: string
  status: ContractStatus
}

export interface OverlapCheckResult {
  hasOverlap: boolean
  overlappingContracts: OverlappingContractInfo[]
  nextAvailableDate: string | null
}

export interface OverlapCheckDetailedResult {
  hasOverlap: boolean
  overlappingContracts: OverlappingContractInfo[]
  nextAvailableDate: string | null
  hasDuplicateTenant: boolean
  duplicateTenantContracts: OverlappingContractInfo[]
}

export interface StatusTransitionResult {
  activatedCount: number
  expiredCount: number
  activatedIds: string[]
  expiredIds: string[]
}

export interface ActiveTenant {
  id: string
  user_id: string
  name: string
  email: string | null
  phone: string | null
  role: ContractContactRole
  contract_id: string
  contract_title: string
  contract_start_date: string
  contract_end_date: string
  is_primary: boolean
  has_account: boolean
}

export interface ActiveTenantsResult {
  tenants: ActiveTenant[]
  hasActiveTenants: boolean
}

// ============================================================================
// DATE HELPERS
// ============================================================================

function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function calculateEndDate(startDate: string, durationMonths: number): string {
  const start = parseLocalDate(startDate)
  start.setMonth(start.getMonth() + durationMonths)
  start.setDate(start.getDate() - 1)
  return formatLocalDate(start)
}

function calculateNextAvailableDate(overlappingContracts: OverlappingContractInfo[]): string {
  const sortedByEndDate = [...overlappingContracts].sort(
    (a, b) => parseLocalDate(b.end_date).getTime() - parseLocalDate(a.end_date).getTime()
  )
  const latestEndDate = sortedByEndDate[0].end_date
  const nextDate = parseLocalDate(latestEndDate)
  nextDate.setDate(nextDate.getDate() + 1)
  return formatLocalDate(nextDate)
}

// ============================================================================
// AUTH HELPERS
// ============================================================================

async function getAuthContext() {
  const authContext = await getServerActionAuthContextOrNull()
  if (!authContext) {
    logger.error('[CONTRACT-ACTION] No auth session found')
    return { success: false as const, error: 'Authentication required' }
  }
  return {
    success: true as const,
    user: authContext.profile,
    authUserId: authContext.user.id,
    supabase: authContext.supabase
  }
}

// ============================================================================
// STATUS ACTIONS
// ============================================================================

/**
 * Activate a draft contract
 */
export async function activateContract(id: string): Promise<ActionResult<Contract>> {
  try {
    logger.info({ id }, '[CONTRACT-ACTION] Activating contract')
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(id)
    if (!existing) return { success: false, error: 'Contract not found' }

    const result = await service.activate(id)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract activated')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error activating contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Terminate a contract
 */
export async function terminateContract(id: string, reason?: string): Promise<ActionResult<Contract>> {
  try {
    logger.info({ id, reason }, '[CONTRACT-ACTION] Terminating contract')
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(id)
    if (!existing) return { success: false, error: 'Contract not found' }

    const result = await service.terminate(id, reason)
    if (result.success) {
      logger.info({ id }, '[CONTRACT-ACTION] Contract terminated')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error terminating contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Renew a contract
 */
export async function renewContract(id: string, newData?: Partial<ContractInsert>): Promise<ActionResult<Contract>> {
  try {
    logger.info({ id }, '[CONTRACT-ACTION] Renewing contract')
    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const existing = await service.getById(id)
    if (!existing) return { success: false, error: 'Contract not found' }

    const result = await service.renew(id, { ...newData, created_by: auth.user!.id })
    if (result.success) {
      logger.info({ oldId: id, newId: result.data.id }, '[CONTRACT-ACTION] Contract renewed')
      return { success: true, data: result.data }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error renewing contract')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// OVERLAP VALIDATION
// ============================================================================

/**
 * Check for overlapping contracts on a lot
 */
export async function getOverlappingContracts(
  lotId: string,
  startDate: string,
  durationMonths: number,
  excludeContractId?: string
): Promise<ActionResult<OverlapCheckResult>> {
  try {
    const endDate = calculateEndDate(startDate, durationMonths)

    logger.debug({ lotId, startDate, endDate, durationMonths, excludeContractId }, '[CONTRACT-ACTION] Checking for overlapping contracts')

    const { createServerActionContractRepository } = await import('@/lib/services/repositories/contract.repository')
    const repository = await createServerActionContractRepository()

    const result = await repository.findOverlappingContracts(lotId, startDate, endDate, excludeContractId)
    if (!result.success) return { success: false, error: result.error.message }

    const overlappingContracts = result.data as OverlappingContractInfo[]
    const hasOverlap = overlappingContracts.length > 0

    let nextAvailableDate: string | null = null
    if (hasOverlap) {
      const allContractsResult = await repository.findAllActiveOrUpcomingContractsOnLot(lotId, excludeContractId)
      if (allContractsResult.success && allContractsResult.data && allContractsResult.data.length > 0) {
        nextAvailableDate = calculateNextAvailableDate(allContractsResult.data as OverlappingContractInfo[])
      }
    }

    logger.debug({ hasOverlap, count: overlappingContracts.length, nextAvailableDate }, '[CONTRACT-ACTION] Overlap check complete')

    return { success: true, data: { hasOverlap, overlappingContracts, nextAvailableDate } }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error checking overlapping contracts')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Check overlaps with tenant duplicate detection
 */
export async function checkContractOverlapWithDetails(
  lotId: string,
  startDate: string,
  durationMonths: number,
  tenantUserIds: string[],
  excludeContractId?: string
): Promise<ActionResult<OverlapCheckDetailedResult>> {
  try {
    const endDate = calculateEndDate(startDate, durationMonths)

    logger.debug({ lotId, startDate, endDate, durationMonths, tenantUserIds, excludeContractId }, '[CONTRACT-ACTION] checkContractOverlapWithDetails')

    const { createServerActionContractRepository } = await import('@/lib/services/repositories/contract.repository')
    const repository = await createServerActionContractRepository()

    const overlapResult = await repository.findOverlappingContracts(lotId, startDate, endDate, excludeContractId)
    if (!overlapResult.success) return { success: false, error: overlapResult.error.message }

    const overlappingContracts = overlapResult.data as OverlappingContractInfo[]
    const hasOverlap = overlappingContracts.length > 0

    let nextAvailableDate: string | null = null
    if (hasOverlap) {
      const allContractsResult = await repository.findAllActiveOrUpcomingContractsOnLot(lotId, excludeContractId)
      if (allContractsResult.success && allContractsResult.data && allContractsResult.data.length > 0) {
        nextAvailableDate = calculateNextAvailableDate(allContractsResult.data as OverlappingContractInfo[])
      }
    }

    let hasDuplicateTenant = false
    const duplicateTenantContracts: OverlappingContractInfo[] = []

    if (tenantUserIds.length > 0) {
      const tenantResults = await Promise.all(
        tenantUserIds.map(tenantUserId =>
          repository.findTenantActiveContractsOnLot(lotId, tenantUserId, startDate, endDate, excludeContractId)
        )
      )

      for (const tenantResult of tenantResults) {
        if (tenantResult.success && tenantResult.data.length > 0) {
          hasDuplicateTenant = true
          for (const contract of tenantResult.data) {
            if (!duplicateTenantContracts.find(c => c.id === contract.id)) {
              duplicateTenantContracts.push({
                id: contract.id,
                title: contract.title,
                start_date: contract.start_date,
                end_date: contract.end_date,
                status: contract.status
              })
            }
          }
        }
      }
    }

    logger.debug({
      hasOverlap,
      overlappingCount: overlappingContracts.length,
      hasDuplicateTenant,
      duplicateCount: duplicateTenantContracts.length,
      nextAvailableDate
    }, '[CONTRACT-ACTION] checkContractOverlapWithDetails complete')

    return {
      success: true,
      data: { hasOverlap, overlappingContracts, nextAvailableDate, hasDuplicateTenant, duplicateTenantContracts }
    }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error in checkContractOverlapWithDetails')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// STATUS TRANSITION (AUTOMATIC)
// ============================================================================

/**
 * Automatic status transition for contracts
 */
export async function transitionContractStatuses(teamId?: string): Promise<ActionResult<StatusTransitionResult>> {
  try {
    const today = new Date().toISOString().split('T')[0]
    logger.info({ teamId, today }, '[CONTRACT-ACTION] Starting automatic status transition')

    const supabase = await createServerActionSupabaseClient()

    let queryAVenir = supabase
      .from('contracts')
      .select('id, title, start_date, end_date')
      .eq('status', 'a_venir')
      .lte('start_date', today)
      .is('deleted_at', null)

    if (teamId) queryAVenir = queryAVenir.eq('team_id', teamId)
    const { data: toActivate, error: errorAVenir } = await queryAVenir

    if (errorAVenir) {
      logger.error({ error: errorAVenir }, '[CONTRACT-ACTION] Error fetching a_venir contracts')
      return { success: false, error: errorAVenir.message }
    }

    let queryActif = supabase
      .from('contracts')
      .select('id, title, start_date, end_date')
      .eq('status', 'actif')
      .lt('end_date', today)
      .is('deleted_at', null)

    if (teamId) queryActif = queryActif.eq('team_id', teamId)
    const { data: toExpire, error: errorActif } = await queryActif

    if (errorActif) {
      logger.error({ error: errorActif }, '[CONTRACT-ACTION] Error fetching actif contracts to expire')
      return { success: false, error: errorActif.message }
    }

    const activatedIds: string[] = []
    const expiredIds: string[] = []

    if (toActivate && toActivate.length > 0) {
      const idsToActivate = toActivate.map(c => c.id)
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'actif' })
        .in('id', idsToActivate)

      if (updateError) {
        logger.error({ error: updateError }, '[CONTRACT-ACTION] Error activating contracts')
      } else {
        activatedIds.push(...idsToActivate)
        logger.info({ count: idsToActivate.length, ids: idsToActivate }, '[CONTRACT-ACTION] Contracts activated (a_venir -> actif)')
      }
    }

    if (toExpire && toExpire.length > 0) {
      const idsToExpire = toExpire.map(c => c.id)
      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'expire' })
        .in('id', idsToExpire)

      if (updateError) {
        logger.error({ error: updateError }, '[CONTRACT-ACTION] Error expiring contracts')
      } else {
        expiredIds.push(...idsToExpire)
        logger.info({ count: idsToExpire.length, ids: idsToExpire }, '[CONTRACT-ACTION] Contracts expired (actif -> expire)')
      }
    }

    const result: StatusTransitionResult = { activatedCount: activatedIds.length, expiredCount: expiredIds.length, activatedIds, expiredIds }
    logger.info(result, '[CONTRACT-ACTION] Status transition complete')

    return { success: true, data: result }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error in status transition')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

// ============================================================================
// LOT TENANT QUERIES
// ============================================================================

/**
 * Get active tenants by lot
 */
export async function getActiveTenantsByLotAction(lotId: string): Promise<ActionResult<ActiveTenantsResult>> {
  try {
    logger.info({ lotId }, '[CONTRACT-ACTION] Getting active tenants for lot')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const result = await service.getActiveTenantsByLot(lotId)

    if (result.success) {
      logger.info({ lotId, tenantsCount: result.data.tenants.length, hasActiveTenants: result.data.hasActiveTenants }, '[CONTRACT-ACTION] Active tenants retrieved')
      return { success: true, data: { tenants: result.data.tenants, hasActiveTenants: result.data.hasActiveTenants } }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting active tenants')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}

/**
 * Get all active tenants from all lots in a building
 */
export async function getActiveTenantsByBuildingAction(buildingId: string): Promise<ActionResult<BuildingTenantsResult>> {
  try {
    logger.info({ buildingId }, '[CONTRACT-ACTION] Getting active tenants for building')

    const auth = await getAuthContext()
    if (!auth.success) return { success: false, error: auth.error }

    const service = await createServerActionContractService()
    const result = await service.getActiveTenantsByBuilding(buildingId)

    if (result.success) {
      logger.info({
        buildingId,
        tenantsCount: result.data.totalCount,
        occupiedLotsCount: result.data.occupiedLotsCount,
        hasActiveTenants: result.data.hasActiveTenants
      }, '[CONTRACT-ACTION] Active tenants for building retrieved')

      return {
        success: true,
        data: {
          tenants: result.data.tenants.map(t => ({
            id: t.id,
            user_id: t.user_id,
            name: t.name,
            email: t.email,
            phone: t.phone,
            is_primary: t.is_primary,
            has_account: t.has_account,
            lot_id: t.lot_id,
            lot_reference: t.lot_reference
          })),
          byLot: result.data.byLot.map(group => ({
            lotId: group.lotId,
            lotReference: group.lotReference,
            tenants: group.tenants.map(t => ({
              id: t.id,
              user_id: t.user_id,
              name: t.name,
              email: t.email,
              phone: t.phone,
              is_primary: t.is_primary,
              has_account: t.has_account
            }))
          })),
          totalCount: result.data.totalCount,
          occupiedLotsCount: result.data.occupiedLotsCount,
          hasActiveTenants: result.data.hasActiveTenants
        }
      }
    }
    return { success: false, error: result.error.message }
  } catch (error) {
    logger.error({ error }, '[CONTRACT-ACTION] Error getting active tenants for building')
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error occurred' }
  }
}
