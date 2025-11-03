"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building } from "lucide-react"
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip"
import { ContactSection } from "@/components/ui/contact-section"
import type { User as UserType } from "@/lib/services/core/service-types"

// Simplified Contact interface matching ContactSelector
interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

/**
 * Version 3: Card Minimaliste avec ContactSection réutilisable
 *
 * Design Principles:
 * - Header ultra-compact: Badge + Nom + Compteur total
 * - Typographie: text-base pour le nom (plus lisible)
 * - Utilise ContactSection pour toutes les catégories de contacts
 * - Scrollable lists + sticky buttons
 * - Maximum readability avec moins d'elements visuels
 *
 * Key Features:
 * ✅ Badge "Immeuble" + Nom + Compteur TOTAL unique (minimaliste)
 * ✅ Grid horizontal 4 colonnes sur desktop
 * ✅ ContactSection réutilisable pour chaque type de contact
 * ✅ Scrollable après 3 contacts, bouton toujours visible
 * ✅ Typographie plus grande (text-base au lieu de text-sm)
 * ✅ Touch targets 44x44px minimum
 * ✅ Accessible: aria-labels, keyboard navigation
 */

interface BuildingContactCardV3Props {
  buildingName: string
  buildingAddress: string

  // Building managers (gestionnaires de l'immeuble)
  buildingManagers: UserType[]
  onAddManager: () => void
  onRemoveManager: (managerId: string) => void

  // Building contacts by type
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
  onAddContact: (contactType: 'provider' | 'owner' | 'other') => void
  onRemoveContact: (contactId: string, contactType: string) => void
}

export function BuildingContactCardV3({
  buildingName,
  buildingAddress,
  buildingManagers,
  onAddManager,
  onRemoveManager,
  providers,
  owners,
  others,
  onAddContact,
  onRemoveContact
}: BuildingContactCardV3Props) {
  return (
    <Card className="border-blue-300 shadow-md gap-0 py-0">
      {/* Header - Ultra Compact */}
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-3 overflow-hidden min-w-0">
          {/* Badge Immeuble - Icône uniquement */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0">
                <Badge
                  variant="default"
                  className="px-2 py-1 bg-blue-600 text-white flex items-center justify-center"
                >
                  <Building className="w-6 h-6" />
                </Badge>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Immeuble</p>
            </TooltipContent>
          </Tooltip>

          {/* Building Name - Larger text */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                className="font-semibold text-base truncate text-slate-900 cursor-default block flex-1 min-w-0"
                title={buildingName || buildingAddress}
              >
                {buildingName || buildingAddress}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{buildingName || buildingAddress}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>

      {/* Content - Always Visible with Horizontal Grid on Desktop */}
      <CardContent className="p-3 pt-0">
        {/* Responsive Grid: Vertical on mobile, 4 columns on desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-2">
          {/* Building Managers Section */}
          <ContactSection
            sectionType="managers"
            contacts={buildingManagers}
            onAddContact={onAddManager}
            onRemoveContact={onRemoveManager}
            minRequired={1}
            customLabel="Gestionnaires de l'immeuble"
          />

          {/* Providers Section */}
          <ContactSection
            sectionType="providers"
            contacts={providers}
            onAddContact={() => onAddContact('provider')}
            onRemoveContact={(contactId) => onRemoveContact(contactId, 'provider')}
          />

          {/* Owners Section */}
          <ContactSection
            sectionType="owners"
            contacts={owners}
            onAddContact={() => onAddContact('owner')}
            onRemoveContact={(contactId) => onRemoveContact(contactId, 'owner')}
          />

          {/* Others Section */}
          <ContactSection
            sectionType="others"
            contacts={others}
            onAddContact={() => onAddContact('other')}
            onRemoveContact={(contactId) => onRemoveContact(contactId, 'other')}
          />
        </div>

        <p className="text-xs text-gray-500 leading-relaxed mt-2">
          Ces contacts seront disponibles au niveau des lots de cet immeuble
        </p>
      </CardContent>
    </Card>
  )
}

export default BuildingContactCardV3
