/**
 * Lot Repository - Phase 2
 * Handles core database operations for lots using BaseRepository pattern.
 *
 * Search, filter, bulk, and stats operations are in lot-search.repository.ts
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

/**
 * Lot Repository
 * Manages core database operations for lots with relations
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
        ['appartement', 'maison', 'garage', 'local_commercial', 'autre'] as const,
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

    if (this.isInsertData(data)) {
      validateRequired(data, ['reference', 'category'])
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
        building:building_id(id, name, team_id),
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        )
      `)
      .order('reference')

    if (options?.page && options?.limit) {
      const offset = (options.page - 1) * options.limit
      query.range(offset, offset + options.limit - 1)
    }

    const { data, error, count } = await query

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:findAllWithRelations`))
    }

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

    if (options?.page && options?.limit) {
      const totalPages = count ? Math.ceil(count / options.limit) : 1
      return {
        success: true as const,
        data: processedData || [],
        pagination: { total: count || 0, page: options.page, limit: options.limit, totalPages }
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
        building:building_id(id, name, team_id),
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
        status: isOccupied ? 'occupied' : 'vacant',
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
        building:building_id(id, name, team_id, address_id),
        lot_contacts(
          id,
          is_primary,
          user:user_id(id, name, email, phone, role, provider_category)
        ),
        contracts(id, title, status, start_date, end_date)
      `)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .order('reference')

    if (error) {
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    // Batch-fetch address records
    const addressIds = (data || []).flatMap(lot => [
      lot.address_id,
      lot.building?.address_id
    ]).filter(Boolean) as string[]

    const addresses: Record<string, Record<string, unknown>> = {}
    if (addressIds.length > 0) {
      const uniqueIds = [...new Set(addressIds)]
      const { data: addressData } = await this.supabase
        .from('addresses')
        .select('*')
        .in('id', uniqueIds)

      addressData?.forEach(addr => { addresses[addr.id] = addr })
    }

    const processedData = data?.map(lot => {
      const tenants = lot.lot_contacts?.filter((contact: LotContact) =>
        contact.user?.role === 'locataire'
      ) || []

      const isOccupied = tenants.length > 0

      const activeContracts = lot.contracts?.filter((contract: { status: string }) =>
        contract.status === 'actif' || contract.status === 'a_venir'
      ) || []

      return {
        ...lot,
        address_record: lot.address_id ? addresses[lot.address_id] : null,
        building: lot.building ? {
          ...lot.building,
          address_record: lot.building.address_id ? addresses[lot.building.address_id] : null
        } : null,
        tenant: tenants.find((contact: LotContact) => contact.is_primary)?.user ||
          tenants[0]?.user || null,
        is_occupied: isOccupied,
        status: isOccupied ? 'occupied' : 'vacant',
        tenants: tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user),
        contracts: activeContracts
      }
    })

    return { success: true as const, data: processedData || [] }
  }

  /**
   * Get lot by ID with full relations
   */
  async findByIdWithRelations(_id: string) {
    const [lotResult, contactsResult] = await Promise.all([
      this.supabase
        .from(this.tableName)
        .select(`*, building:building_id(id, name, team_id, address_id)`)
        .eq('id', _id)
        .single(),

      this.supabase
        .from('lot_contacts')
        .select(`id, is_primary, user:user_id(id, name, email, phone, role, provider_category)`)
        .eq('lot_id', _id)
    ])

    if (lotResult.error) {
      if (lotResult.error.code === 'PGRST116') throw new NotFoundException(this.tableName, _id)
      return createErrorResponse(handleError(lotResult.error, `${this.tableName}:query`))
    }

    const data = lotResult.data
    const lotContacts = contactsResult.data || []

    const addressIds = [data.address_id, data.building?.address_id].filter(Boolean)

    let addresses: Record<string, Record<string, unknown>> = {}
    if (addressIds.length > 0) {
      const { data: addressData } = await this.supabase
        .from('addresses')
        .select('*')
        .in('id', addressIds)

      addressData?.forEach(addr => { addresses[addr.id] = addr })
    }

    const tenants = lotContacts.filter((contact: LotContact) =>
      contact.user?.role === 'locataire'
    ) || []

    const isOccupied = tenants.length > 0

    const result = {
      ...data,
      address_record: data.address_id ? addresses[data.address_id] : null,
      building: data.building ? {
        ...data.building,
        address_record: data.building.address_id ? addresses[data.building.address_id] : null
      } : null,
      lot_contacts: lotContacts,
      tenant: tenants.find((contact: LotContact) => contact.is_primary)?.user ||
        tenants[0]?.user || null,
      is_occupied: isOccupied,
      status: isOccupied ? 'occupied' : 'vacant',
      tenants: tenants.map((contact: LotContact) => contact.user).filter((user): user is User => !!user)
    }

    return { success: true as const, data: result }
  }

  /**
   * Get lot with contact statistics
   */
  async findByIdWithContacts(_id: string) {
    const lotResult = await this.findByIdWithRelations(_id)
    if (!lotResult.success) return lotResult

    const { data: contactStats, error: statsError } = await this.supabase
      .from('lots_with_contacts')
      .select('*')
      .eq('id', _id)
      .single()

    if (statsError && statsError.code !== 'PGRST116') {
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

    if (excludeId) queryBuilder = queryBuilder.neq('id', excludeId)

    const { error } = await queryBuilder.single()

    if (error) {
      if (error.code === 'PGRST116') return { success: true as const, exists: false }
      return createErrorResponse(handleError(error, `${this.tableName}:query`))
    }

    return { success: true as const, exists: true }
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
 */
export const createServerActionLotRepository = async () => {
  const supabase = await createServerActionSupabaseClient()
  return new LotRepository(supabase)
}
