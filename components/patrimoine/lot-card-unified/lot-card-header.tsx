"use client"

import { Home, Building2, Users, Check, X, MapPin } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { getLotCategoryConfig, type LotCategory } from "@/lib/lot-types"
import type { LotCardHeaderProps, LotCardBadgesProps, LotData, LotContact, BaseContact } from "./types"

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform lot_contacts by role for display
 */
export function transformContactsByRole(lotContacts: LotContact[]) {
  const managers: BaseContact[] = []
  const tenants: BaseContact[] = []
  const providers: BaseContact[] = []
  const owners: BaseContact[] = []
  const others: BaseContact[] = []

  lotContacts.forEach((contact) => {
    const transformedContact: BaseContact = {
      id: contact.user.id,
      name: contact.user.name,
      email: contact.user.email,
      phone: contact.user.phone,
      type: contact.user.role
    }

    switch (contact.user.role) {
      case 'gestionnaire':
        managers.push(transformedContact)
        break
      case 'locataire':
        tenants.push(transformedContact)
        break
      case 'prestataire':
        providers.push(transformedContact)
        break
      case 'proprietaire':
        owners.push(transformedContact)
        break
      default:
        others.push(transformedContact)
    }
  })

  return { managers, tenants, providers, owners, others }
}

/**
 * Calculate total contacts count (lot_contacts + contract_contacts)
 */
export function countContacts(lot: LotData): number {
  const lotContactsCount = lot.lot_contacts?.length || 0
  const contractContactsCount = lot.contracts?.reduce(
    (sum, contract) => sum + (contract.contacts?.length || 0), 0
  ) || 0
  return lotContactsCount + contractContactsCount
}

/**
 * Calculate occupancy status from various sources
 */
export function calculateOccupancy(lot: LotData): { isOccupied: boolean; tenantName: string | null } {
  const tenants = lot.lot_contacts?.filter(lc => lc.user?.role === 'locataire') || []
  const isOccupied = tenants.length > 0 || lot.has_active_tenants || lot.is_occupied || false
  const tenantName = tenants[0]?.user?.name || lot.tenant?.name || null
  return { isOccupied, tenantName }
}

/**
 * Format contacts for tooltip display
 */
function formatContactsForTooltip(managers: BaseContact[], tenants: BaseContact[], providers: BaseContact[], owners: BaseContact[], others: BaseContact[]) {
  const sections: Array<{ label: string; contacts: BaseContact[] }> = []

  if (managers.length > 0) sections.push({ label: 'Gestionnaires', contacts: managers })
  if (tenants.length > 0) sections.push({ label: 'Locataires', contacts: tenants })
  if (providers.length > 0) sections.push({ label: 'Prestataires', contacts: providers })
  if (owners.length > 0) sections.push({ label: 'Propriétaires', contacts: owners })
  if (others.length > 0) sections.push({ label: 'Autres', contacts: others })

  return sections
}

// ============================================================================
// LOT CARD HEADER
// ============================================================================

/**
 * Header section with icon, reference, and building name
 */
