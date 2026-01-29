'use client'

/**
 * LocalisationTab - Onglet dédié à l'affichage de la carte de localisation
 *
 * Affiche une carte Google Maps en grand format avec l'adresse de l'intervention.
 * Gère le fallback quand les coordonnées ne sont pas disponibles.
 */

import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { MapPin, ExternalLink, Building2, Home } from 'lucide-react'
import { GoogleMapsProvider } from '@/components/google-maps/google-maps-provider'
import { GoogleMapPreview } from '@/components/google-maps/google-map-preview'

export interface LocalisationTabProps {
  /** Latitude pour la carte */
  latitude?: number
  /** Longitude pour la carte */
  longitude?: number
  /** Adresse complète formatée */
  address?: string
  /** Nom de l'immeuble */
  buildingName?: string
  /** Référence du lot */
  lotReference?: string
  /** Classes CSS additionnelles */
  className?: string
}

/**
 * Ouvre l'adresse dans Google Maps
 */
const openInGoogleMaps = (address?: string, latitude?: number, longitude?: number) => {
  const query = address
    ? encodeURIComponent(address)
    : latitude && longitude
      ? `${latitude},${longitude}`
      : ''

  if (query) {
    window.open(
      `https://www.google.com/maps/search/?api=1&query=${query}`,
      '_blank',
      'noopener,noreferrer'
    )
  }
}

/**
 * Onglet Localisation avec carte Google Maps en grand format
 */
export const LocalisationTab = ({
  latitude,
  longitude,
  address,
  buildingName,
  lotReference,
  className
}: LocalisationTabProps) => {
  const hasCoordinates = latitude && longitude && !(latitude === 0 && longitude === 0)
  const hasAddress = address && address.trim() !== ''
  const hasLocation = hasCoordinates || hasAddress

  // Pas de données de localisation
  if (!hasLocation && !buildingName && !lotReference) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <MapPin className="h-12 w-12 text-muted-foreground/30 mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">
            Aucune information de localisation disponible
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardContent className="space-y-4">
        {/* Carte Google Maps en grand format */}
        {hasCoordinates ? (
          <GoogleMapsProvider>
            <GoogleMapPreview
              latitude={latitude!}
              longitude={longitude!}
              address={address}
              height={400}
              className="rounded-lg border border-border shadow-sm"
              showOpenButton={false}
            />
          </GoogleMapsProvider>
        ) : (
          // Fallback sans coordonnées
          <div className="flex flex-col items-center justify-center py-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border">
            <MapPin className="h-12 w-12 text-indigo-400 mb-4" aria-hidden="true" />
            <p className="text-sm text-indigo-600 font-medium mb-1">
              Localisation non géolocalisée
            </p>
            <p className="text-xs text-indigo-400">
              Les coordonnées GPS ne sont pas disponibles
            </p>
          </div>
        )}

        {/* Infos de localisation sous la carte */}
        <div className="space-y-3">
          {/* Immeuble et Lot */}
          {(buildingName || lotReference) && (
            <div className="flex items-center gap-3 text-sm flex-wrap">
              {buildingName && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="font-medium">{buildingName}</span>
                </div>
              )}
              {buildingName && lotReference && (
                <span className="text-muted-foreground">›</span>
              )}
              {lotReference && (
                <div className="flex items-center gap-1.5">
                  <Home className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span>Lot {lotReference}</span>
                </div>
              )}
            </div>
          )}

          {/* Adresse complète */}
          {hasAddress && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <span>{address}</span>
            </div>
          )}
        </div>

        {/* Bouton ouvrir dans Google Maps */}
        {hasLocation && (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => openInGoogleMaps(address, latitude, longitude)}
          >
            <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
            Ouvrir dans Google Maps
          </Button>
        )}
      </CardContent>
    </Card>
  )
}
