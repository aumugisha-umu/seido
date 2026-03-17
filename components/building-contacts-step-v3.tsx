"use client"

import React from "react"
import { BuildingContactCardV3 } from "@/components/ui/building-contact-card-v3"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import { ContactSelectorRef } from "@/components/contact-selector"
import type { User as UserType, Team } from "@/lib/services/core/service-types"
import { LotCategory } from "@/lib/lot-types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Users, Paperclip } from "lucide-react"
import { PerLotDocumentAccordion } from "@/components/documents/per-lot-document-accordion"
import type { UsePropertyDocumentUploadReturn } from "@/hooks/use-property-document-upload"
import { Badge } from "@/components/ui/badge"

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
  /** Existing building documents (read-only display) */
  existingBuildingDocs?: Array<{ id: string; document_type: string; original_filename: string; uploaded_at: string; storage_path: string }>
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
  lotDocUploads,
  existingBuildingDocs
}: BuildingContactsStepV3Props) {
  const providers = buildingContacts['provider'] || []
  const others = buildingContacts['other'] || []

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
                    others={lotOthers}
                    onAddContact={(contactType) => {
                      contactSelectorRef.current?.openContactModal(contactType, lot.id)
                    }}
                    onRemoveContact={(contactId, contactType) => {
                      removeContactFromLot(lot.id, contactType, contactId)
                    }}
                    buildingManagers={buildingManagers}
                    buildingProviders={providers}
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

  // Documents content (building + per-lot via shared accordion)
  const documentsContent = buildingDocUpload ? (
    <PerLotDocumentAccordion
      lots={lots}
      lotDocUploads={lotDocUploads || {}}
      buildingDocUpload={buildingDocUpload}
      buildingName={buildingInfo.name || 'Immeuble'}
      existingBuildingDocs={existingBuildingDocs}
    />
  ) : null

  // If no document upload provided, render contacts only (backwards compat)
  if (!buildingDocUpload) {
    return contactsContent
  }

  // Render with sub-tabs
  return (
    <div className="space-y-4">
      <Tabs defaultValue="contacts" className="w-full">
        <div className="py-2">
          <TabsList className="grid w-full max-w-md grid-cols-2 mx-auto bg-slate-100 border border-slate-200 p-1 rounded-xl shadow-sm">
            <TabsTrigger
              value="contacts"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-white/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Users className="w-4 h-4" />
              <span>Contacts</span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground hover:bg-white/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
            >
              <Paperclip className="w-4 h-4" />
              <span>Documents</span>
              {buildingDocUpload.hasFiles && (
                <Badge variant="secondary" className="text-xs bg-green-100 text-green-700 ml-1">
                  {buildingDocUpload.progress.percentage}%
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

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
