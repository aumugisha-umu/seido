'use client'

/**
 * InterventionModalHeader
 * Standard header for intervention modals
 *
 * Copied directly from programming-modal-FINAL.tsx for consistency
 */

import { DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { X, Calendar, User, Building2, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InterventionData } from './types'
import type { LucideIcon } from 'lucide-react'

interface InterventionModalHeaderProps {
  // Title
  title: string
  icon?: LucideIcon

  // Intervention data
  intervention?: InterventionData

  // Additional content (e.g., manager message)
  summaryAdditionalContent?: React.ReactNode

  // Close button
  onClose?: () => void
  showCloseButton?: boolean

  // Styling
  sticky?: boolean
  className?: string
}

// Helper functions (copied from programming-modal)
const getPriorityColor = (priority: string) => {
  const p = priority?.toLowerCase() || 'normale'
  if (p === 'urgente') return 'bg-red-100 text-red-800 border-red-200'
  if (p === 'haute') return 'bg-orange-100 text-orange-800 border-orange-200'
  if (p === 'normale') return 'bg-blue-100 text-blue-800 border-blue-200'
  return 'bg-slate-100 text-slate-800 border-slate-200'
}

const getPriorityLabel = (priority: string) => {
  const p = priority?.toLowerCase() || 'normale'
  if (p === 'urgente') return 'Urgente'
  if (p === 'haute') return 'Haute'
  if (p === 'normale') return 'Normale'
  return priority
}

const getInterventionLocationText = (intervention: InterventionData): string => {
  // Debug logging
  console.log('🔍 [LOCATION-DEBUG] Intervention status:', intervention.status)
  console.log('🔍 [LOCATION-DEBUG] Building:', intervention.building)
  console.log('🔍 [LOCATION-DEBUG] Lot:', intervention.lot)

  // Helper to format country enum to display name
  const formatCountry = (country: string | undefined): string => {
    if (!country) return ''
    const countryMap: Record<string, string> = {
      'france': 'France',
      'belgique': 'Belgique',
      'allemagne': 'Allemagne',
      'pays-bas': 'Pays-Bas',
      'suisse': 'Suisse',
      'luxembourg': 'Luxembourg',
      'autre': 'Autre'
    }
    return countryMap[country.toLowerCase()] || country
  }

  // Determine if we should show simplified location (for quote stages)
  const isQuoteStage = intervention.status === 'demande_de_devis'

  // Case 1: lot object is populated
  if (intervention.lot && typeof intervention.lot === 'object') {
    const lot = intervention.lot
    const building = intervention.building

    if (isQuoteStage) {
      // Show postal code, city, country for quote stage
      // Priority: lot's own location fields, fallback to building's
      const postal = lot.postal_code || building?.postal_code || ''
      const city = lot.city || building?.city || ''
      const country = lot.country || building?.country || ''

      const locationParts = [postal, city, formatCountry(country)].filter(Boolean)
      console.log('🔍 [LOCATION-DEBUG] Location parts:', locationParts)

      if (locationParts.length > 0) {
        return `${lot.reference} - ${locationParts.join(', ')}`
      }
      return lot.reference
    } else {
      // Show full details for later stages (planifiée, en_cours, etc.)
      const buildingName = building?.name || ''
      return buildingName
        ? `${lot.reference} - ${buildingName}`
        : lot.reference
    }
  }

  // Case 2: building object is populated (no lot)
  if (intervention.building && typeof intervention.building === 'object') {
    const building = intervention.building

    if (isQuoteStage) {
      // Show postal code, city, country for quote stage
      const locationParts = [
        building.postal_code,
        building.city,
        formatCountry(building.country)
      ].filter(Boolean)

      console.log('🔍 [LOCATION-DEBUG] Building location parts:', locationParts)

      if (locationParts.length > 0) {
        return locationParts.join(', ')
      }
      return building.name
    } else {
      // Show full name for later stages
      return building.name
    }
  }

  // Case 3: Only IDs available (fallback)
  if (intervention.lot_id) {
    return `Lot ${intervention.lot_id}`
  }
  if (intervention.building_id) {
    return `Immeuble ${intervention.building_id}`
  }

  console.log('⚠️ [LOCATION-DEBUG] No location data available')
  return 'Localisation non spécifiée'
}

const getInterventionLocationIcon = (intervention: InterventionData) => {
  return intervention.building ? "building" : "lot"
}

export function InterventionModalHeader({
  title,
  icon: Icon,
  intervention,
  summaryAdditionalContent,
  onClose,
  showCloseButton = true,
  sticky = true,
  className
}: InterventionModalHeaderProps) {

  return (
    <div className={cn(
      'flex-shrink-0 bg-white border-b border-slate-200',
      sticky && 'sticky top-0 z-10',
      className
    )}>
      {/* Dialog Header with Title */}
      <DialogHeader className="p-6 pb-4 relative">
        <DialogTitle className="text-2xl font-semibold text-slate-900 flex items-center gap-3">
          {Icon && <Icon className="h-6 w-6 text-blue-600" />}
          {title}
        </DialogTitle>

        {/* Close Button */}
        {showCloseButton && onClose && (
          <button
            onClick={onClose}
            className="absolute top-6 right-6 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>
        )}
      </DialogHeader>

      {/* Intervention Summary - EXACT COPY from programming-modal-FINAL.tsx */}
      {intervention && (
        <div className="px-6 pb-4">
          <div className="text-center">
            {/* Titre et badges - Layout horizontal */}
            <div className="flex items-center justify-center space-x-3 mb-2 flex-wrap">
              <h2 className="text-lg font-bold text-slate-900 truncate">
                {intervention?.title || "Sans titre"}
              </h2>

              {/* Badge de statut */}
              <Badge
                className={`flex items-center space-x-1 font-medium border ${
                  (() => {
                    const status = (intervention?.status || '').toLowerCase()
                    if (status === 'approuvee' || status === 'approuvée') return 'bg-emerald-100 text-emerald-800 border-emerald-200'
                    if (status === 'planifiee' || status === 'planifiée' || status === 'planification') return 'bg-blue-100 text-blue-800 border-blue-200'
                    if (status === 'en cours') return 'bg-blue-100 text-blue-800 border-blue-200'
                    return 'bg-amber-100 text-amber-800 border-amber-200'
                  })()
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  (() => {
                    const status = (intervention?.status || '').toLowerCase()
                    if (status === 'approuvee' || status === 'approuvée') return 'bg-emerald-500'
                    if (status === 'planifiee' || status === 'planifiée' || status === 'planification') return 'bg-blue-500'
                    if (status === 'en cours') return 'bg-blue-600'
                    return 'bg-amber-500'
                  })()
                }`} />
                <span>{intervention?.status || 'Demande'}</span>
              </Badge>

              {/* Badge d'urgence */}
              <Badge
                className={`flex items-center space-x-1 font-medium border ${
                  getPriorityColor(intervention?.priority || intervention?.urgency || 'normale')
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${
                  (intervention?.priority || intervention?.urgency) === "urgente" ? "bg-red-500" :
                  (intervention?.priority || intervention?.urgency) === "haute" ? "bg-orange-500" :
                  (intervention?.priority || intervention?.urgency) === "normale" ? "bg-blue-500" :
                  "bg-slate-500"
                }`} />
                <span>{getPriorityLabel(intervention?.priority || intervention?.urgency || 'normale')}</span>
              </Badge>
            </div>

            {/* Informations contextuelles */}
            <div className="flex items-center justify-center space-x-4 text-sm text-slate-600 flex-wrap gap-2">
              {/* Location */}
              <div className="flex items-center space-x-1">
                {intervention && getInterventionLocationIcon(intervention) === "building" ? (
                  <Building2 className="h-3 w-3" />
                ) : (
                  <MapPin className="h-3 w-3" />
                )}
                <span className="truncate max-w-xs">
                  {intervention ? getInterventionLocationText(intervention) : 'Localisation non spécifiée'}
                </span>
              </div>

              {/* Créé par */}
              {(intervention?.creator?.name || intervention?.created_by) && (
                <div className="flex items-center space-x-1">
                  <User className="h-3 w-3" />
                  <span>Créée par : {intervention.creator?.name || intervention.created_by}</span>
                </div>
              )}

              {/* Créé le */}
              {intervention?.created_at && (
                <div className="flex items-center space-x-1">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Créé le : {new Date(intervention.created_at).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                </div>
              )}
            </div>

            {/* Additional content (e.g., manager message) */}
            {summaryAdditionalContent && (
              <div className="mt-4">
                {summaryAdditionalContent}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
