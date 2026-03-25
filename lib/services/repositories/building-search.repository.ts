/**
 * Building Search & Bulk Repository
 *
 * Search, filter, bulk operations, and stats for buildings.
 * Companion to building.repository.ts (core CRUD).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Building, BuildingInsert } from '../core/service-types'
import { handleError, createErrorResponse } from '../core/error-handler'
import { validateRequired, validateLength } from '../core/service-types'
import { logger } from '@/lib/logger'
import { sanitizeSearch } from '@/lib/utils/sanitize-search'
import { BuildingRepository } from './building.repository'

const logInfo = (msg: string, data?: object) => logger.info(msg, data)
const logDebug = (msg: string, data?: object) => logger.debug(msg, data)
const logError = (msg: string, data?: unknown) => logger.error(msg, data)

/**
 * Building Search Repository
 * Extends BuildingRepository with search, filter, bulk, and stats operations
 */
export class BuildingSearchRepository extends BuildingRepository {
  constructor(supabase: SupabaseClient) {
    super(supabase)
  }

  /**
   * Search buildings by name or address
   */
  async search(query: string, options?: { teamId?: string; city?: string }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*, address_record:address_id!inner(*)')
      .or(`name.ilike.%${sanitizeSearch(query)}%,address_id.street.ilike.%${sanitizeSearch(query)}%,address_id.city.ilike.%${sanitizeSearch(query)}%,address_id.formatted_address.ilike.%${sanitizeSearch(query)}%`)

    if (options?.teamId) queryBuilder = queryBuilder.eq('team_id', options.teamId)
    if (options?.city) queryBuilder = queryBuilder.eq('address_id.city', options.city)

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      const fallbackQuery = this.supabase
        .from(this.tableName)
        .select('*, address_record:address_id(*)')
        .ilike('name', `%${sanitizeSearch(query)}%`)

      if (options?.teamId) fallbackQuery.eq('team_id', options.teamId)

      const fallbackResult = await fallbackQuery.order('name')
      if (fallbackResult.error) {
        return createErrorResponse(handleError(fallbackResult.error, `${this.tableName}:query`))
      }
      return { success: true as const, data: fallbackResult.data || [] }
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get buildings with lot count statistics
   */
  async findWithLotStats(teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        address_record:address_id(*),
        lots(id, lot_contacts(user:user_id(role)))
      `)

    if (teamId) queryBuilder = queryBuilder.eq('team_id', teamId)

    const { data, error } = await queryBuilder.order('name')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processedData = data?.map(building => {
      const lots = building.lots || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occupiedLots = lots.filter((lot: any) =>
        lot.lot_contacts?.some((contact: { user?: { role?: string } }) => contact.user?.role === 'locataire')
      )

      return {
        ...building,
        lot_stats: {
          total: lots.length,
          occupied: occupiedLots.length,
          vacant: lots.length - occupiedLots.length,
          occupancy_rate: lots.length > 0 ? (occupiedLots.length / lots.length) * 100 : 0
        }
      }
    })

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Update building's team assignment
   */
  async updateTeam(buildingId: string, teamId: string | null) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ team_id: teamId })
      .eq('id', buildingId)
      .select()
      .single()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data }
  }

  /**
   * Bulk update buildings' team
   */
  async updateTeamBulk(buildingIds: string[], teamId: string | null) {
    if (!buildingIds.length) return { success: true as const, data: [] }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ team_id: teamId })
      .in('id', buildingIds)
      .select()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Get buildings by city
   */
  async findByCity(city: string, options?: { teamId?: string }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*, address_record:address_id!inner(*)')
      .ilike('address_id.city', sanitizeSearch(city))

    if (options?.teamId) queryBuilder = queryBuilder.eq('team_id', options.teamId)

    const { data, error } = await queryBuilder.order('name')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Get nearby buildings by postal code
   */
  async findNearby(postalCode: string, range = 2) {
    const baseCode = parseInt(postalCode.slice(0, -3))
    const minCode = String(baseCode - range).padStart(2, '0')
    const maxCode = String(baseCode + range).padStart(2, '0')

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, address_record:address_id!inner(*)')
      .gte('address_id.postal_code', minCode + '000')
      .lte('address_id.postal_code', maxCode + '999')
      .order('name')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data || [] }
  }

  /**
   * Check if building name exists in a team
   */
  async nameExists(name: string, teamId?: string, excludeId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('name', name)

    if (teamId) queryBuilder = queryBuilder.eq('team_id', teamId)
    if (excludeId) queryBuilder = queryBuilder.neq('id', excludeId)

    const { data, error } = await queryBuilder.limit(1)

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: (data && data.length > 0) }
  }

  /**
   * Find building by name and team (for import upsert)
   */
  async findByNameAndTeam(name: string, teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, address_record:address_id(*)')
      .eq('team_id', teamId)
      .ilike('name', name.trim())
      .limit(1)
      .maybeSingle()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:findByNameAndTeam`))
    return { success: true as const, data }
  }

  /**
   * Bulk upsert buildings (for import)
   */
  async upsertMany(
    buildings: BuildingInsert[],
    teamId: string
  ): Promise<{ success: true; created: string[]; updated: string[] } | { success: false; error: { code: string; message: string } }> {
    const created: string[] = []
    const updated: string[] = []

    logInfo('[BUILDING-REPO] upsertMany starting', { count: buildings.length, teamId })

    for (let i = 0; i < buildings.length; i++) {
      const building = buildings[i]
      logDebug(`[BUILDING-REPO] Processing building ${i + 1}/${buildings.length}`, { name: building.name })

      const existingResult = await this.findByNameAndTeam(building.name, teamId)

      if (!existingResult.success) {
        logError(`[BUILDING-REPO] findByNameAndTeam failed for "${building.name}"`, existingResult.error)
        return existingResult
      }

      if (existingResult.data) {
        logDebug('[BUILDING-REPO] Updating existing building', { id: existingResult.data.id, name: building.name })
        const updateResult = await this.update(existingResult.data.id, { ...building, team_id: teamId })

        if (!updateResult.success) {
          logError(`[BUILDING-REPO] Update failed for "${building.name}"`, updateResult.error)
          return updateResult as { success: false; error: { code: string; message: string } }
        }

        updated.push(existingResult.data.id)
      } else {
        logDebug('[BUILDING-REPO] Creating new building', { name: building.name })
        const createResult = await this.create({ ...building, team_id: teamId })

        if (!createResult.success) {
          logError(`[BUILDING-REPO] Create failed for "${building.name}"`, createResult.error)
          return createResult as { success: false; error: { code: string; message: string } }
        }

        created.push(createResult.data.id)
      }
    }

    logInfo('[BUILDING-REPO] upsertMany completed', { created: created.length, updated: updated.length })
    return { success: true, created, updated }
  }

  /**
   * Find buildings by gestionnaire (primary manager) ID
   */
  async findByGestionnaire(gestionnaireId: string) {
    validateRequired({ gestionnaireId }, ['gestionnaireId'])

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`*, address_record:address_id(*), building_contacts!inner(user_id)`)
      .eq('building_contacts.user_id', gestionnaireId)
      .order('name')

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))

    const cleanedData = data?.map(({ building_contacts, ...building }) => building)
    return { success: true as const, data: cleanedData || [] }
  }

  /**
   * Update building gestionnaire assignment
   */
  async updateGestionnaire(buildingId: string, gestionnaireId: string) {
    const { error: deleteError } = await this.supabase
      .from('building_contacts')
      .delete()
      .eq('building_id', buildingId)
      .eq('is_primary', true)
      .in('user_id',
        this.supabase
          .from('users')
          .select('id')
          .eq('role', 'gestionnaire')
      )

    if (deleteError) return createErrorResponse(handleError(deleteError, 'building_contacts:delete'))

    const { error: insertError } = await this.supabase
      .from('building_contacts')
      .insert({ building_id: buildingId, user_id: gestionnaireId, is_primary: true })

    if (insertError) return createErrorResponse(handleError(insertError, 'building_contacts:insert'))

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*, address_record:address_id(*)')
      .eq('id', buildingId)
      .single()

    if (error) return createErrorResponse(handleError(error, `${this.tableName}:query`))
    return { success: true as const, data: data as unknown as Building }
  }
}
