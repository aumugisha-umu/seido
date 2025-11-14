/**
 * Lot Repository - Phase 2
 * Handles all database operations for lots using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import {
  createBrowserSupabaseClient,
  createServerSupabaseClient,
  createServerActionSupabaseClient
} from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lot, LotInsert, LotUpdate, User } from '../core/service-types'
import { NotFoundException, handleError, createErrorResponse } from '../core/error-handler'
import { logger } from '@/lib/logger'
import {
  validateRequired,
  validateLength,
  validateNumber,
  validateEnum
} from '../core/service-types'

// Types for lot relations
interface LotContact {
  is_primary?: boolean
  user?: User
}

interface LotWithContacts extends Lot {
  lot_contacts?: LotContact[]
  tenant?: User | null
  is_occupied?: boolean
  tenants?: User[]
  building?: {
    name: string
    address: string
    city: string
  }
}

/**
 * Lot Repository
 * Manages all database operations for lots with relations
 */
export class LotRepository extends BaseRepository<Lot, LotInsert, LotUpdate> {
  constructor(supabase: SupabaseClient) {
    super(supabase, 'lots')
  }

  /**
   * Validation hook for lot data
   */
  protected async validate(data: LotInsert | LotUpdate): Promise<void> {
    if ('reference' in data && data.reference) {
      validateLength(data.reference, 1, 50, 'reference')
    }

    if ('category' in data && data.category) {
      validateEnum(
        data.category,
        ['appartement', 'collocation', 'maison', 'garage', 'local_commercial', 'parking', 'autre'] as const,
        'category'
      )
    }

    if ('surface_area' in data && data.surface_area !== undefined) {
      validateNumber(data.surface_area, 1, 10000, 'surface_area')
    }

    if ('rooms' in data && data.rooms !== undefined) {
      validateNumber(data.rooms, 0, 100, 'rooms')
    }

    if ('floor' in data && data.floor !== undefined) {
      validateNumber(data.floor, -5, 100, 'floor')
    }

    if ('monthly_rent' in data && data.monthly_rent !== undefined) {
      validateNumber(data.monthly_rent, 0, 1000000, 'monthly_rent')
    }

    if ('monthly_charges' in data && data.monthly_charges !== undefined) {
      validateNumber(data.monthly_charges, 0, 100000, 'monthly_charges')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['reference', 'building_id', 'category'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: LotInsert | LotUpdate): data is LotInsert {
    return 'reference' in data && 'building_id' in data && 'category' in data
  }

  /**
   * Get all lots with relations
   */
  async findAllWithRelations(options?: { page?: number; limit?: number }) {
    const query = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city, team_id),
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('reference')

    // Apply pagination if provided
    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit
      query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findAllWithRelations`))
    }

    // Post-process to extract tenants and calculate is_occupied
    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      ) || []

      return {
        ...lot,
        tenant: tenants.find((contact: LotContact) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: tenants.length > 0,
        tenants: tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user)
      }
    })

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
   * Get lots by building
   */
  async findByBuilding(buildingId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('building_id', buildingId)
      .order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Post-process to extract tenants and calculate is_occupied
    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      ) || []

      const isOccupied = tenants.length > 0

      return {
        ...lot,
        tenant: tenants.find((contact: LotContact) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: isOccupied,
        status: isOccupied ? 'occupied' : 'vacant', // Add status field for compatibility
        tenants: tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user)
      }
    })

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get all lots for a team (includes lots with and without building)
   */
  async findByTeam(teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city, team_id),
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Post-process to extract tenants and calculate is_occupied
    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      ) || []

      const isOccupied = tenants.length > 0

      return {
        ...lot,
        tenant: tenants.find((contact: LotContact) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: isOccupied,
        status: isOccupied ? 'occupied' : 'vacant', // Add status field for compatibility
        tenants: tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user)
      }
    })

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get lot by ID with full relations
   */
  async findByIdWithRelations(_id: string) {
    const startTime = Date.now()
    console.log('🔍 [LOT-REPOSITORY] findByIdWithRelations called', {
      lotId: _id,
      timestamp: new Date().toISOString()
    })

    console.log('📍 [LOT-REPOSITORY] Step 1: Preparing Supabase query...')
    const queryStart = Date.now()

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('id', _id)
      .single()

    const queryElapsed = Date.now() - queryStart
    console.log('⏱️ [LOT-REPOSITORY] Supabase query completed', {
      elapsed: `${queryElapsed}ms`,
      hasData: !!data,
      hasError: !!error
    })

    if (error) {
      console.error('❌ [LOT-REPOSITORY] Query failed', {
        errorCode: error.code,
        errorMessage: error.message,
        lotId: _id,
        elapsed: `${Date.now() - startTime}ms`
      })

      if (error.code === 'PGRST116') {
        throw new NotFoundException(this.tableName, _id)
      }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    console.log('📍 [LOT-REPOSITORY] Step 2: Post-processing data...')
    const processStart = Date.now()

    // Post-process to extract tenants
    if (data) {
      const tenants = data.lot_contacts?.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      ) || []

      const isOccupied = tenants.length > 0

      data.tenant = tenants.find((contact: LotContact) => contact.is_primary)?.user ||
        tenants[0]?.user || null
      data.is_occupied = isOccupied
      data.status = isOccupied ? 'occupied' : 'vacant' // Add status field for compatibility
      data.tenants = tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user)
    }

    const processElapsed = Date.now() - processStart
    const totalElapsed = Date.now() - startTime

    console.log('✅ [LOT-REPOSITORY] findByIdWithRelations completed successfully', {
      lotId: _id,
      lotReference: data?.reference,
      contactsCount: data?.lot_contacts?.length || 0,
      tenantsCount: data?.tenants?.length || 0,
      processElapsed: `${processElapsed}ms`,
      totalElapsed: `${totalElapsed}ms`
    })

    return { success: true as const, data }
  }

  /**
   * Get lot with contact statistics
   */
  async findByIdWithContacts(_id: string) {
    // First get the basic lot data
    const lotResult = await this.findByIdWithRelations(_id)
    if (!lotResult.success) return lotResult

    // Get contact statistics
    const { data: contactStats, error: statsError } = await this.supabase
      .from('lots_with_contacts')
      .select('*')
      .eq('id', _id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      // If view doesn't exist or error, calculate manually
      const contacts = lotResult.data?.lot_contacts || []
      const tenants = contacts.filter((c: LotContact) => c.user?.role === 'locataire')
      const managers = contacts.filter((c: LotContact) => c.user?.role === 'gestionnaire')
      const providers = contacts.filter((c: LotContact) => c.user?.role === 'prestataire')

      return {
        success: true as const,
        data: {
          ...lotResult.data,
          active_tenants_count: tenants.length,
          active_managers_count: managers.length,
          active_providers_count: providers.length,
          active_contacts_total: contacts.length,
          primary_tenant_name: tenants.find((t: LotContact) => t.is_primary)?.user?.name,
          primary_tenant_email: tenants.find((t: LotContact) => t.is_primary)?.user?.email,
          primary_tenant_phone: tenants.find((t: LotContact) => t.is_primary)?.user?.phone
        }
      }
    }

    return { success: true as const, data: contactStats || lotResult.data }
  }

  /**
   * Check if lot reference exists for building
   */
  async referenceExists(reference: string, buildingId: string, excludeId?: string) {
    validateLength(reference, 1, 50, 'reference')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select('id')
      .eq('reference', reference)
      .eq('building_id', buildingId)

    if (excludeId) {
      queryBuilder = queryBuilder.neq('id', excludeId)
    }

    const { data, error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found = reference doesn't exist
        return { success: true as const, exists: false }
      }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, exists: true }
  }

  /**
   * Get lots by category
   */
  async findByCategory(category: Lot['category'], options?: { buildingId?: string; teamId?: string }) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city, team_id)
      `)
      .eq('category', category)

    if (options?.buildingId) {
      queryBuilder = queryBuilder.eq('building_id', options.buildingId)
    }

    if (options?.teamId) {
      queryBuilder = queryBuilder.eq('building.team_id', options.teamId)
    }

    const { data, error } = await queryBuilder.order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get occupied lots
   */
  async findOccupied(buildingId?: string) {
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts!inner(
          user:user_id!inner(role)
        )
      `)
      .eq('lot_contacts.user.role', 'tenant')

    if (buildingId) {
      queryBuilder = queryBuilder.eq('building_id', buildingId)
    }

    const { data, error } = await queryBuilder.order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get vacant lots
   */
  async findVacant(buildingId?: string) {
    // First get all lots
    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts(
          id,
          user:user_id(role)
        )
      `)

    if (buildingId) {
      queryBuilder = queryBuilder.eq('building_id', buildingId)
    }

    const { data, error } = await queryBuilder.order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Filter for lots without tenants
    const vacantLots = data?.filter(lot => {
      const hasTenant = lot.lot_contacts?.some((_contact: unknown) =>
        contact.user?.role === 'locataire'
      )
      return !hasTenant
    }) || []

    return { success: true as const, data: vacantLots }
  }

