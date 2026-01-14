"use client"

import { useState, useMemo, type RefObject } from "react"
import {
  Users,
  User,
  Calendar as CalendarIcon,
  CalendarPlus,
  ArrowRight,
  MessageSquare,
  Plus,
  X,
  Info,
  FileText,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Send,
  UserCheck
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { DatePicker } from "@/components/ui/date-picker"
import { TimePicker24h } from "@/components/ui/time-picker-24h"
import { Label } from "@/components/ui/label"
import { ContactSection } from "@/components/ui/contact-section"
import type { ContactSelectorRef } from "@/components/contact-selector"
import { cn } from "@/lib/utils"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import { AssignmentModeSelector, type AssignmentMode } from "./assignment-mode-selector"
import { ProviderInstructionsInput } from "./provider-instructions-input"
import { ParticipantConfirmationSelector } from "./participant-confirmation-selector"
import type { BuildingTenantsResult } from "@/app/actions/contract-actions"

interface Contact {
  id: string
  name: string
  email: string
  phone: string
  role?: string
  speciality?: string
  isCurrentUser?: boolean
  type: "gestionnaire" | "prestataire" | "locataire"
}

interface TimeSlot {
  date: string
  startTime: string
  endTime: string
}

interface AssignmentSectionV2Props {
  managers: Contact[]
  providers: Contact[]
  tenants: Contact[]  // Locataires du lot (affichés automatiquement)
  selectedManagerIds: string[]
  selectedProviderIds: string[]
  onManagerSelect: (managerId: string) => void
  onProviderSelect: (providerId: string) => void
  onContactCreated: (contact: any) => void
  schedulingType: "fixed" | "slots" | "flexible"
  onSchedulingTypeChange: (type: "fixed" | "slots" | "flexible") => void
  fixedDateTime: { date: string; time: string }
  onFixedDateTimeChange: (dateTime: { date: string; time: string }) => void
  timeSlots: TimeSlot[]
  onAddTimeSlot: (slot?: { date: string; startTime: string; endTime: string }) => void
  onUpdateTimeSlot: (index: number, field: keyof TimeSlot, value: string) => void
  onRemoveTimeSlot: (index: number) => void
  expectsQuote: boolean
  onExpectsQuoteChange: (expects: boolean) => void
  globalMessage: string
  onGlobalMessageChange: (message: string) => void
  teamId: string
  isLoading?: boolean
  // Nouvelle prop pour ouvrir le modal de sélection
  contactSelectorRef?: RefObject<ContactSelectorRef>
  // Multi-provider mode props
  assignmentMode?: AssignmentMode
  onAssignmentModeChange?: (mode: AssignmentMode) => void
  providerInstructions?: Record<string, string>
  onProviderInstructionsChange?: (providerId: string, instructions: string) => void
  // Tenant toggle props (for occupied lots OR buildings)
  showTenantsSection?: boolean
  includeTenants?: boolean
  onIncludeTenantsChange?: (include: boolean) => void
  // Building tenants (grouped by lot)
  buildingTenants?: BuildingTenantsResult | null
  loadingBuildingTenants?: boolean
  // Lots selection (for granular control)
  excludedLotIds?: Set<string>
  onLotToggle?: (lotId: string) => void
  // Confirmation des participants (date fixe: optionnel, créneaux: obligatoire)
  requiresConfirmation?: boolean
  onRequiresConfirmationChange?: (requires: boolean) => void
  confirmationRequired?: string[]  // IDs des participants qui doivent confirmer
  onConfirmationRequiredChange?: (userId: string, required: boolean) => void
}

// Helper pour formater la date des créneaux
function formatSlotDate(dateStr: string): string {
  if (!dateStr) return ''
  try {
    const date = new Date(dateStr)
    return format(date, 'dd/MM', { locale: fr })
  } catch {
    return dateStr
  }
}

// Composant Popover pour ajouter un créneau
function TimeSlotPopoverContent({
  onAdd,
  onOpenChange
}: {
  onAdd: (slot: { date: string; startTime: string; endTime: string }) => void
  onOpenChange?: (open: boolean) => void
}) {
  const [date, setDate] = useState<Date | undefined>()
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("17:00")

  const handleAdd = () => {
    if (date) {
      onAdd({
        date: format(date, 'yyyy-MM-dd'),
        startTime,
        endTime
      })
      // Reset form
      setDate(undefined)
      setStartTime("09:00")
      setEndTime("17:00")
      // Close popover
      onOpenChange?.(false)
    }
  }

  return (
    <div className="w-full max-w-[340px]">
      {/* Header avec icône et fond coloré */}
      <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-slate-100">
        <div className="p-2 bg-blue-100 rounded-lg">
          <CalendarPlus className="h-4 w-4 text-blue-600" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-900 text-sm">Ajouter un créneau</h4>
          <p className="text-xs text-slate-500">Sélectionnez une date et un horaire</p>
        </div>
      </div>

      {/* Section Calendrier */}
      <div className="bg-slate-50/50 rounded-lg p-1">
        <Calendar
          mode="single"
          selected={date}
          onSelect={setDate}
          disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
          className="rounded-md"
          locale={fr}
        />
      </div>

      {/* Section Horaires - Design compact avec flèche */}
      <div className="mt-4">
        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-3">
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block mb-1">Début</span>
            <TimePicker24h value={startTime} onChange={setStartTime} />
          </div>
          <ArrowRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
          <div className="flex-1">
            <span className="text-[10px] uppercase tracking-wide text-slate-400 block mb-1">Fin</span>
            <TimePicker24h value={endTime} onChange={setEndTime} />
          </div>
        </div>
      </div>

      {/* Preview du créneau si date sélectionnée */}
      {date && (
        <div className="mt-3 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <CalendarIcon className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <span className="font-medium text-blue-900">
              {format(date, 'EEEE d MMMM', { locale: fr })}
            </span>
            <span className="text-blue-600">
              {startTime} - {endTime}
            </span>
          </div>
        </div>
      )}

      {/* Actions avec meilleur espacement */}
      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpenChange?.(false)}
          className="text-slate-600 hover:text-slate-900"
        >
          Annuler
        </Button>
        <Button
          size="sm"
          onClick={handleAdd}
          disabled={!date}
          className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Ajouter
        </Button>
      </div>
    </div>
  )
}

