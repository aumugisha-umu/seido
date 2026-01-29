'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { ExternalLink, MapPin, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface GoogleMapPreviewProps {
  latitude: number
  longitude: number
  address?: string
  height?: number
  className?: string
  showOpenButton?: boolean
}

/**
 * Timeout in ms to wait for tiles to load before falling back to static map
 * If tiles don't load within this time, the Map ID is likely invalid
 */
const TILES_LOAD_TIMEOUT_MS = 3000

/**
 * Google Map Preview Component
 *
 * Displays an interactive map with a custom SEIDO-styled marker.
 * Requires a Vector Map ID configured in Google Cloud Console.
 * The Map component handles its own loading state internally.
 *
 * If Map ID is not configured or invalid, shows a static fallback
 * with a link to open in Google Maps.
 */
export function GoogleMapPreview({
  latitude,
  longitude,
  address,
  height = 200,
  className,
  showOpenButton = true
}: GoogleMapPreviewProps) {
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID
  const position = { lat: latitude, lng: longitude }
  const [mapError, setMapError] = useState(false)
  const [tilesLoaded, setTilesLoaded] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Set timeout to detect if tiles never load (invalid Map ID)
  useEffect(() => {
    if (mapId && !tilesLoaded && !mapError) {
      timeoutRef.current = setTimeout(() => {
        if (!tilesLoaded) {
          console.warn('🗺️ [GoogleMapPreview] Tiles timeout - Map ID may be invalid, falling back to static map')
          setMapError(true)
        }
      }, TILES_LOAD_TIMEOUT_MS)
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [mapId, tilesLoaded, mapError])

  // Handle successful tiles load
  const handleTilesLoaded = useCallback(() => {
    setTilesLoaded(true)
    setMapError(false)
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
  }, [])

  const openInGoogleMaps = () => {
    const query = address
      ? encodeURIComponent(address)
      : `${latitude},${longitude}`
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer'
    )
  }

  // Don't render if no valid coordinates
  if (!latitude || !longitude || (latitude === 0 && longitude === 0)) {
    return null
  }

  // Fallback: Static map image when Map ID is not configured or invalid
  const renderStaticMapFallback = () => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
    const staticMapUrl = apiKey
      ? `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=16&size=600x${height}&scale=2&markers=color:0x6366f1|${latitude},${longitude}&key=${apiKey}`
      : null

    return (
      <div
        style={{ width: '100%', height }}
        className="rounded-lg overflow-hidden border bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center"
      >
        {staticMapUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={staticMapUrl}
            alt={`Carte: ${address || `${latitude}, ${longitude}`}`}
            className="w-full h-full object-cover"
            onError={() => {
              // If static map also fails, show placeholder
              setMapError(true)
            }}
          />
        ) : (
          <>
            <MapPin className="h-8 w-8 text-indigo-400 mb-2" />
            <p className="text-sm text-indigo-600 font-medium">
              {address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`}
            </p>
            <p className="text-xs text-indigo-400 mt-1">
              Cliquez ci-dessous pour voir sur Google Maps
            </p>
          </>
        )}
      </div>
    )
  }

  // Show fallback if no Map ID configured or map failed to load
  if (!mapId || mapError) {
    return (
      <div className={cn('space-y-2', className)}>
        {!mapId && (
          <div className="flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
            <AlertTriangle className="h-3 w-3" />
            <span>Map ID non configuré - Aperçu statique</span>
          </div>
        )}
        {renderStaticMapFallback()}
        {showOpenButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openInGoogleMaps}
            className="w-full"
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir dans Google Maps
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div style={{ width: '100%', height }} className="rounded-lg overflow-hidden border bg-muted">
        <Map
          style={{ width: '100%', height: '100%' }}
          center={position}
          zoom={16}
          mapId={mapId}
          disableDefaultUI
          gestureHandling="cooperative"
          onTilesLoaded={handleTilesLoaded}
        >
          <AdvancedMarker position={position} title={address}>
            <Pin
              background="#6366f1"
              glyphColor="#ffffff"
              borderColor="#4f46e5"
            />
          </AdvancedMarker>
        </Map>
      </div>

      {showOpenButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={openInGoogleMaps}
          className="w-full"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ouvrir dans Google Maps
        </Button>
      )}
    </div>
  )
}
