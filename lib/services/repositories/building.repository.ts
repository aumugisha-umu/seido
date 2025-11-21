/**
 * Building Repository - Phase 2
 * Handles all database operations for buildings using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Building, BuildingInsert, BuildingUpdate } from '../core/service-types'
import { NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
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
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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
   * ⚡ OPTIMIZED: Get buildings summary by team (for list views)
   * Returns minimal data: id, name, address, city, postal_code, lots count
   * 90% less data transferred compared to findByTeam()
   *
   * ✅ Next.js 15: Uses native Data Cache (no custom cache layer)
   * Cache invalidated via revalidateTag('buildings') or revalidatePath()
   */
  async findByTeamSummary(teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        id,
        name,
        address,
        city,
        postal_code,
        team_id,
        lots(id),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, role, provider_category)
        )
      `)
      .eq('team_id', teamId)
      .order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Add lots count
    const processedData = data?.map(building => ({
      ...building,
      lots_count: building.lots?.length || 0
    }))

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get buildings by team with full relations
   * Use this when you need ALL data (contacts, team details, etc.)
   * For list views, prefer findByTeamSummary() instead
   *
   * ✅ Next.js 15: Uses native Data Cache (no custom cache layer)
   * Cache invalidated via revalidateTag('buildings') or revalidatePath()
   */
  async findByTeam(teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
          category,
          lot_contacts(
            is_primary,
            user:user_id(id, name, email, phone, role, provider_category)
          )
        ),
        building_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category, speciality)
        )
      `)
      .eq('team_id', teamId)
      .order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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
  async findByUser(userId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        team:team_id(id, name, description),
        lots(
          id,
          reference,
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
      .or(`building_contacts.user_id.eq.${userId},team_id.in.(select team_id from team_members where user_id = '${userId}')`)
      .order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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
   * ✅ Next.js 15: Data Cache + Request Memoization (automatic)
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
          user:user_id(id, name, email, phone, role, provider_category, speciality)
        )
      `)
      .eq('id', _id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, _id)
      }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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

    if (options?.teamId) {
      queryBuilder = queryBuilder.eq('team_id', options.teamId)
    }

    if (options?.city) {
      queryBuilder = queryBuilder.eq('city', options.city)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get buildings with lot count statistics
   * Uses lot_contacts to determine occupancy (Phase 2 refactored schema)
   */
  async findWithLotStats(teamId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        lots(
          id,
          lot_contacts(
            user:user_id(role)
          )
        )
      `)

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Calculate lot statistics (occupied = has tenants in lot_contacts)
    const processedData = data?.map(building => {
      const lots = building.lots || []
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const occupiedLots = lots.filter((lot: any) =>
        lot.lot_contacts?.some((contact: any) => contact.user?.role === 'locataire')
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

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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

    if (options?.teamId) {
      queryBuilder = queryBuilder.eq('team_id', options.teamId)
    }

    const { data, error } = await queryBuilder.order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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

    if (teamId) {
      queryBuilder = queryBuilder.eq('team_id', teamId)
    }

    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data, error } = await queryBuilder.limit(1)

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: (data && data.length > 0) }
  }
  /**
   * Find buildings by gestionnaire (primary manager) ID
   * Uses building_contacts junction table (Phase 2 refactored schema)
   */
  async findByGestionnaire(gestionnaireId: string) {
    validateRequired({ gestionnaireId }, ['gestionnaireId'])

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        building_contacts!inner(user_id)
      `)
      .eq('building_contacts.user_id', gestionnaireId)
      .order('name')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Clean up the response to remove the building_contacts join artifact
    const cleanedData = data?.map(({ building_contacts, ...building }) => building)

    return { success: true as const, data: cleanedData || [] }
  }

  /**
   * Update building gestionnaire assignment
   * Uses building_contacts junction table (Phase 2 refactored schema)
   * Note: This updates the PRIMARY manager contact
   */
  async updateGestionnaire(buildingId: string, gestionnaireId: string) {
    // First, remove existing primary manager
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

    if (deleteError) {
      return createErrorResponse(handleError(deleteError, 'building_contacts:delete'))
    }

    // Then, add new primary manager
    const { error: insertError } = await this.supabase
      .from('building_contacts')
      .insert({
        building_id: buildingId,
        user_id: gestionnaireId,
        is_primary: true
      })

    if (insertError) {
      return createErrorResponse(handleError(insertError, 'building_contacts:insert'))
    }

    // Return the updated building
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id', buildingId)
      .single()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
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

/**
 * Create Building Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionBuildingRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new BuildingRepository(supabase)
}
