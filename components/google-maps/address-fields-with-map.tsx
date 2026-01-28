'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { MapPin, Hash, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { AddressAutocompleteInput, type AddressData } from './address-autocomplete-input'
import { GoogleMapPreview } from './google-map-preview'
import { cn } from '@/lib/utils'

/**
 * Address fields structure for form data
 */
export interface AddressFields {
  street: string
  postalCode: string
  city: string
  country: string
}

/**
 * Geocoding result with coordinates
 * Also includes the address fields for atomic updates (avoids stale closure issues)
 */
export interface GeocodeResult {
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
  // Include fields to allow atomic update in parent (fixes stale closure)
  fields?: AddressFields
}

export interface AddressFieldsWithMapProps {
  // Field values
  street: string
  postalCode: string
  city: string
  country: string

  // Coordinates (optional, for edit mode)
  latitude?: number
  longitude?: number

  // Callbacks
  onFieldsChange: (fields: AddressFields) => void
  onGeocodeResult?: (result: GeocodeResult | null) => void

  // Options
  showAutocomplete?: boolean  // Show Google search field (default: true)
  showMap?: boolean           // Show map preview (default: true)
  mapHeight?: number          // Map height in px (default: 180)
  disabled?: boolean
  required?: boolean
  className?: string
}

/**
 * Debounce delay for geocoding manual field changes (in ms)
 */
const GEOCODE_DEBOUNCE_MS = 800

/**
 * Available countries for selection
 */
const COUNTRIES = [
  'Belgique',
  'France',
  'Luxembourg',
  'Pays-Bas',
  'Allemagne',
  'Espagne',
  'Italie',
  'Portugal',
  'Royaume-Uni',
  'Suisse',
  'Autriche',
  'République tchèque',
  'Pologne',
  'Danemark',
  'Suède',
  'Norvège',
  'Finlande',
  'Autre'
]

/**
 * AddressFieldsWithMap - Unified address component
 *
 * Combines:
 * 1. Google Places autocomplete (optional)
 * 2. Manual address fields (street, postal code, city, country)
 * 3. Bidirectional geocoding (autocomplete OR manual entry -> coordinates)
 * 4. Map preview (optional)
 *
 * @example
 * ```tsx
 * <AddressFieldsWithMap
 *   street={form.street}
 *   postalCode={form.postalCode}
 *   city={form.city}
 *   country={form.country}
 *   onFieldsChange={(fields) => setForm({ ...form, ...fields })}
 *   onGeocodeResult={(result) => setCoordinates(result)}
 * />
 * ```
 */
