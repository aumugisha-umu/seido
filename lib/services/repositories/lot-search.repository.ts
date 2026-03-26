/**
 * Lot Search & Bulk Repository
 *
 * Search, filter, bulk operations, and stats for lots.
 * Companion to lot.repository.ts (core CRUD).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lot, LotInsert, User } from '../core/service-types'
import { handleError, createErrorResponse } from '../core/error-handler'
import { validateLength } from '../core/service-types'
import { logger } from '@/lib/logger'
import { sanitizeSearch } from '@/lib/utils/sanitize-search'
import { LotRepository } from './lot.repository'

// Types for lot relations
interface LotContact {
  is_primary?: boolean
  user?: User
}

/**
 * Lot Search Repository
 * Extends LotRepository with search, filter, bulk, and stats operations
 */
export class LotSearchRepository extends LotRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Get lots by category
   */
  async findByCategory(category: Lot['category'], options?: { buildingId?: string; teamId?: string }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id)`)
      .eq('category', category)

    if (options?.buildingId) queryBuilder = queryBuilder.eq('building_id', options.buildingId)
    if (options?.teamId) queryBuilder = queryBuilder.eq('building.team_id', options.teamId)

    const { data, error } = await queryBuilder.order('reference')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Get occupied lots
   */
  async findOccupied(buildingId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id), lot_contacts!inner(user:user_id!inner(role))`)
      .eq('lot_contacts.user.role', 'locataire')

    if (buildingId) queryBuilder = queryBuilder.eq('building_id', buildingId)

    const { data, error } = await queryBuilder.order('reference')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Get vacant lots
   */
  async findVacant(buildingId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id), lot_contacts(id, user:user_id(role))`)

    if (buildingId) queryBuilder = queryBuilder.eq('building_id', buildingId)

    const { data, error } = await queryBuilder.order('reference')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))

    const vacantLots = data?.filter(lot => {
      const hasTenant = lot.lot_contacts?.some((contact: { user?: { role?: string } }) =>
        contact.user?.role === 'locataire'
      )
      return !hasTenant
    }) || []

    return { success: true as const, data: vacantLots }
  }

  /**
   * Get lots by floor
   */
  async findByFloor(buildingId: string, floor: number) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id)`)
      .eq('building_id', buildingId)
      .eq('floor', floor)
      .order('reference')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Search lots
   */
  async search(query: string, options?: { buildingId?: string; category?: Lot['category'] }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id)`)
      .or(`reference.ilike.%${sanitizeSearch(query)}%`)

    if (options?.buildingId) queryBuilder = queryBuilder.eq('building_id', options.buildingId)
    if (options?.category) queryBuilder = queryBuilder.eq('category', options.category)

    const { data, error } = await queryBuilder.order('reference')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Get lot count by category for a team
   */
  async getCountByCategory(teamId: string) {
    try {
      const categories = ['appartement', 'maison', 'garage', 'local_commercial', 'autre']

      const countPromises = categories.map(async (category) => {
        const { count, error } = await this.supabase
          .from(this.tableName)
          .select('id', { count: 'exact', head: true })
          .eq('team_id', teamId)
          .is('deleted_at', null)
          .eq('category', category)

        return { category, count: error ? 0 : (count ?? 0) }
      })

      const results = await Promise.all(countPromises)
      const counts: Record<string, number> = {}
      for (const { category, count } of results) {
        if (count > 0) counts[category] = count
      }

      logger.info('[LOT-REPOSITORY] Category counts calculated:', counts)
      return { success: true as const, data: counts }
    } catch (error) {
      logger.error('[LOT-REPOSITORY] getCountByCategory exception:', error)
      return { success: false as const, error: handleError(error as Error, 'lot:getCountByCategory') }
    }
  }

  /**
   * Bulk update lots' building
   */
  async updateBuildingBulk(lotIds: string[], buildingId: string) {
    if (!lotIds.length) return { success: true as const, data: [] }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ building_id: buildingId, updated_at: new Date().toISOString() })
      .in('id', lotIds)
      .select()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Find multiple lots by IDs in a single query (batch operation)
   */
  async findByIds(lotIds: string[]) {
    if (!lotIds.length) return { success: true as const, data: [] }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id)`)
      .in('id', lotIds)

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Find lot by reference and team (for import upsert)
   */
  async findByReferenceAndTeam(reference: string, teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`*, building:building_id(id, name, team_id)`)
      .eq('team_id', teamId)
      .ilike('reference', reference.trim())
      .limit(1)
      .maybeSingle()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:findByReferenceAndTeam`))
    return { success: true as const, data }
  }

  /**
   * Bulk upsert lots (for import)
   */
  async upsertMany(
    lots: (LotInsert & { _resolvedBuildingId?: string | null })[],
    teamId: string
  ): Promise<{ success: true; created: string[]; updated: string[] } | { success: false; error: { code: string; message: string } }> {
    const created: string[] = []
    const updated: string[] = []

    logger.info('[LOT-REPO] upsertMany starting', { count: lots.length, teamId })

    for (let i = 0; i < lots.length; i++) {
      const lot = lots[i]
      logger.debug(`[LOT-REPO] Processing lot ${i + 1}/${lots.length}`, { reference: lot.reference })

      const existingResult = await this.findByReferenceAndTeam(lot.reference, teamId)

      if (!existingResult.success) {
        logger.error(`[LOT-REPO] findByReferenceAndTeam failed for "${lot.reference}"`, existingResult.error)
        return existingResult
      }

      const lotData = {
        ...lot,
        team_id: teamId,
        building_id: lot._resolvedBuildingId ?? lot.building_id ?? null,
      }

      delete (lotData as Record<string, unknown>)._resolvedBuildingId

      if (existingResult.data) {
        logger.debug('[LOT-REPO] Updating existing lot', { id: existingResult.data.id, reference: lot.reference })
        const updateResult = await this.update(existingResult.data.id, lotData)

        if (!updateResult.success) {
          logger.error(`[LOT-REPO] Update failed for "${lot.reference}"`, updateResult.error)
          return updateResult as { success: false; error: { code: string; message: string } }
        }

        updated.push(existingResult.data.id)
      } else {
        logger.debug('[LOT-REPO] Creating new lot', { reference: lot.reference })
        const createResult = await this.create(lotData)

        if (!createResult.success) {
          logger.error(`[LOT-REPO] Create failed for "${lot.reference}"`, createResult.error)
          return createResult as { success: false; error: { code: string; message: string } }
        }

        created.push(createResult.data.id)
      }
    }

    logger.info('[LOT-REPO] upsertMany completed', { created: created.length, updated: updated.length })
    return { success: true, created, updated }
  }
}
