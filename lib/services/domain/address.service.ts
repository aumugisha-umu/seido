/**
 * Address Service
 * Business logic for address management with Google Maps integration
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'
import {
  createAddressRepository,
  type Address,
  type AddressInsert
} from '../repositories/address.repository'
import type { AddressRepository } from '../repositories/address.repository'
import { logger } from '@/lib/logger'
import {
  createSuccessResponse,
  createErrorResponse,
  handleError
} from '../core/error-handler'
import type { RepositoryResponse } from '../core/service-types'

/**
 * Address data from Google Places API
 */
export interface GooglePlaceAddress {
  street: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}

/**
 * Address Service
 * Handles business logic for address management with Google Maps integration
 */
export class AddressService {
  private repository: AddressRepository

  constructor(supabase: SupabaseClient<Database>) {
    this.repository = createAddressRepository(supabase)
  }

  /**
   * Create address from Google Places data
   * Checks for existing address by place_id to avoid duplicates
   */
  async createFromGooglePlace(
    googlePlace: GooglePlaceAddress,
    teamId: string
  ): Promise<RepositoryResponse<Address>> {
    try {
      // Check if address already exists by place_id
      const existing = await this.repository.findByPlaceId(googlePlace.placeId, teamId)
      if (existing) {
        logger.debug('Address already exists', { placeId: googlePlace.placeId })
        return createSuccessResponse(existing)
      }

      // Create address with geocoding data
      const result = await this.repository.createWithGeocode({
        street: googlePlace.street,
        postal_code: googlePlace.postalCode,
        city: googlePlace.city,
        country: this.mapCountryToEnum(googlePlace.country),
        latitude: googlePlace.latitude,
        longitude: googlePlace.longitude,
        place_id: googlePlace.placeId,
        formatted_address: googlePlace.formattedAddress,
        team_id: teamId
      })

      if (!result.success) {
        return result
      }

      logger.info('Address created from Google Place', {
        addressId: result.data.id,
        placeId: googlePlace.placeId
      })

      return result
    } catch (error) {
      logger.error('Error creating address from Google Place', { error, googlePlace })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:createFromGooglePlace')
      )
    }
  }

  /**
   * Create address manually (without geocoding)
   */
  async createManual(
    data: {
      street: string
      postalCode: string
      city: string
      country: string
    },
    teamId: string
  ): Promise<RepositoryResponse<Address>> {
    try {
      const addressData: AddressInsert = {
        street: data.street,
        postal_code: data.postalCode,
        city: data.city,
        country: this.mapCountryToEnum(data.country),
        team_id: teamId
      }

      const result = await this.repository.create(addressData)

      if (!result.success) {
        return result
      }

      return createSuccessResponse(result.data)
    } catch (error) {
      logger.error('Error creating manual address', { error, data })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:createManual')
      )
    }
  }

  /**
   * Get address by ID
   */
  async getById(addressId: string): Promise<RepositoryResponse<Address>> {
    try {
      const result = await this.repository.findById(addressId)

      if (!result.success) {
        return result
      }

      return createSuccessResponse(result.data)
    } catch (error) {
      logger.error('Error getting address', { error, addressId })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:getById')
      )
    }
  }

  /**
   * Get addresses by team with optional filters
   */
  async getByTeam(
    teamId: string,
    options?: {
      city?: string
      hasCoordinates?: boolean
      limit?: number
    }
  ): Promise<RepositoryResponse<Address[]>> {
    try {
      const addresses = await this.repository.findByTeam(teamId, options)
      return createSuccessResponse(addresses)
    } catch (error) {
      logger.error('Error getting addresses by team', { error, teamId })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:getByTeam')
      )
    }
  }

  /**
   * Update address geocoding data
   */
  async updateGeocode(
    addressId: string,
    geocodeData: {
      latitude: number
      longitude: number
      placeId: string
      formattedAddress: string
    }
  ): Promise<RepositoryResponse<Address>> {
    try {
      const result = await this.repository.updateGeocode(addressId, {
        latitude: geocodeData.latitude,
        longitude: geocodeData.longitude,
        place_id: geocodeData.placeId,
        formatted_address: geocodeData.formattedAddress
      })

      if (!result.success) {
        return result
      }

      return result
    } catch (error) {
      logger.error('Error updating address geocoding', { error, addressId })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:updateGeocode')
      )
    }
  }

  /**
   * Find existing address by place_id
   */
  async findByPlaceId(placeId: string, teamId: string): Promise<RepositoryResponse<Address | null>> {
    try {
      const address = await this.repository.findByPlaceId(placeId, teamId)
      return createSuccessResponse(address)
    } catch (error) {
      logger.error('Error finding address by place_id', { error, placeId })
      return createErrorResponse(
        handleError(error instanceof Error ? error : new Error('Unknown error'), 'AddressService:findByPlaceId')
      )
    }
  }

  /**
   * Geocode an address using Google Geocoding API (server-side)
   * @returns GeocodeResult if found, null if not found or error
   */
  async geocodeAddress(
    street: string,
    postalCode: string,
    city: string,
    country: string
  ): Promise<RepositoryResponse<{
    latitude: number
    longitude: number
    placeId: string
    formattedAddress: string
  } | null>> {
    const GEOCODING_TIMEOUT_MS = 10000 // 10 seconds timeout

    try {
      // Use NEXT_PUBLIC key (same API key, accessible on server)
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        logger.error('Google Maps API key not configured', { context: 'AddressService:geocodeAddress' })
        return createErrorResponse({
          code: 'CONFIGURATION_ERROR',
          message: 'Google Maps API key not configured'
        })
      }

      // Build combined address string
      const addressParts = [street, postalCode, city, country].filter(Boolean)
      const combinedAddress = addressParts.join(', ')

      if (!combinedAddress.trim()) {
        logger.warn('Empty address provided for geocoding')
        return createSuccessResponse(null)
      }

      // Call Google Geocoding API with timeout
      const url = new URL('https://maps.googleapis.com/maps/api/geocode/json')
      url.searchParams.set('address', combinedAddress)
      url.searchParams.set('key', apiKey)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), GEOCODING_TIMEOUT_MS)

      let response: Response
      try {
        response = await fetch(url.toString(), { signal: controller.signal })
      } finally {
        clearTimeout(timeoutId)
      }

      if (!response.ok) {
        // Non-critical: geocoding is optional, warn and return null
        logger.warn('Google Geocoding API HTTP request failed', {
          status: response.status,
          statusText: response.statusText,
          context: 'AddressService:geocodeAddress'
        })
        return createSuccessResponse(null)
      }

      // Parse JSON response with error handling
      let data: {
        status: string
        results: Array<{
          geometry: {
            location: {
              lat: number
              lng: number
            }
          }
          place_id: string
          formatted_address: string
        }>
        error_message?: string
      }

      try {
        data = await response.json()
      } catch (parseError) {
        // Non-critical: geocoding is optional
        logger.warn('Failed to parse Google Geocoding API response', { parseError })
        return createSuccessResponse(null)
      }

      // Handle API response statuses
      if (data.status === 'ZERO_RESULTS') {
        logger.debug('No geocoding results found', { address: combinedAddress })
        return createSuccessResponse(null)
      }

      if (data.status !== 'OK') {
        // Use warn instead of error - geocoding failures are non-critical
        // Common statuses: REQUEST_DENIED (API key), OVER_QUERY_LIMIT (quota)
        logger.warn('Google Geocoding API returned non-OK status', {
          status: data.status,
          errorMessage: data.error_message,
          address: combinedAddress,
          hint: data.status === 'REQUEST_DENIED' ? 'Check API key configuration' :
                data.status === 'OVER_QUERY_LIMIT' ? 'API quota exceeded' :
                'Check address format',
          context: 'AddressService:geocodeAddress'
        })
        // Return null instead of error - geocoding is optional
        // The import will continue without coordinates
        return createSuccessResponse(null)
      }

      // Extract result from first match
      const result = data.results[0]
      if (!result) {
        logger.debug('No geocoding results in response', { address: combinedAddress })
        return createSuccessResponse(null)
      }

      const geocodeResult = {
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
        placeId: result.place_id,
        formattedAddress: result.formatted_address
      }

      logger.debug('Address geocoded successfully', {
        address: combinedAddress,
        placeId: geocodeResult.placeId
      })

      return createSuccessResponse(geocodeResult)
    } catch (error) {
      // Non-critical: geocoding is optional, continue without coordinates
      // This handles timeout errors, network issues, etc.
      const isAbortError = error instanceof Error && error.name === 'AbortError'
      logger.warn('Geocoding failed (non-critical)', {
        error: error instanceof Error ? error.message : 'Unknown error',
        isTimeout: isAbortError,
        street, postalCode, city, country
      })
      return createSuccessResponse(null)
    }
  }

  /**
   * Map country name to database enum
   * Handles various country name formats (English, French, etc.)
   */
  private mapCountryToEnum(country: string): Database['public']['Enums']['country'] {
    const normalized = country.toLowerCase().trim()

    const countryMap: Record<string, Database['public']['Enums']['country']> = {
      // Belgium
      'belgium': 'belgique',
      'belgique': 'belgique',
      'be': 'belgique',
      'belgië': 'belgique',

      // France
      'france': 'france',
      'fr': 'france',

      // Luxembourg
      'luxembourg': 'luxembourg',
      'luxemburg': 'luxembourg',
      'lu': 'luxembourg',

      // Netherlands (enum value is 'pays-bas' with hyphen)
      'netherlands': 'pays-bas',
      'pays-bas': 'pays-bas',
      'pays bas': 'pays-bas',
      'nl': 'pays-bas',
      'nederland': 'pays-bas',

      // Germany
      'germany': 'allemagne',
      'allemagne': 'allemagne',
      'de': 'allemagne',
      'deutschland': 'allemagne',

      // Switzerland
      'switzerland': 'suisse',
      'suisse': 'suisse',
      'ch': 'suisse',
      'schweiz': 'suisse'
    }

    return countryMap[normalized] || 'autre'
  }
}

// Factory functions
export function createAddressService(supabase: SupabaseClient<Database>): AddressService {
  return new AddressService(supabase)
}
