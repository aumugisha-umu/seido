"use client"

import React from "react"
import { BuildingInfoCard } from "@/components/ui/building-info-card"
import { BuildingContactCardV3 } from "@/components/ui/building-contact-card-v3"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import ContactSelector, { ContactSelectorRef } from "@/components/contact-selector"
import type { User as UserType, Team, Contact } from "@/lib/services/core/service-types"
import { LotCategory } from "@/lib/lot-types"

interface BuildingInfo {
  name: string
  address: string
  postalCode: string
  city: string
  country: string
  description: string
}

interface Lot {
  id: string
  reference: string
  floor: string
  doorNumber: string
  description: string
  category: LotCategory
}

interface BuildingContactsStepV3Props {
  buildingInfo: BuildingInfo
  teamManagers: UserType[]
  buildingManagers: UserType[] // Tous les gestionnaires de l'immeuble (minimum 1 requis)
  userProfile: {
    id: string
    email: string
    name: string
    role: string
  }
  userTeam: Team
  lots: Lot[]
  expandedLots: { [key: string]: boolean }
  buildingContacts: { [contactType: string]: Contact[] }
  lotContactAssignments: { [lotId: string]: { [contactType: string]: Contact[] } }
  assignedManagers: { [key: string]: UserType[] }
  contactSelectorRef: React.RefObject<ContactSelectorRef>
  handleContactAdd: (contact: Contact, contactType: string, context?: { lotId?: string }) => void
  handleBuildingContactRemove: (contactId: string, contactType: string) => void
  removeContactFromLot: (lotId: string, contactType: string, contactId: string) => void
  getLotContactsByType: (lotId: string, contactType: string) => Contact[]
  getAllLotContacts: (lotId: string) => Contact[]
  getAssignedManagers: (lotId: string) => UserType[]
  removeManagerFromLot: (lotId: string, managerId: string) => void
  openManagerModal: (lotId: string) => void
  openBuildingManagerModal: () => void
  removeBuildingManager: (managerId: string) => void
  toggleLotExpansion: (lotId: string) => void
}

/**
 * ✨ V3 VERSION - Using BuildingContactCardV3 and LotContactCardV4
 *
 * Key improvements over V2:
 * ✅ Uses standalone BuildingContactCardV3 (grid 2x2 on desktop)
 * ✅ Uses standalone LotContactCardV4 (accordion + visual indicators)
 * ✅ Consistent design across creation wizard and detail pages
 * ✅ Reduced code duplication
 * ✅ Easier to maintain and update
 *
 * Architecture:
 * - Building contacts: V3 card with horizontal grid on desktop
 * - Lot contacts: V4 card with accordion + colored badges
 * - All business logic preserved from V2
 */
export function BuildingContactsStepV3({
  buildingInfo,
  buildingManagers,
  lots,
  expandedLots,
  buildingContacts,
  lotContactAssignments,
  assignedManagers,
  contactSelectorRef,
  handleContactAdd,
  handleBuildingContactRemove,
  removeContactFromLot,
  getLotContactsByType,
  getAssignedManagers,
  removeManagerFromLot,
  openManagerModal,
  openBuildingManagerModal,
  removeBuildingManager,
  toggleLotExpansion
}: BuildingContactsStepV3Props) {
  // Map building contacts from object to arrays
  const providers = buildingContacts['provider'] || []
  const owners = buildingContacts['owner'] || []
  const others = buildingContacts['other'] || []

  return (
    <div className="space-y-3 @container">
      {/* Building Contact Card V3 */}
      <BuildingContactCardV3
        buildingName={buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
        buildingAddress={`${buildingInfo.address}, ${buildingInfo.city}${buildingInfo.postalCode ? ` - ${buildingInfo.postalCode}` : ''}`}
        buildingManagers={buildingManagers}
        onAddManager={openBuildingManagerModal}
        onRemoveManager={removeBuildingManager}
        providers={providers}
        owners={owners}
        others={others}
        onAddContact={(contactType) => {
          // Open contact selector modal for building (no lotId)
          contactSelectorRef.current?.openContactModal(contactType)
        }}
        onRemoveContact={(contactId, contactType) => {
          handleBuildingContactRemove(contactId, contactType)
        }}
      />

      {/* Lot Contact Cards V4 */}
      {lots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-gray-700">
              Contacts spécifiques aux lots 
            </h3>
          </div>

          {lots.map((lot, index) => {
            const isExpanded = expandedLots[lot.id] || false
            const lotNumber = lots.length - index
            const lotManagers = getAssignedManagers(lot.id)
            const tenants = getLotContactsByType(lot.id, 'tenant')
            const lotProviders = getLotContactsByType(lot.id, 'provider')
            const lotOwners = getLotContactsByType(lot.id, 'owner')
            const lotOthers = getLotContactsByType(lot.id, 'other')

            return (
              <LotContactCardV4
                key={lot.id}
                lotNumber={lotNumber}
                lotReference={lot.reference}
                lotCategory={lot.category}
                isExpanded={isExpanded}
                onToggleExpand={() => toggleLotExpansion(lot.id)}
                lotManagers={lotManagers}
                onAddLotManager={() => openManagerModal(lot.id)}
                onRemoveLotManager={(managerId) => removeManagerFromLot(lot.id, managerId)}
                tenants={tenants}
                providers={lotProviders}
                owners={lotOwners}
                others={lotOthers}
                onAddContact={(contactType) => {
                  // Open contact selector modal for this lot
                  contactSelectorRef.current?.openContactModal(contactType, lot.id)
                }}
                onRemoveContact={(contactId, contactType) => {
                  removeContactFromLot(lot.id, contactType, contactId)
                }}
                buildingManagersCount={buildingManagers.length}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

export default BuildingContactsStepV3
