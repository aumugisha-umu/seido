"use client"

import React from "react"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { Building2, Home, Users, FileText, CalendarCheck, CheckCircle2, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react"
import { ParticipantChip } from "@/components/interventions/shared/layout/participants-row"
import {
  ConfirmationPageShell,
  ConfirmationEntityHeader,
  ConfirmationSummaryBanner,
  ConfirmationSection,
  ConfirmationKeyValueGrid,
  ConfirmationContactGrid,
  ConfirmationDocumentList,
} from "@/components/confirmation"
import type { User as UserType, Contact } from "@/lib/services/core/service-types"
import type { GenericDocumentSlotState } from "@/components/documents/types"
import type { ScheduledInterventionData } from "@/components/contract/intervention-schedule-row"
import { LotCategory, getLotCategoryConfig } from "@/lib/lot-types"

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
  /** Existing building documents (already uploaded to the parent building) */
  existingBuildingDocs?: Array<{
    id: string
    document_type: string
    original_filename: string
    uploaded_at: string
    storage_path: string
  }>
}

// ─── Helper: map GenericDocumentSlotState[] → ConfirmationDocumentList slots ─
const mapDocSlots = (slots: GenericDocumentSlotState[]) =>
  slots.map((s) => ({
    label: s.label,
    fileCount: s.files.length,
    fileNames: s.files.map((f) => ({ name: f.name, url: f.signedUrl })),
    recommended: !!s.recommended,
  }))

