"use client"

import React from "react"
import { Badge } from "@/components/ui/badge"
import { BuildingInfoCard } from "@/components/ui/building-info-card"
import { BuildingContactCardV3 } from "@/components/ui/building-contact-card-v3"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import type { User as UserType, Contact } from "@/lib/services/core/service-types"
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

interface BuildingConfirmationStepProps {
  buildingInfo: BuildingInfo
  buildingManagers: UserType[]
  buildingContacts: { [contactType: string]: Contact[] }
  lots: Lot[]
  existingLots?: Array<{
    id: string
    reference: string
    floor: string
    door_number: string
    description: string
    category: LotCategory
  }>
  lotContactAssignments: { [lotId: string]: { [contactType: string]: Contact[] } }
  assignedManagers: { [lotId: string]: UserType[] }
}

/**
 * Building Confirmation Step - Read-only summary using reusable components
 *
 * ✨ V2 VERSION - Component Reuse Strategy
 *
 * Uses the same components as the edit steps but in read-only mode:
 * - BuildingInfoCard (readOnly)
 * - BuildingContactCardV3 (readOnly)
 * - LotContactCardV4 (readOnly + forced expansion)
 *
 * Benefits:
 * ✅ Code reuse across wizard steps
 * ✅ Consistent styling and layout
 * ✅ Single source of truth for UI logic
 * ✅ Easier maintenance
 * ✅ ~350 lines reduced to ~80 lines
 */
export function BuildingConfirmationStep({
  buildingInfo,
  buildingManagers,
  buildingContacts,
  lots,
  existingLots = [],
  lotContactAssignments,
  assignedManagers
}: BuildingConfirmationStepProps) {
  // State to manage lot expansion (collapsed by default in confirmation)
  // Include both new lots and existing lots
  const [expandedLots, setExpandedLots] = React.useState<{ [key: string]: boolean }>(
    () => {
      const newLotsEntries = lots.map(lot => [lot.id, false])
      const existingLotsEntries = existingLots.map(lot => [lot.id, false])
      return Object.fromEntries([...newLotsEntries, ...existingLotsEntries])
    }
  )

  // Toggle lot expansion
  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots(prev => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  // Helper functions to extract contacts by type
  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  const getAssignedManagers = (lotId: string): UserType[] => {
    return assignedManagers[lotId] || []
  }

  // Map building contacts from object to arrays
  const providers = buildingContacts['provider'] || []
  const owners = buildingContacts['owner'] || []
  const others = buildingContacts['other'] || []

  return (
    <div className="space-y-3 @container">
      {/* Building Information Card - Read-only mode */}
      <BuildingInfoCard
        name={buildingInfo.name}
        address={buildingInfo.address}
        postalCode={buildingInfo.postalCode}
        city={buildingInfo.city}
        country={buildingInfo.country}
        description={buildingInfo.description}
        readOnly={true}
      />

      {/* Building Contact Card V3 - Read-only mode */}
      <BuildingContactCardV3
        buildingName={buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
        buildingAddress={`${buildingInfo.address}, ${buildingInfo.city}${buildingInfo.postalCode ? ` - ${buildingInfo.postalCode}` : ''}`}
        buildingManagers={buildingManagers}
        providers={providers}
        owners={owners}
        others={others}
        readOnly={true}
      />

      {/* Lots Section - Show both existing and new lots */}
      {(existingLots.length > 0 || lots.length > 0) && (
        <div className="space-y-3">
          {/* Existing Lots */}
          {existingLots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-gray-700">
                  Lots existants dans l'immeuble
                </h3>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-gray-100 text-gray-700">
                  {existingLots.length}
                </Badge>
              </div>

              {/* Grid layout: 1 col mobile, 2 col tablet, 3 col desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {existingLots.map((lot, index) => {
                  const isExpanded = expandedLots[lot.id] || false

                  return (
                    <div
                      key={lot.id}
                      className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}
                    >
                      <LotContactCardV4
                        lotNumber={index + 1}
                        lotReference={lot.reference}
                        lotCategory={lot.category}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleLotExpansion(lot.id)}
                        lotManagers={[]} // Existing lots don't have managers in this context
                        tenants={[]}
                        providers={[]}
                        owners={[]}
                        others={[]}
                        readOnly={true}
                        isExisting={true} // NEW: Mark as existing lot
                        floor={lot.floor}
                        doorNumber={lot.door_number}
                        description={lot.description}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* New Lots being created */}
          {lots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-gray-700">
                  {existingLots.length > 0 ? "Nouveaux lots ajoutés" : "Lots"}
                </h3>
                <Badge variant="secondary" className="text-xs px-1.5 py-0 bg-green-100 text-green-700">
                  {lots.length}
                </Badge>
              </div>

              {/* Grid layout: 1 col mobile, 2 col tablet, 3 col desktop */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {lots.map((lot, index) => {
                  const isExpanded = expandedLots[lot.id] || false
                  const lotNumber = index + 1 // Order of creation: first created = #1
                  const lotManagers = getAssignedManagers(lot.id)
                  const tenants = getLotContactsByType(lot.id, 'tenant')
                  const lotProviders = getLotContactsByType(lot.id, 'provider')
                  const lotOwners = getLotContactsByType(lot.id, 'owner')
                  const lotOthers = getLotContactsByType(lot.id, 'other')

                  return (
                    <div
                      key={lot.id}
                      className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}
                    >
                      <LotContactCardV4
                        lotNumber={lotNumber}
                        lotReference={lot.reference}
                        lotCategory={lot.category}
                        isExpanded={isExpanded}
                        onToggleExpand={() => toggleLotExpansion(lot.id)}
                        lotManagers={lotManagers}
                        tenants={tenants}
                        providers={lotProviders}
                        owners={lotOwners}
                        others={lotOthers}
                        buildingManagers={buildingManagers}
                        buildingProviders={providers}
                        buildingOwners={owners}
                        buildingOthers={others}
                        readOnly={true} // Show inherited contacts
                        isExisting={false} // NEW: Mark as new lot
                        floor={lot.floor}
                        doorNumber={lot.doorNumber}
                        description={lot.description}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