// Section Créneaux avec Popover contrôlé
function TimeSlotSection({
  timeSlots,
  onAddTimeSlot,
  onUpdateTimeSlot,
  onRemoveTimeSlot
}: {
  timeSlots: TimeSlot[]
  onAddTimeSlot: (slot?: { date: string; startTime: string; endTime: string }) => void
  onUpdateTimeSlot: (index: number, field: keyof TimeSlot, value: string) => void
  onRemoveTimeSlot: (index: number) => void
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false)

  return (
    <div className="space-y-3">
      {/* Badges des créneaux existants */}
      {timeSlots.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm group"
            >
              <CalendarIcon className="h-3.5 w-3.5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {formatSlotDate(slot.date)}
              </span>
              <span className="text-blue-600">
                {slot.startTime || '09:00'} - {slot.endTime || '17:00'}
              </span>
              <button
                type="button"
                onClick={() => onRemoveTimeSlot(index)}
                className="ml-1 p-0.5 hover:bg-blue-200 rounded opacity-60 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3.5 w-3.5 text-blue-600" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Popover contrôlé pour ajouter un créneau */}
      <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="border-dashed"
          >
            <Plus className="h-4 w-4 mr-2" />
            Ajouter un créneau
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-4" align="start" sideOffset={8} collisionPadding={16}>
          <TimeSlotPopoverContent
            onAdd={(slot) => {
              // ✅ Passer le slot complet directement pour éviter les problèmes de batching React
              onAddTimeSlot(slot)
            }}
            onOpenChange={setIsPopoverOpen}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export function AssignmentSectionV2({
  managers,
  providers,
  tenants,
  selectedManagerIds,
  selectedProviderIds,
  onManagerSelect,
  onProviderSelect,
  onContactCreated,
  schedulingType,
  onSchedulingTypeChange,
  fixedDateTime,
  onFixedDateTimeChange,
  timeSlots,
  onAddTimeSlot,
  onUpdateTimeSlot,
  onRemoveTimeSlot,
  expectsQuote,
  onExpectsQuoteChange,
  globalMessage,
  onGlobalMessageChange,
  teamId,
  isLoading = false,
  contactSelectorRef,
  // Multi-provider mode
  assignmentMode = 'single',
  onAssignmentModeChange,
  providerInstructions = {},
  onProviderInstructionsChange,
  // Tenant toggle
  showTenantsSection = false,
  includeTenants = true,
  onIncludeTenantsChange,
  // Building tenants
  buildingTenants = null,
  loadingBuildingTenants = false,
  // Lots selection
  excludedLotIds = new Set(),
  onLotToggle,
  // Confirmation des participants
  requiresConfirmation = false,
  onRequiresConfirmationChange,
  confirmationRequired = [],
  onConfirmationRequiredChange
}: AssignmentSectionV2Props) {
  const [expandedSections, setExpandedSections] = useState({
    contacts: true,
    planning: true,
    quote: false,
    messages: true
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Get selected contacts
  const selectedManagers = managers.filter(m => selectedManagerIds.includes(String(m.id)))
  const selectedProviders = providers.filter(p => selectedProviderIds.includes(String(p.id)))

  // Combiner tous les locataires (lot-level + building-level filtré par excludedLotIds)
  const allTenants = useMemo(() => {
    // Si on a des tenants directs (lot-level), les utiliser
    if (tenants.length > 0) {
      return tenants
    }

    // Si on a des building tenants (building-level), les combiner depuis les lots non-exclus
    if (buildingTenants && includeTenants) {
      const buildingTenantsFlattened: Contact[] = []
      for (const lotGroup of buildingTenants.byLot) {
        // Ignorer les lots exclus
        if (excludedLotIds?.has(lotGroup.lotId)) continue

        for (const tenant of lotGroup.tenants) {
          buildingTenantsFlattened.push({
            id: tenant.user_id,
            name: tenant.name || '',
            email: tenant.email || undefined,
            phone: tenant.phone || undefined,
            type: 'locataire' as const
          })
        }
      }
      return buildingTenantsFlattened
    }

    return []
  }, [tenants, buildingTenants, includeTenants, excludedLotIds])

  const allSelectedContacts = [...selectedManagers, ...selectedProviders, ...allTenants]

  // Vérifier si il y a d'autres participants que l'utilisateur courant
  // (nécessaire pour activer le mode "créneaux" et la confirmation)
  const hasOtherParticipants =
    selectedProviders.length > 0 ||
    selectedManagers.filter(m => !m.isCurrentUser).length > 0 ||
    allTenants.length > 0

  // Debug log
  console.log("🔍 AssignmentSectionV2 - Tenants received:", tenants)
  console.log("🔍 AssignmentSectionV2 - Building tenants:", buildingTenants)
  console.log("🔍 AssignmentSectionV2 - All tenants (combined):", allTenants)
  console.log("🔍 AssignmentSectionV2 - Has other participants:", hasOtherParticipants)

  return (
    <div className="space-y-4">
      {/* Unified Contact Selection Section */}
      <Collapsible open={expandedSections.contacts}>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <CollapsibleTrigger
            onClick={() => toggleSection('contacts')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Participants de l'intervention
              </h3>
              {allSelectedContacts.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {allSelectedContacts.length} sélectionné{allSelectedContacts.length > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {expandedSections.contacts ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-6 pb-6 space-y-4 border-t">
              {/* Managers, Providers, and Tenants Cards */}
              <div className={`pt-4 grid grid-cols-1 gap-4 ${
                showTenantsSection ? 'md:grid-cols-3' : 'md:grid-cols-2'
              }`}>
                {/* Managers Card */}
                <ContactSection
                  sectionType="managers"
                  contacts={selectedManagers}
                  onAddContact={() => contactSelectorRef?.current?.openContactModal('manager')}
                  onRemoveContact={onManagerSelect}
                  minRequired={1}
                  customLabel="Gestionnaires *"
                />

                {/* Providers Card */}
                <ContactSection
                  sectionType="providers"
                  contacts={selectedProviders}
                  onAddContact={() => contactSelectorRef?.current?.openContactModal('provider')}
                  onRemoveContact={onProviderSelect}
                  customLabel="Prestataires (optionnel)"
                />

                {/* Tenants Card - For occupied lots OR buildings with tenants */}
                {showTenantsSection && (
                  <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col h-full">
                    {/* Header with toggle */}
                    <div className="w-full flex items-center justify-between gap-2 p-2.5 bg-blue-50">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold text-sm text-blue-900">Locataires</span>
                        {/* Badge count - shows included tenants only */}
                        {buildingTenants ? (
                          (() => {
                            const includedCount = buildingTenants.byLot
                              .filter(lot => !excludedLotIds?.has(lot.lotId))
                              .reduce((sum, lot) => sum + lot.tenants.length, 0)
                            const includedLotsCount = buildingTenants.byLot
                              .filter(lot => !excludedLotIds?.has(lot.lotId)).length
                            return includedCount > 0 && (
                              <>
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                                  {includedCount}
                                </span>
                                <span className="text-xs text-blue-600">
                                  sur {includedLotsCount} lot{includedLotsCount > 1 ? 's' : ''}
                                </span>
                              </>
                            )
                          })()
                        ) : (
                          tenants.length > 0 && (
                            <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-600 text-white">
                              {tenants.length}
                            </span>
                          )
                        )}
                      </div>
                      <Switch
                        checked={includeTenants}
                        onCheckedChange={onIncludeTenantsChange}
                        className="data-[state=checked]:bg-blue-600"
                        disabled={loadingBuildingTenants}
                      />
                    </div>

                    {/* Content */}
                    <div className="p-2 bg-white flex-1">
                      {loadingBuildingTenants ? (
                        <div className="p-3 text-center text-xs text-gray-500">
                          Chargement des locataires...
                        </div>
                      ) : buildingTenants ? (
                        /* Building tenants - grouped by lot with individual switches */
                        includeTenants && buildingTenants.byLot.length > 0 ? (
                          <div className="space-y-3 max-h-60 overflow-y-auto">
                            {buildingTenants.byLot.map((lotGroup) => {
                              const isLotIncluded = !excludedLotIds?.has(lotGroup.lotId)

                              return (
                                <div key={lotGroup.lotId}>
                                  {/* Lot header with switch */}
                                  <div className="flex items-center justify-between mb-1.5 px-1">
                                    <span className="text-xs font-medium text-slate-600">
                                      {lotGroup.lotReference}
                                      <span className="text-slate-400 ml-1">
                                        ({lotGroup.tenants.length})
                                      </span>
                                    </span>
                                    <Switch
                                      checked={isLotIncluded}
                                      onCheckedChange={() => onLotToggle?.(lotGroup.lotId)}
                                      className="scale-75 data-[state=checked]:bg-blue-600"
                                    />
                                  </div>
                                  {/* Tenants in this lot (greyed out if excluded) */}
                                  <div className={cn("space-y-1", !isLotIncluded && "opacity-40")}>
                                    {lotGroup.tenants.map((tenant, index) => (
                                      <div
                                        key={tenant.id || `tenant-${lotGroup.lotId}-${index}`}
                                        className="flex items-center gap-2 p-2 bg-blue-50/50 rounded border border-blue-100"
                                      >
                                        <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                                          <User className="w-4 h-4 text-blue-700" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm truncate">{tenant.name}</div>
                                          {tenant.email && (
                                            <div className="text-xs text-gray-500 truncate">{tenant.email}</div>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )
                            })}
                            {/* Info message for building */}
                            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                              <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-700">
                                {buildingTenants.byLot.filter(lot => !excludedLotIds?.has(lot.lotId)).reduce((sum, lot) => sum + lot.tenants.length, 0) > 1
                                  ? 'Ils pourront'
                                  : 'Il pourra'} suivre l'intervention et interagir dans le chat
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-gray-500">
                            {includeTenants ? 'Aucun locataire dans cet immeuble' : 'Les locataires ne seront pas notifiés'}
                          </div>
                        )
                      ) : (
                        /* Lot tenants - simple list */
                        includeTenants && tenants.length > 0 ? (
                          <div className="space-y-1.5">
                            {tenants.map((tenant, index) => (
                              <div
                                key={tenant.id || `tenant-${index}`}
                                className="flex items-center gap-2 p-2 bg-blue-50/50 rounded border border-blue-100"
                              >
                                <div className="w-7 h-7 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                                  <User className="w-4 h-4 text-blue-700" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm truncate">{tenant.name}</div>
                                  {tenant.email && (
                                    <div className="text-xs text-gray-500 truncate">{tenant.email}</div>
                                  )}
                                </div>
                              </div>
                            ))}
                            {/* Info message for lot */}
                            <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 mt-2">
                              <Info className="h-3.5 w-3.5 text-blue-600 mt-0.5 flex-shrink-0" />
                              <p className="text-xs text-blue-700">
                                {tenants.length > 1 ? 'Ils pourront' : 'Il pourra'} suivre l'intervention et interagir dans le chat
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 text-center text-xs text-gray-500">
                            {includeTenants ? 'Aucun locataire' : 'Les locataires ne seront pas notifiés'}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Quote Section - Compact */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <FileText className={cn(
              "h-5 w-5 flex-shrink-0",
              selectedProviderIds.length === 0 ? "text-slate-400" : "text-slate-600"
            )} />
            <label
              htmlFor="quote-switch"
              className={cn(
                "text-base font-semibold whitespace-nowrap",
                selectedProviderIds.length === 0
                  ? "text-slate-400 cursor-not-allowed"
                  : "text-slate-900 cursor-pointer"
              )}
            >
              Demander un devis
            </label>

            {/* Info/Warning message inline with background - hidden on mobile */}
            {(selectedProviderIds.length === 0 || expectsQuote) && (
              <div className={cn(
                "hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ml-3",
                selectedProviderIds.length === 0
                  ? "bg-slate-50 border-slate-200"
                  : "bg-amber-50 border-amber-200"
              )}>
                {selectedProviderIds.length === 0 ? (
                  <>
                    <Info className="h-4 w-4 text-slate-500 flex-shrink-0" />
                    <p className="text-xs text-slate-600">
                      Sélectionnez un prestataire pour demander un devis.
                    </p>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                    <p className="text-xs text-amber-800">
                      Les prestataires devront fournir un devis.
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          <Switch
            id="quote-switch"
            checked={expectsQuote}
            onCheckedChange={onExpectsQuoteChange}
            disabled={selectedProviderIds.length === 0}
            className="flex-shrink-0"
          />
        </div>
      </div>

      {/* Instructions + Planning - Side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
        {/* Messages & Assignment Mode Section */}
        <Collapsible open={expandedSections.messages} className="h-full">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
          <CollapsibleTrigger
            onClick={() => toggleSection('messages')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Instructions et messages
              </h3>
              {(globalMessage || (assignmentMode === 'separate' && Object.values(providerInstructions).some(v => v?.trim()))) && (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
            </div>
            {expandedSections.messages ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="flex-1">
            <div className="px-6 pb-6 space-y-5 border-t pt-4">
              {/* Assignment Mode Selector - Only show when 2+ providers */}
              {selectedProviderIds.length > 1 && onAssignmentModeChange && (
                <AssignmentModeSelector
                  mode={assignmentMode}
                  onModeChange={onAssignmentModeChange}
                  providerCount={selectedProviderIds.length}
                />
              )}

              {/* Global Message - Always visible, BEFORE provider-specific */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <Send className="h-4 w-4" />
                  Instructions générales
                </label>
                <Textarea
                  placeholder="Instructions visibles par tous les prestataires et gestionnaires assignés"
                  value={globalMessage}
                  onChange={(e) => onGlobalMessageChange(e.target.value)}
                  rows={3}
                  className="resize-none text-sm"
                />
                <p className="text-xs text-slate-500 mt-1.5">
                  Visibles par tous les prestataires assignés
                </p>
              </div>

              {/* Provider-specific instructions in separate mode */}
              {assignmentMode === 'separate' && selectedProviderIds.length > 1 && onProviderInstructionsChange && (
                <ProviderInstructionsInput
                  providers={selectedProviders.map(p => ({
                    id: p.id,
                    name: p.name,
                    avatar_url: undefined,
                    speciality: p.speciality
                  }))}
                  instructions={providerInstructions}
                  onInstructionsChange={onProviderInstructionsChange}
                />
              )}

              <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                <p className="text-xs text-blue-700">
                  Les instructions ne seront pas visibles par le locataire. Seuls les assignés pourront les consulter.
                </p>
              </div>
            </div>
          </CollapsibleContent>
        </div>
      </Collapsible>

      {/* Planning Section */}
      <Collapsible open={expandedSections.planning} className="h-full">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
          <CollapsibleTrigger
            onClick={() => toggleSection('planning')}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <CalendarIcon className="h-5 w-5 text-slate-600" />
              <h3 className="text-base font-semibold text-slate-900">
                Planification de l'intervention
              </h3>
              <Badge variant="outline" className="text-xs">
                {schedulingType === "flexible" ? "À définir" :
                 schedulingType === "fixed" ? "Date fixe" : "Créneaux multiples"}
              </Badge>
            </div>
            {expandedSections.planning ? (
              <ChevronUp className="h-5 w-5 text-slate-400" />
            ) : (
              <ChevronDown className="h-5 w-5 text-slate-400" />
            )}
          </CollapsibleTrigger>

          <CollapsibleContent className="flex-1">
            <div className="px-6 pb-6 space-y-4 border-t pt-4 h-full">
              {/* Inline Radio Options */}
              <div className="flex flex-col sm:flex-row gap-3">
                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  schedulingType === "flexible"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "flexible"}
                    onChange={() => onSchedulingTypeChange("flexible")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">À définir</span>
                    <p className="text-xs text-slate-600">Laissez les parties s'organiser</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  schedulingType === "fixed"
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-200 hover:border-slate-300"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "fixed"}
                    onChange={() => onSchedulingTypeChange("fixed")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Date fixe</span>
                    <p className="text-xs text-slate-600">Définir un créneau précis</p>
                  </div>
                </label>

                <label className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 transition-all",
                  !hasOtherParticipants
                    ? "opacity-50 cursor-not-allowed border-slate-200 bg-slate-50"
                    : schedulingType === "slots"
                      ? "border-blue-500 bg-blue-50 cursor-pointer"
                      : "border-slate-200 hover:border-slate-300 cursor-pointer"
                )}>
                  <input
                    type="radio"
                    name="scheduling"
                    checked={schedulingType === "slots"}
                    onChange={() => hasOtherParticipants && onSchedulingTypeChange("slots")}
                    disabled={!hasOtherParticipants}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="flex-1">
                    <span className="font-medium text-sm">Créneaux</span>
                    <p className="text-xs text-slate-600">
                      {!hasOtherParticipants
                        ? "Ajoutez au moins 1 autre participant"
                        : "Proposer plusieurs options"}
                    </p>
                  </div>
                </label>
              </div>

              {/* Conditional content based on selection */}
              {schedulingType === "fixed" && (
                <div className="space-y-4">
                  {/* Date & Heure */}
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-end">
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Date</Label>
                      <DatePicker
                        value={fixedDateTime.date}
                        onChange={(date) => onFixedDateTimeChange({ ...fixedDateTime, date })}
                        minDate={new Date().toISOString().split('T')[0]}
                        className="w-full"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Label className="text-sm font-medium">Heure</Label>
                      <TimePicker24h
                        value={fixedDateTime.time}
                        onChange={(time) => onFixedDateTimeChange({ ...fixedDateTime, time })}
                      />
                    </div>
                  </div>

                  {/* Section confirmation (optionnelle) - visible seulement si autres participants */}
                  {hasOtherParticipants && onRequiresConfirmationChange && (
                    <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-5 w-5 text-blue-600" />
                          <Label className="text-sm font-medium cursor-pointer">
                            Demander confirmation des participants
                          </Label>
                        </div>
                        <Switch
                          checked={requiresConfirmation}
                          onCheckedChange={onRequiresConfirmationChange}
                          className="data-[state=checked]:bg-blue-600"
                        />
                      </div>

                      {/* Sélection individuelle si toggle activé */}
                      {requiresConfirmation && onConfirmationRequiredChange && (
                        <ParticipantConfirmationSelector
                          managers={selectedManagers}
                          providers={selectedProviders}
                          tenants={allTenants}
                          confirmationRequired={confirmationRequired}
                          onToggle={onConfirmationRequiredChange}
                          mandatory={false}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

              {schedulingType === "slots" && (
                <div className="space-y-4">
                  {/* Sélection des créneaux */}
                  <TimeSlotSection
                    timeSlots={timeSlots}
                    onAddTimeSlot={onAddTimeSlot}
                    onUpdateTimeSlot={onUpdateTimeSlot}
                    onRemoveTimeSlot={onRemoveTimeSlot}
                  />

                  {/* Section confirmation OBLIGATOIRE pour le mode créneaux */}
                  {hasOtherParticipants && onConfirmationRequiredChange && (
                    <div className="border border-blue-200 rounded-lg p-4 bg-blue-50/50">
                      <div className="flex items-center gap-2 mb-1">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        <Label className="text-sm font-medium">
                          Participants qui doivent valider les créneaux
                        </Label>
                        <Badge variant="secondary" className="text-xs">
                          Obligatoire
                        </Badge>
                      </div>
                      <p className="text-xs text-blue-600 mb-2">
                        Les participants sélectionnés devront confirmer leur disponibilité sur les créneaux proposés.
                      </p>

                      <ParticipantConfirmationSelector
                        managers={selectedManagers}
                        providers={selectedProviders}
                        tenants={allTenants}
                        confirmationRequired={confirmationRequired}
                        onToggle={onConfirmationRequiredChange}
                        mandatory={true}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </div>
        </Collapsible>
      </div>

    </div>
  )
}