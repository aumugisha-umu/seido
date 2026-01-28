'use client'

import { APIProvider } from '@vis.gl/react-google-maps'
import { ReactNode } from 'react'

interface GoogleMapsProviderProps {
  children: ReactNode
}

/**
 * Google Maps API Provider
 * Wraps components that need access to Google Maps APIs
 *
 * Configuration required in .env.local:
 * - NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: Your Google Maps API key
 * - NEXT_PUBLIC_GOOGLE_MAP_ID: Vector Map ID for AdvancedMarker support
 *
 * Usage:
 * <GoogleMapsProvider>
 *   <AddressAutocompleteInput />
 *   <GoogleMapPreview />
 * </GoogleMapsProvider>
 */
export function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

  if (!apiKey) {
    console.warn('🗺️ [GoogleMapsProvider] API key not configured - check NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local')
    return <>{children}</>
  }

  return (
    <APIProvider
      apiKey={apiKey}
      solutionChannel="SEIDO_REAL_ESTATE"
    >
      {children}
    </APIProvider>
  )
}