  /**
   * ❌ SUPPRIMÉ: updateTenant()
   * Utilisez LotContactRepository.assignTenant() et removeTenant() à la place
   * La colonne tenant_id n'existe plus, les locataires sont gérés via lot_contacts
   */

  /**
   * Get lots by floor
   */
  async findByFloor(buildingId: string, floor: number) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('building_id', buildingId)
      .eq('floor', floor)
      .order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Search lots
   */
  async search(query: string, options?: { buildingId?: string; category?: Lot['category'] }) {
    validateLength(query, 1, 100, 'search query')

    let queryBuilder = this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city)
      `)
      .or(`reference.ilike.%${query}%`)

    if (options?.buildingId) {
      queryBuilder = queryBuilder.eq('building_id', options.buildingId)
    }

    if (options?.category) {
      queryBuilder = queryBuilder.eq('category', options.category)
    }

    const { data, error } = await queryBuilder.order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get lot count by category for a team
   */
  async getCountByCategory(teamId: string) {
    try {
      const { data, error } = await this.supabase
        .from(this.tableName)
        .select(`
          category,
          buildings!inner(team_id)
        `)
        .eq('buildings.team_id', teamId)

      if (error) {
        logger.error('❌ [LOT-REPOSITORY] getCountByCategory SQL error:', error)
        return { success: false as const, error: handleError(error, 'lot:getCountByCategory') }
      }

      // Count by category
      const counts = data?.reduce((acc, lot) => {
        acc[lot.category] = (acc[lot.category] || 0) + 1
        return acc
      }, {} as Record<string, number>) || {}

      logger.info('✅ [LOT-REPOSITORY] Category counts calculated:', counts)
      return { success: true as const, data: counts }
    } catch (error) {
      logger.error('❌ [LOT-REPOSITORY] getCountByCategory exception:', error)
      return { success: false as const, error: handleError(error as Error, 'lot:getCountByCategory') }
    }
  }

  /**
   * Bulk update lots' building
   */
  async updateBuildingBulk(lotIds: string[], buildingId: string) {
    if (!lotIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error} = await this.supabase
      .from(this.tableName)
      .update({
        building_id: buildingId,
        updated_at: new Date().toISOString()
      })
      .in('id', lotIds)
      .select()

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Find multiple lots by IDs in a single query (batch operation)
   * ✅ PERFORMANCE FIX (Oct 23, 2025 - Issue #1): Prevents N+1 query pattern
   *
   * @param lotIds Array of lot IDs to fetch
   * @returns Array of lots (may be less than input if some IDs don't exist)
   */
  async findByIds(lotIds: string[]) {
    if (!lotIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .in('id', lotIds)

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, data: data || [] }
  }
}

// Factory functions for creating repository instances
export const createLotRepository = (client?: SupabaseClient) => {
  const supabase = client || createBrowserSupabaseClient()
  return new LotRepository(supabase)
}

export const createServerLotRepository = async () => {
  const supabase = await createServerSupabaseClient()
  return new LotRepository(supabase)
}

/**
 * Create Lot Repository for Server Actions (READ-WRITE)
 * ✅ Uses createServerActionSupabaseClient() which can modify cookies
 * ✅ Maintains auth session for RLS policies (auth.uid() available)
 * ✅ Use this in Server Actions that perform write operations
 */
export const createServerActionLotRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new LotRepository(supabase)
}