// ─── Helper: map contacts to ContactTypeGroup[] ─────────────────────────────
const mapContactGroup = (type: string, contacts: Contact[], emptyLabel: string) => ({
  type,
  contacts: contacts.map((c) => ({
    id: c.id,
    name: `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim() || c.company_name || "Sans nom",
    email: c.email ?? undefined,
  })),
  emptyLabel,
})

const mapManagerGroup = (managers: UserType[]) => ({
  type: "Gestionnaires",
  contacts: managers.map((m) => ({
    id: m.id,
    name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.email || "Sans nom",
    email: m.email ?? undefined,
  })),
  emptyLabel: "Aucun gestionnaire",
})

// ─── Interventions sub-component (kept inline, not in reusable lib) ──────────
const InterventionsSummary = ({ interventions }: { interventions: ScheduledInterventionData[] }) => {
  const [expanded, setExpanded] = React.useState(false)
  const enabled = interventions.filter((i) => i.enabled && i.scheduledDate)
  const disabled = interventions.filter((i) => !i.enabled)

  if (enabled.length === 0 && disabled.length === 0) return null

  return (
    <div className="space-y-2">
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
            {disabled.length} desactivee{disabled.length > 1 ? "s" : ""}
          </span>
        )}
      </button>

      {expanded && (
        <div className="space-y-1.5 pl-6">
          {enabled.map((intervention, i) => (
            <div key={i} className="flex items-start gap-2 text-sm">
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">{intervention.title}</span>
                <span className="text-muted-foreground">
                  — {intervention.scheduledDate ? format(intervention.scheduledDate, "dd/MM/yyyy") : "—"}
                </span>
                {intervention.assignedUsers.length > 0 && (
                  <div className="flex items-center gap-1 flex-wrap">
                    {intervention.assignedUsers.map((user) => (
                      <ParticipantChip
                        key={user.userId}
                        participant={{ id: user.userId, name: user.name }}
                        roleKey={user.role === "gestionnaire" ? "managers" : user.role === "prestataire" ? "providers" : "tenants"}
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
              <span>
                {disabled.length} intervention{disabled.length > 1 ? "s" : ""} desactivee{disabled.length > 1 ? "s" : ""}
              </span>
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
  lotInterventions = {},
  existingBuildingDocs = [],
}: BuildingConfirmationStepProps) {
  // State to manage lot expansion (collapsed by default in confirmation)
  const [expandedLots, setExpandedLots] = React.useState<{ [key: string]: boolean }>(() => {
    const newLotsEntries = lots.map((lot) => [lot.id, false])
    const existingLotsEntries = existingLots.map((lot) => [lot.id, false])
    return Object.fromEntries([...newLotsEntries, ...existingLotsEntries])
  })

  const toggleLotExpansion = (lotId: string) => {
    setExpandedLots((prev) => ({ ...prev, [lotId]: !prev[lotId] }))
  }

  // Helper functions to extract contacts by type
  const getLotContactsByType = (lotId: string, contactType: string): Contact[] => {
    return lotContactAssignments[lotId]?.[contactType] || []
  }

  const getAssignedManagers = (lotId: string): UserType[] => {
    return assignedManagers[lotId] || []
  }

  // Map building contacts from object to arrays
  const providers = buildingContacts["provider"] || []
  const others = buildingContacts["other"] || []

  // Compute summary metrics
  const fullAddress = `${buildingInfo.address}, ${buildingInfo.postalCode ? `${buildingInfo.postalCode} ` : ""}${buildingInfo.city}${buildingInfo.country ? `, ${buildingInfo.country}` : ""}`
  const totalContacts = buildingManagers.length + providers.length + others.length
  const totalDocFiles = buildingDocSlots.reduce((acc, s) => acc + s.files.length, 0)
  const enabledInterventions = buildingInterventions.filter((i) => i.enabled && i.scheduledDate)

  return (
    <ConfirmationPageShell maxWidth="7xl">
      {/* Entity Header */}
      <ConfirmationEntityHeader
        icon={Building2}
        title={buildingInfo.name || `Immeuble - ${buildingInfo.address}`}
        subtitle={fullAddress}
        badges={[
          ...(lots.length > 0
            ? [{ label: `${lots.length} nouveau${lots.length > 1 ? "x" : ""} lot${lots.length > 1 ? "s" : ""}`, className: "bg-green-50 text-green-700 border-green-200" }]
            : []),
          ...(existingLots.length > 0
            ? [{ label: `${existingLots.length} lot${existingLots.length > 1 ? "s" : ""} existant${existingLots.length > 1 ? "s" : ""}`, variant: "secondary" as const }]
            : []),
        ]}
      />

      {/* Summary Banner */}
      <ConfirmationSummaryBanner
        metrics={[
          { label: "Lots", value: lots.length + existingLots.length, icon: <Home className="h-3.5 w-3.5" /> },
          { label: "Contacts", value: totalContacts, icon: <Users className="h-3.5 w-3.5" /> },
          { label: "Documents", value: totalDocFiles, icon: <FileText className="h-3.5 w-3.5" /> },
          { label: "Interventions", value: enabledInterventions.length, icon: <CalendarCheck className="h-3.5 w-3.5" /> },
        ]}
      />

      {/* General Information */}
      <ConfirmationSection title="Informations generales" card>
        <ConfirmationKeyValueGrid
          pairs={[
            {
              label: "Description",
              value: buildingInfo.description || undefined,
              empty: !buildingInfo.description,
              fullWidth: true,
            },
            {
              label: "Pays",
              value: buildingInfo.country || undefined,
              empty: !buildingInfo.country,
            },
          ]}
          columns={1}
        />
      </ConfirmationSection>

      {/* Building Contacts */}
      <ConfirmationSection title="Contacts de l'immeuble" card>
        <ConfirmationContactGrid
          groups={[
            mapManagerGroup(buildingManagers),
            mapContactGroup("Prestataires", providers, "Aucun prestataire"),
            mapContactGroup("Autres", others, "Aucun autre contact"),
          ]}
          columns={3}
        />
      </ConfirmationSection>

      {/* Building Documents */}
      <ConfirmationSection title="Documents de l'immeuble" card>
        {existingBuildingDocs.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">Documents existants</p>
            <div className="space-y-1">
              {existingBuildingDocs.map((doc) => (
                <div key={doc.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-3.5 w-3.5 shrink-0" />
                  <span>{doc.original_filename}</span>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {doc.document_type.replace(/_/g, ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
        <ConfirmationDocumentList slots={mapDocSlots(buildingDocSlots)} />
      </ConfirmationSection>

      {/* Building Interventions */}
      {buildingInterventions.length > 0 && (
        <ConfirmationSection title="Interventions de l'immeuble" card>
          <InterventionsSummary interventions={buildingInterventions} />
        </ConfirmationSection>
      )}

      {/* Existing Lots (collapsible section) */}
      {existingLots.length > 0 && (
        <ConfirmationSection title="Lots existants">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {existingLots.map((lot, index) => {
              const isExpanded = expandedLots[lot.id] || false
              const catConfig = getLotCategoryConfig(lot.category)

              return (
                <div key={lot.id} className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}>
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    {/* Lot header */}
                    <button
                      type="button"
                      onClick={() => toggleLotExpansion(lot.id)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">
                        #{index + 1} — {lot.reference || "Sans reference"}
                      </span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catConfig.bgColor} ${catConfig.color} border-0`}>
                        {catConfig.label}
                      </Badge>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200">
                        Existant
                      </Badge>
                    </button>

                    {isExpanded && (
                      <div className="space-y-3 pl-6">
                        <ConfirmationKeyValueGrid
                          pairs={[
                            { label: "Etage", value: lot.floor || undefined, empty: !lot.floor },
                            { label: "Porte", value: lot.door_number || undefined, empty: !lot.door_number },
                            { label: "Description", value: lot.description || undefined, empty: !lot.description, fullWidth: true },
                          ]}
                          columns={2}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ConfirmationSection>
      )}

      {/* New Lots */}
      {lots.length > 0 && (
        <ConfirmationSection title={existingLots.length > 0 ? "Nouveaux lots ajoutes" : "Lots"}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lots.map((lot, index) => {
              const isExpanded = expandedLots[lot.id] || false
              const lotManagers = getAssignedManagers(lot.id)
              const tenants = getLotContactsByType(lot.id, "tenant")
              const lotProviders = getLotContactsByType(lot.id, "provider")
              const lotOthers = getLotContactsByType(lot.id, "other")
              const lotDocs = lotDocSlots[lot.id] || []
              const lotIntv = lotInterventions[lot.id] || []
              const catConfig = getLotCategoryConfig(lot.category)

              return (
                <div key={lot.id} className={isExpanded ? "md:col-span-2 lg:col-span-3" : ""}>
                  <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
                    {/* Lot header */}
                    <button
                      type="button"
                      onClick={() => toggleLotExpansion(lot.id)}
                      className="flex items-center gap-2 w-full text-left"
                    >
                      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                      <span className="text-sm font-semibold text-foreground flex-1 truncate">
                        #{index + 1} — {lot.reference || "Sans reference"}
                      </span>
                      <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${catConfig.bgColor} ${catConfig.color} border-0`}>
                        {catConfig.label}
                      </Badge>
                    </button>

                    {/* Always show key info even when collapsed */}
                    {!isExpanded && (
                      <div className="pl-6 flex items-center gap-3 text-xs text-muted-foreground">
                        {lot.floor && <span>Etage {lot.floor}</span>}
                        {lot.doorNumber && <span>Porte {lot.doorNumber}</span>}
                        <span>{lotManagers.length + tenants.length + lotProviders.length + lotOthers.length} contacts</span>
                      </div>
                    )}

                    {/* Expanded details */}
                    {isExpanded && (
                      <div className="space-y-4 pl-6">
                        <ConfirmationKeyValueGrid
                          pairs={[
                            { label: "Etage", value: lot.floor || undefined, empty: !lot.floor },
                            { label: "Porte", value: lot.doorNumber || undefined, empty: !lot.doorNumber },
                            { label: "Description", value: lot.description || undefined, empty: !lot.description, fullWidth: true },
                          ]}
                          columns={2}
                        />

                        <ConfirmationContactGrid
                          groups={[
                            mapManagerGroup(lotManagers),
                            mapContactGroup("Locataires", tenants, "Aucun locataire"),
                            mapContactGroup("Prestataires", lotProviders, "Aucun prestataire"),
                            mapContactGroup("Autres", lotOthers, "Aucun autre contact"),
                          ]}
                          columns={4}
                        />

                        {lotDocs.length > 0 && <ConfirmationDocumentList slots={mapDocSlots(lotDocs)} />}

                        {lotIntv.length > 0 && <InterventionsSummary interventions={lotIntv} />}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </ConfirmationSection>
      )}
    </ConfirmationPageShell>
  )
}
