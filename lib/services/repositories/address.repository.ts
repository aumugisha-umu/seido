/**
 * Address Repository
 * Handles all database operations for the centralized addresses table
 */

import { BaseRepository } from '../core/base-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import type { RepositoryResponse } from '../core/service-types'
import {
  validateRequired,
  validateLength,
  validateNumber
} from '../core/service-types'
import { logger } from '@/lib/logger'

// Type aliases from database
type AddressRow = Database['public']['Tables']['addresses']['Row']
type AddressInsert = Database['public']['Tables']['addresses']['Insert']
type AddressUpdate = Database['public']['Tables']['addresses']['Update']

export type Address = AddressRow
export type { AddressInsert, AddressUpdate }

/**
 * Address data for creating/updating with geocoding
 * Extends AddressInsert with optional geocoding fields
 */
export interface AddressWithGeocode {
  street: string
  postal_code: string
  city: string
  country?: Database['public']['Enums']['country']
  team_id: string
  latitude?: number | null
  longitude?: number | null
  place_id?: string | null
  formatted_address?: string | null
}

/**
 * Address Repository
 */
export class AddressRepository extends BaseRepository<Address, AddressInsert, AddressUpdate> {
  constructor(supabase: SupabaseClient<Database>) {
    super(supabase, 'addresses')
  }

  /**
   * Validation hook for address data
   */
  protected async validate(data: AddressInsert | AddressUpdate): Promise<void> {
    if ('street' in data && data.street) {
      validateLength(data.street, 3, 200, 'street')
    }

    if ('city' in data && data.city) {
      validateLength(data.city, 2, 100, 'city')
    }

    if ('postal_code' in data && data.postal_code) {
      validateLength(data.postal_code, 2, 20, 'postal_code')
    }

    // Validate coordinates if provided
    if ('latitude' in data && data.latitude !== null && data.latitude !== undefined) {
      validateNumber(data.latitude, -90, 90, 'latitude')
    }

    if ('longitude' in data && data.longitude !== null && data.longitude !== undefined) {
      validateNumber(data.longitude, -180, 180, 'longitude')
    }

    // For insert, validate required fields
    if (this.isInsertData(data)) {
      validateRequired(data, ['street', 'postal_code', 'city', 'team_id'])
    }
  }

  /**
   * Type guard to check if data is for insert
   */
  private isInsertData(data: AddressInsert | AddressUpdate): data is AddressInsert {
    return 'street' in data && 'postal_code' in data && 'city' in data && 'team_id' in data
  }

  /**
   * Find address by place_id (Google Places unique ID)
   */
  async findByPlaceId(placeId: string, teamId: string): Promise<Address | null> {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('place_id', placeId)
      .eq('team_id', teamId)
      .is('deleted_at', null)
      .maybeSingle()

    if (error) {
      logger.error('Error finding address by place_id', { placeId, error })
      return null
    }

    return data
  }

  /**
   * Find addresses by team with optional filters
   */
  async findByTeam(
    teamId: string,
    options?: {
      city?: string
      hasCoordinates?: boolean
      limit?: number
    }
  ): Promise<Address[]> {
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('team_id', teamId)
      .is('deleted_at', null)

    if (options?.city) {
      query = query.ilike('city', `%${options.city}%`)
    }

    if (options?.hasCoordinates === true) {
      query = query.not('latitude', 'is', null)
    } else if (options?.hasCoordinates === false) {
      query = query.is('latitude', null)
    }

    if (options?.limit) {
      query = query.limit(options.limit)
    }

    const { data, error } = await query.order('created_at', { ascending: false })

    if (error) {
      logger.error('Error finding addresses by team', { teamId, error })
      return []
    }

    return data || []
  }

  /**
   * Create address with geocoding data
   */
  async createWithGeocode(data: AddressWithGeocode): Promise<RepositoryResponse<Address>> {
    const insertData: AddressInsert = {
      street: data.street,
      postal_code: data.postal_code,
      city: data.city,
      country: data.country,
      team_id: data.team_id,
      latitude: data.latitude,
      longitude: data.longitude,
      place_id: data.place_id,
      formatted_address: data.formatted_address
    }
    return this.create(insertData)
  }

  /**
   * Update geocoding data for an existing address
   */
  async updateGeocode(
    addressId: string,
    geocodeData: {
      latitude: number
      longitude: number
      place_id: string
      formatted_address: string
    }
  ): Promise<RepositoryResponse<Address>> {
    return this.update(addressId, geocodeData)
  }
}

// Factory functions
export function createAddressRepository(supabase: SupabaseClient<Database>): AddressRepository {
  return new AddressRepository(supabase)
}
