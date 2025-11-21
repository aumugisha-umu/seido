"use client"

import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Building, Users, Wrench, Home, UserCircle } from "lucide-react"
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
 * - Header ultra-compact: Badge + Nom + Badges colorés par type de contact
 * - Typographie: text-base pour le nom (plus lisible)
 * - Utilise ContactSection pour toutes les catégories de contacts
 * - Scrollable lists + sticky buttons
 * - Maximum readability avec indicateurs visuels colorés
 *
 * Key Features:
 * ✅ Badge "Immeuble" + Nom + Badges colorés par type (style identique aux lots)
 * ✅ Badges colorés: Gestionnaires (violet), Prestataires (vert), Propriétaires (orange), Autres (gris)
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
  onAddManager?: () => void
  onRemoveManager?: (managerId: string) => void

  // Building contacts by type
  providers: Contact[]
  owners: Contact[]
  others: Contact[]
  onAddContact?: (contactType: 'provider' | 'owner' | 'other') => void
  onRemoveContact?: (contactId: string, contactType: string) => void

  // Read-only mode (for confirmation view)
  readOnly?: boolean
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
  onRemoveContact,
  readOnly = false
}: BuildingContactCardV3Props) {
  return (
    <Card className="border-blue-300 shadow-md gap-0 py-0">
      {/* Header - Ultra Compact */}
      <CardHeader className="p-3 pb-2">
        <div className="flex items-center gap-2.5 overflow-hidden min-w-0">
          {/* Badge Immeuble - Icône uniquement */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex-shrink-0">
                <Badge
                  variant="default"
                  className="px-2 py-1.5 bg-blue-600 text-white flex items-center justify-center [&>svg]:!size-5"
                >
                  <Building className="w-5 h-5" />
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
                className="font-semibold text-base truncate text-slate-900 cursor-default block flex-shrink min-w-0"
                title={buildingName || buildingAddress}
              >
                {buildingName || buildingAddress}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{buildingName || buildingAddress}</p>
            </TooltipContent>
          </Tooltip>

          {/* Visual Indicators - Colored badges with icons (same as lots) */}
          <div className="flex items-center gap-1.5 flex-wrap flex-shrink-0">
            {buildingManagers.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs bg-purple-100 text-purple-700 border border-purple-300 font-medium px-2 py-0.5 cursor-help">
                    <Users className="w-3.5 h-3.5 mr-1" />
                    {buildingManagers.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Gestionnaires de l'immeuble</p></TooltipContent>
              </Tooltip>
            )}

            {providers.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 border border-green-300 font-medium px-2 py-0.5 cursor-help">
                    <Wrench className="w-3.5 h-3.5 mr-1" />
                    {providers.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Prestataires</p></TooltipContent>
              </Tooltip>
            )}

            {owners.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 border border-orange-300 font-medium px-2 py-0.5 cursor-help">
                    <Home className="w-3.5 h-3.5 mr-1" />
                    {owners.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Propriétaires</p></TooltipContent>
              </Tooltip>
            )}

            {others.length > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700 border border-gray-300 font-medium px-2 py-0.5 cursor-help">
                    <UserCircle className="w-3.5 h-3.5 mr-1" />
                    {others.length}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="top"><p className="text-xs">Autres contacts</p></TooltipContent>
              </Tooltip>
            )}
          </div>
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
            readOnly={readOnly}
            minRequired={1}
            customLabel="Gestionnaires de l'immeuble"
          />

          {/* Providers Section */}
          <ContactSection
            sectionType="providers"
            contacts={providers}
            onAddContact={onAddContact ? () => onAddContact('provider') : undefined}
            onRemoveContact={onRemoveContact ? (contactId) => onRemoveContact(contactId, 'provider') : undefined}
            readOnly={readOnly}
          />

          {/* Owners Section */}
          <ContactSection
            sectionType="owners"
            contacts={owners}
            onAddContact={onAddContact ? () => onAddContact('owner') : undefined}
            onRemoveContact={onRemoveContact ? (contactId) => onRemoveContact(contactId, 'owner') : undefined}
            readOnly={readOnly}
          />

          {/* Others Section */}
          <ContactSection
            sectionType="others"
            contacts={others}
            onAddContact={onAddContact ? () => onAddContact('other') : undefined}
            onRemoveContact={onRemoveContact ? (contactId) => onRemoveContact(contactId, 'other') : undefined}
            readOnly={readOnly}
          />
        </div>

        {!readOnly && (
          <p className="text-xs text-gray-500 leading-relaxed mt-2">
            Ces contacts seront disponibles au niveau des lots de cet immeuble
          </p>
        )}
      </CardContent>
    </Card>
  )
}

export default BuildingContactCardV3
