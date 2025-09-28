/**
 * Lot Repository - Phase 2
 * Handles all database operations for lots using BaseRepository pattern
 */

import { BaseRepository } from '../core/base-repository'
import { createBrowserSupabaseClient, createServerSupabaseClient } from '../core/supabase-client'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lot, LotInsert, LotUpdate } from '../core/service-types'
import { ValidationException, NotFoundException } from '../core/error-handler'
import {
  validateRequired,
  validateLength,
  validateNumber,
  validateEnum
} from '../core/service-types'

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
        ['apartment', 'office', 'commercial', 'storage', 'parking'] as const,
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
        building:building_id(name, address, city),
        lot_contacts(
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
      return this.handleError(error)
    }

    // Post-process to extract tenants and calculate is_occupied
    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: any) =>
        contact.user?.role === 'tenant'
      ) || []

      return {
        ...lot,
        tenant: tenants.find((contact: any) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: tenants.length > 0,
        tenants: tenants.map((contact: any) => contact.user)
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
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('building_id', buildingId)
      .order('reference')

    if (error) {
      return this.handleError(error)
    }

    // Post-process to extract tenants and calculate is_occupied
    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: any) =>
        contact.user?.role === 'tenant'
      ) || []

      return {
        ...lot,
        tenant: tenants.find((contact: any) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: tenants.length > 0,
        tenants: tenants.map((contact: any) => contact.user)
      }
    })

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get lot by ID with full relations
   */
  async findByIdWithRelations(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        *,
        building:building_id(name, address, city),
        lot_contacts(
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException('Lot not found', this.tableName, id)
      }
      return this.handleError(error)
    }

    // Post-process to extract tenants
    if (data) {
      const tenants = data.lot_contacts?.filter((contact: any) =>
        contact.user?.role === 'tenant'
      ) || []

      data.tenant = tenants.find((contact: any) => contact.is_primary)?.user ||
        tenants[0]?.user || null
      data.is_occupied = tenants.length > 0
      data.tenants = tenants.map((contact: any) => contact.user)
    }

    return { success: true as const, data }
  }

  /**
   * Get lot with contact statistics
   */
  async findByIdWithContacts(id: string) {
    // First get the basic lot data
    const lotResult = await this.findByIdWithRelations(id)
    if (!lotResult.success) return lotResult

    // Get contact statistics
    const { data: contactStats, error: statsError } = await this.supabase
      .from('lots_with_contacts')
      .select('*')
      .eq('id', id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
      // If view doesn't exist or error, calculate manually
      const contacts = lotResult.data?.lot_contacts || []
      const tenants = contacts.filter((c: any) => c.user?.role === 'tenant')
      const managers = contacts.filter((c: any) => c.user?.role === 'manager')
      const providers = contacts.filter((c: any) => c.user?.role === 'provider')

      return {
        success: true as const,
        data: {
          ...lotResult.data,
          active_tenants_count: tenants.length,
          active_managers_count: managers.length,
          active_providers_count: providers.length,
          active_contacts_total: contacts.length,
          primary_tenant_name: tenants.find((t: any) => t.is_primary)?.user?.name,
          primary_tenant_email: tenants.find((t: any) => t.is_primary)?.user?.email,
          primary_tenant_phone: tenants.find((t: any) => t.is_primary)?.user?.phone
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
      return this.handleError(error)
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
      return this.handleError(error)
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
      return this.handleError(error)
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
          user:user_id(role)
        )
      `)

    if (buildingId) {
      queryBuilder = queryBuilder.eq('building_id', buildingId)
    }

    const { data, error } = await queryBuilder.order('reference')

    if (error) {
      return this.handleError(error)
    }

    // Filter for lots without tenants
    const vacantLots = data?.filter(lot => {
      const hasTenant = lot.lot_contacts?.some((contact: any) =>
        contact.user?.role === 'tenant'
      )
      return !hasTenant
    }) || []

    return { success: true as const, data: vacantLots }
  }

  /**
   * Update lot occupancy status
   */
  async updateOccupancy(lotId: string, isOccupied: boolean) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({ is_occupied: isOccupied, updated_at: new Date().toISOString() })
      .eq('id', lotId)
      .select()
      .single()

    if (error) {
      return this.handleError(error)
    }

    return { success: true as const, data }
  }

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
      return this.handleError(error)
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
      return this.handleError(error)
    }

    return { success: true as const, data: data || [] }
  }

  /**
   * Get lot count by category for a team
   */
  async getCountByCategory(teamId: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select(`
        category,
        building:building_id!inner(team_id)
      `)
      .eq('building.team_id', teamId)

    if (error) {
      return this.handleError(error)
    }

    // Count by category
    const counts = data?.reduce((acc, lot) => {
      acc[lot.category] = (acc[lot.category] || 0) + 1
      return acc
    }, {} as Record<string, number>) || {}

    return { success: true as const, data: counts }
  }

  /**
   * Bulk update lots' building
   */
  async updateBuildingBulk(lotIds: string[], buildingId: string) {
    if (!lotIds.length) {
      return { success: true as const, data: [] }
    }

    const { data, error } = await this.supabase
      .from(this.tableName)
      .update({
        building_id: buildingId,
        updated_at: new Date().toISOString()
      })
      .in('id', lotIds)
      .select()

    if (error) {
      return this.handleError(error)
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