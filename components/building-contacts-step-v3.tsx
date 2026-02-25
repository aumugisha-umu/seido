"use client"

import React, { useState } from "react"
import { BuildingContactCardV3 } from "@/components/ui/building-contact-card-v3"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import { ContactSelectorRef } from "@/components/contact-selector"
import type { User as UserType, Team } from "@/lib/services/core/service-types"
import { LotCategory, getLotCategoryConfig } from "@/lib/lot-types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Users, Paperclip, ChevronDown, ChevronUp } from "lucide-react"
import { DocumentChecklistGeneric } from "@/components/documents/document-checklist-generic"
import type { UsePropertyDocumentUploadReturn } from "@/hooks/use-property-document-upload"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Simplified Contact interface matching ContactSelector and child components
interface Contact {
  id: string
  name: string
  email: string
  type: string
  phone?: string
  speciality?: string
}

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
  buildingManagers: UserType[]
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
  /** Optional: building document upload hook (enables Documents sub-tab) */
  buildingDocUpload?: UsePropertyDocumentUploadReturn
  /** Optional: per-lot document upload hooks (map of lotId → hook return) */
  lotDocUploads?: { [lotId: string]: UsePropertyDocumentUploadReturn }
}

/**
 * BuildingContactsStepV3 — Contacts & Documents merged step
 *
 * When buildingDocUpload is provided, renders sub-tabs:
 * - Tab "Contacts": existing contact assignment UI
 * - Tab "Documents": building-level + per-lot document checklists
 *
 * When buildingDocUpload is NOT provided (backwards compat), renders contacts only.
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
  toggleLotExpansion,
  buildingDocUpload,
  lotDocUploads
}: BuildingContactsStepV3Props) {
  const providers = buildingContacts['provider'] || []
  const owners = buildingContacts['owner'] || []
  const others = buildingContacts['other'] || []

  // Track expanded lots in documents tab separately
  const [expandedDocLots, setExpandedDocLots] = useState<{ [key: string]: boolean }>({})

  const toggleDocLotExpansion = (lotId: string) => {
    setExpandedDocLots(prev => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  // Contacts content (extracted to reuse with/without tabs)
  const contactsContent = (
    <div className="space-y-3 @container">
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
          contactSelectorRef.current?.openContactModal(contactType)
        }}
        onRemoveContact={(contactId, contactType) => {
          handleBuildingContactRemove(contactId, contactType)
        }}
      />

      {lots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-gray-700">
              Contacts spécifiques aux lots
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lots.map((lot, index) => {
              const isExpanded = expandedLots[lot.id] || false
              const lotNumber = lots.length - index
              const lotManagers = getAssignedManagers(lot.id)
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
                    onAddLotManager={() => openManagerModal(lot.id)}
                    onRemoveLotManager={(managerId) => removeManagerFromLot(lot.id, managerId)}
                    providers={lotProviders}
                    owners={lotOwners}
                    others={lotOthers}
                    onAddContact={(contactType) => {
                      contactSelectorRef.current?.openContactModal(contactType, lot.id)
                    }}
                    onRemoveContact={(contactId, contactType) => {
                      removeContactFromLot(lot.id, contactType, contactId)
                    }}
                    buildingManagers={buildingManagers}
                    buildingProviders={providers}
                    buildingOwners={owners}
                    buildingOthers={others}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )

  // Documents content (building + per-lot)
  const documentsContent = buildingDocUpload ? (
    <div className="space-y-6">
      {/* Building-level documents */}
      <DocumentChecklistGeneric
        title={`Documents de l'immeuble — ${buildingInfo.name || 'Immeuble'}`}
        slots={buildingDocUpload.slots}
        onAddFilesToSlot={buildingDocUpload.addFilesToSlot}
        onRemoveFileFromSlot={buildingDocUpload.removeFileFromSlot}
        progress={buildingDocUpload.progress}
        missingRecommendedTypes={buildingDocUpload.missingRecommendedTypes}
        isUploading={buildingDocUpload.isUploading}
        onSetSlotExpiryDate={buildingDocUpload.setSlotExpiryDate}
      />

      {/* Per-lot documents */}
      {lots.length > 0 && lotDocUploads && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-1">
            <h3 className="text-sm font-semibold text-gray-700">
              Documents spécifiques aux lots
            </h3>
            <span className="text-xs text-muted-foreground">
              ({lots.length} lot{lots.length > 1 ? 's' : ''})
            </span>
          </div>

          <div className="space-y-3">
            {lots.map((lot, index) => {
              const lotNumber = lots.length - index
              const lotUpload = lotDocUploads[lot.id]
              if (!lotUpload) return null

              const isExpanded = expandedDocLots[lot.id] || false
              const categoryConfig = getLotCategoryConfig(lot.category)
              const hasFiles = lotUpload.hasFiles
              const progressPct = lotUpload.progress.percentage

              return (
                <div
                  key={lot.id}
                  className="border rounded-lg bg-white overflow-hidden"
                >
                  {/* Lot header — clickable accordion */}
                  <button
                    type="button"
                    onClick={() => toggleDocLotExpansion(lot.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-lg text-sm font-bold",
                      "bg-blue-100 text-blue-700"
                    )}>
                      #{lotNumber}
                    </div>
                    <div className="flex-1 text-left">
                      <span className="font-medium text-sm">{lot.reference}</span>
                      <Badge variant="outline" className="ml-2 text-xs">
                        {categoryConfig.label}
                      </Badge>
                    </div>
                    {hasFiles && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        {progressPct}%
                      </Badge>
                    )}
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {/* Expanded: document checklist */}
                  {isExpanded && (
                    <div className="px-4 pb-4 border-t">
                      <DocumentChecklistGeneric
                        title={`Documents — ${lot.reference}`}
                        slots={lotUpload.slots}
                        onAddFilesToSlot={lotUpload.addFilesToSlot}
                        onRemoveFileFromSlot={lotUpload.removeFileFromSlot}
                        progress={lotUpload.progress}
                        missingRecommendedTypes={lotUpload.missingRecommendedTypes}
                        isUploading={lotUpload.isUploading}
                        onSetSlotExpiryDate={lotUpload.setSlotExpiryDate}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  ) : null

  // If no document upload provided, render contacts only (backwards compat)
  if (!buildingDocUpload) {
    return contactsContent
  }

  // Render with sub-tabs
  return (
    <div className="space-y-4">
      <Tabs defaultValue="contacts" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <Paperclip className="w-4 h-4" />
            <span>Documents</span>
            {buildingDocUpload.hasFiles && (
              <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 ml-1">
                {buildingDocUpload.progress.percentage}%
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="mt-4">
          {contactsContent}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          {documentsContent}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default BuildingContactsStepV3
