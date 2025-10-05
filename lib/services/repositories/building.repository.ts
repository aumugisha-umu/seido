/**
 * Building Repository - Phase 2
 * Handles all database operations for buildings using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Building, BuildingInsert, BuildingUpdate } from '../core/service-types'
import { NotFoundException } from '../core/error-handler'
import {
  validateRequired,
  validateLength,
  validateNumber
} from '../core/service-types'

/**
 * Building Repository
 * Manages all database operations for buildings with relations
 */
export class BuildingRepository extends BaseRepository<Building, BuildingInsert, BuildingUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'buildings')
  }

  /**
   * Validation hook for building data
   */
  protected async validate(data: BuildingInsert | BuildingUpdate): Promise<void> {
    if ('name' in data && data.name) {
      validateLength(data.name, 2, 100, 'name')
    }

    if ('address' in data && data.address) {
      validateLength(data.address, 5, 200, 'address')
    }

    if ('city' in data && data.city) {
      validateLength(data.city, 2, 100, 'city')
    }

    if ('postal_code' in data && data.postal_code) {
      validateLength(data.postal_code, 3, 20, 'postal_code')
    }

    if ('total_lots' in data && data.total_lots !== undefined) {
      validateNumber(data.total_lots, 0, 10000, 'total_lots')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['name', 'address', 'city', 'postal_code'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: BuildingInsert | BuildingUpdate): data is BuildingInsert {
    return 'name' in data && 'address' in data && 'city' in data && 'postal_code' in data
  }

  /**
   * Get all buildings with relations
   */
  async findAllWithRelations(options?: { page?: number; limit?: number }) {
    const query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
          is_occupied,
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('name')

    // Apply pagination if provided
    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit
      query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      return this.handleError(error)
    }

    // Post-process to extract primary managers
    const processedData = data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find((bc: { user?: { role?: string }; is_primary?: boolean }) =>
        bc.user?.role === 'gestionnaire' && bc.is_primary
      )?.user || null
    }))

    // Handle pagination response
    if (options?.page && options?.limit) {
      const totalPages = count ? Math.ceil(count / options.limit) : 1
      return {
        success: true as const,
        data: processedData || [],
        pagination: {
          total: count || 0,
          page: options.page,
          limit: options.limit,
          totalPages
        }
      }
    }

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get buildings by team
   */
  async findByTeam(_teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
          is_occupied,
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('team_id', _teamId)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    // Post-process to extract primary managers
    const processedData = data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find((bc: { user?: { role?: string }; is_primary?: boolean }) =>
        bc.user?.role === 'gestionnaire' && bc.is_primary
      )?.user || null
    }))

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get buildings for a user (via building_contacts or team_members)
   */
  async findByUser(_userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
          is_occupied,
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .or(`building_contacts.user_id.eq.${_userId},team_id.in.(select team_id from team_members where user_id = '${_userId}')`)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    // Post-process to extract primary managers
    const processedData = data?.map(building => ({
      ...building,
      manager: building.building_contacts?.find((bc: { user?: { role?: string }; is_primary?: boolean }) =>
        bc.user?.role === 'gestionnaire' && bc.is_primary
      )?.user || null
    }))

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get building by ID with full relations
   */
  async findByIdWithRelations(_id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(
          id,
          name,
          description,
          team_members(
            id,
            role,
            user:user_id(id, name, email)
          )
        ),
        lots(
          *,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('id', _id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Building not found', this.tableName, _id)
      }
      return this.handleError(error)
    }

    // Post-process to extract managers and tenants
    if (data) {
      data.manager = data.building_contacts?.[0]?.user || null

      // For each lot, extract primary tenant
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      data.lots = data.lots?.map((_lot: any) => ({
        ..._lot,
        tenant: _lot.lot_contacts?.[0]?.user || null
      }))
    }

    return { success: true as const, data }
  }

  /**
   * Search buildings by name or address
   */
  async search(query: string, options?: { teamId?: string; city?: string }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*')
      .or(`name.ilike.%${query}%,address.ilike.%${query}%,city.ilike.%${query}%`)

    if (options?._teamId) {
      queryBuilder = queryBuilder.eq('team_id', options._teamId)
    }

    if (options?.city) {
      queryBuilder = queryBuilder.eq('city', options.city)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return this.handleError(error)
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
        lots(
          id,
          is_occupied
        )
      `)

    if (_teamId) {
      queryBuilder = queryBuilder.eq('team_id', _teamId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return this.handleError(error)
    }

    // Calculate lot statistics
    const processedData = data?.map(building => {
      const lots = building.lots || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occupiedLots = lots.filter((_lot: unknown) => lot.is_occupied)

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
      .eq('id', _buildingId)
      .select()
      .single()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data }
  }


  /**
   * Bulk update buildings' team
   */
  async updateTeamBulk(buildingIds: string[], teamId: string | null) {
    if (!buildingIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ team_id: teamId })
      .in('id', buildingIds)
      .select()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get buildings by city
   */
  async findByCity(city: string, options?: { teamId?: string }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('city', city)

    if (options?._teamId) {
      queryBuilder = queryBuilder.eq('team_id', options._teamId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get nearby buildings by postal code
   */
  async findNearby(postalCode: string, range = 2) {
    // Extract numeric part of postal code for range search
    const baseCode = parseInt(postalCode.slice(0, -3))
    const minCode = String(baseCode - range).padStart(2, '0')
    const maxCode = String(baseCode + range).padStart(2, '0')

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .gte('postal_code', minCode + '000')
      .lte('postal_code', maxCode + '999')
      .order('postal_code')

    if (error) {
      return this.handleError(error)
    }

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

    if (_teamId) {
      queryBuilder = queryBuilder.eq('team_id', _teamId)
    }

    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data, error } = await queryBuilder.limit(1)

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: (data && data.length > 0) }
  }
  /**
   * Find buildings by manager ID
   */
  async findByManager(managerId: string) {
    validateRequired({ managerId }, ['managerId'])

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('manager_id', managerId)
      .order('name')

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Update building manager assignment
   */
  async updateManager(buildingId: string, managerId: string | null) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        manager_id: managerId,
        updated_at: new Date().toISOString()
      })
      .eq('id', buildingId)
      .select()
      .single()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data: data as unknown as Building }
  }
}

// Factory functions for creating repository instances
export const createBuildingRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new BuildingRepository(supabase)
}

export const createServerBuildingRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new BuildingRepository(supabase)
}