export function AddressFieldsWithMap({
  street,
  postalCode,
  city,
  country,
  latitude,
  longitude,
  onFieldsChange,
  onGeocodeResult,
  showAutocomplete = true,
  showMap = true,
  mapHeight = 180,
  disabled = false,
  required = false,
  className
}: AddressFieldsWithMapProps) {
  // Geocoding library
  const geocoding = useMapsLibrary('geocoding')

  // Internal coordinates state (from props or geocoding)
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latitude && longitude ? { lat: latitude, lng: longitude } : null
  )
  const [formattedAddress, setFormattedAddress] = useState<string>('')

  // Geocoding state
  const [isGeocoding, setIsGeocoding] = useState(false)
  const geocoderRef = useRef<google.maps.Geocoder | null>(null)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize geocoder when library is ready
  // Note: Geocoding API may be disabled or return REQUEST_DENIED
  // In that case, we gracefully degrade - autocomplete still works since it provides coordinates
  useEffect(() => {
    if (geocoding && !geocoderRef.current) {
      try {
        geocoderRef.current = new google.maps.Geocoder()
      } catch (e) {
        console.warn('[AddressFieldsWithMap] Geocoding not available:', e)
      }
    }
  }, [geocoding])

  // Update coords when props change (edit mode)
  useEffect(() => {
    if (latitude && longitude) {
      setCoords({ lat: latitude, lng: longitude })
    }
  }, [latitude, longitude])

  /**
   * Handle autocomplete address selection
   *
   * STALE CLOSURE FIX:
   * When onGeocodeResult is provided, we pass fields in the result for atomic update.
   * In this case, we DON'T call onFieldsChange to avoid double-update with stale data.
   * When onGeocodeResult is NOT provided, we call onFieldsChange only.
   */
  const handleAutocompleteSelect = useCallback((address: AddressData) => {
    console.log('🔍 [ADDRESS-MAP] handleAutocompleteSelect called with address:', {
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      formattedAddress: address.formattedAddress
    })

    const fieldsToUpdate: AddressFields = {
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
      country: address.country
    }

    console.log('🔍 [ADDRESS-MAP] fieldsToUpdate:', fieldsToUpdate)

    // Update internal coordinates state
    setCoords({ lat: address.latitude, lng: address.longitude })
    setFormattedAddress(address.formattedAddress)

    if (onGeocodeResult) {
      console.log('🔍 [ADDRESS-MAP] Calling onGeocodeResult with fields:', {
        hasOnGeocodeResult: true,
        fields: fieldsToUpdate
      })
      // ATOMIC UPDATE: Pass everything in onGeocodeResult, skip onFieldsChange
      onGeocodeResult({
        latitude: address.latitude,
        longitude: address.longitude,
        placeId: address.placeId,
        formattedAddress: address.formattedAddress,
        fields: fieldsToUpdate  // Include fields for atomic update
      })
      // DO NOT call onFieldsChange here - parent handles everything in onGeocodeResult
    } else {
      console.log('🔍 [ADDRESS-MAP] Calling onFieldsChange (no onGeocodeResult)')
      // No geocode callback - just update fields
      onFieldsChange(fieldsToUpdate)
    }
  }, [onFieldsChange, onGeocodeResult])

  /**
   * Geocode combined address after manual field changes
   * Note: This may fail with REQUEST_DENIED if Geocoding API is not enabled
   * In that case, we silently fail - the map won't update from manual edits,
   * but autocomplete selection still works perfectly since Places API provides coordinates
   */
  const geocodeAddress = useCallback(async (fields: AddressFields) => {
    // Early return if geocoder not available (API disabled or initialization failed)
    if (!geocoderRef.current) {
      return
    }

    // Build address string
    const addressParts = [
      fields.street,
      fields.postalCode,
      fields.city,
      fields.country
    ].filter(Boolean)

    if (addressParts.length < 2) {
      // Not enough data to geocode
      setCoords(null)
      setFormattedAddress('')
      if (onGeocodeResult) {
        onGeocodeResult(null)
      }
      return
    }

    const combinedAddress = addressParts.join(', ')

    setIsGeocoding(true)
    try {
      const result = await geocoderRef.current.geocode({ address: combinedAddress })

      if (result.results[0]) {
        const location = result.results[0].geometry.location
        const newCoords = {
          lat: location.lat(),
          lng: location.lng()
        }

        setCoords(newCoords)
        setFormattedAddress(result.results[0].formatted_address)

        if (onGeocodeResult) {
          onGeocodeResult({
            latitude: newCoords.lat,
            longitude: newCoords.lng,
            placeId: result.results[0].place_id,
            formattedAddress: result.results[0].formatted_address
          })
        }
      } else {
        // No results
        setCoords(null)
        setFormattedAddress('')
        if (onGeocodeResult) {
          onGeocodeResult(null)
        }
      }
    } catch (error: unknown) {
      // Handle REQUEST_DENIED and other errors gracefully
      // Common causes: Geocoding API not enabled, billing issues, quota exceeded
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('REQUEST_DENIED')) {
        // Only log once to avoid console spam
        console.warn('[AddressFieldsWithMap] Geocoding API not available - manual field edits won\'t update the map')
        // Disable future geocoding attempts by clearing the ref
        geocoderRef.current = null
      } else {
        console.error('[AddressFieldsWithMap] Geocoding error:', error)
      }
      // Don't clear existing coords - keep the map showing if we had valid coords from autocomplete
    } finally {
      setIsGeocoding(false)
    }
  }, [onGeocodeResult])

  /**
   * Handle manual field change with debounced geocoding
   */
  const handleFieldChange = useCallback((field: keyof AddressFields, value: string) => {
    const newFields: AddressFields = {
      street,
      postalCode,
      city,
      country,
      [field]: value
    }

    // Immediately notify parent of field change
    onFieldsChange(newFields)

    // Debounce geocoding
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    debounceTimerRef.current = setTimeout(() => {
      geocodeAddress(newFields)
    }, GEOCODE_DEBOUNCE_MS)
  }, [street, postalCode, city, country, onFieldsChange, geocodeAddress])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [])

  // Check if we have valid coordinates to show map
  const hasValidCoords = coords && coords.lat !== 0 && coords.lng !== 0

  return (
    <div className={cn('space-y-4', className)}>
      {/* Google Autocomplete Search */}
      {showAutocomplete && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Recherche d&apos;adresse
          </Label>
          <AddressAutocompleteInput
            onAddressSelect={handleAutocompleteSelect}
            placeholder="Rechercher une adresse..."
            disabled={disabled}
          />
        </div>
      )}

      {/* Manual Address Fields */}
      <div className="grid gap-4">
        {/* Street */}
        <div className="space-y-2">
          <Label htmlFor="address-street" className="text-sm font-medium">
            Rue {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="address-street"
              value={street}
              onChange={(e) => handleFieldChange('street', e.target.value)}
              placeholder="Rue et numéro"
              disabled={disabled}
              required={required}
              className="pl-10"
            />
          </div>
        </div>

        {/* Postal Code and City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="address-postalCode" className="text-sm font-medium">
              Code postal {required && <span className="text-destructive">*</span>}
            </Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="address-postalCode"
                value={postalCode}
                onChange={(e) => handleFieldChange('postalCode', e.target.value)}
                placeholder="1000"
                disabled={disabled}
                required={required}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address-city" className="text-sm font-medium">
              Ville {required && <span className="text-destructive">*</span>}
            </Label>
            <Input
              id="address-city"
              value={city}
              onChange={(e) => handleFieldChange('city', e.target.value)}
              placeholder="Bruxelles"
              disabled={disabled}
              required={required}
            />
          </div>
        </div>

        {/* Country */}
        <div className="space-y-2">
          <Label htmlFor="address-country" className="text-sm font-medium">
            Pays {required && <span className="text-destructive">*</span>}
          </Label>
          <Select
            value={country}
            onValueChange={(value) => handleFieldChange('country', value)}
            disabled={disabled}
          >
            <SelectTrigger id="address-country" className="w-full">
              <SelectValue placeholder="Sélectionner un pays" />
            </SelectTrigger>
            <SelectContent>
              {COUNTRIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Geocoding Status */}
      {isGeocoding && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Recherche de l&apos;adresse sur la carte...</span>
        </div>
      )}

      {/* Map Preview */}
      {showMap && hasValidCoords && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">
            Aperçu sur la carte
          </Label>
          <GoogleMapPreview
            latitude={coords.lat}
            longitude={coords.lng}
            address={formattedAddress}
            height={mapHeight}
            showOpenButton={true}
          />
        </div>
      )}
    </div>
  )
}
