"use client"

import React from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { BuildingContactCardV3 } from "@/components/ui/building-contact-card-v3"
import { LotContactCardV4 } from "@/components/ui/lot-contact-card-v4"
import { CheckCircle2, AlertTriangle, Paperclip, CalendarCheck, ChevronDown, ChevronRight } from "lucide-react"
import { ParticipantChip } from "@/components/interventions/shared/layout/participants-row"
import type { User as UserType, Contact } from "@/lib/services/core/service-types"
import type { GenericDocumentSlotState } from "@/components/documents/types"
import type { ScheduledInterventionData } from "@/components/contract/intervention-schedule-row"
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
  /** Building-level document slots (from usePropertyDocumentUpload) */
  buildingDocSlots?: GenericDocumentSlotState[]
  /** Per-lot document slots: Record<lotId, slots[]> */
  lotDocSlots?: Record<string, GenericDocumentSlotState[]>
  /** Building-level interventions (enabled ones) */
  buildingInterventions?: ScheduledInterventionData[]
  /** Per-lot interventions: Record<lotId, interventions[]> */
  lotInterventions?: Record<string, ScheduledInterventionData[]>
}

// ─── Collapsible summary sub-components ─────────────────────────────

const DocumentsSummary = ({ slots }: { slots: GenericDocumentSlotState[] }) => {
  const [expanded, setExpanded] = React.useState(false)
  const slotsWithFiles = slots.filter(s => s.files.length > 0)
  const missingRecommended = slots.filter(s => s.recommended && s.files.length === 0)
  const totalFiles = slotsWithFiles.reduce((acc, s) => acc + s.files.length, 0)

  if (totalFiles === 0 && missingRecommended.length === 0) return null

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Paperclip className="h-3.5 w-3.5" />
        <span>Documents ({totalFiles})</span>
        {missingRecommended.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-300 text-amber-600 ml-auto">
            {missingRecommended.length} manquant{missingRecommended.length > 1 ? 's' : ''}
          </Badge>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 pl-6">
          {slotsWithFiles.map((slot, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
              <span className="font-medium">{slot.label}</span>
              <span className="text-muted-foreground">
                — {slot.files.length} fichier{slot.files.length > 1 ? 's' : ''}
              </span>
            </div>
          ))}
          {missingRecommended.length > 0 && (
            <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">Recommandés manquants :</p>
                  <ul className="list-disc list-inside space-y-0.5">
                    {missingRecommended.map((slot, i) => (
                      <li key={i}>{slot.label}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

const InterventionsSummary = ({ interventions }: { interventions: ScheduledInterventionData[] }) => {
  const [expanded, setExpanded] = React.useState(false)
  const enabled = interventions.filter(i => i.enabled && i.scheduledDate)
  const disabled = interventions.filter(i => !i.enabled)

  if (enabled.length === 0 && disabled.length === 0) return null

  return (
    <div className="mt-3 border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full"
      >
        {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <CalendarCheck className="h-3.5 w-3.5" />
        <span>Interventions ({enabled.length})</span>
        {disabled.length > 0 && (
          <span className="text-xs text-muted-foreground ml-auto">
            {disabled.length} désactivée{disabled.length > 1 ? 's' : ''}
          </span>
        )}
      </button>

      {expanded && (
        <div className="mt-2 space-y-1.5 pl-6">
          {enabled.map((intervention, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{intervention.title}</span>
                <span className="text-muted-foreground">
                  — {intervention.scheduledDate ? format(intervention.scheduledDate, 'dd/MM/yyyy') : '—'}
                </span>
                {intervention.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {intervention.assignedUsers.map(user => (
                      <ParticipantChip
                        key={user.userId}
                        participant={{ id: user.userId, name: user.name }}
                        roleKey={user.role === 'gestionnaire' ? 'managers' : user.role === 'prestataire' ? 'providers' : 'tenants'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {disabled.length > 0 && (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{disabled.length} intervention{disabled.length > 1 ? 's' : ''} désactivée{disabled.length > 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────

export function BuildingConfirmationStep({
  buildingInfo,
  buildingManagers,
  buildingContacts,
  lots,
  existingLots = [],
  lotContactAssignments,
  assignedManagers,
  buildingDocSlots = [],
  lotDocSlots = {},
  buildingInterventions = [],
  lotInterventions = {}
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
      {/* Building Card - Contacts + docs/interventions (address shown in header) */}
      <BuildingContactCardV3
        buildingName={buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
        buildingAddress={`${buildingInfo.address}, ${buildingInfo.postalCode ? `${buildingInfo.postalCode} ` : ''}${buildingInfo.city}${buildingInfo.country ? `, ${buildingInfo.country}` : ''}`}
        buildingManagers={buildingManagers}
        providers={providers}
        owners={owners}
        others={others}
        readOnly={true}
      >
        {(buildingDocSlots.length > 0 || buildingInterventions.length > 0) && (
          <div className="px-4 pb-3">
            {buildingDocSlots.length > 0 && (
              <DocumentsSummary slots={buildingDocSlots} />
            )}
            {buildingInterventions.length > 0 && (
              <InterventionsSummary interventions={buildingInterventions} />
            )}
          </div>
        )}
      </BuildingContactCardV3>

      {/* Lots Section - Show both existing and new lots */}
      {(existingLots.length > 0 || lots.length > 0) && (
        <div className="space-y-3">
          {/* Existing Lots */}
          {existingLots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 px-1">
                <h3 className="text-sm font-semibold text-gray-700">
                  Lots existants dans l&apos;immeuble
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
                        isExisting={true}
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
                  const lotNumber = index + 1
                  const lotManagers = getAssignedManagers(lot.id)
                  const tenants = getLotContactsByType(lot.id, 'tenant')
                  const lotProviders = getLotContactsByType(lot.id, 'provider')
                  const lotOwners = getLotContactsByType(lot.id, 'owner')
                  const lotOthers = getLotContactsByType(lot.id, 'other')
                  const lotDocs = lotDocSlots[lot.id] || []
                  const lotIntv = lotInterventions[lot.id] || []

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
                        readOnly={true}
                        isExisting={false}
                        floor={lot.floor}
                        doorNumber={lot.doorNumber}
                        description={lot.description}
                      >
                        {isExpanded && (lotDocs.length > 0 || lotIntv.length > 0) && (
                          <div className="px-4 pb-3">
                            {lotDocs.length > 0 && <DocumentsSummary slots={lotDocs} />}
                            {lotIntv.length > 0 && <InterventionsSummary interventions={lotIntv} />}
                          </div>
                        )}
                      </LotContactCardV4>
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
