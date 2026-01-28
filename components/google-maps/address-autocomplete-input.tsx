'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useMapsLibrary } from '@vis.gl/react-google-maps'
import { Input } from '@/components/ui/input'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { MapPin, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Address data returned from Google Places
 */
export interface AddressData {
  street: string
  postalCode: string
  city: string
  country: string
  latitude: number
  longitude: number
  placeId: string
  formattedAddress: string
}

interface AddressAutocompleteInputProps {
  onAddressSelect: (address: AddressData) => void
  defaultValue?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

/**
 * Address Autocomplete Input using Google Places API (New)
 *
 * Features:
 * - Real-time suggestions with debounce (300ms)
 * - Geographic bias for BE/FR/LU/NL
 * - Session tokens for billing optimization
 * - Automatic address component parsing
 */
export function AddressAutocompleteInput({
  onAddressSelect,
  defaultValue = '',
  placeholder = 'Rechercher une adresse...',
  disabled = false,
  className
}: AddressAutocompleteInputProps) {
  const places = useMapsLibrary('places')

  const [inputValue, setInputValue] = useState(defaultValue)
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Session token for billing optimization
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null)

  // Create new session token on mount
  useEffect(() => {
    if (places && window.google?.maps?.places?.AutocompleteSessionToken) {
      sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
    }
  }, [places])

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (input: string) => {
    if (!places || !window.google?.maps?.places?.AutocompleteSuggestion || input.length < 3) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const request: google.maps.places.AutocompleteRequest = {
        input,
        includedRegionCodes: ['BE', 'FR', 'LU', 'NL'],
        language: 'fr'
      }

      // Add session token if available
      if (sessionTokenRef.current) {
        request.sessionToken = sessionTokenRef.current
      }

      const { suggestions: results } = await google.maps.places.AutocompleteSuggestion
        .fetchAutocompleteSuggestions(request)

      setSuggestions(results || [])
      setIsOpen((results || []).length > 0)
    } catch (error) {
      console.error('Autocomplete error:', error)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [places])

  // Debounce input changes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 3) {
        fetchSuggestions(inputValue)
      } else {
        setSuggestions([])
        setIsOpen(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [inputValue, fetchSuggestions])

  // Handle suggestion selection
  const handleSelect = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!suggestion.placePrediction) return

    setIsLoading(true)
    try {
      const place = suggestion.placePrediction.toPlace()
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location', 'addressComponents']
      })

      // Parse address components
      const addressData = parseAddressComponents(place)

      setInputValue(place.formattedAddress || '')
      setIsOpen(false)
      setSuggestions([])
      onAddressSelect(addressData)

      // Create new session token after selection (billing optimization)
      if (window.google?.maps?.places?.AutocompleteSessionToken) {
        sessionTokenRef.current = new google.maps.places.AutocompleteSessionToken()
      }
    } catch (error) {
      console.error('Place details error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Check if Places API is available
  const isPlacesAvailable = places && typeof window !== 'undefined' && window.google?.maps?.places

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn('relative', className)}>
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={placeholder}
            disabled={disabled || !isPlacesAvailable}
            className="pl-10 pr-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverTrigger>

      {suggestions.length > 0 && (
        <PopoverContent
          className="p-0 w-[var(--radix-popover-trigger-width)]"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <Command>
            <CommandList>
              <CommandEmpty>Aucune adresse trouvée</CommandEmpty>
              <CommandGroup>
                {suggestions.map((suggestion, index) => (
                  <CommandItem
                    key={index}
                    onSelect={() => handleSelect(suggestion)}
                    className="cursor-pointer"
                  >
                    <MapPin className="mr-2 h-4 w-4 flex-shrink-0" />
                    <div className="flex flex-col overflow-hidden">
                      <span className="font-medium truncate">
                        {suggestion.placePrediction?.mainText?.text}
                      </span>
                      <span className="text-sm text-muted-foreground truncate">
                        {suggestion.placePrediction?.secondaryText?.text}
                      </span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}

/**
 * Parse Google Place address components into structured data
 *
 * For Belgian addresses (especially Brussels communes like Forest, Ixelles, etc.):
 * - `sublocality` contains the commune name (e.g., "Forest")
 * - `locality` contains the main city (e.g., "Bruxelles")
 * We prioritize sublocality for Belgian addresses to get the correct commune.
 */
function parseAddressComponents(place: google.maps.places.Place): AddressData {
  const components = place.addressComponents || []

  const getComponent = (type: string): string => {
    const component = components.find(c => c.types.includes(type))
    return component?.longText || ''
  }

  // Street: combine route + street_number
  const streetNumber = getComponent('street_number')
  const route = getComponent('route')
  // Also check for 'premise' for addresses without route
  const premise = getComponent('premise')

  let street = ''
  if (route) {
    street = `${route}${streetNumber ? ` ${streetNumber}` : ''}`
  } else if (premise) {
    street = `${premise}${streetNumber ? ` ${streetNumber}` : ''}`
  } else if (streetNumber) {
    street = streetNumber
  }

  // City: For Belgian addresses, prioritize sublocality (commune) over locality (main city)
  // This ensures "Forest" instead of "Bruxelles" for Brussels communes
  const sublocality = getComponent('sublocality') || getComponent('sublocality_level_1')
  const locality = getComponent('locality')
  const adminArea2 = getComponent('administrative_area_level_2')
  const postalTown = getComponent('postal_town')

  // Priority: sublocality > locality > postal_town > administrative_area_level_2
  let city = sublocality || locality || postalTown || adminArea2
  let postalCode = getComponent('postal_code')
  let country = getComponent('country')

  // FALLBACK: If components are missing, parse from formattedAddress
  // Belgian format: "Rue Marconi 8, 1190 Forest, Belgique"
  // French format: "8 Rue Marconi, 75001 Paris, France"
  const formattedAddr = place.formattedAddress || ''
  if (formattedAddr && (!street || !postalCode || !city)) {
    // Try Belgian/European format: "Street Number, PostalCode City, Country"
    const belgianMatch = formattedAddr.match(/^(.+?),\s*(\d{4,5})\s+([^,]+),\s*(.+)$/)

    if (belgianMatch) {
      const [, parsedStreet, parsedPostal, parsedCity, parsedCountry] = belgianMatch

      // Only use fallback for empty fields
      if (!street && parsedStreet) street = parsedStreet.trim()
      if (!postalCode && parsedPostal) postalCode = parsedPostal
      if (!city && parsedCity) city = parsedCity.trim()
      if (!country && parsedCountry) country = parsedCountry.trim()
    }
  }

  const result = {
    street: street.trim(),
    postalCode: postalCode,
    city: city,
    country: country,
    latitude: place.location?.lat() || 0,
    longitude: place.location?.lng() || 0,
    placeId: place.id || '',
    formattedAddress: place.formattedAddress || ''
  }

  console.log('🏠 [AUTOCOMPLETE] parseAddressComponents result:', result)

  return result
}
