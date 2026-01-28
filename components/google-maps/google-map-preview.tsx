'use client'

import { Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps'
import { ExternalLink } from 'lucide-react'
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
 * Google Map Preview Component
 *
 * Displays an interactive map with a custom SEIDO-styled marker.
 * Requires a Vector Map ID configured in Google Cloud Console.
 * The Map component handles its own loading state internally.
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
