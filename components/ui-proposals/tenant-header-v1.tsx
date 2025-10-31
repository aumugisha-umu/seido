'use client'

/**
 * VERSION 1: HORIZONTAL ULTRA-COMPACT
 *
 * Concept: Maximiser la compacité en alignant tout horizontalement
 * - Layout: Flex row avec icon, infos inline (séparateurs), button à droite
 * - Hauteur cible: ~60-70px (réduction de 55%)
 * - Hiérarchie: Lot reference bold, building name medium, adresse subtile
 *
 * UX Tradeoffs:
 * ✅ Hauteur minimale = plus d'espace pour le contenu principal
 * ✅ Scan horizontal rapide (lecture naturelle gauche → droite)
 * ✅ CTA visible en fin de ligne (position naturelle d'action)
 * ⚠️ Sur mobile, stack vertical automatique (perd l'avantage horizontal)
 * ⚠️ Adresse longue peut forcer wrapping
 */

import React from 'react'
import { Home, MapPin } from 'lucide-react'
import { PendingActionsBadge } from '@/components/pending-actions-badge'

interface TenantHeaderV1Props {
  lotReference: string
  buildingName?: string
  street?: string
  floor?: number
  apartmentNumber?: string
  postalCode?: string
  city?: string
  pendingActionsCount?: number
  onPendingActionsClick?: () => void
}

const TenantHeaderV1 = ({
  lotReference,
  buildingName,
  street,
  floor,
  apartmentNumber,
  postalCode,
  city,
  pendingActionsCount = 0,
  onPendingActionsClick
}: TenantHeaderV1Props) => {
  // Construction de l'adresse complète (inline)
  const buildAddressString = () => {
    const parts: string[] = []

    if (street) {
      let streetPart = street
      if (floor) streetPart += `, ${floor}`
      if (apartmentNumber) streetPart += `, Porte ${apartmentNumber}`
      parts.push(streetPart)
    }

    if (postalCode || city) {
      parts.push(`${postalCode || ''} ${city || ''}`.trim())
    }

    return parts.join(' • ')
  }

  const addressString = buildAddressString()

  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-sm transition-shadow hover:shadow-md">
      {/* Layout horizontal compact avec padding réduit */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">

        {/* Section Info: Icon + Texte inline */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Icon avec couleur primaire */}
          <Home className="w-5 h-5 text-blue-600 flex-shrink-0" aria-hidden="true" />

          {/* Infos en ligne avec séparateurs visuels */}
          <div className="flex flex-wrap items-baseline gap-2 min-w-0">
            {/* Lot reference - Niveau 1 */}
            <h1 className="text-xl font-bold text-slate-900 whitespace-nowrap">
              {lotReference}
            </h1>

            {/* Building name - Niveau 2 */}
            {buildingName && (
              <>
                <span className="text-slate-400" aria-hidden="true">•</span>
                <span className="text-base font-medium text-slate-700">
                  {buildingName}
                </span>
              </>
            )}

            {/* Adresse - Niveau 3 */}
            {addressString && (
              <>
                <span className="hidden md:inline text-slate-300" aria-hidden="true">|</span>
                <span className="text-sm text-slate-500 flex items-center gap-1.5 truncate">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" aria-hidden="true" />
                  {addressString}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Badge Actions en attente - Position naturelle d'action (droite) */}
        {pendingActionsCount > 0 && onPendingActionsClick && (
          <PendingActionsBadge
            count={pendingActionsCount}
            onClick={onPendingActionsClick}
            userRole="locataire"
            isAlert={true}
          />
        )}
      </div>
    </div>
  )
}

export default TenantHeaderV1