export function LotCardHeader({
  lot,
  showBuilding = false,
  isOccupied,
  contactsCount: _contactsCount
}: LotCardHeaderProps) {
  // Note: contactsCount is available in props for potential header badge display
  void _contactsCount

  return (
    <div className="flex items-center gap-3 min-w-0 flex-1">
      {/* Icon */}
      <div className={cn(
        "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
        isOccupied ? "bg-green-100" : "bg-amber-100"
      )}>
        <Home className={cn(
          "h-5 w-5",
          isOccupied ? "text-green-600" : "text-amber-600"
        )} />
      </div>

      {/* Reference and Building/Address */}
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-base text-slate-900 truncate">
          {lot.reference}
        </h3>

        {/* Building name + address OR lot's own address (for independent lots) */}
        {showBuilding && (
          lot.building?.name ? (
            // Lot linked to a building: show building name AND address from address_record
            (() => {
              const buildingAddressRecord = lot.building?.address_record
              let buildingAddressText: string | null = null

              if (buildingAddressRecord?.formatted_address) {
                buildingAddressText = buildingAddressRecord.formatted_address
              } else if (buildingAddressRecord?.street || buildingAddressRecord?.city) {
                const parts = [buildingAddressRecord.street, buildingAddressRecord.postal_code, buildingAddressRecord.city].filter(Boolean)
                buildingAddressText = parts.join(', ')
              }

              return (
                <div className="flex items-center text-xs text-slate-500 mt-0.5 gap-1">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="flex-shrink-0">{lot.building.name}</span>
                  {buildingAddressText && (
                    <>
                      <span className="text-slate-400">•</span>
                      <MapPin className="h-3 w-3 flex-shrink-0 text-slate-400" />
                      <span className="truncate text-slate-400">
                        {buildingAddressText}
                      </span>
                    </>
                  )}
                </div>
              )
            })()
          ) : (
            // Independent lot: show its own address
            (() => {
              // Priority: address_record.formatted_address > address_record fields > inline fields
              const addressRecord = lot.address_record
              let addressText: string | null = null

              if (addressRecord?.formatted_address) {
                addressText = addressRecord.formatted_address
              } else if (addressRecord?.street || addressRecord?.city) {
                const parts = [addressRecord.street, addressRecord.postal_code, addressRecord.city].filter(Boolean)
                addressText = parts.join(', ')
              }

              return addressText ? (
                <div className="flex items-center text-xs text-slate-500 mt-0.5">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">{addressText}</span>
                </div>
              ) : null
            })()
          )
        )}

        {/* Apartment number (if available) */}
        {lot.apartment_number && (
          <div className="text-xs text-slate-500 mt-0.5">
            N° {lot.apartment_number}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// LOT CARD BADGES
// ============================================================================

/**
 * Badges row: category, occupation, floor, contacts, interventions
 */
export function LotCardBadges({
  lot,
  isOccupied,
  contactsCount,
  interventionsCount = 0,
  showInterventionsCount = false,
  showDetails = false
}: LotCardBadgesProps) {
  const categoryConfig = lot.category
    ? getLotCategoryConfig(lot.category as LotCategory)
    : null

  const { managers, tenants, providers, owners, others } = transformContactsByRole(lot.lot_contacts || [])
  const tooltipSections = formatContactsForTooltip(managers, tenants, providers, owners, others)

  return (
    <div className="flex items-center flex-wrap gap-2 pt-2 mt-2 border-t border-slate-100">
      {/* Category badge */}
      {categoryConfig && (
        <Badge
          variant="outline"
          className={cn(
            categoryConfig.bgColor,
            categoryConfig.borderColor,
            categoryConfig.color,
            "text-xs h-5 px-2"
          )}
        >
          {categoryConfig.label}
        </Badge>
      )}

      {/* Occupation status badge */}
      <Badge
        variant="outline"
        className={cn(
          "text-xs h-5 px-2 flex items-center gap-1",
          isOccupied
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-gray-50 border-gray-200 text-gray-600"
        )}
      >
        {isOccupied ? (
          <>
            <Check className="h-3 w-3" />
            Occupé
          </>
        ) : (
          <>
            <X className="h-3 w-3" />
            Vacant
          </>
        )}
      </Badge>

      {/* Floor, Door, Surface, Rooms - only in detailed view */}
      {showDetails && (
        <>
          {lot.floor !== undefined && lot.floor !== null && (
            <span className="text-xs text-slate-600">
              Étage {lot.floor}
            </span>
          )}

          {lot.door_number && (
            <span className="text-xs text-slate-500">
              • Porte {lot.door_number}
            </span>
          )}

          {lot.surface_area && (
            <span className="text-xs text-slate-600">
              {lot.surface_area}m²
            </span>
          )}

          {lot.rooms && (
            <span className="text-xs text-slate-600">
              {lot.rooms} pièces
            </span>
          )}
        </>
      )}

      {/* Contacts count badge with tooltip */}
      {contactsCount > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className="text-xs h-5 px-2 bg-purple-50 text-purple-700 border-purple-200 cursor-help flex items-center gap-1"
            >
              <Users className="h-3 w-3" />
              {contactsCount}
            </Badge>
          </TooltipTrigger>
          <TooltipContent
            side="top"
            className="max-w-xs bg-white text-gray-900 border border-gray-200 shadow-lg p-3"
          >
            <div className="space-y-2">
              {tooltipSections.length > 0 ? (
                tooltipSections.map((section) => (
                  <div key={section.label}>
                    <div className="font-semibold text-xs text-gray-700 mb-1">
                      {section.label} ({section.contacts.length})
                    </div>
                    <div className="space-y-1 pl-2">
                      {section.contacts.map((contact) => (
                        <div key={contact.id} className="text-xs text-gray-600">
                          {contact.name}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-gray-500">
                  {contactsCount} contact(s) lié(s) aux contrats
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      ) : (
        <Badge
          variant="outline"
          className="text-xs h-5 px-2 bg-gray-50 text-gray-500 border-gray-200 flex items-center gap-1"
        >
          <Users className="h-3 w-3" />
          0
        </Badge>
      )}

    </div>
  )
}

export default LotCardHeader
